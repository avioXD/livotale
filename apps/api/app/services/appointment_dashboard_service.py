from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.ops_scope_service import DashboardScope, build_appointment_pincode_exists_sql

_ADMIN_APPOINTMENT_SELECT = """
  SELECT a.id,
         a.appointment_code,
         at.code AS type_code,
         at.name AS type_name,
         a.visit_mode,
         a.status,
         a.scheduled_start,
         a.scheduled_end,
         a.patient_id,
         pu.full_name AS patient_name,
         p.patient_code,
         a.doctor_id,
         du.full_name AS doctor_name,
         a.technician_id,
         tu.full_name AS technician_name,
         a.payment_status,
         a.payment_amount,
         pa.line1,
         pa.pincode,
         c.name AS city_name,
         a.tele_meeting_url,
         a.chief_complaint,
         a.symptoms,
         a.patient_notes
  FROM operations.appointments a
  JOIN operations.appointment_types at ON at.id = a.appointment_type_id
  JOIN clinical.patients p ON p.id = a.patient_id
  JOIN identity.users pu ON pu.id = p.user_id
  LEFT JOIN clinical.doctors d ON d.id = a.doctor_id
  LEFT JOIN identity.users du ON du.id = d.user_id
  LEFT JOIN operations.technicians t ON t.id = a.technician_id
  LEFT JOIN identity.users tu ON tu.id = t.user_id
  LEFT JOIN clinical.patient_addresses pa ON pa.id = a.address_id
  LEFT JOIN core.cities c ON c.id = pa.city_id
"""


def _map_admin_appointment(row: dict[str, Any]) -> dict[str, Any]:
    scheduled_start = row.get("scheduled_start")
    scheduled_end = row.get("scheduled_end")
    return {
        "id": str(row["id"]),
        "appointmentCode": row["appointment_code"],
        "typeCode": row["type_code"],
        "typeName": row["type_name"],
        "visitMode": row["visit_mode"],
        "status": row["status"],
        "scheduledStart": scheduled_start.isoformat() if hasattr(scheduled_start, "isoformat") else scheduled_start,
        "scheduledEnd": scheduled_end.isoformat() if hasattr(scheduled_end, "isoformat") else scheduled_end,
        "patientId": str(row["patient_id"]),
        "patientName": row["patient_name"],
        "patientCode": row.get("patient_code"),
        "doctorId": str(row["doctor_id"]) if row.get("doctor_id") else None,
        "doctorName": row.get("doctor_name"),
        "technicianId": str(row["technician_id"]) if row.get("technician_id") else None,
        "technicianName": row.get("technician_name"),
        "paymentStatus": row.get("payment_status"),
        "paymentAmount": float(row["payment_amount"]) if row.get("payment_amount") is not None else None,
        "line1": row.get("line1"),
        "pincode": row.get("pincode"),
        "cityName": row.get("city_name"),
        "teleMeetingUrl": row.get("tele_meeting_url"),
        "chiefComplaint": row.get("chief_complaint"),
        "symptoms": row.get("symptoms"),
        "patientNotes": row.get("patient_notes"),
    }


def _scope_clause(scope: DashboardScope | None, *, appointment_alias: str = "operations.appointments") -> tuple[str, dict[str, Any]]:
    if scope and scope.is_scoped() and scope.pincodes:
        return (
            f" AND {build_appointment_pincode_exists_sql(appointment_alias=appointment_alias)}",
            {"scope_pincodes": scope.pincodes},
        )
    return "", {}


class AppointmentDashboardService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_dashboard(self, scope: DashboardScope | None = None) -> dict[str, Any]:
        scope_sql, params = _scope_clause(scope, appointment_alias="a")
        kpi_result = await self.session.execute(
            text(
                f"""
                SELECT
                  COUNT(*) FILTER (WHERE scheduled_start::date = CURRENT_DATE)::int AS today_total,
                  COUNT(*) FILTER (
                    WHERE scheduled_start::date = CURRENT_DATE
                      AND status IN ('completed','closed','prescription_approved')
                  )::int AS completed_today,
                  COUNT(*) FILTER (
                    WHERE scheduled_start::date = CURRENT_DATE
                      AND status IN ('cancelled_by_patient','cancelled_by_admin','cancelled_by_doctor')
                  )::int AS cancelled_today,
                  COUNT(*) FILTER (
                    WHERE scheduled_start::date = CURRENT_DATE
                      AND status IN ('no_show','missed')
                  )::int AS missed_today,
                  COUNT(*) FILTER (
                    WHERE status IN ('booked','confirmed','pending_payment')
                      AND scheduled_start >= now()
                      AND (
                        (at.requires_doctor = true AND a.doctor_id IS NULL)
                        OR (at.requires_technician = true AND a.technician_id IS NULL AND a.visit_mode = 'home')
                      )
                  )::int AS pending_assignments,
                  COUNT(*) FILTER (
                    WHERE a.visit_mode = 'home'
                      AND a.status IN ('technician_assigned','technician_on_the_way','patient_confirmed','reminder_sent')
                      AND a.scheduled_start < now() - interval '20 minutes'
                  )::int AS delayed_technicians
                FROM operations.appointments a
                JOIN operations.appointment_types at ON at.id = a.appointment_type_id
                WHERE 1=1{scope_sql}
                """
            ),
            params,
        )
        kpis = dict(kpi_result.mappings().first() or {})

        upcoming_scope_sql, upcoming_params = _scope_clause(scope, appointment_alias="a")
        upcoming_result = await self.session.execute(
            text(
                f"""
                {_ADMIN_APPOINTMENT_SELECT}
                WHERE a.scheduled_start >= now() - interval '1 day'
                  AND a.status NOT IN (
                    'cancelled_by_patient','cancelled_by_admin','cancelled_by_doctor','completed','closed'
                  )
                  {upcoming_scope_sql}
                ORDER BY a.scheduled_start ASC
                LIMIT 20
                """
            ),
            upcoming_params,
        )
        upcoming = [_map_admin_appointment(dict(row)) for row in upcoming_result.mappings().all()]
        return {"kpis": kpis, "upcoming": upcoming}

    async def get_analytics(self, scope: DashboardScope | None = None) -> dict[str, Any]:
        scope_sql, params = _scope_clause(scope, appointment_alias="a")
        appt_from = f"FROM operations.appointments a WHERE a.scheduled_start >= CURRENT_DATE - INTERVAL '30 days'{scope_sql}"

        by_type = await self.session.execute(
            text(
                f"""
                SELECT at.code AS type_code, at.name AS type_name, COUNT(*)::int AS total
                FROM operations.appointments a
                JOIN operations.appointment_types at ON at.id = a.appointment_type_id
                WHERE a.scheduled_start >= CURRENT_DATE - INTERVAL '30 days'{scope_sql}
                GROUP BY at.code, at.name
                ORDER BY total DESC
                """
            ),
            params,
        )
        by_status = await self.session.execute(
            text(
                f"""
                SELECT a.status, COUNT(*)::int AS total
                {appt_from}
                GROUP BY a.status
                ORDER BY total DESC
                """
            ),
            params,
        )
        daily_volume = await self.session.execute(
            text(
                f"""
                SELECT a.scheduled_start::date AS day, COUNT(*)::int AS total
                {appt_from}
                GROUP BY a.scheduled_start::date
                ORDER BY day ASC
                """
            ),
            params,
        )
        completion = await self.session.execute(
            text(
                f"""
                SELECT
                  COUNT(*) FILTER (
                    WHERE a.status IN ('completed','closed','prescription_approved')
                  )::int AS completed,
                  COUNT(*)::int AS total
                {appt_from}
                """
            ),
            params,
        )
        completion_row = completion.mappings().first() or {}
        completed = int(completion_row.get("completed") or 0)
        total = int(completion_row.get("total") or 0)
        return {
            "byType": [dict(row) for row in by_type.mappings().all()],
            "byStatus": [dict(row) for row in by_status.mappings().all()],
            "dailyVolume": [
                {
                    "day": row["day"].isoformat() if hasattr(row["day"], "isoformat") else str(row["day"]),
                    "total": row["total"],
                }
                for row in daily_volume.mappings().all()
            ],
            "completionRate": round((completed / total) * 1000) / 10 if total else 0,
        }
