from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from fastapi import UploadFile
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.domain.order_workflow import OrderWorkflowEvent
from app.domain.pathology_workflow import (
    PathologyWorkflowEvent,
    SampleDispatchStatus,
    apply_transition,
    can_transition,
    dispatch_at_least,
)
from app.models.integrations import AIExtractionJob, LabReportUpload
from app.models.operations import LabPartner, SampleDispatch
from app.schemas.pathology import (
    AssignLabRequest,
    DispatchSampleRequest,
    LabPartnerVisitRequest,
    SchedulePathologyRequest,
    UpdateExternalAppointmentRequest,
)
from app.schemas.technician import CollectionProofRequest, MarkSampleCollectedRequest, SubmitSampleToLabRequest
from app.services.order_helpers import append_timeline, iso, load_order_row, order_to_api, transition_order
from app.services.workflow_notifications import WorkflowNotificationService

logger = logging.getLogger(__name__)


def dispatch_to_api(dispatch: SampleDispatch, partner_lab_name: str | None = None) -> dict[str, Any]:
    extra = dict(dispatch.extra or {})
    return {
        "id": dispatch.id,
        "orderId": dispatch.order_id,
        "partnerLabId": dispatch.partner_lab_id,
        "partnerLabName": partner_lab_name or extra.get("partnerLabName"),
        "status": dispatch.status,
        "collectedBy": extra.get("collectedBy"),
        "collectedAt": iso(dispatch.collected_at),
        "collectionProofFileId": extra.get("collectionProofFileId"),
        "collectionProofFileName": extra.get("collectionProofFileName"),
        "collectionProofUploadedAt": extra.get("collectionProofUploadedAt"),
        "orderLabelVerified": bool(extra.get("orderLabelVerified")),
        "collectionPhotos": extra.get("collectionPhotos", []),
        "dispatchedBy": extra.get("dispatchedBy"),
        "dispatchedAt": iso(dispatch.dispatched_at),
        "receivedAtLabAt": iso(dispatch.received_at_lab),
        "awaitingReportSince": iso(dispatch.awaiting_report_at),
        "courierRef": extra.get("courierRef"),
        "notes": extra.get("notes"),
        "updatedAt": iso(dispatch.updated_at),
    }


def lab_report_to_api(report: LabReportUpload, partner_lab_name: str | None = None) -> dict[str, Any]:
    extra = dict(getattr(report, "extra", None) or {})
    return {
        "id": report.id,
        "orderId": report.order_id,
        "patientId": report.patient_id,
        "partnerLabId": report.partner_lab_id,
        "partnerLabName": partner_lab_name or extra.get("partnerLabName"),
        "fileName": report.file_name,
        "fileUrl": report.file_url,
        "fileId": report.file_id,
        "uploadedBy": report.uploaded_by,
        "uploadedAt": iso(report.uploaded_at),
        "extractionStatus": report.extraction_status,
        "finalStatus": report.final_status,
        "verifiedBy": report.verified_by,
        "verifiedAt": iso(report.verified_at),
        "sourceType": extra.get("sourceType"),
        "emailFrom": extra.get("emailFrom"),
        "emailSubject": extra.get("emailSubject"),
        "emailReceivedAt": extra.get("emailReceivedAt"),
        "fileSizeBytes": extra.get("fileSizeBytes"),
    }


class PathologyService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _get_dispatch(self, order_id: UUID) -> SampleDispatch | None:
        result = await self.db.execute(select(SampleDispatch).where(SampleDispatch.order_id == order_id))
        return result.scalar_one_or_none()

    async def _ensure_dispatch(self, order_id: UUID, partner_lab_id: UUID | None = None) -> SampleDispatch:
        dispatch = await self._get_dispatch(order_id)
        if dispatch:
            return dispatch
        dispatch = SampleDispatch(
            order_id=order_id,
            partner_lab_id=partner_lab_id,
            status=SampleDispatchStatus.PENDING_DISPATCH.value,
        )
        self.db.add(dispatch)
        await self.db.flush()
        return dispatch

    async def _apply_dispatch_event(
        self,
        dispatch: SampleDispatch,
        event: PathologyWorkflowEvent,
        *,
        timestamp_field: str | None = None,
    ) -> SampleDispatch:
        if not can_transition(dispatch, event):
            raise AppError(
                f'Cannot apply "{event}" from status "{dispatch.status}"',
                status_code=409,
                error="invalid_transition",
            )
        result = apply_transition(dispatch, event)
        dispatch.status = result.status.value
        dispatch.updated_at = result.updated_at
        now = result.updated_at
        if timestamp_field == "collected_at":
            dispatch.collected_at = now
        elif timestamp_field == "dispatched_at":
            dispatch.dispatched_at = now
        elif timestamp_field == "received_at_lab":
            dispatch.received_at_lab = now
        elif timestamp_field == "awaiting_report_at":
            dispatch.awaiting_report_at = now
        await self.db.flush()
        return dispatch

    async def _transition_order_or_warn(
        self,
        order_id: UUID,
        event: OrderWorkflowEvent,
        *,
        performed_by: UUID | None = None,
        timeline_label: str | None = None,
        timeline_metadata: dict[str, Any] | None = None,
    ) -> None:
        try:
            await transition_order(
                self.db,
                order_id,
                event,
                performed_by=performed_by,
                timeline_label=timeline_label,
                timeline_metadata=timeline_metadata,
            )
        except AppError as exc:
            logger.warning("Order transition %s skipped for order %s: %s", event, order_id, exc)

    async def get_sample_dispatch(self, order_id: UUID) -> dict[str, Any] | None:
        dispatch = await self._get_dispatch(order_id)
        if not dispatch:
            return None
        order = await load_order_row(self.db, order_id)
        return dispatch_to_api(dispatch, order.get("partner_lab_name"))

    async def list_sample_dispatch_queue(self) -> list[dict[str, Any]]:
        result = await self.db.execute(
            text(
                """
                SELECT sd.id
                FROM operations.sample_dispatches sd
                WHERE sd.status NOT IN ('report_uploaded', 'not_required', 'cancelled')
                ORDER BY sd.updated_at ASC
                """
            )
        )
        rows: list[dict[str, Any]] = []
        for row in result.mappings():
            dispatch_result = await self.db.execute(
                select(SampleDispatch).where(SampleDispatch.id == row["id"])
            )
            dispatch = dispatch_result.scalar_one()
            order = await load_order_row(self.db, dispatch.order_id)
            rows.append(dispatch_to_api(dispatch, order.get("partner_lab_name")))
        return rows

    async def assign_lab(self, order_id: UUID, body: AssignLabRequest, user_id: UUID) -> dict[str, Any]:
        lab_result = await self.db.execute(select(LabPartner).where(LabPartner.id == body.partner_lab_id))
        lab = lab_result.scalar_one_or_none()
        if not lab:
            raise AppError("Lab partner not found", status_code=404)

        order_result = await self.db.execute(
            text(
                """
                UPDATE commerce.service_orders
                SET partner_lab_id = :lab_id, updated_at = now(), updated_by = :user_id
                WHERE id = :order_id
                RETURNING id
                """
            ),
            {"lab_id": body.partner_lab_id, "order_id": order_id, "user_id": user_id},
        )
        if not order_result.first():
            raise AppError("Order not found", status_code=404)

        dispatch = await self._ensure_dispatch(order_id, body.partner_lab_id)
        dispatch.partner_lab_id = body.partner_lab_id
        dispatch.status = SampleDispatchStatus.PENDING_DISPATCH.value
        extra = dict(dispatch.extra or {})
        extra["partnerLabName"] = lab.name
        dispatch.extra = extra

        try:
            await transition_order(
                self.db,
                order_id,
                OrderWorkflowEvent.ASSIGN_LAB,
                performed_by=user_id,
                timeline_label=f"{lab.name} assigned",
                timeline_metadata={"partnerLabId": str(lab.id), "partnerLabName": lab.name},
            )
        except AppError as exc:
            logger.warning("ASSIGN_LAB transition skipped for order %s: %s", order_id, exc)

        await append_timeline(
            self.db,
            order_id,
            "lab_assigned",
            f"{lab.name} assigned — create lab order and confirm pathology schedule.",
            performed_by=user_id,
            metadata={"partnerLabId": str(lab.id), "partnerLabName": lab.name},
        )
        order = await load_order_row(self.db, order_id)
        workflow = WorkflowNotificationService(self.db)
        tech_id = order.get("technician_id")
        target_user_ids = [UUID(str(tech_id))] if tech_id else None
        await workflow.order_event(
            "lab_assigned",
            order={
                "id": order["id"],
                "patientName": order.get("patient_name"),
                "patientPhone": order.get("patient_phone"),
                "patientId": order.get("patient_id"),
                "orderNumber": order.get("order_number"),
                "technicianName": order.get("technician_name"),
                "partnerLabName": lab.name,
            },
            target_user_ids=target_user_ids,
        )
        return dispatch_to_api(dispatch, lab.name)

    async def create_lab_partner_order(self, order_id: UUID, user_id: UUID) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        if not order.get("partner_lab_id"):
            raise AppError("Assign a lab partner first")

        ref = f"LAB-{order['order_number'].replace('-', '')[-8:]}-{uuid4().hex[:4].upper()}"
        await self.db.execute(
            text(
                """
                UPDATE commerce.service_orders
                SET pathology_lab_order_ref = :ref, updated_at = now(), updated_by = :user_id
                WHERE id = :order_id
                """
            ),
            {"ref": ref, "order_id": order_id, "user_id": user_id},
        )
        await append_timeline(
            self.db,
            order_id,
            "lab_order_created",
            f"Lab order {ref} created with {order.get('partner_lab_name')}",
            performed_by=user_id,
            metadata={"pathologyLabOrderRef": ref},
        )
        return order_to_api(await load_order_row(self.db, order_id))

    async def update_external_appointment(
        self,
        order_id: UUID,
        body: UpdateExternalAppointmentRequest,
        user_id: UUID,
    ) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        if not order.get("partner_lab_id"):
            raise AppError("Assign a lab partner first")
        if not order.get("pathology_lab_order_ref"):
            raise AppError("Create internal lab order before recording external appointment ID")

        dispatch = await self._get_dispatch(order_id)
        if dispatch and dispatch_at_least(dispatch.status, SampleDispatchStatus.SAMPLE_COLLECTED):
            raise AppError("Cannot update external appointment ID after sample collection")

        external_id = body.external_appointment_id.strip()
        if not external_id:
            raise AppError("External appointment ID is required")

        await self.db.execute(
            text(
                """
                UPDATE commerce.service_orders
                SET pathology_external_appointment_id = :external_id,
                    updated_at = now(),
                    updated_by = :user_id
                WHERE id = :order_id
                """
            ),
            {"external_id": external_id, "order_id": order_id, "user_id": user_id},
        )
        await append_timeline(
            self.db,
            order_id,
            "external_appointment_recorded",
            f"External lab appointment ID {external_id} recorded",
            performed_by=user_id,
            metadata={"pathologyExternalAppointmentId": external_id},
        )
        return order_to_api(await load_order_row(self.db, order_id))

    async def schedule_pathology(
        self,
        order_id: UUID,
        body: SchedulePathologyRequest,
        user_id: UUID,
    ) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        if not order.get("partner_lab_id") or not order.get("pathology_lab_order_ref"):
            raise AppError("Assign lab partner and create lab order before confirming schedule")
        if not order.get("pathology_external_appointment_id"):
            raise AppError("Record external lab appointment ID before confirming schedule")

        await self.db.execute(
            text(
                """
                UPDATE commerce.service_orders
                SET pathology_time_slot = :time_slot,
                    pathology_scheduled_at = :scheduled_at,
                    pathology_patient_preferred_at = COALESCE(pathology_patient_preferred_at, :scheduled_at),
                    pathology_visit_outcome = NULL,
                    pathology_visit_confirmed_at = NULL,
                    pathology_visit_confirmed_by = NULL,
                    updated_at = now(),
                    updated_by = :user_id
                WHERE id = :order_id
                """
            ),
            {
                "time_slot": body.time_slot,
                "scheduled_at": body.scheduled_at,
                "order_id": order_id,
                "user_id": user_id,
            },
        )

        dispatch = await self._ensure_dispatch(order_id, order.get("partner_lab_id"))
        extra = dict(dispatch.extra or {})
        extra["notes"] = f"Scheduled lab visit · {body.time_slot}"
        dispatch.extra = extra

        await append_timeline(
            self.db,
            order_id,
            "pathology_scheduled",
            f"{order.get('partner_lab_name')} · {body.time_slot} · Ref {order.get('pathology_lab_order_ref')}",
            performed_by=user_id,
            metadata={"scheduledAt": body.scheduled_at.isoformat(), "timeSlot": body.time_slot},
        )
        return order_to_api(await load_order_row(self.db, order_id))

    async def confirm_lab_partner_visit(
        self,
        order_id: UUID,
        body: LabPartnerVisitRequest,
        user_id: UUID,
    ) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        if not order.get("pathology_scheduled_at"):
            raise AppError("Confirm pathology schedule first")

        dispatch = await self._get_dispatch(order_id)
        if dispatch and dispatch_at_least(dispatch.status, SampleDispatchStatus.SAMPLE_COLLECTED):
            raise AppError("Sample already collected — visit confirmation is locked")

        now = datetime.now(UTC)
        if body.outcome == "no_show":
            await self.db.execute(
                text(
                    """
                    UPDATE commerce.service_orders
                    SET pathology_visit_outcome = 'no_show',
                        pathology_visit_confirmed_at = :now,
                        pathology_visit_confirmed_by = :user_id,
                        pathology_scheduled_at = NULL,
                        pathology_time_slot = NULL,
                        updated_at = now(),
                        updated_by = :user_id
                    WHERE id = :order_id
                    """
                ),
                {"now": now, "user_id": user_id, "order_id": order_id},
            )
            label = "Lab collector did not visit — reschedule pathology visit"
            if body.notes:
                label = f"{label} · {body.notes}"
            await append_timeline(
                self.db,
                order_id,
                "pathology_visit_no_show",
                label,
                performed_by=user_id,
                metadata={"outcome": "no_show", "notes": body.notes},
            )
        else:
            await self.db.execute(
                text(
                    """
                    UPDATE commerce.service_orders
                    SET pathology_visit_outcome = 'visited',
                        pathology_visit_confirmed_at = :now,
                        pathology_visit_confirmed_by = :user_id,
                        updated_at = now(),
                        updated_by = :user_id
                    WHERE id = :order_id
                    """
                ),
                {"now": now, "user_id": user_id, "order_id": order_id},
            )
            await append_timeline(
                self.db,
                order_id,
                "pathology_visit_confirmed",
                f"Lab collector visited patient at scheduled time"
                + (f" · {body.notes}" if body.notes else ""),
                performed_by=user_id,
                metadata={"outcome": "visited", "notes": body.notes},
            )
        return order_to_api(await load_order_row(self.db, order_id))

    async def mark_lab_partner_collected(self, order_id: UUID, user_id: UUID) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        if not order.get("pathology_scheduled_at"):
            raise AppError("Confirm pathology schedule first")
        if order.get("pathology_visit_outcome") != "visited":
            raise AppError("Confirm lab collector visit before marking sample collected")

        dispatch = await self._ensure_dispatch(order_id, order.get("partner_lab_id"))
        extra = dict(dispatch.extra or {})
        extra["collectedBy"] = order.get("partner_lab_name") or "Lab partner"
        dispatch.extra = extra
        dispatch = await self._apply_dispatch_event(
            dispatch, PathologyWorkflowEvent.COLLECT_SAMPLE, timestamp_field="collected_at"
        )
        await append_timeline(
            self.db,
            order_id,
            "sample_collected",
            f"Blood sample collected by {order.get('partner_lab_name')} at scheduled visit",
            performed_by=user_id,
        )
        return dispatch_to_api(dispatch, order.get("partner_lab_name"))

    async def upload_collection_proof(
        self,
        order_id: UUID,
        user_id: UUID,
        roles: list[str],
        body: CollectionProofRequest,
    ) -> dict[str, Any]:
        dispatch = await self._ensure_dispatch(order_id)
        order = await load_order_row(self.db, order_id)
        is_handover = body.photo_type == "lab_handover"
        if is_handover and dispatch.status != SampleDispatchStatus.SAMPLE_COLLECTED.value:
            raise AppError("Mark sample as collected before uploading lab handover photo")
        if not is_handover and dispatch.status != SampleDispatchStatus.PENDING_DISPATCH.value:
            raise AppError("Collection photos can only be added before sample is confirmed collected")

        extra = dict(dispatch.extra or {})
        photos = list(extra.get("collectionPhotos", []))
        uploaded_at = datetime.now(UTC).isoformat()
        file_id = body.file_id or f"proof-{order_id}-{uuid4().hex[:8]}"
        storage_url = body.storage_url
        if not storage_url:
            raise AppError("storageUrl is required — upload the file via /storage/presign first")

        photo = {
            "id": file_id,
            "orderId": str(order_id),
            "photoType": body.photo_type,
            "fileName": body.file_name,
            "storageUrl": storage_url,
            "createdAt": uploaded_at,
        }
        photos.append(photo)
        extra["collectionPhotos"] = photos
        if not is_handover:
            extra["collectionProofFileId"] = photo["id"]
            extra["collectionProofFileName"] = body.file_name
            extra["collectionProofUploadedAt"] = uploaded_at
            if body.order_label_verified or body.photo_type == "order_id_label":
                extra["orderLabelVerified"] = True
        dispatch.extra = extra
        dispatch.updated_at = datetime.now(UTC)
        await append_timeline(
            self.db,
            order_id,
            "sample_handover_photo" if is_handover else "sample_proof_uploaded",
            f"{body.photo_type.replace('_', ' ')} photo · order {order['order_number']}",
            performed_by=user_id,
        )
        await self.db.flush()
        return dispatch_to_api(dispatch, order.get("partner_lab_name"))

    async def mark_sample_collected(
        self,
        order_id: UUID,
        user_id: UUID,
        roles: list[str],
        body: MarkSampleCollectedRequest,
    ) -> dict[str, Any]:
        dispatch = await self._ensure_dispatch(order_id)
        if dispatch.status != SampleDispatchStatus.PENDING_DISPATCH.value:
            raise AppError("Blood sample is already collected or submitted")

        extra = dict(dispatch.extra or {})
        photos = extra.get("collectionPhotos", [])
        has_tube = any(p.get("photoType") in {"order_id_label", "sample_tube"} for p in photos)
        has_technician = any(p.get("photoType") == "technician_collector" for p in photos)
        if not has_tube:
            raise AppError("Upload tube label and sample tube photos with order ID visible")
        if not has_technician:
            raise AppError("Upload a technician photo to confirm you collected the sample")

        extra["collectedBy"] = body.collected_by
        extra["orderLabelVerified"] = True
        dispatch.extra = extra
        dispatch = await self._apply_dispatch_event(
            dispatch, PathologyWorkflowEvent.COLLECT_SAMPLE, timestamp_field="collected_at"
        )
        order = await load_order_row(self.db, order_id)
        await append_timeline(
            self.db,
            order_id,
            "sample_collected",
            f"Blood sample collected · {len(photos)} photo(s) · order {order['order_number']}",
            performed_by=user_id,
        )
        return dispatch_to_api(dispatch, order.get("partner_lab_name"))

    async def technician_submit_sample_to_lab(
        self,
        order_id: UUID,
        user_id: UUID,
        roles: list[str],
        body: SubmitSampleToLabRequest,
    ) -> dict[str, Any]:
        dispatch = await self._ensure_dispatch(order_id)
        if dispatch.status != SampleDispatchStatus.SAMPLE_COLLECTED.value:
            raise AppError("Mark blood sample as collected before handing over to lab")

        extra = dict(dispatch.extra or {})
        if not any(p.get("photoType") == "lab_handover" for p in extra.get("collectionPhotos", [])):
            raise AppError("Upload a handover photo at the lab before confirming")

        lab_result = await self.db.execute(select(LabPartner).where(LabPartner.id == body.partner_lab_id))
        lab = lab_result.scalar_one_or_none()
        if not lab:
            raise AppError("Lab partner not found", status_code=404)

        await self.db.execute(
            text(
                """
                UPDATE commerce.service_orders
                SET partner_lab_id = :lab_id, updated_at = now()
                WHERE id = :order_id
                """
            ),
            {"lab_id": body.partner_lab_id, "order_id": order_id},
        )

        dispatch.partner_lab_id = lab.id
        extra["partnerLabName"] = lab.name
        extra["dispatchedBy"] = body.dispatched_by
        extra["courierRef"] = body.courier_ref
        dispatch.extra = extra
        dispatch = await self._apply_dispatch_event(
            dispatch, PathologyWorkflowEvent.DISPATCH, timestamp_field="dispatched_at"
        )

        try:
            await transition_order(self.db, order_id, OrderWorkflowEvent.ASSIGN_LAB, performed_by=user_id)
        except AppError:
            pass

        await append_timeline(
            self.db,
            order_id,
            "sample_dispatched",
            f"Handed over to {lab.name}",
            performed_by=user_id,
            metadata={"partnerLabId": str(lab.id), "courierRef": body.courier_ref or ""},
        )
        return dispatch_to_api(dispatch, lab.name)

    async def dispatch_sample(
        self,
        order_id: UUID,
        body: DispatchSampleRequest,
        user_id: UUID,
    ) -> dict[str, Any]:
        dispatch = await self._get_dispatch(order_id)
        if not dispatch or not dispatch.partner_lab_id:
            raise AppError("Assign lab partner first")
        if dispatch.status != SampleDispatchStatus.SAMPLE_COLLECTED.value:
            raise AppError("Mark blood sample as collected before submitting to lab")

        extra = dict(dispatch.extra or {})
        extra["dispatchedBy"] = body.dispatched_by
        extra["courierRef"] = body.courier_ref
        dispatch.extra = extra
        dispatch = await self._apply_dispatch_event(
            dispatch, PathologyWorkflowEvent.DISPATCH, timestamp_field="dispatched_at"
        )
        order = await load_order_row(self.db, order_id)
        await append_timeline(
            self.db,
            order_id,
            "sample_dispatched",
            f"Courier to {order.get('partner_lab_name')}",
            performed_by=user_id,
        )
        return dispatch_to_api(dispatch, order.get("partner_lab_name"))

    async def mark_received_at_lab(self, order_id: UUID, user_id: UUID) -> dict[str, Any]:
        dispatch = await self._get_dispatch(order_id)
        if not dispatch:
            raise AppError("No sample dispatch record", status_code=404)
        dispatch = await self._apply_dispatch_event(
            dispatch, PathologyWorkflowEvent.MARK_RECEIVED, timestamp_field="received_at_lab"
        )
        order = await load_order_row(self.db, order_id)
        await append_timeline(
            self.db,
            order_id,
            "sample_received_at_lab",
            f"{order.get('partner_lab_name')} confirmed receipt",
            performed_by=user_id,
        )
        return dispatch_to_api(dispatch, order.get("partner_lab_name"))

    async def mark_awaiting_report(self, order_id: UUID, user_id: UUID) -> dict[str, Any]:
        dispatch = await self._get_dispatch(order_id)
        if not dispatch:
            raise AppError("No sample dispatch record", status_code=404)
        dispatch = await self._apply_dispatch_event(
            dispatch, PathologyWorkflowEvent.MARK_AWAITING_REPORT, timestamp_field="awaiting_report_at"
        )
        order = await load_order_row(self.db, order_id)
        await append_timeline(
            self.db,
            order_id,
            "awaiting_lab_report",
            "Watch inbox for partner lab PDF",
            performed_by=user_id,
        )
        return dispatch_to_api(dispatch, order.get("partner_lab_name"))

    async def upload_lab_report_multipart(
        self,
        order_id: UUID,
        file: UploadFile,
        user_id: UUID,
        *,
        uploaded_by: str | None = None,
        email_from: str | None = None,
        email_subject: str | None = None,
        email_received_at: str | None = None,
    ) -> dict[str, Any]:
        from app.services.storage_service import StorageService

        order = await load_order_row(self.db, order_id)
        if not order.get("partner_lab_id"):
            raise AppError("Assign a lab partner first")

        dispatch = await self._get_dispatch(order_id)
        if not dispatch or dispatch.status != SampleDispatchStatus.AWAITING_REPORT.value:
            raise AppError("Mark sample as awaiting report before uploading lab PDF")

        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise AppError("Only PDF files from lab email are accepted")

        storage = StorageService(self.db)
        upload = await storage.upload_multipart(file, user_id, "lab_report", order_id)

        report = LabReportUpload(
            order_id=order_id,
            patient_id=order["patient_id"],
            partner_lab_id=order["partner_lab_id"],
            file_name=upload["fileName"],
            file_url=upload["storageUrl"],
            file_id=str(upload["fileId"]),
            uploaded_by=uploaded_by or "operations",
            extraction_status="not_started",
            final_status="pending",
            extra={
                "sourceType": "partner_lab_email",
                "emailFrom": email_from,
                "emailSubject": email_subject,
                "emailReceivedAt": email_received_at,
                "fileSizeBytes": upload.get("fileSizeBytes"),
            },
        )
        self.db.add(report)

        dispatch = await self._apply_dispatch_event(dispatch, PathologyWorkflowEvent.UPLOAD_REPORT)
        await self._transition_order_or_warn(
            order_id,
            OrderWorkflowEvent.UPLOAD_LAB_REPORT,
            performed_by=user_id,
            timeline_label=f"{upload['fileName']} uploaded",
        )

        await append_timeline(
            self.db,
            order_id,
            "lab_report_uploaded",
            f"{upload['fileName']} from lab email · AI extraction queued",
            performed_by=user_id,
        )
        await self.db.flush()
        return lab_report_to_api(report, order.get("partner_lab_name"))

    async def get_report(self, order_id: UUID) -> dict[str, Any] | None:
        result = await self.db.execute(
            select(LabReportUpload).where(LabReportUpload.order_id == order_id).order_by(LabReportUpload.uploaded_at.desc())
        )
        report = result.scalars().first()
        if not report:
            return None
        order = await load_order_row(self.db, order_id)
        return lab_report_to_api(report, order.get("partner_lab_name"))

    async def list_lab_report_queue(
        self,
        *,
        search: str | None = None,
        dispatch_status: str | None = None,
        lab_id: UUID | None = None,
        extraction_status: str | None = None,
    ) -> list[dict[str, Any]]:
        result = await self.db.execute(
            text(
                """
                SELECT o.id AS order_id
                FROM commerce.service_orders o
                JOIN commerce.liver_care_packages p ON p.id = o.package_id
                WHERE p.pathology_included = true AND o.deleted_at IS NULL
                ORDER BY o.updated_at DESC
                """
            )
        )
        rows: list[dict[str, Any]] = []
        for row in result.mappings():
            order = await load_order_row(self.db, row["order_id"])
            dispatch = await self._get_dispatch(row["order_id"])
            report_result = await self.db.execute(
                select(LabReportUpload).where(LabReportUpload.order_id == row["order_id"]).limit(1)
            )
            report = report_result.scalar_one_or_none()
            job_result = await self.db.execute(
                select(AIExtractionJob).where(AIExtractionJob.order_id == row["order_id"]).limit(1)
            )
            job = job_result.scalar_one_or_none()

            queue_row = {
                "id": dispatch.id if dispatch else row["order_id"],
                "orderId": row["order_id"],
                "orderNumber": order["order_number"],
                "patientId": order["patient_id"],
                "patientName": order["patient_name"],
                "packageCode": order["package_code"],
                "partnerLabId": order.get("partner_lab_id"),
                "partnerLabName": order.get("partner_lab_name"),
                "dispatchStatus": dispatch.status if dispatch else "not_started",
                "extractionStatus": job.status if job else (report.extraction_status if report else None),
                "reportFileName": report.file_name if report else None,
                "reportUploadedAt": iso(report.uploaded_at) if report else None,
                "courierRef": (dispatch.extra or {}).get("courierRef") if dispatch else None,
                "pathologyExternalAppointmentId": order.get("pathology_external_appointment_id"),
                "pathologyVisitOutcome": order.get("pathology_visit_outcome"),
                "pathologyVisitConfirmedAt": iso(order.get("pathology_visit_confirmed_at")),
                "updatedAt": iso(dispatch.updated_at if dispatch else order["updated_at"]),
            }
            if search:
                needle = search.lower()
                hay = f"{queue_row['orderNumber']} {queue_row['patientName']}".lower()
                if needle not in hay:
                    continue
            if dispatch_status and queue_row["dispatchStatus"] != dispatch_status:
                continue
            if lab_id and queue_row["partnerLabId"] != lab_id:
                continue
            if extraction_status and queue_row["extractionStatus"] != extraction_status:
                continue
            rows.append(queue_row)
        return rows

    async def get_lab_report_queue_row(self, order_id: UUID) -> dict[str, Any] | None:
        rows = await self.list_lab_report_queue()
        return next((row for row in rows if row["orderId"] == order_id), None)

    async def list_reports_pending_extraction(self) -> list[dict[str, Any]]:
        result = await self.db.execute(
            select(LabReportUpload).where(
                LabReportUpload.extraction_status.in_(["not_started", "extracted", "review_pending"])
            )
        )
        reports = []
        for report in result.scalars():
            order = await load_order_row(self.db, report.order_id)
            reports.append(lab_report_to_api(report, order.get("partner_lab_name")))
        return reports
