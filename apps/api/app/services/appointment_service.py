from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError


class AppointmentService:
    """Legacy appointment list/book stubs over operations.appointments."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_appointments(
        self,
        *,
        patient_id: UUID | None = None,
        doctor_id: UUID | None = None,
        technician_id: UUID | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        clauses = ["1=1"]
        params: dict[str, Any] = {"limit": limit}
        if patient_id:
            clauses.append("a.patient_id = :patient_id")
            params["patient_id"] = patient_id
        if doctor_id:
            clauses.append("a.doctor_id = :doctor_id")
            params["doctor_id"] = doctor_id
        if technician_id:
            clauses.append("a.technician_id = :technician_id")
            params["technician_id"] = technician_id

        where = " AND ".join(clauses)
        result = await self.db.execute(
            text(
                f"""
                SELECT
                  a.id,
                  a.appointment_code,
                  a.patient_id,
                  pu.full_name AS patient_name,
                  a.appointment_type_id,
                  at.code AS appointment_type_code,
                  at.name AS appointment_type_name,
                  a.visit_mode::text AS visit_mode,
                  a.status::text AS status,
                  a.scheduled_start,
                  a.scheduled_end,
                  a.doctor_id,
                  du.full_name AS doctor_name,
                  a.technician_id,
                  a.payment_status::text AS payment_status,
                  a.payment_amount,
                  a.created_at,
                  a.updated_at
                FROM operations.appointments a
                JOIN operations.appointment_types at ON at.id = a.appointment_type_id
                JOIN clinical.patients p ON p.id = a.patient_id
                JOIN identity.users pu ON pu.id = p.user_id
                LEFT JOIN clinical.doctors d ON d.id = a.doctor_id
                LEFT JOIN identity.users du ON du.id = d.user_id
                WHERE {where}
                ORDER BY a.updated_at DESC, a.created_at DESC
                LIMIT :limit
                """
            ),
            params,
        )
        return [self._summary_row(dict(row)) for row in result.mappings().all()]

    async def get_appointment(self, appointment_id: UUID) -> dict[str, Any] | None:
        result = await self.db.execute(
            text(
                """
                SELECT
                  a.id,
                  a.appointment_code,
                  a.patient_id,
                  pu.full_name AS patient_name,
                  a.appointment_type_id,
                  at.code AS appointment_type_code,
                  at.name AS appointment_type_name,
                  a.visit_mode::text AS visit_mode,
                  a.status::text AS status,
                  a.scheduled_start,
                  a.scheduled_end,
                  a.doctor_id,
                  du.full_name AS doctor_name,
                  a.technician_id,
                  a.payment_status::text AS payment_status,
                  a.payment_amount,
                  a.chief_complaint,
                  a.symptoms,
                  a.patient_notes,
                  a.tele_meeting_url,
                  a.created_at,
                  a.updated_at
                FROM operations.appointments a
                JOIN operations.appointment_types at ON at.id = a.appointment_type_id
                JOIN clinical.patients p ON p.id = a.patient_id
                JOIN identity.users pu ON pu.id = p.user_id
                LEFT JOIN clinical.doctors d ON d.id = a.doctor_id
                LEFT JOIN identity.users du ON du.id = d.user_id
                WHERE a.id = :appointment_id
                LIMIT 1
                """
            ),
            {"appointment_id": appointment_id},
        )
        row = result.mappings().first()
        if not row:
            return None
        summary = self._summary_row(dict(row))
        summary.update(
            {
                "chiefComplaint": row["chief_complaint"],
                "symptoms": row["symptoms"],
                "patientNotes": row["patient_notes"],
                "teleMeetingUrl": row["tele_meeting_url"],
            }
        )
        return summary

    async def book_appointment(self, payload: dict[str, Any], created_by: UUID | None = None) -> dict[str, Any]:
        type_code = payload.get("typeCode") or payload.get("appointmentTypeCode")
        if not type_code:
            raise AppError("appointment type code is required")

        type_row = await self.db.execute(
            text("SELECT id, duration_minutes, base_price FROM operations.appointment_types WHERE code = :code"),
            {"code": type_code},
        )
        appt_type = type_row.mappings().first()
        if not appt_type:
            raise AppError(f"Unknown appointment type: {type_code}", status_code=404)

        scheduled_start = payload.get("scheduledStart") or payload.get("scheduled_start")
        if not scheduled_start:
            raise AppError("scheduledStart is required")

        if isinstance(scheduled_start, str):
            scheduled_start = datetime.fromisoformat(scheduled_start.replace("Z", "+00:00"))

        duration = int(appt_type["duration_minutes"])
        scheduled_end = payload.get("scheduledEnd") or payload.get("scheduled_end")
        if not scheduled_end:
            from datetime import timedelta

            scheduled_end = scheduled_start + timedelta(minutes=duration)
        elif isinstance(scheduled_end, str):
            scheduled_end = datetime.fromisoformat(scheduled_end.replace("Z", "+00:00"))

        result = await self.db.execute(
            text(
                """
                INSERT INTO operations.appointments (
                  appointment_code,
                  patient_id,
                  appointment_type_id,
                  visit_mode,
                  status,
                  scheduled_start,
                  scheduled_end,
                  doctor_id,
                  technician_id,
                  payment_status,
                  payment_amount,
                  chief_complaint,
                  patient_notes,
                  created_by
                )
                VALUES (
                  'APT-' || lpad(nextval('operations.appointment_code_seq')::text, 6, '0'),
                  :patient_id,
                  :appointment_type_id,
                  COALESCE(:visit_mode, 'home')::operations.appointment_visit_mode_enum,
                  'booked'::operations.appointment_status_enum,
                  :scheduled_start,
                  :scheduled_end,
                  :doctor_id,
                  :technician_id,
                  'unpaid'::operations.appointment_payment_status_enum,
                  :payment_amount,
                  :chief_complaint,
                  :patient_notes,
                  :created_by
                )
                RETURNING id
                """
            ),
            {
                "patient_id": payload["patientId"],
                "appointment_type_id": appt_type["id"],
                "visit_mode": payload.get("visitMode") or "home",
                "scheduled_start": scheduled_start,
                "scheduled_end": scheduled_end,
                "doctor_id": payload.get("doctorId"),
                "technician_id": payload.get("technicianId"),
                "payment_amount": appt_type["base_price"],
                "chief_complaint": payload.get("chiefComplaint"),
                "patient_notes": payload.get("patientNotes"),
                "created_by": created_by,
            },
        )
        appointment_id = result.mappings().first()["id"]
        detail = await self.get_appointment(appointment_id)
        if not detail:
            raise AppError("Failed to create appointment")
        return detail

    async def list_appointment_types(self) -> list[dict[str, Any]]:
        result = await self.db.execute(
            text(
                """
                SELECT code, name, duration_minutes, base_price, allows_home, allows_clinic, allows_tele
                FROM operations.appointment_types
                WHERE is_active = true
                ORDER BY name ASC
                """
            )
        )
        return [
            {
                "code": row["code"],
                "name": row["name"],
                "durationMinutes": row["duration_minutes"],
                "basePrice": row["base_price"],
                "allowsHome": row["allows_home"],
                "allowsClinic": row["allows_clinic"],
                "allowsTele": row["allows_tele"],
            }
            for row in result.mappings().all()
        ]

    @staticmethod
    def _summary_row(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row["id"],
            "appointmentCode": row["appointment_code"],
            "patientId": row["patient_id"],
            "patientName": row["patient_name"],
            "appointmentTypeId": row["appointment_type_id"],
            "appointmentTypeCode": row["appointment_type_code"],
            "appointmentTypeName": row["appointment_type_name"],
            "visitMode": row["visit_mode"],
            "status": row["status"],
            "scheduledStart": row["scheduled_start"],
            "scheduledEnd": row["scheduled_end"],
            "doctorId": row["doctor_id"],
            "doctorName": row["doctor_name"],
            "technicianId": row["technician_id"],
            "paymentStatus": row["payment_status"],
            "paymentAmount": row["payment_amount"],
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
        }
