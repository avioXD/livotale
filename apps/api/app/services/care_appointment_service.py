from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.services.workflow_notifications import WorkflowNotificationService

CARE_TYPE_CODES = ("dietician_consultation", "health_coach_follow_up")


def _map_care_appointment(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "appointmentCode": row["appointment_code"],
        "typeCode": row["type_code"],
        "typeName": row["type_name"],
        "visitMode": row["visit_mode"],
        "status": row["status"],
        "scheduledStart": row["scheduled_start"].isoformat() if row["scheduled_start"] else None,
        "scheduledEnd": row["scheduled_end"].isoformat() if row.get("scheduled_end") else None,
        "patientId": row["patient_id"],
        "patientName": row["patient_name"],
        "patientCode": row["patient_code"],
        "chiefComplaint": row.get("chief_complaint"),
        "patientNotes": row.get("patient_notes"),
    }


class CareAppointmentService:
    CARE_SELECT = """
        SELECT a.*,
               at.code AS type_code,
               at.name AS type_name,
               pu.full_name AS patient_name,
               p.patient_code,
               a.chief_complaint,
               a.patient_notes
        FROM operations.appointments a
        JOIN operations.appointment_types at ON at.id = a.appointment_type_id
        JOIN clinical.patients p ON p.id = a.patient_id
        JOIN identity.users pu ON pu.id = p.user_id
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.notifications = WorkflowNotificationService(db)

    async def resolve_care_team_member_id(self, user_id: UUID) -> UUID:
        result = await self.db.execute(
            text(
                """
                SELECT id
                FROM care.care_team_members
                WHERE user_id = :user_id AND status = 'active'
                ORDER BY created_at DESC
                LIMIT 1
                """
            ),
            {"user_id": user_id},
        )
        row = result.first()
        if not row:
            raise AppError("Care team member not found", status_code=403, error="forbidden")
        return row[0]

    async def _assert_care_access(self, care_team_member_id: UUID, appointment_id: UUID) -> dict[str, Any]:
        result = await self.db.execute(
            text(
                f"""
                {self.CARE_SELECT}
                WHERE a.id = :appointment_id
                  AND (
                    a.care_team_member_id = :care_team_member_id
                    OR (
                      at.code = ANY(:care_type_codes)
                      AND EXISTS (
                        SELECT 1 FROM care.care_team_assignments cta
                        WHERE cta.patient_id = a.patient_id
                          AND cta.care_team_member_id = :care_team_member_id
                          AND cta.status = 'active'
                          AND cta.ended_at IS NULL
                      )
                    )
                  )
                """
            ),
            {
                "appointment_id": appointment_id,
                "care_team_member_id": care_team_member_id,
                "care_type_codes": list(CARE_TYPE_CODES),
            },
        )
        row = result.mappings().first()
        if not row:
            raise AppError("Appointment not found for care team member", status_code=404, error="not_found")
        return dict(row)

    async def list_appointments(
        self,
        care_team_member_id: UUID,
        *,
        filter: str = "upcoming",
    ) -> list[dict[str, Any]]:
        if filter == "completed":
            time_filter = "a.status IN ('completed','closed')"
        elif filter == "today":
            time_filter = "a.scheduled_start::date = CURRENT_DATE"
        else:
            time_filter = "a.scheduled_start >= now() - interval '1 day'"

        result = await self.db.execute(
            text(
                f"""
                {self.CARE_SELECT}
                WHERE ({time_filter})
                  AND a.status NOT IN (
                    'cancelled_by_patient','cancelled_by_admin','cancelled_by_doctor'
                  )
                  AND (
                    a.care_team_member_id = :care_team_member_id
                    OR (
                      at.code = ANY(:care_type_codes)
                      AND EXISTS (
                        SELECT 1 FROM care.care_team_assignments cta
                        WHERE cta.patient_id = a.patient_id
                          AND cta.care_team_member_id = :care_team_member_id
                          AND cta.status = 'active'
                          AND cta.ended_at IS NULL
                      )
                    )
                  )
                ORDER BY a.scheduled_start ASC
                LIMIT 100
                """
            ),
            {
                "care_team_member_id": care_team_member_id,
                "care_type_codes": list(CARE_TYPE_CODES),
            },
        )
        return [_map_care_appointment(dict(row)) for row in result.mappings()]

    async def get_appointment(self, care_team_member_id: UUID, appointment_id: UUID) -> dict[str, Any]:
        row = await self._assert_care_access(care_team_member_id, appointment_id)
        notes_result = await self.db.execute(
            text(
                """
                SELECT n.id, n.note, n.created_at, u.full_name AS author_name
                FROM operations.appointment_internal_notes n
                LEFT JOIN identity.users u ON u.id = n.author_id
                WHERE n.appointment_id = :appointment_id
                ORDER BY n.created_at DESC
                """
            ),
            {"appointment_id": appointment_id},
        )
        session_notes = [
            {
                "id": note["id"],
                "note": note["note"],
                "createdAt": note["created_at"].isoformat() if note["created_at"] else None,
                "authorName": note["author_name"],
            }
            for note in notes_result.mappings()
        ]
        return {**_map_care_appointment(row), "sessionNotes": session_notes, "timeline": []}

    async def add_session_note(
        self,
        care_team_member_id: UUID,
        user_id: UUID,
        appointment_id: UUID,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        note = (payload.get("note") or "").strip()
        if not note:
            raise AppError("note is required", status_code=400)

        appt = await self._assert_care_access(care_team_member_id, appointment_id)
        inserted = await self.db.execute(
            text(
                """
                INSERT INTO operations.appointment_internal_notes(appointment_id, author_id, note)
                VALUES (:appointment_id, :author_id, :note)
                RETURNING id, note, created_at
                """
            ),
            {"appointment_id": appointment_id, "author_id": user_id, "note": note},
        )
        row = inserted.mappings().first()
        assert row is not None

        if payload.get("visibleToPatient"):
            await self.db.execute(
                text(
                    """
                    INSERT INTO care.care_notes(patient_id, author_user_id, note_type, note, visible_to_patient)
                    VALUES (:patient_id, :author_user_id, 'coach', :note, true)
                    """
                ),
                {"patient_id": appt["patient_id"], "author_user_id": user_id, "note": note},
            )

        await self.db.flush()
        return {
            "id": row["id"],
            "note": row["note"],
            "createdAt": row["created_at"].isoformat() if row["created_at"] else None,
        }

    async def recommend_follow_up(
        self,
        care_team_member_id: UUID,
        user_id: UUID,
        appointment_id: UUID,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        reason = (payload.get("reason") or "").strip()
        if not reason:
            raise AppError("reason is required", status_code=400)

        appt = await self._assert_care_access(care_team_member_id, appointment_id)
        from_status = appt["status"]

        await self.db.execute(
            text(
                """
                UPDATE operations.appointments
                SET status = 'follow_up_required', updated_at = now()
                WHERE id = :appointment_id
                """
            ),
            {"appointment_id": appointment_id},
        )
        await self.db.execute(
            text(
                """
                INSERT INTO operations.appointment_status_history(
                  appointment_id, from_status, to_status, changed_by, actor_role, reason, notes
                ) VALUES (
                  :appointment_id, :from_status, 'follow_up_required', :changed_by, 'care_team', :reason, :notes
                )
                """
            ),
            {
                "appointment_id": appointment_id,
                "from_status": from_status,
                "changed_by": user_id,
                "reason": reason,
                "notes": payload.get("notes"),
            },
        )

        follow_up_days = int(payload.get("followUpDays") or 14)
        task_result = await self.db.execute(
            text(
                """
                INSERT INTO care.care_tasks(
                  patient_id, assigned_to, task_type, due_date, status, notes
                ) VALUES (
                  :patient_id,
                  (SELECT user_id FROM care.care_team_members WHERE id = :care_team_member_id),
                  'monthly_followup',
                  CURRENT_DATE + (:follow_up_days * interval '1 day'),
                  'pending',
                  :notes
                )
                RETURNING assigned_to, due_date, task_type
                """
            ),
            {
                "patient_id": appt["patient_id"],
                "care_team_member_id": care_team_member_id,
                "follow_up_days": follow_up_days,
                "notes": reason,
            },
        )
        task_row = task_result.mappings().first()

        if task_row and task_row["assigned_to"]:
            due_date = task_row["due_date"]
            await self.notifications.emit(
                "care_task_assigned",
                context={
                    "patientName": appt["patient_name"],
                    "dueDate": due_date.isoformat() if isinstance(due_date, date) else str(due_date),
                    "taskType": task_row["task_type"],
                    "notes": reason,
                },
                target_user_ids=[task_row["assigned_to"]],
            )

        await self.db.flush()
        return await self.get_appointment(care_team_member_id, appointment_id)
