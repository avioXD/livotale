from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.domain.order_workflow import (
    OrderWorkflowEvent,
    apply_transition,
    can_transition,
    get_applicable_events,
    get_package_flags,
)
from app.domain.serial_numbers import next_order_number
from app.models.commerce import OrderPayment, OrderTimelineEvent, ServiceOrder
from app.repositories.enquiry_repo import EnquiryRepository
from app.repositories.order_repo import OrderRepository
from app.services.consultation_service import ConsultationService
from app.services.patient_registry_service import PatientRegistryService
from app.services.workflow_notifications import WorkflowNotificationService
from app.schemas.orders import (
    AssignDoctorInput,
    AssignTechnicianInput,
    ConfirmConsultationScheduleInput,
    ConfirmScanScheduleInput,
    CreateOrderInput,
    OfflinePaymentInput,
    OrderTransitionInput,
    ScheduleConsultationInput,
    ScheduleScanInput,
)
from app.services.doctor_availability_service import DoctorAvailabilityService
from app.services.order_helpers import load_order_visit_location, visit_location_for_order
from app.services.slot_availability_service import SlotAvailabilityService

TIMELINE_CATALOG: dict[str, dict[str, str]] = {
    "order_created": {"label": "Order created", "category": "order"},
    "submit": {"label": "Order submitted", "category": "order"},
    "request_payment": {"label": "Payment requested", "category": "payment"},
    "payment_link_sent": {"label": "Payment link sent", "category": "payment"},
    "payment_submitted": {"label": "Payment proof submitted", "category": "payment"},
    "payment_verified": {"label": "Payment verified", "category": "payment"},
    "payment_rejected": {"label": "Payment proof rejected", "category": "payment"},
    "payment_completed": {"label": "Payment received", "category": "payment"},
    "payment_failed": {"label": "Payment failed", "category": "payment"},
    "assign_technician": {"label": "Technician assigned", "category": "scan"},
    "technician_reassigned": {"label": "Technician reassigned", "category": "scan"},
    "schedule_scan": {"label": "Scan scheduled", "category": "scan"},
    "scan_schedule_confirmed": {"label": "Home visit confirmed", "category": "scan"},
    "start_scan": {"label": "Scan started", "category": "scan"},
    "complete_scan": {"label": "Scan marked complete", "category": "scan"},
    "assign_lab": {"label": "Lab partner assigned", "category": "pathology"},
    "upload_lab_report": {"label": "Lab report uploaded", "category": "pathology"},
    "trigger_ai": {"label": "AI extraction started", "category": "ai"},
    "verify_ai": {"label": "AI extraction verified", "category": "ai"},
    "generate_report": {"label": "Letterhead report generated", "category": "report"},
    "assign_doctor": {"label": "Doctor assigned", "category": "consultation"},
    "doctor_reassigned": {"label": "Doctor reassigned", "category": "consultation"},
    "schedule_consultation": {"label": "Consultation scheduled", "category": "consultation"},
    "consultation_schedule_confirmed": {"label": "Consultation confirmed", "category": "consultation"},
    "complete_consultation": {"label": "Consultation completed", "category": "consultation"},
    "publish_prescription": {"label": "Prescription published", "category": "prescription"},
    "complete": {"label": "Order marked complete", "category": "order"},
    "cancel": {"label": "Order cancelled", "category": "order"},
}

EVENT_NOTIFICATION_MAP: dict[str, str] = {
    "submit": "order_created",
    "order_created": "order_created",
    "enquiry_converted": "enquiry_converted",
    "payment_completed": "payment_completed",
    "payment_submitted": "payment_submitted",
    "payment_rejected": "payment_rejected",
    "payment_failed": "payment_failed",
    "assign_technician": "technician_assigned",
    "technician_reassigned": "technician_assigned",
    "schedule_scan": "scan_scheduled",
    "start_scan": "scan_started",
    "complete_scan": "scan_completed",
    "assign_lab": "lab_assigned",
    "upload_lab_report": "lab_report_uploaded",
    "trigger_ai": "ai_extraction_ready",
    "verify_ai": "ai_verified",
    "generate_report": "final_report_generated",
    "assign_doctor": "doctor_assigned",
    "doctor_reassigned": "doctor_assigned",
    "schedule_consultation": "consultation_scheduled",
    "complete_consultation": "consultation_completed",
    "publish_prescription": "prescription_published",
}


def payload_collected_by_name(payment: OrderPayment, name: str | None) -> str:
    if name:
        return name
    return "Patient" if payment.collected_by is None else "Operations"


async def _resolve_file_url(db: AsyncSession, file_id: UUID | None) -> str | None:
    if file_id is None:
        return None
    result = await db.execute(
        text("SELECT storage_url FROM storage.files WHERE id = :file_id"),
        {"file_id": file_id},
    )
    row = result.mappings().first()
    return row["storage_url"] if row else None


async def _assert_receipt_file(db: AsyncSession, file_id: UUID) -> None:
    result = await db.execute(
        text("SELECT id FROM storage.files WHERE id = :file_id"),
        {"file_id": file_id},
    )
    if result.mappings().first() is None:
        raise AppError("Payment receipt file not found", status_code=400, error="validation_error")


class OrderService:
    def __init__(self, session: AsyncSession):
        self.repo = OrderRepository(session)
        self.enquiry_repo = EnquiryRepository(session)

    async def list_orders(self, **filters) -> list[dict]:
        rows = await self.repo.list_orders(**filters)
        return [await self._to_dict(row) for row in rows]

    async def get_by_id(self, order_id: UUID) -> dict:
        row = await self.repo.get_by_id(order_id)
        if row is None:
            raise AppError("Order not found", status_code=404, error="not_found")
        return await self._to_dict(row)

    async def create(self, payload: CreateOrderInput, *, actor_id: UUID | None) -> dict:
        package = await self.repo.get_package(payload.package_id)
        if package is None:
            raise AppError("Package not found", status_code=404, error="not_found")

        patient_id = await self._resolve_patient_id(payload, actor_id=actor_id)
        patient = await self.repo.get_patient_profile(patient_id)
        if patient is None:
            raise AppError("Patient not found", status_code=404, error="not_found")

        base_price = package.discount_price if package.discount_price is not None else package.price
        discount = Decimal(str(payload.discount or 0))
        final_amount = Decimal(str(base_price)) - discount
        if final_amount < 0:
            raise AppError("Final amount cannot be negative", status_code=400, error="validation_error")

        order_status = "payment_pending" if payload.payment_mode else "created"
        order = ServiceOrder(
            order_number=await next_order_number(self.repo.session),
            patient_id=patient_id,
            enquiry_id=payload.enquiry_id,
            package_id=package.id,
            package_name=package.name,
            package_price=package.price,
            discount=discount,
            final_amount=final_amount,
            payment_mode=payload.payment_mode,
            payment_status="pending",
            order_status=order_status,
            scan_scheduled_at=payload.scan_scheduled_at,
            created_by=actor_id,
            updated_by=actor_id,
        )
        saved = await self.repo.add(order)
        await self._append_timeline(
            saved.id,
            "order_created",
            performed_by=actor_id,
            detail=f"{package.code} · ₹{float(final_amount):,.0f}",
            metadata={"packageCode": package.code, "amount": str(final_amount)},
        )

        if payload.enquiry_id:
            enquiry = await self.enquiry_repo.get_by_id(payload.enquiry_id)
            if enquiry is not None:
                patient_id = enquiry.patient_id if payload.skip_patient_creation and enquiry.patient_id else patient_id
                enquiry.status = "converted"
                enquiry.patient_id = patient_id
                enquiry.order_id = saved.id
                enquiry.order_outcome = enquiry.order_outcome or "confirmed"
                enquiry.updated_by = actor_id
                await self.enquiry_repo.save(enquiry)

        result = await self._to_dict(saved)
        await self._notify_for_event("order_created", result)
        if payload.enquiry_id:
            await self._notify_for_event("enquiry_converted", result)
        return result

    async def _resolve_patient_id(self, payload: CreateOrderInput, *, actor_id: UUID | None) -> UUID:
        if payload.skip_patient_creation:
            if payload.patient_id is None:
                raise AppError(
                    "patientId is required when skipPatientCreation is true",
                    status_code=400,
                    error="validation_error",
                )
            return payload.patient_id

        if payload.patient_id is not None:
            return payload.patient_id

        name = (payload.patient_name or "").strip()
        phone = (payload.patient_phone or "").strip()
        if not name or not phone:
            raise AppError(
                "patientName and patientPhone are required to create a new patient",
                status_code=400,
                error="validation_error",
            )

        registry = PatientRegistryService(self.repo.session)
        return await registry.create_patient_from_intake(
            name=name,
            phone=phone,
            intake=payload.patient_intake,
            actor_id=actor_id,
        )

    async def transition(self, order_id: UUID, payload: OrderTransitionInput, *, actor_id: UUID | None) -> dict:
        order = await self.repo.get_by_id(order_id, for_update=True)
        if order is None:
            raise AppError("Order not found", status_code=404, error="not_found")

        if payload.expected_version is not None and order.version != payload.expected_version:
            raise AppError("Order was modified by another user", status_code=409, error="conflict")

        package = await self.repo.get_package(order.package_id)
        if package is None:
            raise AppError("Package not found", status_code=404, error="not_found")

        flags = get_package_flags(package)
        event = OrderWorkflowEvent(payload.event)
        if not can_transition(order, event, flags):
            raise AppError(
                f'Cannot apply "{event}" from status "{order.order_status}"',
                status_code=400,
                error="invalid_transition",
            )

        previous_status = order.order_status
        result = apply_transition(order, event, flags)
        order.order_status = result.order_status.value
        order.updated_at = result.updated_at
        order.updated_by = actor_id
        order.version = int(order.version or 1) + 1

        meta = payload.meta or {}
        if meta.get("technicianId"):
            order.technician_id = UUID(meta["technicianId"])
        if meta.get("doctorId"):
            order.doctor_id = UUID(meta["doctorId"])
        if meta.get("partnerLabId"):
            order.partner_lab_id = UUID(meta["partnerLabId"])
        if event is OrderWorkflowEvent.PAYMENT_COMPLETED:
            order.payment_status = "success"

        saved = await self.repo.save(order)
        await self._append_timeline(
            saved.id,
            event.value,
            performed_by=actor_id,
            detail=self._format_transition_detail(event.value, meta),
            metadata=meta or None,
        )
        response = await self._to_dict(saved)
        response["_transition"] = {
            "event": event.value,
            "previousStatus": previous_status,
            "newStatus": saved.order_status,
        }
        await self._notify_for_event(event.value, response)
        return response

    async def send_payment_link(
        self,
        order_id: UUID,
        *,
        channels: list[str],
        actor_id: UUID | None,
    ) -> dict:
        entity = await self.repo.get_by_id(order_id)
        if entity is None:
            raise AppError("Order not found", status_code=404)
        order = await self._to_dict(entity)
        payment_link = f"https://portal.livotale.demo/pay/{order_id}"
        workflow = WorkflowNotificationService(self.repo.session)
        await workflow.payment_link_sent(
            order_id=order_id,
            patient_id=order["patientId"],
            patient_phone=order["patientPhone"],
            patient_email=order.get("patientEmail"),
            order_number=order["orderNumber"],
            amount=str(order["finalAmount"]),
            payment_link=payment_link,
            patient_name=order["patientName"],
            channels=[ch if ch != "whatsapp" else "sms" for ch in channels],
        )
        transition = OrderTransitionInput(event="request_payment", meta={"channels": ",".join(channels)})
        return await self.transition(order_id, transition, actor_id=actor_id)

    async def get_timeline(self, order_id: UUID) -> list[dict]:
        if await self.repo.get_by_id(order_id) is None:
            raise AppError("Order not found", status_code=404, error="not_found")
        events = await self.repo.list_timeline(order_id)
        return [self._timeline_to_dict(event) for event in events]

    async def get_workflow_events(self, order_id: UUID) -> list[str]:
        order = await self.repo.get_by_id(order_id)
        if order is None:
            raise AppError("Order not found", status_code=404, error="not_found")
        package = await self.repo.get_package(order.package_id)
        if package is None:
            return []
        return [event.value for event in get_applicable_events(order, get_package_flags(package))]

    async def assign_technician(
        self,
        order_id: UUID,
        payload: AssignTechnicianInput,
        *,
        actor_id: UUID | None,
    ) -> dict:
        order = await self.repo.get_by_id(order_id, for_update=True)
        if order is None:
            raise AppError("Order not found", status_code=404, error="not_found")
        if order.order_status in {"cancelled", "completed"}:
            raise AppError("Technician cannot be changed for this order", status_code=400, error="invalid_state")

        package = await self.repo.get_package(order.package_id)
        flags = get_package_flags(package) if package else get_package_flags({"pathology_included": False, "consultation_included": False})
        previous_name = await self.repo.get_user_name(order.technician_id)
        is_reassign = order.technician_id is not None

        order.technician_id = payload.technician_id
        order.updated_by = actor_id
        order.version = int(order.version or 1) + 1

        if can_transition(order, OrderWorkflowEvent.ASSIGN_TECHNICIAN, flags):
            result = apply_transition(order, OrderWorkflowEvent.ASSIGN_TECHNICIAN, flags)
            order.order_status = result.order_status.value
            order.updated_at = result.updated_at

        saved = await self.repo.save(order)
        await self._append_timeline(
            saved.id,
            "technician_reassigned" if is_reassign else "assign_technician",
            performed_by=actor_id,
            detail=(
                f"Changed from {previous_name or 'unassigned'} to {payload.technician_name}"
                if is_reassign
                else f"Assigned to {payload.technician_name}"
            ),
            metadata={"technicianId": str(payload.technician_id), "technicianName": payload.technician_name},
        )
        result = await self._to_dict(saved)
        await self._notify_for_event("technician_assigned", result)
        return result

    async def assign_doctor(self, order_id: UUID, payload: AssignDoctorInput, *, actor_id: UUID | None) -> dict:
        order = await self.repo.get_by_id(order_id, for_update=True)
        if order is None:
            raise AppError("Order not found", status_code=404, error="not_found")
        if order.order_status in {"cancelled", "completed"}:
            raise AppError("Doctor cannot be changed for this order", status_code=400, error="invalid_state")

        package = await self.repo.get_package(order.package_id)
        flags = get_package_flags(package) if package else get_package_flags({"pathology_included": False, "consultation_included": False})
        previous_name = await self.repo.get_doctor_name(order.doctor_id)
        is_reassign = order.doctor_id is not None

        order.doctor_id = payload.doctor_id
        order.updated_by = actor_id
        order.version = int(order.version or 1) + 1

        for _ in range(2):
            if can_transition(order, OrderWorkflowEvent.ASSIGN_DOCTOR, flags):
                result = apply_transition(order, OrderWorkflowEvent.ASSIGN_DOCTOR, flags)
                order.order_status = result.order_status.value
                order.updated_at = result.updated_at

        saved = await self.repo.save(order)
        if saved.patient_id:
            await self.repo.session.execute(
                text(
                    """
                    INSERT INTO clinical.doctor_patient_assignments (
                      doctor_id, patient_id, assigned_by, status
                    )
                    VALUES (:doctor_id, :patient_id, :assigned_by, 'active')
                    ON CONFLICT (doctor_id, patient_id) DO UPDATE
                      SET status = 'active', assigned_at = now(), assigned_by = EXCLUDED.assigned_by
                    """
                ),
                {
                    "doctor_id": payload.doctor_id,
                    "patient_id": saved.patient_id,
                    "assigned_by": actor_id,
                },
            )
        await self._append_timeline(
            saved.id,
            "doctor_reassigned" if is_reassign else "assign_doctor",
            performed_by=actor_id,
            detail=(
                f"Changed from {previous_name or 'unassigned'} to {payload.doctor_name}"
                if is_reassign
                else f"Assigned to {payload.doctor_name}"
            ),
            metadata={"doctorId": str(payload.doctor_id), "doctorName": payload.doctor_name},
        )
        await ConsultationService(self.repo.session).ensure_for_order(saved.id)
        result = await self._to_dict(saved)
        await self._notify_for_event("doctor_assigned", result)
        return result

    async def schedule_scan(self, order_id: UUID, payload: ScheduleScanInput, *, actor_id: UUID | None) -> dict:
        order = await self.repo.get_by_id(order_id, for_update=True)
        if order is None:
            raise AppError("Order not found", status_code=404, error="not_found")
        if order.order_status in {"cancelled", "completed"}:
            raise AppError("Cannot schedule scan on this order", status_code=400, error="invalid_state")

        package = await self.repo.get_package(order.package_id)
        flags = get_package_flags(package) if package else get_package_flags({"pathology_included": False, "consultation_included": False})

        order.scan_scheduled_at = payload.scheduled_at
        order.scan_time_slot = payload.time_slot
        order.updated_by = actor_id
        order.version = int(order.version or 1) + 1

        if can_transition(order, OrderWorkflowEvent.SCHEDULE_SCAN, flags):
            result = apply_transition(order, OrderWorkflowEvent.SCHEDULE_SCAN, flags)
            order.order_status = result.order_status.value
            order.updated_at = result.updated_at
        elif order.order_status not in {"scan_scheduled", "scan_in_progress", "scan_completed"}:
            raise AppError("Scan cannot be scheduled at this stage", status_code=400, error="invalid_transition")

        saved = await self.repo.save(order)
        await self._append_timeline(
            saved.id,
            "schedule_scan",
            performed_by=actor_id,
            detail=f"Home visit · {payload.time_slot} · {payload.scheduled_at.isoformat()}",
            metadata={
                "scheduledAt": payload.scheduled_at.isoformat(),
                "visitMode": payload.visit_mode,
                "timeSlot": payload.time_slot,
            },
        )
        result = await self._to_dict(saved)
        result["scanVisitMode"] = payload.visit_mode
        await self._notify_for_event("scan_scheduled", result)
        return result

    async def get_scan_slots_for_order(self, order_id: UUID, date_str: str) -> list[dict]:
        order = await self.repo.get_by_id(order_id)
        if order is None:
            raise AppError("Order not found", status_code=404, error="not_found")
        order_dict = await self._to_dict(order)
        slot_service = SlotAvailabilityService(self.repo.session)
        return await slot_service.get_scan_slots(
            date_str,
            exclude_order_id=order_id,
            patient_preference=order_dict,
        )

    async def confirm_scan_schedule(
        self,
        order_id: UUID,
        payload: ConfirmScanScheduleInput,
        *,
        actor_id: UUID | None,
    ) -> dict:
        order = await self.repo.get_by_id(order_id, for_update=True)
        if order is None:
            raise AppError("Order not found", status_code=404, error="not_found")
        if order.order_status in {"cancelled", "completed"}:
            raise AppError("Cannot schedule scan on this order", status_code=400, error="invalid_state")
        if order.payment_status != "success" and order.order_status not in {
            "payment_completed",
            "technician_assigned",
            "scan_scheduled",
        }:
            raise AppError("Payment must be completed before confirming scan", status_code=400, error="validation_error")

        location = await load_order_visit_location(self.repo.session, order_id, order.patient_id)
        if not location.get("isComplete"):
            raise AppError(
                "Patient home address and pincode are required before confirming schedule",
                status_code=400,
                error="validation_error",
            )

        slot_service = SlotAvailabilityService(self.repo.session)
        if not await slot_service.is_slot_available(
            payload.scheduled_at,
            exclude_order_id=order_id,
        ):
            raise AppError("Selected time slot is no longer available", status_code=409, error="slot_unavailable")

        available = await slot_service.list_technicians_available_for_slot(
            payload.scheduled_at,
            exclude_order_id=order_id,
        )
        tech_ids = {str(row["id"]) for row in available}
        if str(payload.technician_id) not in tech_ids:
            raise AppError("Technician is not available for this slot", status_code=409, error="technician_unavailable")

        package = await self.repo.get_package(order.package_id)
        flags = get_package_flags(package) if package else get_package_flags({"pathology_included": False, "consultation_included": False})

        order.technician_id = payload.technician_id
        order.scan_scheduled_at = payload.scheduled_at
        order.scan_time_slot = payload.time_slot
        order.scan_visit_mode = payload.visit_mode
        order.updated_by = actor_id
        order.version = int(order.version or 1) + 1

        if can_transition(order, OrderWorkflowEvent.ASSIGN_TECHNICIAN, flags):
            result = apply_transition(order, OrderWorkflowEvent.ASSIGN_TECHNICIAN, flags)
            order.order_status = result.order_status.value
            order.updated_at = result.updated_at

        if can_transition(order, OrderWorkflowEvent.SCHEDULE_SCAN, flags):
            result = apply_transition(order, OrderWorkflowEvent.SCHEDULE_SCAN, flags)
            order.order_status = result.order_status.value
            order.updated_at = result.updated_at
        elif order.order_status not in {"scan_scheduled", "scan_in_progress", "scan_completed"}:
            raise AppError("Scan cannot be confirmed at this stage", status_code=400, error="invalid_transition")

        saved = await self.repo.save(order)
        await self._append_timeline(
            saved.id,
            "scan_schedule_confirmed",
            performed_by=actor_id,
            detail=f"Home visit · {payload.time_slot} · {payload.technician_name}",
            metadata={
                "scheduledAt": payload.scheduled_at.isoformat(),
                "visitMode": payload.visit_mode,
                "timeSlot": payload.time_slot,
                "technicianId": str(payload.technician_id),
                "technicianName": payload.technician_name,
            },
        )
        result = await self._to_dict(saved)
        workflow = WorkflowNotificationService(self.repo.session)
        await workflow.scan_schedule_confirmed(order=result)
        return result

    async def get_consult_slots_for_order(self, order_id: UUID, date_str: str) -> list[dict]:
        order = await self.repo.get_by_id(order_id)
        if order is None:
            raise AppError("Order not found", status_code=404, error="not_found")
        order_dict = await self._to_dict(order)
        availability = DoctorAvailabilityService(self.repo.session)
        return await availability.get_aggregate_tele_slots(
            date_str,
            exclude_order_id=order_id,
            patient_preference=order_dict,
        )

    async def confirm_consultation_schedule(
        self,
        order_id: UUID,
        payload: ConfirmConsultationScheduleInput,
        *,
        actor_id: UUID | None,
    ) -> dict:
        order = await self.repo.get_by_id(order_id, for_update=True)
        if order is None:
            raise AppError("Order not found", status_code=404, error="not_found")
        if order.order_status in {"cancelled", "completed"}:
            raise AppError("Cannot schedule consultation on this order", status_code=400, error="invalid_state")

        package = await self.repo.get_package(order.package_id)
        flags = get_package_flags(package) if package else get_package_flags({"pathology_included": False, "consultation_included": False})
        if not flags.consultation:
            raise AppError("This package does not include consultation", status_code=400, error="validation_error")

        availability = DoctorAvailabilityService(self.repo.session)
        available = await availability.list_doctors_available_for_slot(
            payload.scheduled_at,
            exclude_order_id=order_id,
        )
        doctor_ids = {str(row["id"]) for row in available}
        if str(payload.doctor_id) not in doctor_ids:
            raise AppError("Doctor is not available for this slot", status_code=409, error="doctor_unavailable")

        previous_doctor_id = order.doctor_id
        is_reassign = previous_doctor_id is not None and previous_doctor_id != payload.doctor_id
        previous_name = await self.repo.get_doctor_name(previous_doctor_id) if is_reassign else None

        order.doctor_id = payload.doctor_id
        order.consultation_scheduled_at = payload.scheduled_at
        order.consultation_time_slot = payload.time_slot
        order.updated_by = actor_id
        order.version = int(order.version or 1) + 1

        for _ in range(2):
            if can_transition(order, OrderWorkflowEvent.ASSIGN_DOCTOR, flags):
                result = apply_transition(order, OrderWorkflowEvent.ASSIGN_DOCTOR, flags)
                order.order_status = result.order_status.value
                order.updated_at = result.updated_at

        if can_transition(order, OrderWorkflowEvent.SCHEDULE_CONSULTATION, flags):
            result = apply_transition(order, OrderWorkflowEvent.SCHEDULE_CONSULTATION, flags)
            order.order_status = result.order_status.value
            order.updated_at = result.updated_at
        elif order.order_status not in {"consultation_pending", "prescription_pending", "prescription_generated"}:
            raise AppError("Consultation cannot be confirmed at this stage", status_code=400, error="invalid_transition")

        saved = await self.repo.save(order)
        if saved.patient_id:
            await self.repo.session.execute(
                text(
                    """
                    INSERT INTO clinical.doctor_patient_assignments (
                      doctor_id, patient_id, assigned_by, status
                    )
                    VALUES (:doctor_id, :patient_id, :assigned_by, 'active')
                    ON CONFLICT (doctor_id, patient_id) DO UPDATE
                      SET status = 'active', assigned_at = now(), assigned_by = EXCLUDED.assigned_by
                    """
                ),
                {
                    "doctor_id": payload.doctor_id,
                    "patient_id": saved.patient_id,
                    "assigned_by": actor_id,
                },
            )

        if is_reassign:
            await self._append_timeline(
                saved.id,
                "doctor_reassigned",
                performed_by=actor_id,
                detail=f"Changed from {previous_name or 'unassigned'} to {payload.doctor_name}",
                metadata={"doctorId": str(payload.doctor_id), "doctorName": payload.doctor_name},
            )
        elif previous_doctor_id is None:
            await self._append_timeline(
                saved.id,
                "assign_doctor",
                performed_by=actor_id,
                detail=f"Assigned to {payload.doctor_name}",
                metadata={"doctorId": str(payload.doctor_id), "doctorName": payload.doctor_name},
            )

        await self._append_timeline(
            saved.id,
            "consultation_schedule_confirmed",
            performed_by=actor_id,
            detail=f"Video consult · {payload.time_slot} · {payload.doctor_name}",
            metadata={
                "scheduledAt": payload.scheduled_at.isoformat(),
                "timeSlot": payload.time_slot,
                "doctorId": str(payload.doctor_id),
                "doctorName": payload.doctor_name,
            },
        )
        await ConsultationService(self.repo.session).ensure_for_order(saved.id)
        await ConsultationService(self.repo.session).sync_ops_schedule(saved.id, payload.scheduled_at)

        result = await self._to_dict(saved)
        workflow = WorkflowNotificationService(self.repo.session)
        if previous_doctor_id is None or is_reassign:
            await self._notify_for_event("doctor_assigned", result)
        await workflow.consultation_schedule_confirmed(order=result)
        await self._notify_for_event("consultation_scheduled", result)
        return result

    async def mark_portal_payment(
        self,
        order_id: UUID,
        *,
        method: str,
        amount: float,
        receipt_file_id: UUID | None = None,
        transaction_ref: str | None = None,
        outcome: str | None = None,
    ) -> dict:
        order = await self.repo.get_by_id(order_id, for_update=True)
        if order is None:
            raise AppError("Order not found", status_code=404, error="not_found")
        if order.order_status == "cancelled":
            raise AppError("This order was cancelled", status_code=400, error="invalid_state")
        if outcome == "failure":
            order.payment_status = "failed"
            order.payment_mode = "patient_portal"
            order.version = int(order.version or 1) + 1
            saved = await self.repo.save(order)
            await self._append_timeline(
                saved.id,
                "payment_failed",
                performed_by=None,
                detail="Patient portal payment failed",
                metadata={"method": method},
            )
            result = await self._to_dict(saved)
            await self._notify_for_event("payment_failed", result)
            return result
        if order.payment_status == "success":
            return await self._to_dict(order)
        if order.payment_status == "processing":
            raise AppError(
                "Payment proof is already under review",
                status_code=400,
                error="invalid_state",
            )
        if receipt_file_id is None:
            raise AppError(
                "Upload a payment screenshot before marking as paid",
                status_code=400,
                error="validation_error",
            )
        await _assert_receipt_file(self.repo.session, receipt_file_id)

        paid_at = datetime.now(UTC)
        payment = OrderPayment(
            order_id=order.id,
            amount=Decimal(str(amount)),
            method=method if method in {"cash", "upi", "bank_transfer", "card"} else "upi",
            status="processing",
            paid_at=paid_at,
            collected_by=None,
            transaction_ref=transaction_ref,
            receipt_file_id=receipt_file_id,
            remarks="Patient portal payment proof",
        )
        await self.repo.add_payment(payment)

        order.payment_mode = "patient_portal"
        order.payment_status = "processing"
        if order.order_status == "created":
            order.order_status = "payment_pending"
        order.version = int(order.version or 1) + 1
        saved = await self.repo.save(order)
        detail = f"Patient portal · ₹{amount:,.0f} via {method}"
        if transaction_ref:
            detail = f"{detail} · Ref {transaction_ref}"
        await self._append_timeline(
            saved.id,
            "payment_submitted",
            performed_by=None,
            detail=detail,
            metadata={"method": method, "amount": str(amount), "performedBy": "patient"},
        )
        result = await self._to_dict(saved)
        await self._notify_for_event("payment_submitted", result)
        return result

    async def verify_payment(self, order_id: UUID, *, actor_id: UUID | None) -> dict:
        order = await self.repo.get_by_id(order_id, for_update=True)
        if order is None:
            raise AppError("Order not found", status_code=404, error="not_found")
        if order.payment_status != "processing":
            raise AppError("No payment awaiting verification", status_code=400, error="invalid_state")

        payments = await self.repo.list_payments(order_id)
        pending = next((p for p in reversed(payments) if p.status == "processing"), None)
        if pending is None:
            raise AppError("No payment record awaiting verification", status_code=400, error="invalid_state")

        pending.status = "success"
        pending.collected_by = actor_id

        package = await self.repo.get_package(order.package_id)
        flags = get_package_flags(package) if package else get_package_flags({"pathology_included": False, "consultation_included": False})
        if can_transition(order, OrderWorkflowEvent.PAYMENT_COMPLETED, flags):
            result = apply_transition(order, OrderWorkflowEvent.PAYMENT_COMPLETED, flags)
            order.order_status = result.order_status.value
            order.updated_at = result.updated_at
        elif order.order_status in {"created", "payment_pending"}:
            order.order_status = "payment_completed"

        order.payment_status = "success"
        order.updated_by = actor_id
        order.version = int(order.version or 1) + 1
        saved = await self.repo.save(order)

        amount = float(pending.amount)
        detail = f"Verified · ₹{amount:,.0f} via {pending.method}"
        if pending.transaction_ref:
            detail = f"{detail} · Ref {pending.transaction_ref}"
        await self._append_timeline(
            saved.id,
            "payment_verified",
            performed_by=actor_id,
            detail=detail,
            metadata={"method": pending.method, "amount": str(amount)},
        )
        await self._append_timeline(
            saved.id,
            "payment_completed",
            performed_by=actor_id,
            detail=detail,
            metadata={"method": pending.method, "amount": str(amount)},
        )
        result = await self._to_dict(saved)
        await self._notify_for_event("payment_completed", result)
        return result

    async def reject_payment(
        self,
        order_id: UUID,
        *,
        actor_id: UUID | None,
        remarks: str | None = None,
    ) -> dict:
        order = await self.repo.get_by_id(order_id, for_update=True)
        if order is None:
            raise AppError("Order not found", status_code=404, error="not_found")
        if order.payment_status != "processing":
            raise AppError("No payment awaiting verification", status_code=400, error="invalid_state")

        payments = await self.repo.list_payments(order_id)
        pending = next((p for p in reversed(payments) if p.status == "processing"), None)
        if pending is None:
            raise AppError("No payment record awaiting verification", status_code=400, error="invalid_state")

        pending.status = "failed"
        if remarks:
            pending.remarks = remarks

        order.payment_status = "pending"
        order.updated_by = actor_id
        order.version = int(order.version or 1) + 1
        saved = await self.repo.save(order)

        detail = remarks or "Payment proof rejected — patient may resubmit"
        await self._append_timeline(
            saved.id,
            "payment_rejected",
            performed_by=actor_id,
            detail=detail,
            metadata={"remarks": remarks or ""},
        )
        result = await self._to_dict(saved)
        await self._notify_for_event("payment_rejected", result)
        return result

    async def schedule_consultation(
        self,
        order_id: UUID,
        payload: ScheduleConsultationInput,
        *,
        actor_id: UUID | None,
    ) -> dict:
        order = await self.repo.get_by_id(order_id, for_update=True)
        if order is None:
            raise AppError("Order not found", status_code=404, error="not_found")
        if order.doctor_id is None:
            raise AppError("Assign a doctor before scheduling consultation", status_code=400, error="validation_error")

        package = await self.repo.get_package(order.package_id)
        flags = get_package_flags(package) if package else get_package_flags({"pathology_included": False, "consultation_included": False})

        if can_transition(order, OrderWorkflowEvent.SCHEDULE_CONSULTATION, flags):
            result = apply_transition(order, OrderWorkflowEvent.SCHEDULE_CONSULTATION, flags)
            order.order_status = result.order_status.value
            order.updated_at = result.updated_at
        elif order.order_status != "consultation_pending":
            raise AppError("Consultation cannot be scheduled at this stage", status_code=400, error="invalid_transition")

        order.consultation_scheduled_at = payload.scheduled_at
        order.updated_by = actor_id
        order.version = int(order.version or 1) + 1
        saved = await self.repo.save(order)

        detail = f"Video consult · {payload.scheduled_at.isoformat()}"
        if payload.slot_label:
            detail = f"{detail} · {payload.slot_label}"
        await self._append_timeline(
            saved.id,
            "schedule_consultation",
            performed_by=actor_id,
            detail=detail,
            metadata={"scheduledAt": payload.scheduled_at.isoformat()},
        )
        await ConsultationService(self.repo.session).sync_ops_schedule(saved.id, payload.scheduled_at)
        result = await self._to_dict(saved)
        await self._notify_for_event("consultation_scheduled", result)
        return result

    async def mark_offline_payment(
        self,
        order_id: UUID,
        payload: OfflinePaymentInput,
        *,
        actor_id: UUID | None,
    ) -> dict:
        order = await self.repo.get_by_id(order_id, for_update=True)
        if order is None:
            raise AppError("Order not found", status_code=404, error="not_found")

        paid_at = datetime.now(UTC)
        if payload.receipt_file_id is not None:
            await _assert_receipt_file(self.repo.session, payload.receipt_file_id)
        payment = OrderPayment(
            order_id=order.id,
            amount=Decimal(str(payload.amount)),
            method=payload.method,
            status="success",
            paid_at=paid_at,
            collected_by=actor_id,
            transaction_ref=payload.transaction_ref,
            receipt_file_id=payload.receipt_file_id,
            remarks=payload.remarks,
        )
        await self.repo.add_payment(payment)

        package = await self.repo.get_package(order.package_id)
        flags = get_package_flags(package) if package else get_package_flags({"pathology_included": False, "consultation_included": False})
        if can_transition(order, OrderWorkflowEvent.PAYMENT_COMPLETED, flags):
            result = apply_transition(order, OrderWorkflowEvent.PAYMENT_COMPLETED, flags)
            order.order_status = result.order_status.value
            order.updated_at = result.updated_at
        elif order.order_status in {"created", "payment_pending"}:
            order.order_status = "payment_completed"

        order.payment_mode = "offline"
        order.payment_status = "success"
        order.updated_by = actor_id
        order.version = int(order.version or 1) + 1
        saved = await self.repo.save(order)

        detail = f"₹{payload.amount:,.0f} via {payload.method}"
        if payload.transaction_ref:
            detail = f"{detail} · Ref {payload.transaction_ref}"
        await self._append_timeline(
            saved.id,
            "payment_completed",
            performed_by=actor_id,
            detail=detail,
            metadata={"method": payload.method, "amount": str(payload.amount)},
        )
        return await self._to_dict(saved)

    async def list_offline_payments(self, order_id: UUID) -> list[dict]:
        if await self.repo.get_by_id(order_id) is None:
            raise AppError("Order not found", status_code=404, error="not_found")
        payments = await self.repo.list_payments(order_id)
        rows: list[dict] = []
        for payment in payments:
            receipt_url = await _resolve_file_url(self.repo.session, payment.receipt_file_id)
            rows.append(
                {
                    "id": payment.id,
                    "orderId": payment.order_id,
                    "amount": float(payment.amount),
                    "method": payment.method,
                    "transactionRef": payment.transaction_ref,
                    "paidAt": payment.paid_at,
                    "collectedBy": payload_collected_by_name(
                        payment, await self.repo.get_user_name(payment.collected_by)
                    ),
                    "receiptFileId": payment.receipt_file_id,
                    "receiptUrl": receipt_url,
                    "status": payment.status,
                    "remarks": payment.remarks,
                }
            )
        return rows

    async def _append_timeline(
        self,
        order_id: UUID,
        event_type: str,
        *,
        performed_by: UUID | None,
        detail: str | None = None,
        metadata: dict[str, str] | None = None,
    ) -> None:
        catalog = TIMELINE_CATALOG.get(event_type, {"label": event_type.replace("_", " ").title(), "category": "system"})
        meta = dict(metadata or {})
        if detail:
            meta["detail"] = detail
        event = OrderTimelineEvent(
            order_id=order_id,
            event_type=event_type,
            label=catalog["label"],
            performed_by=performed_by,
            metadata_=meta,
        )
        await self.repo.add_timeline_event(event)

    def _timeline_to_dict(self, event: OrderTimelineEvent) -> dict:
        meta = dict(event.metadata_ or {})
        detail = meta.pop("detail", None)
        category = TIMELINE_CATALOG.get(event.event_type, {}).get("category")
        return {
            "id": event.id,
            "orderId": event.order_id,
            "eventType": event.event_type,
            "label": event.label,
            "occurredAt": event.occurred_at,
            "performedBy": str(event.performed_by) if event.performed_by else None,
            "detail": detail,
            "category": category,
            "metadata": {k: str(v) for k, v in meta.items()} or None,
        }

    def _format_transition_detail(self, event: str, meta: dict[str, str]) -> str | None:
        if event == "assign_technician" and meta.get("technicianName"):
            return f"Assigned to {meta['technicianName']}"
        if event == "assign_doctor" and meta.get("doctorName"):
            return f"Assigned to {meta['doctorName']}"
        if event == "payment_completed" and meta.get("amount"):
            return f"₹{float(meta['amount']):,.0f}"
        return None

    async def _notify_for_event(self, event: str, order: dict[str, Any]) -> None:
        trigger = EVENT_NOTIFICATION_MAP.get(event)
        if not trigger:
            return
        workflow = WorkflowNotificationService(self.repo.session)
        target_user_ids: list[UUID] | None = None
        if trigger == "technician_assigned" and order.get("technicianId"):
            target_user_ids = [UUID(str(order["technicianId"]))]
        elif trigger == "doctor_assigned" and order.get("doctorId"):
            doctor_user_id = await self.repo.get_doctor_user_id(order["doctorId"])
            if doctor_user_id:
                target_user_ids = [doctor_user_id]
        await workflow.order_event(trigger, order=order, target_user_ids=target_user_ids)

    async def _to_dict(self, order: ServiceOrder) -> dict:
        patient = await self.repo.get_patient_profile(order.patient_id)
        package = await self.repo.get_package(order.package_id)
        location = await load_order_visit_location(self.repo.session, order.id, order.patient_id)
        return {
            "id": order.id,
            "orderNumber": order.order_number,
            "patientId": order.patient_id,
            "patientName": patient["full_name"] if patient else "",
            "patientPhone": patient["mobile"] if patient else "",
            "patientEmail": patient.get("email") if patient else None,
            "patientPreferredLanguage": patient.get("preferred_language") if patient else None,
            "enquiryId": order.enquiry_id,
            "packageId": order.package_id,
            "packageCode": package.code if package else "",
            "packageName": order.package_name,
            "packagePrice": float(order.package_price),
            "discount": float(order.discount),
            "finalAmount": float(order.final_amount),
            "paymentMode": order.payment_mode,
            "paymentStatus": order.payment_status,
            "orderStatus": order.order_status,
            "technicianId": order.technician_id,
            "technicianName": await self.repo.get_user_name(order.technician_id),
            "partnerLabId": order.partner_lab_id,
            "partnerLabName": await self.repo.get_lab_name(order.partner_lab_id),
            "doctorId": order.doctor_id,
            "doctorName": await self.repo.get_doctor_name(order.doctor_id),
            "scanVisitMode": "home" if order.scan_scheduled_at else None,
            "scanTimeSlot": order.scan_time_slot,
            "scanClinicLocation": None,
            "scanPatientPreferredAt": order.scan_patient_preferred_at,
            "scanScheduledAt": order.scan_scheduled_at,
            "pathologyLabOrderRef": order.pathology_lab_order_ref,
            "pathologyExternalAppointmentId": order.pathology_external_appointment_id,
            "pathologyVisitOutcome": order.pathology_visit_outcome,
            "pathologyVisitConfirmedAt": order.pathology_visit_confirmed_at,
            "pathologyTimeSlot": order.pathology_time_slot,
            "pathologyPatientPreferredAt": order.pathology_patient_preferred_at,
            "pathologyScheduledAt": order.pathology_scheduled_at,
            "consultationPatientPreferredAt": order.consultation_patient_preferred_at,
            "consultationTimeSlot": order.consultation_time_slot,
            "consultationScheduledAt": order.consultation_scheduled_at,
            "visitLocation": visit_location_for_order(location),
            "createdBy": order.created_by,
            "createdAt": order.created_at,
            "updatedAt": order.updated_at,
            "version": order.version,
        }
