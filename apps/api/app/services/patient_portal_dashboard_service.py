from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.utils.phone import normalize_phone


def _map_trend_row(row: dict[str, Any]) -> dict[str, Any]:
    snapshot_date = row.get("snapshot_date")
    return {
        "patient_id": str(row["patient_id"]) if row.get("patient_id") else None,
        "snapshot_date": snapshot_date.isoformat() if hasattr(snapshot_date, "isoformat") else snapshot_date,
        "weight_kg": float(row["weight_kg"]) if row.get("weight_kg") is not None else None,
        "bmi": float(row["bmi"]) if row.get("bmi") is not None else None,
        "sgpt": float(row["sgpt"]) if row.get("sgpt") is not None else None,
        "sgot": float(row["sgot"]) if row.get("sgot") is not None else None,
        "hba1c": float(row["hba1c"]) if row.get("hba1c") is not None else None,
        "triglycerides": float(row["triglycerides"]) if row.get("triglycerides") is not None else None,
        "liverFibrosisScanKpa": float(row["fibroscan_kpa"]) if row.get("fibroscan_kpa") is not None else None,
        "cap_dbm": float(row["cap_dbm"]) if row.get("cap_dbm") is not None else None,
        "liver_score": float(row["liver_score"]) if row.get("liver_score") is not None else None,
        "compliance_score": float(row["compliance_score"]) if row.get("compliance_score") is not None else None,
    }


class PatientPortalDashboardService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def _resolve_patient_id(self, phone: str):
        normalized = normalize_phone(phone)
        if not normalized:
            raise AppError("Phone number is required", status_code=400)
        result = await self.session.execute(
            text(
                """
                SELECT pt.id
                FROM clinical.patients pt
                JOIN identity.users u ON u.id = pt.user_id
                WHERE right(regexp_replace(u.mobile, '\\D', '', 'g'), 10) = :phone
                ORDER BY pt.created_at DESC
                LIMIT 1
                """
            ),
            {"phone": normalized},
        )
        row = result.first()
        if not row:
            raise AppError("No portal access for this phone number", status_code=403, error="forbidden")
        return row[0]

    async def get_dashboard_analytics(self, phone: str) -> dict[str, Any]:
        patient_id = await self._resolve_patient_id(phone)

        dashboard = await self.session.execute(
            text("SELECT * FROM clinical.patient_dashboard_summary WHERE patient_id = :patient_id"),
            {"patient_id": patient_id},
        )
        trends = await self.session.execute(
            text(
                """
                SELECT * FROM clinical.patient_trends
                WHERE patient_id = :patient_id
                ORDER BY snapshot_date ASC
                """
            ),
            {"patient_id": patient_id},
        )
        checkins = await self.session.execute(
            text(
                """
                SELECT checkin_week_start, weight_kg, diet_compliance_percent,
                       exercise_compliance_percent, medicine_compliance_percent,
                       alcohol_intake, submitted_at
                FROM clinical.patient_checkins
                WHERE patient_id = :patient_id
                ORDER BY checkin_week_start ASC
                LIMIT 24
                """
            ),
            {"patient_id": patient_id},
        )
        visits = await self.session.execute(
            text(
                """
                SELECT COUNT(*)::int AS total,
                       COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
                FROM operations.home_visits
                WHERE patient_id = :patient_id
                """
            ),
            {"patient_id": patient_id},
        )
        prescriptions = await self.session.execute(
            text(
                """
                SELECT COUNT(*)::int AS total,
                       COUNT(*) FILTER (WHERE status = 'approved')::int AS approved
                FROM clinical.prescriptions
                WHERE patient_id = :patient_id
                """
            ),
            {"patient_id": patient_id},
        )

        row = dict(dashboard.mappings().first() or {})
        visit_stats = dict(visits.mappings().first() or {"total": 0, "completed": 0})
        rx_stats = dict(prescriptions.mappings().first() or {"total": 0, "approved": 0})

        def _num(value: Any) -> float | None:
            if value is None:
                return None
            return float(value)

        score_at = row.get("score_calculated_at")
        package_start = row.get("start_date")
        package_end = row.get("end_date")

        return {
            "kpis": {
                "liverScore": _num(row.get("liver_score")),
                "riskScore": _num(row.get("risk_score")),
                "complianceScore": _num(row.get("compliance_score")),
                "bmi": _num(row.get("bmi")),
                "weightKg": _num(row.get("current_weight_kg")),
                "heightCm": _num(row.get("height_cm")),
                "latestLiverFibrosisScanKpa": _num(row.get("latest_fibroscan_kpa")),
                "latestCapDbm": _num(row.get("latest_cap_dbm")),
                "fibrosisStage": row.get("fibrosis_stage"),
                "steatosisGrade": row.get("steatosis_grade"),
                "sgpt": _num(row.get("sgpt")),
                "sgot": _num(row.get("sgot")),
                "hba1c": _num(row.get("hba1c")),
                "triglycerides": _num(row.get("triglycerides")),
                "activePackage": row.get("active_package_name"),
                "packageStart": package_start.isoformat() if hasattr(package_start, "isoformat") else package_start,
                "packageEnd": package_end.isoformat() if hasattr(package_end, "isoformat") else package_end,
                "dietCompliance": row.get("diet_compliance_percent"),
                "exerciseCompliance": row.get("exercise_compliance_percent"),
                "medicineCompliance": row.get("medicine_compliance_percent"),
                "scoreCalculatedAt": score_at.isoformat() if hasattr(score_at, "isoformat") else score_at,
                "homeVisitsTotal": int(visit_stats.get("total") or 0),
                "homeVisitsCompleted": int(visit_stats.get("completed") or 0),
                "prescriptionsTotal": int(rx_stats.get("total") or 0),
                "prescriptionsApproved": int(rx_stats.get("approved") or 0),
            },
            "trends": [_map_trend_row(dict(r)) for r in trends.mappings().all()],
            "compliance": [
                {
                    "checkinWeekStart": (
                        c["checkin_week_start"].isoformat()
                        if hasattr(c["checkin_week_start"], "isoformat")
                        else c["checkin_week_start"]
                    ),
                    "weightKg": _num(c.get("weight_kg")),
                    "dietCompliancePercent": c.get("diet_compliance_percent"),
                    "exerciseCompliancePercent": c.get("exercise_compliance_percent"),
                    "medicineCompliancePercent": c.get("medicine_compliance_percent"),
                    "alcoholIntake": c.get("alcohol_intake") or "",
                    "submittedAt": (
                        c["submitted_at"].isoformat()
                        if hasattr(c.get("submitted_at"), "isoformat")
                        else c.get("submitted_at")
                    ),
                }
                for c in checkins.mappings().all()
            ],
        }
