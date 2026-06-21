from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.notification_dispatch_service import NotificationDispatchService


class WorkflowNotificationService:
    """Maps workflow events to multi-channel notification dispatch."""

    TRIGGER_CHANNELS: dict[str, list[str]] = {
        "enquiry_received": ["in_app", "email"],
        "enquiry_assigned": ["in_app"],
        "enquiry_converted": ["in_app"],
        "order_created": ["in_app"],
        "payment_link_sent": ["in_app", "sms", "email"],
        "payment_completed": ["in_app", "sms"],
        "payment_failed": ["in_app"],
        "technician_assigned": ["in_app", "sms"],
        "scan_scheduled": ["in_app", "sms"],
        "scan_date_requested": ["in_app"],
        "scan_schedule_confirmed": ["in_app", "sms"],
        "technician_visit_assigned": ["in_app"],
        "visit_started": ["in_app"],
        "visit_reached": ["in_app"],
        "scan_started": ["in_app"],
        "scan_completed": ["in_app", "sms"],
        "scan_reviewed": ["in_app"],
        "lab_assigned": ["in_app"],
        "sample_dispatch_pending": ["in_app"],
        "sample_dispatched": ["in_app"],
        "sample_received_at_lab": ["in_app"],
        "awaiting_lab_report": ["in_app", "email"],
        "lab_report_uploaded": ["in_app"],
        "ai_extraction_ready": ["in_app"],
        "ai_reupload_required": ["in_app"],
        "ai_verified": ["in_app"],
        "final_report_generated": ["in_app"],
        "final_report_published": ["in_app", "sms"],
        "consultation_date_requested": ["in_app"],
        "consultation_schedule_confirmed": ["in_app", "sms"],
        "doctor_assigned": ["in_app"],
        "consultation_scheduled": ["in_app", "sms"],
        "consultation_completed": ["in_app"],
        "prescription_published": ["in_app", "sms"],
        "care_task_assigned": ["in_app"],
        "care_task_escalation": ["in_app"],
        "otp_sent": ["sms"],
        "audit_alert": ["in_app", "email"],
    }

    ROLE_TARGETS: dict[str, list[str]] = {
        "enquiry_received": ["OPERATIONS", "CITY_MANAGER", "SUPER_ADMIN"],
        "payment_completed": ["OPERATIONS", "CITY_MANAGER", "SUPER_ADMIN"],
        "scan_date_requested": ["OPERATIONS", "CITY_MANAGER", "SUPER_ADMIN"],
        "consultation_date_requested": ["OPERATIONS", "CITY_MANAGER", "SUPER_ADMIN"],
        "visit_started": ["OPERATIONS", "CITY_MANAGER", "SUPER_ADMIN"],
        "visit_reached": ["OPERATIONS", "CITY_MANAGER", "SUPER_ADMIN"],
        "scan_completed": ["OPERATIONS", "CITY_MANAGER", "SUPER_ADMIN"],
        "scan_started": ["OPERATIONS"],
        "final_report_generated": ["OPERATIONS", "CITY_MANAGER", "SUPER_ADMIN"],
        "consultation_completed": ["OPERATIONS"],
        "lab_assigned": ["OPERATIONS", "CITY_MANAGER", "SUPER_ADMIN"],
        "care_task_escalation": ["DOCTOR"],
        "audit_alert": ["CITY_MANAGER", "SUPER_ADMIN"],
    }

    def __init__(self, db: AsyncSession):
        self.dispatch = NotificationDispatchService(db)

    async def emit(
        self,
        trigger_action: str,
        *,
        context: dict[str, Any],
        order_id: UUID | None = None,
        patient_id: UUID | None = None,
        recipient_phone: str | None = None,
        recipient_email: str | None = None,
        target_roles: list[str] | None = None,
        target_user_ids: list[UUID] | None = None,
        channels: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        resolved_channels = channels or self.TRIGGER_CHANNELS.get(trigger_action, ["in_app"])
        resolved_roles = target_roles if target_roles is not None else self.ROLE_TARGETS.get(trigger_action)
        return await self.dispatch.dispatch(
            trigger_action,
            context=context,
            channels=resolved_channels,
            recipient_phone=recipient_phone,
            recipient_email=recipient_email,
            target_roles=resolved_roles,
            target_user_ids=target_user_ids,
            order_id=order_id,
            patient_id=patient_id,
        )

    async def enquiry_received(self, *, patient_name: str, patient_phone: str, patient_email: str | None = None) -> None:
        await self.emit(
            "enquiry_received",
            context={"patientName": patient_name, "patientPhone": patient_phone},
            recipient_email=patient_email,
        )

    async def enquiry_assigned(
        self,
        *,
        patient_name: str,
        assignee_user_id: UUID,
        enquiry_number: str | None = None,
    ) -> None:
        await self.emit(
            "enquiry_assigned",
            context={
                "patientName": patient_name,
                "orderCode": enquiry_number or "",
            },
            target_user_ids=[assignee_user_id],
            target_roles=[],
        )

    async def payment_link_sent(
        self,
        *,
        order_id: UUID,
        patient_id: UUID,
        patient_phone: str,
        patient_email: str | None,
        order_number: str,
        amount: str,
        payment_link: str,
        patient_name: str,
        channels: list[str] | None = None,
    ) -> None:
        await self.emit(
            "payment_link_sent",
            context={
                "orderNumber": order_number,
                "amount": amount,
                "paymentLink": payment_link,
                "patientName": patient_name,
            },
            order_id=order_id,
            patient_id=patient_id,
            recipient_phone=patient_phone,
            recipient_email=patient_email,
            channels=channels,
        )

    async def order_event(
        self,
        trigger_action: str,
        *,
        order: dict[str, Any],
        extra: dict[str, Any] | None = None,
        target_user_ids: list[UUID] | None = None,
        target_roles: list[str] | None = None,
    ) -> None:
        context = {
            "patientName": order.get("patientName") or order.get("patient_name"),
            "orderNumber": order.get("orderNumber") or order.get("order_number"),
            "packageName": order.get("packageName") or order.get("package_name"),
            "amount": str(order.get("finalAmount") or order.get("final_amount") or ""),
            "technicianName": order.get("technicianName") or order.get("technician_name"),
            "doctorName": order.get("doctorName") or order.get("doctor_name"),
            "scanScheduledAt": str(order.get("scanScheduledAt") or order.get("scan_scheduled_at") or ""),
            "consultationScheduledAt": str(
                order.get("consultationScheduledAt") or order.get("consultation_scheduled_at") or ""
            ),
            "reportNumber": (extra or {}).get("reportNumber", ""),
            "reportUrl": (extra or {}).get("reportUrl", ""),
            **(extra or {}),
        }
        await self.emit(
            trigger_action,
            context=context,
            order_id=order.get("id"),
            patient_id=order.get("patientId") or order.get("patient_id"),
            recipient_phone=order.get("patientPhone") or order.get("patient_phone"),
            recipient_email=order.get("patientEmail") or order.get("patient_email"),
            target_user_ids=target_user_ids,
            target_roles=target_roles,
        )

    async def scan_date_requested(self, *, order: dict[str, Any], time_slot: str) -> None:
        await self.emit(
            "scan_date_requested",
            context={
                "patientName": order.get("patientName") or "",
                "orderNumber": order.get("orderNumber") or "",
                "timeSlot": time_slot,
            },
            order_id=order.get("id"),
            patient_id=order.get("patientId"),
        )

    async def scan_schedule_confirmed(self, *, order: dict[str, Any]) -> None:
        await self.order_event("scan_schedule_confirmed", order=order)
        tech_id = order.get("technicianId") or order.get("technician_id")
        target_user_ids = [UUID(str(tech_id))] if tech_id else None
        await self.emit(
            "technician_visit_assigned",
            context={
                "patientName": order.get("patientName") or "",
                "orderNumber": order.get("orderNumber") or "",
                "technicianName": order.get("technicianName") or "",
                "scanScheduledAt": str(order.get("scanScheduledAt") or ""),
                "timeSlot": order.get("scanTimeSlot") or "",
            },
            order_id=order.get("id"),
            patient_id=order.get("patientId"),
            target_user_ids=target_user_ids,
            target_roles=[],
            channels=["in_app"],
        )

    async def consultation_date_requested(self, *, order: dict[str, Any], time_slot: str) -> None:
        await self.emit(
            "consultation_date_requested",
            context={
                "patientName": order.get("patientName") or "",
                "orderNumber": order.get("orderNumber") or "",
                "timeSlot": time_slot,
            },
            order_id=order.get("id"),
            patient_id=order.get("patientId"),
        )

    async def consultation_schedule_confirmed(self, *, order: dict[str, Any]) -> None:
        await self.order_event(
            "consultation_schedule_confirmed",
            order=order,
            extra={"timeSlot": order.get("consultationTimeSlot") or ""},
        )
        doctor_user_id = order.get("doctorUserId")
        target_user_ids = [UUID(str(doctor_user_id))] if doctor_user_id else None
        if target_user_ids is None:
            doctor_id = order.get("doctorId")
            if doctor_id:
                from sqlalchemy import text

                result = await self.dispatch.db.execute(
                    text("SELECT user_id FROM clinical.doctors WHERE id = :doctor_id"),
                    {"doctor_id": doctor_id},
                )
                row = result.mappings().first()
                if row:
                    target_user_ids = [row["user_id"]]
        await self.emit(
            "consultation_scheduled",
            context={
                "patientName": order.get("patientName") or "",
                "orderNumber": order.get("orderNumber") or "",
                "doctorName": order.get("doctorName") or "",
                "consultationScheduledAt": str(order.get("consultationScheduledAt") or ""),
                "timeSlot": order.get("consultationTimeSlot") or "",
            },
            order_id=order.get("id"),
            patient_id=order.get("patientId"),
            recipient_phone=order.get("patientPhone") or order.get("patient_phone"),
            target_user_ids=target_user_ids,
            target_roles=[],
        )
