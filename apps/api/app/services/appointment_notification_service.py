from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.services.notification_dispatch_service import NotificationDispatchService

REMINDER_TYPE_BY_MINUTES = {1440: "24h", 120: "2h", 15: "15m"}
TEMPLATE_BY_REMINDER = {
    "24h": "appointment_reminder_24h",
    "2h": "appointment_reminder_2h",
    "15m": "appointment_reminder_15m",
    "custom": "appointment_manual_reminder",
}

TERMINAL_STATUSES = frozenset(
    {
        "cancelled_by_patient",
        "cancelled_by_admin",
        "cancelled_by_doctor",
        "completed",
        "closed",
        "no_show",
        "missed",
    }
)


class AppointmentNotificationService:
    """FastAPI port of legacy appointment reminder dispatch."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.dispatch = NotificationDispatchService(db)

    async def send_reminder(
        self,
        appointment_id: UUID,
        *,
        reminder_type: str = "custom",
        channel: str = "in_app",
        template_code: str | None = None,
    ) -> dict[str, Any]:
        appt = await self._load_appointment(appointment_id)
        if appt["status"] in TERMINAL_STATUSES:
            raise AppError("Cannot send reminder for a terminal appointment", status_code=400)

        code = template_code or TEMPLATE_BY_REMINDER.get(reminder_type, TEMPLATE_BY_REMINDER["custom"])
        scheduled_at = appt["scheduled_start"].astimezone(UTC).strftime("%d %b %Y, %I:%M %p UTC")
        context = {
            "typeName": appt["type_name"],
            "scheduledAt": scheduled_at,
            "appointmentCode": appt["appointment_code"],
            "patientName": appt["patient_name"],
        }

        existing = await self.db.execute(
            text(
                """
                SELECT id FROM operations.appointment_reminder_logs
                WHERE appointment_id = :appointment_id AND reminder_type = :reminder_type AND channel = :channel
                """
            ),
            {"appointment_id": appointment_id, "reminder_type": reminder_type, "channel": channel},
        )
        if existing.mappings().first():
            raise AppError("Reminder already sent for this appointment/channel", status_code=409)

        await self.dispatch.dispatch(
            code,
            context=context,
            channels=[channel],
            recipient_phone=appt.get("patient_phone"),
            recipient_email=appt.get("patient_email"),
            target_roles=["PATIENT"] if channel == "in_app" else None,
        )

        log_result = await self.db.execute(
            text(
                """
                INSERT INTO operations.appointment_reminder_logs
                  (appointment_id, reminder_type, channel, recipient_user_id, template_code, status, sent_at, delivery_status)
                VALUES
                  (:appointment_id, :reminder_type, :channel, :recipient_user_id, :template_code, 'sent', now(), 'sent')
                RETURNING id, appointment_id, reminder_type, channel, template_code, status, sent_at, created_at
                """
            ),
            {
                "appointment_id": appointment_id,
                "reminder_type": reminder_type,
                "channel": channel,
                "recipient_user_id": appt["patient_user_id"],
                "template_code": code,
            },
        )
        row = dict(log_result.mappings().first())
        return {
            "id": row["id"],
            "appointmentId": row["appointment_id"],
            "reminderType": row["reminder_type"],
            "channel": row["channel"],
            "templateCode": row["template_code"],
            "status": row["status"],
            "sentAt": row["sent_at"],
            "createdAt": row["created_at"],
            "appointmentCode": appt["appointment_code"],
            "patientName": appt["patient_name"],
        }

    async def notify_staff_assigned(self, appointment_id: UUID) -> dict[str, Any]:
        return await self.send_reminder(
            appointment_id,
            reminder_type="custom",
            template_code="appointment_staff_assigned",
        )

    async def dispatch_due_reminders(self, *, window_minutes: int = 5) -> list[dict[str, Any]]:
        result = await self.db.execute(
            text(
                """
                SELECT a.id, a.scheduled_start, a.status, at.reminder_schedule
                FROM operations.appointments a
                JOIN operations.appointment_types at ON at.id = a.appointment_type_id
                WHERE a.scheduled_start > now()
                  AND a.status NOT IN (
                    'cancelled_by_patient','cancelled_by_admin','cancelled_by_doctor',
                    'completed','closed','no_show','missed'
                  )
                """
            )
        )
        dispatched: list[dict[str, Any]] = []
        now = datetime.now(UTC)
        for row in result.mappings().all():
            schedule = row["reminder_schedule"] or [1440, 120, 15]
            for minutes in schedule:
                reminder_type = REMINDER_TYPE_BY_MINUTES.get(minutes)
                if not reminder_type:
                    continue
                due_at = row["scheduled_start"] - timedelta(minutes=minutes)
                if due_at > now or due_at < now - timedelta(minutes=window_minutes):
                    continue
                sent = await self.db.execute(
                    text(
                        """
                        SELECT 1 FROM operations.appointment_reminder_logs
                        WHERE appointment_id = :appointment_id AND reminder_type = :reminder_type
                        """
                    ),
                    {"appointment_id": row["id"], "reminder_type": reminder_type},
                )
                if sent.mappings().first():
                    continue
                try:
                    log = await self.send_reminder(row["id"], reminder_type=reminder_type)
                    dispatched.append(log)
                except AppError:
                    continue
        return dispatched

    async def _load_appointment(self, appointment_id: UUID) -> dict[str, Any]:
        result = await self.db.execute(
            text(
                """
                SELECT a.id, a.appointment_code, a.status, a.scheduled_start,
                       at.name AS type_name,
                       p.user_id AS patient_user_id,
                       u.full_name AS patient_name,
                       u.mobile AS patient_phone,
                       u.email AS patient_email
                FROM operations.appointments a
                JOIN operations.appointment_types at ON at.id = a.appointment_type_id
                JOIN clinical.patients p ON p.id = a.patient_id
                JOIN identity.users u ON u.id = p.user_id
                WHERE a.id = :appointment_id
                """
            ),
            {"appointment_id": appointment_id},
        )
        row = result.mappings().first()
        if not row:
            raise AppError("Appointment not found", status_code=404)
        return dict(row)
