from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ops_scope_service import DashboardScope, build_sample_collection_scope_sql


def _period_sql(period: str) -> tuple[str, str]:
    if period == "daily":
        return "day", "interval '30 days'"
    if period == "yearly":
        return "year", "interval '5 years'"
    return "month", "interval '12 months'"


def _map_technician(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "userId": row["user_id"],
        "badgeId": row.get("user_badge_id"),
        "fullName": row["full_name"],
        "email": row.get("email"),
        "mobile": row.get("mobile"),
        "employeeCode": row.get("employee_code") or "",
        "technicianType": row.get("technician_type"),
        "status": row.get("status") or "inactive",
        "rating": float(row["rating"]) if row.get("rating") is not None else None,
        "maxAppointmentsPerDay": row.get("max_appointments_per_day"),
        "serviceZone": row.get("service_zone"),
        "samplesCollected": int(row.get("samples_collected") or 0),
        "samplesCompleted": int(row.get("samples_completed") or 0),
        "samplesHandedOver": int(row.get("samples_handed_over") or 0),
    }


def _map_lab_partner(row: dict[str, Any]) -> dict[str, Any]:
    status = row.get("status") or "inactive"
    return {
        "id": row["id"],
        "name": row["name"],
        "contactUserId": row.get("contact_user_id"),
        "contactName": row.get("contact_name"),
        "email": row.get("email"),
        "mobile": row.get("contact_number") or row.get("mobile"),
        "registrationNumber": row.get("registration_number"),
        "status": status,
        "samplesReceived": int(row.get("samples_received") or 0),
        "reportsUploaded": int(row.get("reports_uploaded") or 0),
        "reportsPublished": int(row.get("reports_published") or 0),
    }


class OpsAnalyticsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def sample_collection_analytics(
        self,
        *,
        period: str = "monthly",
        lab_partner_id: UUID | None = None,
        scope: DashboardScope | None = None,
    ) -> dict[str, Any]:
        trunc, interval = _period_sql(period)
        params: dict[str, Any] = {}
        lab_filter = ""
        scope_filter = ""
        if lab_partner_id:
            params["lab_partner_id"] = lab_partner_id
            lab_filter = " AND sc.lab_partner_id = :lab_partner_id"
        if scope and scope.is_scoped() and scope.pincodes:
            params["scope_pincodes"] = scope.pincodes
            scope_filter = f" AND {build_sample_collection_scope_sql()}"

        summary_result = await self.db.execute(
            text(
                f"""
                SELECT
                  COUNT(*)::int AS total_samples,
                  COUNT(*) FILTER (WHERE sc.collected_at IS NOT NULL)::int AS collected,
                  COUNT(*) FILTER (
                    WHERE sc.status IN (
                      'handed_over_to_lab','received_by_lab','testing_started',
                      'testing_in_progress','report_uploaded','pending_approval',
                      'approved','published_to_patient','completed'
                    )
                  )::int AS in_lab_pipeline,
                  COUNT(*) FILTER (
                    WHERE sc.status IN ('published_to_patient','completed')
                  )::int AS reports_published,
                  COUNT(*) FILTER (WHERE sc.status = 'rejected_by_lab')::int AS rejected
                FROM operations.sample_collections sc
                WHERE sc.created_at >= now() - {interval}{lab_filter}{scope_filter}
                """
            ),
            params,
        )
        summary = dict(summary_result.mappings().first() or {})

        collections_result = await self.db.execute(
            text(
                f"""
                SELECT date_trunc('{trunc}', sc.collected_at) AS bucket,
                       COUNT(*)::int AS collected
                FROM operations.sample_collections sc
                WHERE sc.collected_at IS NOT NULL
                  AND sc.collected_at >= now() - {interval}{lab_filter}{scope_filter}
                GROUP BY 1 ORDER BY 1
                """
            ),
            params,
        )
        collections_over_time = [
            {"bucket": row["bucket"], "collected": row["collected"]}
            for row in collections_result.mappings().all()
        ]

        reports_result = await self.db.execute(
            text(
                f"""
                SELECT date_trunc('{trunc}', sc.report_published_at) AS bucket,
                       COUNT(*)::int AS reports
                FROM operations.sample_collections sc
                WHERE sc.report_published_at IS NOT NULL
                  AND sc.report_published_at >= now() - {interval}{lab_filter}{scope_filter}
                GROUP BY 1 ORDER BY 1
                """
            ),
            params,
        )
        reports_over_time = [
            {"bucket": row["bucket"], "reports": row["reports"]}
            for row in reports_result.mappings().all()
        ]

        status_result = await self.db.execute(
            text(
                f"""
                SELECT sc.status, COUNT(*)::int AS total
                FROM operations.sample_collections sc
                WHERE sc.created_at >= now() - {interval}{lab_filter}{scope_filter}
                GROUP BY sc.status ORDER BY total DESC
                """
            ),
            params,
        )
        by_status = [dict(row) for row in status_result.mappings().all()]

        return {
            "period": period,
            "summary": summary,
            "collectionsOverTime": collections_over_time,
            "reportsOverTime": reports_over_time,
            "byStatus": by_status,
        }

    async def list_technicians(self) -> list[dict[str, Any]]:
        result = await self.db.execute(
            text(
                """
                SELECT t.*, u.full_name, u.email, u.mobile, u.user_badge_id,
                  (
                    SELECT COUNT(*)::int FROM operations.sample_collections sc
                    WHERE sc.technician_id = t.id
                  ) AS samples_collected,
                  (
                    SELECT COUNT(*)::int FROM operations.sample_collections sc
                    WHERE sc.technician_id = t.id
                      AND sc.status IN ('published_to_patient','completed')
                  ) AS samples_completed,
                  (
                    SELECT COUNT(*)::int FROM operations.sample_collections sc
                    WHERE sc.technician_id = t.id
                      AND sc.handed_over_at IS NOT NULL
                  ) AS samples_handed_over
                FROM operations.technicians t
                JOIN identity.users u ON u.id = t.user_id
                ORDER BY t.updated_at DESC, t.created_at DESC
                """
            )
        )
        return [_map_technician(dict(row)) for row in result.mappings().all()]

    async def list_lab_partners_with_stats(self) -> list[dict[str, Any]]:
        result = await self.db.execute(
            text(
                """
                SELECT lp.*, u.full_name AS contact_name,
                  (
                    SELECT COUNT(*)::int FROM operations.sample_collections sc
                    WHERE sc.lab_partner_id = lp.id AND sc.received_at IS NOT NULL
                  ) AS samples_received,
                  (
                    SELECT COUNT(*)::int FROM operations.sample_collections sc
                    WHERE sc.lab_partner_id = lp.id
                      AND sc.status IN (
                        'report_uploaded','pending_approval','approved',
                        'published_to_patient','completed'
                      )
                  ) AS reports_uploaded,
                  (
                    SELECT COUNT(*)::int FROM operations.sample_collections sc
                    WHERE sc.lab_partner_id = lp.id
                      AND sc.status IN ('published_to_patient','completed')
                  ) AS reports_published
                FROM operations.lab_partners lp
                LEFT JOIN identity.users u ON u.id = lp.contact_user_id
                ORDER BY lp.updated_at DESC, lp.created_at DESC
                """
            )
        )
        return [_map_lab_partner(dict(row)) for row in result.mappings().all()]

    async def update_technician(self, technician_id: UUID, body: dict[str, Any]) -> dict[str, Any]:
        field_map = {
            "maxAppointmentsPerDay": "max_appointments_per_day",
            "serviceZone": "service_zone",
            "technicianType": "technician_type",
        }
        sets: list[str] = []
        params: dict[str, Any] = {"id": technician_id}

        for camel, col in field_map.items():
            if body.get(camel) is not None:
                param = f"f_{col}"
                params[param] = body[camel]
                sets.append(f"{col} = :{param}")

        for col in ("status", "rating"):
            if body.get(col) is not None:
                params[col] = body[col]
                sets.append(f"{col} = :{col}")

        if sets:
            await self.db.execute(
                text(f"UPDATE operations.technicians SET {', '.join(sets)}, updated_at = now() WHERE id = :id"),
                params,
            )

        rows = await self.list_technicians()
        match = next((row for row in rows if str(row["id"]) == str(technician_id)), None)
        if not match:
            from app.core.exceptions import AppError

            raise AppError("Technician not found", status_code=404)
        return match

    async def list_doctors(
        self,
        *,
        include_inactive: bool = False,
        language: str | None = None,
    ) -> list[dict[str, Any]]:
        filters = []
        params: dict[str, Any] = {}
        if not include_inactive:
            filters.append("d.status IN ('active', 'draft')")
        if language:
            filters.append(":language = ANY(d.languages_known)")
            params["language"] = language.strip()
        where_clause = f"WHERE {' AND '.join(filters)}" if filters else ""
        result = await self.db.execute(
            text(
                f"""
                SELECT d.id, u.id AS user_id, u.full_name, d.specialization, d.qualification,
                       d.registration_number, d.languages_known, c.name AS clinic_name,
                       COALESCE(u.status::text, d.status::text) AS status
                FROM clinical.doctors d
                JOIN identity.users u ON u.id = d.user_id
                LEFT JOIN core.clinics c ON c.id = d.clinic_id
                {where_clause}
                ORDER BY d.updated_at DESC, d.created_at DESC
                """
            ),
            params,
        )
        return [
            {
                "id": row["id"],
                "userId": row["user_id"],
                "fullName": row["full_name"],
                "specialization": row.get("specialization"),
                "qualification": row.get("qualification"),
                "registrationNumber": row.get("registration_number"),
                "clinicName": row.get("clinic_name"),
                "languagesKnown": [str(lang) for lang in (row.get("languages_known") or []) if lang],
                "status": row.get("status") or "inactive",
            }
            for row in result.mappings().all()
        ]
