from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.commerce import LiverCarePackage
from app.models.operations import Enquiry
from app.repositories.order_repo import OrderRepository
from app.services.ops_scope_service import (
    DashboardScope,
    build_appointment_pincode_exists_sql,
    get_doctor_id,
)


def _apply_enquiry_date_filters(stmt, *, date_from: datetime | None, date_to: datetime | None):
    if date_from:
        stmt = stmt.where(Enquiry.enquiry_at >= date_from)
    if date_to:
        stmt = stmt.where(Enquiry.enquiry_at <= date_to)
    return stmt


def _apply_enquiry_scope(stmt, scope: DashboardScope | None):
    if scope is None or scope.unrestricted:
        return stmt
    if not scope.pincodes and not scope.city_names:
        return stmt.where(Enquiry.id.is_(None))

    parts: list[str] = []
    bind_params: dict = {}
    if scope.pincodes:
        parts.append(
            """
            EXISTS (
              SELECT 1 FROM clinical.patient_addresses pa
              WHERE pa.patient_id = operations.enquiries.patient_id
                AND pa.is_default = true
                AND pa.pincode = ANY(:scope_pincodes)
            )
            """
        )
        bind_params["scope_pincodes"] = scope.pincodes
    if scope.city_names:
        parts.append(
            """
            (
              operations.enquiries.patient_id IS NULL
              AND operations.enquiries.city IS NOT NULL
              AND lower(operations.enquiries.city) = ANY(:scope_city_names)
            )
            """
        )
        bind_params["scope_city_names"] = [name.lower() for name in scope.city_names]
    return stmt.where(text("(" + " OR ".join(parts) + ")").bindparams(**bind_params))


class DashboardService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.order_repo = OrderRepository(session)

    async def get_summary(self, filters: dict | None = None, scope: DashboardScope | None = None) -> dict:
        filters = filters or {}
        date_from = filters.get("dateFrom")
        date_to = filters.get("dateTo")
        package_id = filters.get("packageId")
        orders = await self.order_repo.dashboard_orders(
            package_id=package_id,
            order_status=filters.get("orderStatus"),
            payment_status=filters.get("paymentStatus"),
            technician_id=filters.get("technicianId"),
            doctor_id=filters.get("doctorId"),
            partner_lab_id=filters.get("partnerLabId"),
            date_from=date_from,
            date_to=date_to,
            scope=scope,
        )

        enquiry_stmt = select(Enquiry).where(Enquiry.deleted_at.is_(None))
        enquiry_stmt = _apply_enquiry_date_filters(enquiry_stmt, date_from=date_from, date_to=date_to)
        enquiry_stmt = _apply_enquiry_scope(enquiry_stmt, scope)
        enquiry_result = await self.session.execute(enquiry_stmt)
        enquiries = list(enquiry_result.scalars().all())

        scan_completed_statuses = {
            "scan_completed",
            "pathology_pending",
            "lab_report_uploaded",
            "ai_extraction_pending",
            "ai_extraction_completed",
            "report_review_pending",
            "final_report_generated",
            "doctor_assignment_pending",
            "doctor_assigned",
            "consultation_pending",
            "prescription_pending",
            "prescription_generated",
            "completed",
        }

        paid_orders = [order for order in orders if order.payment_status == "success"]
        revenue_total = sum(float(order.final_amount) for order in paid_orders)
        today = datetime.now(UTC).date()
        revenue_today = sum(
            float(order.final_amount)
            for order in paid_orders
            if order.updated_at and order.updated_at.date() == today
        )
        month_start = today.replace(day=1)
        revenue_month = sum(
            float(order.final_amount)
            for order in paid_orders
            if order.updated_at and order.updated_at.date() >= month_start
        )

        packages_result = await self.session.execute(
            select(LiverCarePackage).where(LiverCarePackage.deleted_at.is_(None))
        )
        packages = list(packages_result.scalars().all())

        package_sales = []
        for pkg in packages:
            pkg_orders = [order for order in orders if order.package_id == pkg.id]
            package_sales.append(
                {
                    "packageId": pkg.id,
                    "packageCode": pkg.code,
                    "packageName": pkg.name,
                    "orderCount": len(pkg_orders),
                    "revenue": sum(float(order.final_amount) for order in pkg_orders if order.payment_status == "success"),
                }
            )

        status_counts: dict[str, int] = {}
        for order in orders:
            status_counts[order.order_status] = status_counts.get(order.order_status, 0) + 1

        return {
            "enquiries": {
                "total": len(enquiries),
                "new": sum(1 for row in enquiries if row.status == "new"),
                "converted": sum(1 for row in enquiries if row.status == "converted"),
            },
            "orders": {
                "total": len(orders),
                "paymentPending": sum(1 for order in orders if order.payment_status != "success"),
                "paymentCompleted": sum(1 for order in orders if order.payment_status == "success"),
                "scanCompleted": sum(1 for order in orders if order.order_status in scan_completed_statuses),
                "labPending": sum(1 for order in orders if order.order_status == "pathology_pending"),
                "reportPending": sum(1 for order in orders if order.order_status in {"report_review_pending", "final_report_generated"}),
                "consultationPending": sum(
                    1
                    for order in orders
                    if order.order_status in {"doctor_assignment_pending", "doctor_assigned", "consultation_pending"}
                ),
                "prescriptionPending": sum(1 for order in orders if order.order_status == "prescription_pending"),
            },
            "revenue": {
                "total": revenue_total,
                "today": revenue_today,
                "month": revenue_month,
            },
            "packageSales": package_sales,
            "ordersByStatus": [{"status": status, "count": count} for status, count in sorted(status_counts.items())],
        }

    async def get_operations_overview(self, scope: DashboardScope | None = None) -> dict:
        appt_scope_sql = ""
        params: dict = {}
        if scope and scope.is_scoped() and scope.pincodes:
            appt_scope_sql = f" AND {build_appointment_pincode_exists_sql()}"
            params["scope_pincodes"] = scope.pincodes

        appointments_today = await self._scalar(
            f"""
            SELECT COUNT(*) FROM operations.appointments
            WHERE scheduled_start >= date_trunc('day', now())
              AND scheduled_start < date_trunc('day', now()) + interval '1 day'
              AND status NOT IN ('cancelled_by_patient', 'cancelled_by_admin', 'cancelled_by_doctor')
              {appt_scope_sql}
            """,
            params,
        )
        missed_today = await self._scalar(
            f"""
            SELECT COUNT(*) FROM operations.appointments
            WHERE scheduled_start >= date_trunc('day', now())
              AND scheduled_start < date_trunc('day', now()) + interval '1 day'
              AND status = 'missed'
              {appt_scope_sql}
            """,
            params,
        )
        return {
            "appointmentsToday": appointments_today,
            "pendingAssignments": await self.order_repo.count_pending_assignments(scope),
            "missedToday": missed_today,
            "samplesPendingAssign": await self.order_repo.count_samples_pending(scope),
            "unpaidOrders": await self.order_repo.count_unpaid_orders(scope),
            "collectedToday": float(await self.order_repo.sum_collected_today(scope)),
        }

    async def get_clinical_overview(
        self,
        *,
        user_id=None,
        roles: list[str] | None = None,
        active_role: str | None = None,
        scope: DashboardScope | None = None,
    ) -> dict:
        effective = [active_role] if active_role else list(roles or [])
        role_set = set(effective or roles or [])
        is_doctor = "doctor" in role_set and "admin" not in role_set and "city_manager" not in role_set
        doctor_id = await get_doctor_id(self.session, user_id) if is_doctor and user_id else None

        patient_scope_sql = ""
        appt_scope_sql = ""
        order_scope_sql = ""
        high_risk_scope_sql = ""
        city_chart_sql = ""
        params: dict = {}

        if scope and scope.is_scoped() and scope.pincodes:
            params["scope_pincodes"] = scope.pincodes
            patient_scope_sql = """
              AND EXISTS (
                SELECT 1 FROM clinical.patient_addresses pa
                WHERE pa.patient_id = clinical.patients.id
                  AND pa.is_default = true
                  AND pa.pincode = ANY(:scope_pincodes)
              )
            """
            appt_scope_sql = f" AND {build_appointment_pincode_exists_sql()}"
            order_scope_sql = """
              AND EXISTS (
                SELECT 1 FROM clinical.patient_addresses pa
                WHERE pa.patient_id = commerce.service_orders.patient_id
                  AND pa.is_default = true
                  AND pa.pincode = ANY(:scope_pincodes)
              )
            """
            high_risk_scope_sql = """
              AND EXISTS (
                SELECT 1 FROM clinical.patient_addresses pa
                WHERE pa.patient_id = clinical.patient_dashboard_summary.patient_id
                  AND pa.is_default = true
                  AND pa.pincode = ANY(:scope_pincodes)
              )
            """
            city_chart_sql = """
              AND EXISTS (
                SELECT 1 FROM clinical.patient_addresses pa
                WHERE pa.patient_id = p.id
                  AND pa.is_default = true
                  AND pa.pincode = ANY(:scope_pincodes)
              )
            """

        if is_doctor and doctor_id:
            params["doctor_id"] = doctor_id
            active_patients = await self._scalar(
                """
                SELECT COUNT(*)::int FROM clinical.doctor_patient_assignments
                WHERE doctor_id = :doctor_id AND status = 'active'
                """,
                params,
            )
            visits_today = await self._scalar(
                """
                SELECT COUNT(*)::int FROM operations.appointments a
                JOIN clinical.doctor_patient_assignments dpa
                  ON dpa.patient_id = a.patient_id AND dpa.doctor_id = :doctor_id
                WHERE a.scheduled_start >= date_trunc('day', now())
                  AND a.scheduled_start < date_trunc('day', now()) + interval '1 day'
                  AND a.status NOT IN ('cancelled_by_patient', 'cancelled_by_admin', 'cancelled_by_doctor')
                  AND dpa.status = 'active'
                """,
                params,
            )
            pending_prescriptions = await self._scalar(
                """
                SELECT COUNT(*)::int FROM commerce.service_orders o
                WHERE o.deleted_at IS NULL
                  AND o.order_status = 'prescription_pending'
                  AND o.doctor_id = :doctor_id
                """,
                params,
            )
            high_risk_patients = await self._scalar(
                """
                SELECT COUNT(*)::int FROM clinical.doctor_patient_summary
                WHERE doctor_id = :doctor_id
                  AND risk_score >= 70
                """,
                params,
            )
            city_rows = []
        else:
            active_patients = await self._scalar(
                f"""
                SELECT COUNT(*)::int FROM clinical.patients
                WHERE status = 'active'
                {patient_scope_sql}
                """,
                params,
            )
            visits_today = await self._scalar(
                f"""
                SELECT COUNT(*)::int FROM operations.appointments
                WHERE scheduled_start >= date_trunc('day', now())
                  AND scheduled_start < date_trunc('day', now()) + interval '1 day'
                  AND status NOT IN ('cancelled_by_patient', 'cancelled_by_admin', 'cancelled_by_doctor')
                  {appt_scope_sql}
                """,
                params,
            )
            pending_prescriptions = await self._scalar(
                f"""
                SELECT COUNT(*)::int FROM commerce.service_orders
                WHERE deleted_at IS NULL
                  AND order_status = 'prescription_pending'
                  {order_scope_sql}
                """,
                params,
            )
            high_risk_patients = await self._scalar(
                f"""
                SELECT COUNT(*)::int FROM clinical.patient_dashboard_summary
                WHERE risk_score >= 70 OR latest_fibroscan_kpa >= 12
                {high_risk_scope_sql}
                """,
                params,
            )
            city_rows = await self._rows(
                f"""
                SELECT COALESCE(c.name, 'Unknown') AS city_name, COUNT(p.id)::int AS patients
                FROM clinical.patients p
                LEFT JOIN core.cities c ON c.id = p.city_id
                WHERE p.status = 'active'
                {city_chart_sql}
                GROUP BY c.name
                ORDER BY patients DESC
                LIMIT 8
                """,
                params,
            )

        trend_rows = await self._rows(
            """
            SELECT
              date_trunc('month', snapshot_date)::date AS snapshot_date,
              ROUND(AVG(bmi)::numeric, 1) AS avg_bmi,
              ROUND(AVG(sgpt)::numeric, 1) AS avg_alt,
              ROUND(AVG(fibroscan_kpa)::numeric, 1) AS avg_liver_fibrosis_scan
            FROM clinical.health_metric_daily_snapshots
            WHERE snapshot_date >= (CURRENT_DATE - interval '12 months')
            GROUP BY date_trunc('month', snapshot_date)
            ORDER BY snapshot_date DESC
            LIMIT 12
            """
        )
        trend_rows = list(reversed(trend_rows))

        if is_doctor and doctor_id:
            city_rows = []

        return {
            "stats": {
                "activePatients": active_patients,
                "visitsToday": visits_today,
                "pendingPrescriptions": pending_prescriptions,
                "highRiskPatients": high_risk_patients,
            },
            "charts": {
                "patientsByCity": [
                    {"city_name": row["city_name"], "patients": row["patients"]}
                    for row in city_rows
                ],
                "clinicTrends": [
                    {
                        "snapshot_date": row["snapshot_date"].isoformat()
                        if hasattr(row["snapshot_date"], "isoformat")
                        else str(row["snapshot_date"]),
                        "avg_bmi": float(row["avg_bmi"]) if row.get("avg_bmi") is not None else None,
                        "avg_alt": float(row["avg_alt"]) if row.get("avg_alt") is not None else None,
                        "avg_liver_fibrosis_scan": (
                            float(row["avg_liver_fibrosis_scan"])
                            if row.get("avg_liver_fibrosis_scan") is not None
                            else None
                        ),
                    }
                    for row in trend_rows
                ],
            },
        }

    async def _rows(self, query: str, params: dict | None = None) -> list[dict]:
        try:
            result = await self.session.execute(text(query), params or {})
            return [dict(row) for row in result.mappings().all()]
        except Exception:
            return []

    async def _scalar(self, query: str, params: dict | None = None) -> int:
        try:
            result = await self.session.execute(text(query), params or {})
            return int(result.scalar_one())
        except Exception:
            return 0
