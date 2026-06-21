from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import AppError
from app.integrations.twilio_service import TwilioVerifyService
from app.services.integration_settings_service import IntegrationSettingsService
from app.services.otp_challenge_service import (
    OtpChallengeService,
    PURPOSE_TECHNICIAN_COMPLETION,
    PURPOSE_TECHNICIAN_INTAKE,
)
from app.domain.order_workflow import OrderWorkflowEvent
from app.models.clinical import FibrosisScanRecord, ScanPatientIntake
from app.models.operations import SampleDispatch, TechnicianOrderVisit
from app.schemas.technician import (
    AttachScanFileRequest,
    CollectionProofRequest,
    CompleteVisitRequest,
    FibroScanIntakeInput,
    FibrosisScanInput,
    MarkSampleCollectedRequest,
    ScanPatientIntakeInput,
    SubmitSampleToLabRequest,
    UnableVisitRequest,
    VerifyPatientIntakeRequest,
)
from app.services.order_helpers import (
    append_timeline,
    intake_json_storage,
    iso,
    load_order_row,
    load_order_visit_location,
    order_to_api,
    require_technician_order,
    transition_order,
)
from app.services.storage_service import StorageService
from app.services.workflow_notifications import WorkflowNotificationService
from app.utils.phone import normalize_phone


def _visit_extra(visit: TechnicianOrderVisit) -> dict[str, Any]:
    return dict(visit.extra or {})


def _dispatch_extra(dispatch: SampleDispatch) -> dict[str, Any]:
    return dict(dispatch.extra or {})


def visit_to_api(visit: TechnicianOrderVisit, location: dict[str, Any] | None = None) -> dict[str, Any]:
    extra = _visit_extra(visit)
    payload: dict[str, Any] = {
        "orderId": visit.order_id,
        "technicianId": visit.technician_id,
        "visitStep": visit.visit_step,
        "unableReason": visit.unable_reason,
        "rescanCount": extra.get("rescanCount", 0),
        "visitStartedAt": iso(visit.started_at),
        "reachedAt": iso(visit.reached_at),
        "completedAt": iso(visit.completed_at),
        "visitCompletionOtpSentAt": extra.get("visitCompletionOtpSentAt"),
        "visitCompletionOtpVerified": bool(extra.get("visitCompletionOtpVerified")),
        "visitCompletionOtpVerifiedAt": extra.get("visitCompletionOtpVerifiedAt"),
        "patientIntakeOtpSentAt": extra.get("patientIntakeOtpSentAt"),
    }
    if location:
        payload.update(location)
    return payload


def intake_data_to_api(order_id: UUID, data: dict[str, Any]) -> dict[str, Any]:
    return {"orderId": order_id, **data}


def scan_to_api(record: FibrosisScanRecord, order_id: UUID, patient_id: UUID) -> dict[str, Any]:
    metrics = dict(record.metrics or {})
    return {
        "id": record.id,
        "orderId": order_id,
        "patientId": patient_id,
        "rescanCount": metrics.get("rescanCount", 0),
        "liverStiffnessKpa": record.lsm_kpa,
        "capDbm": record.cap_db_m,
        "iqr": record.iqr,
        "iqrMedianPercent": metrics.get("iqrMedianPercent", 0),
        "validMeasurements": metrics.get("validMeasurements", 0),
        "totalMeasurements": metrics.get("totalMeasurements", 0),
        "successRatePercent": metrics.get("successRatePercent", 0),
        "probeType": record.probe_type,
        "scanAt": metrics.get("scanAt") or iso(record.created_at),
        "operatorName": metrics.get("operatorName", ""),
        "deviceSerial": record.device_serial,
        "fastingStatus": metrics.get("fastingStatus", False),
        "bmi": metrics.get("bmi", 0),
        "interpretation": record.interpretation,
        "steatosisGrade": record.steatosis_grade,
        "fibrosisStage": record.fibrosis_stage,
        "remarks": metrics.get("remarks"),
        "scanFileId": metrics.get("scanFileId"),
        "scanFileUrl": metrics.get("scanFileUrl"),
        "scanReportDocumentType": metrics.get("scanReportDocumentType"),
        "source": record.source or "manual",
        "locked": record.locked,
        "createdAt": iso(record.created_at),
        "updatedAt": iso(record.updated_at),
    }


# Technician field portal only surfaces scan-phase orders — not pathology, AI, report, or consult.
TECHNICIAN_FIELD_ORDER_STATUSES = (
    "technician_assigned",
    "scan_scheduled",
    "scan_in_progress",
    "scan_completed",
)


class TechnicianOrderService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self._verify = TwilioVerifyService(IntegrationSettingsService(db))
        self._otp = OtpChallengeService(db)

    async def _verify_otp(self, phone: str, otp: str, purpose: str) -> None:
        normalized = normalize_phone(phone)
        settings = get_settings()
        if settings.effective_otp_mode == "demo":
            await self._otp.verify_challenge(normalized, purpose, otp, status_code=400)
            return
        if not await self._verify.check_verification(phone, otp):
            raise AppError("Invalid or expired OTP", status_code=400)

    async def _send_otp(
        self, phone: str, purpose: str
    ) -> dict[str, Any]:
        normalized = normalize_phone(phone)
        await self._otp.check_send_allowed(normalized, purpose)
        settings = get_settings()
        if settings.effective_otp_mode == "demo":
            demo = OtpChallengeService.demo_code()
            if not demo:
                raise AppError("OTP provider not configured", status_code=501, error="not_configured")
            await self._otp.create_challenge(normalized, purpose, demo)
        else:
            await self._verify.send_verification(phone)
            await self._otp.create_challenge(normalized, purpose, "twilio_verify")
        return self._otp.send_response_fields()

    async def list_assigned(self, technician_id: UUID) -> list[dict[str, Any]]:
        from sqlalchemy import text

        result = await self.db.execute(
            text(
                """
                SELECT o.id
                FROM commerce.service_orders o
                WHERE o.technician_id = :technician_id
                  AND o.order_status = ANY(:field_statuses)
                  AND o.deleted_at IS NULL
                ORDER BY o.updated_at DESC, o.created_at DESC
                """
            ),
            {
                "technician_id": technician_id,
                "field_statuses": list(TECHNICIAN_FIELD_ORDER_STATUSES),
            },
        )
        rows = []
        for row in result.mappings():
            order = await load_order_row(self.db, row["id"])
            location = await load_order_visit_location(self.db, row["id"], order["patient_id"])
            rows.append({**order_to_api(order), **location})
        return rows

    async def get_order_detail(
        self, order_id: UUID, user_id: UUID, roles: list[str]
    ) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        require_technician_order(order, user_id, roles)
        location = await load_order_visit_location(self.db, order_id, order["patient_id"])
        visit = await self._get_visit(order_id)
        api_order = order_to_api(order)
        return {
            **api_order,
            **location,
            "visitStep": visit.visit_step if visit else "assigned",
        }

    async def _visit_location(self, order_id: UUID, patient_id: UUID) -> dict[str, Any]:
        return await load_order_visit_location(self.db, order_id, patient_id)

    async def _get_visit(self, order_id: UUID) -> TechnicianOrderVisit | None:
        result = await self.db.execute(
            select(TechnicianOrderVisit).where(TechnicianOrderVisit.order_id == order_id)
        )
        return result.scalar_one_or_none()

    async def _ensure_visit(self, order_id: UUID, technician_id: UUID | None) -> TechnicianOrderVisit:
        visit = await self._get_visit(order_id)
        if visit:
            return visit
        visit = TechnicianOrderVisit(order_id=order_id, technician_id=technician_id, visit_step="assigned")
        self.db.add(visit)
        await self.db.flush()
        return visit

    async def get_visit(self, order_id: UUID) -> dict[str, Any] | None:
        visit = await self._get_visit(order_id)
        if not visit:
            return None
        order = await load_order_row(self.db, order_id)
        location = await self._visit_location(order_id, order["patient_id"])
        return visit_to_api(visit, location)

    async def get_scan(self, order_id: UUID) -> dict[str, Any] | None:
        order = await load_order_row(self.db, order_id)
        result = await self.db.execute(
            select(FibrosisScanRecord).where(FibrosisScanRecord.order_id == order_id)
        )
        record = result.scalar_one_or_none()
        return scan_to_api(record, order_id, order["patient_id"]) if record else None

    async def get_patient_intake(self, order_id: UUID) -> dict[str, Any] | None:
        result = await self.db.execute(
            select(ScanPatientIntake).where(ScanPatientIntake.order_id == order_id)
        )
        row = result.scalar_one_or_none()
        if not row:
            return None
        return intake_data_to_api(order_id, dict(row.data or {}))

    async def verify_patient_intake(
        self,
        order_id: UUID,
        user_id: UUID,
        roles: list[str],
        body: VerifyPatientIntakeRequest,
    ) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        require_technician_order(order, user_id, roles)
        await self._verify_otp(order["patient_phone"], body.otp, PURPOSE_TECHNICIAN_INTAKE)

        existing = await self.get_patient_intake(order_id)
        payload = body.model_dump(by_alias=True, exclude={"otp"})
        if existing:
            payload = {**existing, **payload}
        payload["phoneOtpVerified"] = True
        payload["technicianVerifiedAt"] = datetime.now(UTC).isoformat()
        payload["technicianVerifiedBy"] = str(user_id)
        payload["operatorVerificationStatus"] = "approved"

        await self._upsert_intake(order_id, payload, patient_verified=True)
        await append_timeline(
            self.db,
            order_id,
            "patient_intake_verified",
            f"Patient intake submitted · Phone OTP verified · {body.name}",
            performed_by=user_id,
        )
        return await self.get_patient_intake(order_id)  # type: ignore[return-value]

    async def send_patient_intake_otp(
        self, order_id: UUID, user_id: UUID, roles: list[str]
    ) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        require_technician_order(order, user_id, roles)
        visit = await self._ensure_visit(order_id, order.get("technician_id"))
        if visit.visit_step not in {"reached_location", "scan_in_progress"}:
            raise AppError("Mark yourself at the patient location before sending intake OTP")

        otp_meta = await self._send_otp(order["patient_phone"], PURPOSE_TECHNICIAN_INTAKE)
        extra = _visit_extra(visit)
        extra["patientIntakeOtpSentAt"] = datetime.now(UTC).isoformat()
        visit.extra = extra
        await append_timeline(
            self.db,
            order_id,
            "patient_intake_otp_sent",
            f"Intake OTP sent to {order['patient_phone']}",
            performed_by=user_id,
        )
        await self.db.flush()
        location = await self._visit_location(order_id, order["patient_id"])
        return {**visit_to_api(visit, location), **otp_meta}

    async def submit_fibroscan_intake(
        self,
        order_id: UUID,
        user_id: UUID,
        roles: list[str],
        body: FibroScanIntakeInput,
    ) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        require_technician_order(order, user_id, roles)

        existing = await self.get_patient_intake(order_id)
        if not existing or not existing.get("technicianVerifiedAt"):
            raise AppError("Submit patient details intake before FibroScan intake")

        payload = {
            **existing,
            "devicePatientCode": body.device_patient_code.strip(),
            "machinePatientName": body.machine_patient_name.strip(),
            "machinePatientAge": body.machine_patient_age,
            "machinePatientSex": body.machine_patient_sex,
            "machinePatientPhone": body.machine_patient_phone.strip(),
            "fibroscanIntakeSubmittedAt": datetime.now(UTC).isoformat(),
            "fibroscanIntakeSubmittedBy": str(user_id),
            "fibroscanOperatorVerificationStatus": "pending",
        }
        await self._upsert_intake(order_id, payload, fibroscan_intake_submitted=True)
        await append_timeline(
            self.db,
            order_id,
            "fibroscan_intake_submitted",
            f"Device code {body.device_patient_code} · {body.machine_patient_name}",
            performed_by=user_id,
        )
        return await self.get_patient_intake(order_id)  # type: ignore[return-value]

    async def mark_visit_started(self, order_id: UUID, user_id: UUID, roles: list[str]) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        require_technician_order(order, user_id, roles)
        visit = await self._ensure_visit(order_id, order.get("technician_id"))
        visit.visit_step = "visit_started"
        visit.started_at = datetime.now(UTC)
        await append_timeline(self.db, order_id, "visit_started", "En route to patient home", performed_by=user_id)
        workflow = WorkflowNotificationService(self.db)
        await workflow.order_event("visit_started", order=order)
        await self.db.flush()
        location = await self._visit_location(order_id, order["patient_id"])
        return visit_to_api(visit, location)

    async def mark_reached(self, order_id: UUID, user_id: UUID, roles: list[str]) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        require_technician_order(order, user_id, roles)
        visit = await self._ensure_visit(order_id, order.get("technician_id"))
        visit.visit_step = "reached_location"
        visit.reached_at = datetime.now(UTC)
        try:
            await transition_order(
                self.db,
                order_id,
                OrderWorkflowEvent.START_SCAN,
                performed_by=user_id,
                timeline_label="Scan session started",
            )
        except AppError:
            pass
        await append_timeline(self.db, order_id, "reached_location", "Scan session started", performed_by=user_id)
        workflow = WorkflowNotificationService(self.db)
        await workflow.order_event("visit_reached", order=order)
        await self.db.flush()
        location = await self._visit_location(order_id, order["patient_id"])
        return visit_to_api(visit, location)

    async def fetch_device_scan(
        self,
        order_id: UUID,
        user_id: UUID,
        roles: list[str],
        device_serial: str | None = None,
    ) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        require_technician_order(order, user_id, roles)
        intake = await self.get_patient_intake(order_id)
        if not intake or not intake.get("fibroscanIntakeSubmittedAt"):
            raise AppError("Submit FibroScan intake before fetching scan data")

        visit = await self._ensure_visit(order_id, order.get("technician_id"))
        visit.visit_step = "scan_in_progress"

        now = datetime.now(UTC)
        metrics = {
            "rescanCount": _visit_extra(visit).get("rescanCount", 0),
            "iqrMedianPercent": 12,
            "validMeasurements": 10,
            "totalMeasurements": 10,
            "successRatePercent": 100,
            "scanAt": now.isoformat(),
            "operatorName": order.get("technician_name") or "Technician",
            "fastingStatus": True,
            "bmi": 24.5,
            "remarks": None,
        }
        record = await self._upsert_scan(
            order_id,
            order["patient_id"],
            lsm_kpa=Decimal("6.2"),
            cap_db_m=Decimal("248"),
            iqr=Decimal("0.8"),
            probe_type="M",
            device_serial=device_serial or "DEMO-FIBRO-001",
            fibrosis_stage="F2",
            steatosis_grade="S1",
            interpretation="Significant fibrosis · moderate steatosis",
            source="device",
            metrics=metrics,
        )
        await append_timeline(
            self.db,
            order_id,
            "scan_data_fetched",
            "LSM 6.2 kPa · CAP 248 dB/m · F2",
            performed_by=user_id,
            metadata={"deviceSerial": device_serial or "DEMO-FIBRO-001", "fibrosisStage": "F2"},
        )
        return scan_to_api(record, order_id, order["patient_id"])

    async def save_scan(
        self,
        order_id: UUID,
        user_id: UUID,
        roles: list[str],
        body: FibrosisScanInput,
    ) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        require_technician_order(order, user_id, roles)

        intake = await self.get_patient_intake(order_id)
        if not intake or not intake.get("fibroscanIntakeSubmittedAt"):
            raise AppError("Submit FibroScan intake before saving scan data")

        existing = await self.get_scan(order_id)
        if existing and existing.get("locked"):
            raise AppError("Scan record is locked")

        visit = await self._ensure_visit(order_id, order.get("technician_id"))
        visit.visit_step = "scan_in_progress"

        metrics = {
            "rescanCount": body.rescan_count,
            "iqrMedianPercent": float(body.iqr_median_percent),
            "validMeasurements": body.valid_measurements,
            "totalMeasurements": body.total_measurements,
            "successRatePercent": float(body.success_rate_percent),
            "scanAt": body.scan_at.isoformat(),
            "operatorName": body.operator_name,
            "fastingStatus": body.fasting_status,
            "bmi": float(body.bmi),
            "remarks": body.remarks,
            "scanFileId": body.scan_file_id,
            "scanFileUrl": body.scan_file_url,
        }
        record = await self._upsert_scan(
            order_id,
            order["patient_id"],
            lsm_kpa=body.liver_stiffness_kpa,
            cap_db_m=body.cap_dbm,
            iqr=body.iqr,
            probe_type=body.probe_type,
            device_serial=body.device_serial,
            fibrosis_stage=body.fibrosis_stage,
            steatosis_grade=body.steatosis_grade,
            interpretation=body.interpretation,
            source=body.source,
            metrics=metrics,
        )
        await append_timeline(
            self.db,
            order_id,
            "scan_saved",
            f"LSM {body.liver_stiffness_kpa} kPa · stage {body.fibrosis_stage}",
            performed_by=user_id,
        )
        return scan_to_api(record, order_id, order["patient_id"])

    async def attach_scan_file(
        self,
        order_id: UUID,
        user_id: UUID,
        roles: list[str],
        body: AttachScanFileRequest,
    ) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        require_technician_order(order, user_id, roles)
        result = await self.db.execute(
            select(FibrosisScanRecord).where(FibrosisScanRecord.order_id == order_id)
        )
        record = result.scalar_one_or_none()
        if not record:
            raise AppError("Save scan KPIs before uploading report proof")

        metrics = dict(record.metrics or {})
        file_id = body.file_id or str(uuid4())
        storage_url = body.storage_url
        if not storage_url:
            raise AppError("storageUrl is required — upload the file via /storage/presign first")
        metrics["scanFileId"] = file_id
        metrics["scanFileUrl"] = storage_url
        if body.scan_report_document_type:
            metrics["scanReportDocumentType"] = body.scan_report_document_type
        record.metrics = metrics
        if record.source == "device":
            record.source = "device"
        else:
            record.source = "upload"
        await append_timeline(
            self.db, order_id, "scan_report_proof_uploaded", body.file_name, performed_by=user_id
        )
        await self.db.flush()
        return scan_to_api(record, order_id, order["patient_id"])

    async def attach_scan_file_upload(
        self,
        order_id: UUID,
        user_id: UUID,
        roles: list[str],
        file: UploadFile,
        scan_report_document_type: str | None,
    ) -> dict[str, Any]:
        """Upload report proof server-side (avoids browser presigned S3 PUT / confirm mismatch)."""
        storage = StorageService(self.db)
        uploaded = await storage.upload_multipart(file, user_id, "fibroscan_report", order_id)
        return await self.attach_scan_file(
            order_id,
            user_id,
            roles,
            AttachScanFileRequest(
                file_name=uploaded["fileName"],
                file_type=uploaded.get("mimeType"),
                file_id=str(uploaded["fileId"]),
                storage_url=uploaded["storageUrl"],
                scan_report_document_type=scan_report_document_type,
            ),
        )

    async def send_visit_completion_otp(self, order_id: UUID, user_id: UUID, roles: list[str]) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        require_technician_order(order, user_id, roles)
        visit = await self._ensure_visit(order_id, order.get("technician_id"))
        if visit.visit_step not in {"reached_location", "scan_in_progress"}:
            raise AppError("Reach patient location before completing the visit")

        otp_meta = await self._send_otp(order["patient_phone"], PURPOSE_TECHNICIAN_COMPLETION)
        extra = _visit_extra(visit)
        extra["visitCompletionOtpSentAt"] = datetime.now(UTC).isoformat()
        visit.extra = extra
        await append_timeline(
            self.db,
            order_id,
            "visit_completion_otp_sent",
            f"Completion OTP sent to {order['patient_phone']}",
            performed_by=user_id,
        )
        await self.db.flush()
        location = await self._visit_location(order_id, order["patient_id"])
        return {**visit_to_api(visit, location), **otp_meta}

    async def complete_scan(
        self,
        order_id: UUID,
        user_id: UUID,
        roles: list[str],
        body: CompleteVisitRequest,
    ) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        require_technician_order(order, user_id, roles)
        await self._verify_otp(order["patient_phone"], body.otp, PURPOSE_TECHNICIAN_COMPLETION)

        if order.get("fibrosis_scan_included", True):
            scan = await self.get_scan(order_id)
            if not scan:
                raise AppError("Save or fetch scan data before completing")
            if not scan.get("scanFileUrl"):
                raise AppError(
                    "Upload FibroScan report PDF or image before completing the visit"
                )

        visit = await self._ensure_visit(order_id, order.get("technician_id"))
        extra = _visit_extra(visit)
        if not extra.get("visitCompletionOtpSentAt"):
            raise AppError("Send completion OTP to the patient first")

        visit.visit_step = "scan_completed"
        visit.completed_at = datetime.now(UTC)
        extra["visitCompletionOtpVerified"] = True
        extra["visitCompletionOtpVerifiedAt"] = datetime.now(UTC).isoformat()
        visit.extra = extra

        try:
            updated_order = await transition_order(
                self.db,
                order_id,
                OrderWorkflowEvent.COMPLETE_SCAN,
                performed_by=user_id,
                timeline_label="Visit completed · patient OTP verified",
            )
        except AppError:
            updated_order = order
            await append_timeline(
                self.db,
                order_id,
                "scan_completed",
                "Visit completed · patient OTP verified",
                performed_by=user_id,
            )

        await append_timeline(
            self.db,
            order_id,
            "visit_completion_otp_verified",
            f"Patient confirmed visit completion · {order['patient_phone']}",
            performed_by=user_id,
        )
        workflow = WorkflowNotificationService(self.db)
        await workflow.order_event("scan_completed", order=updated_order if isinstance(updated_order, dict) else order)
        location = await self._visit_location(order_id, order["patient_id"])
        return {"visit": visit_to_api(visit, location), "order": order_to_api(updated_order)}

    async def request_rescan(self, order_id: UUID, user_id: UUID, roles: list[str]) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        require_technician_order(order, user_id, roles)

        result = await self.db.execute(
            select(FibrosisScanRecord).where(FibrosisScanRecord.order_id == order_id)
        )
        existing = result.scalar_one_or_none()
        if existing and existing.locked:
            raise AppError("Scan is locked — contact operations for a rescan")
        if existing:
            await self.db.delete(existing)

        visit = await self._ensure_visit(order_id, order.get("technician_id"))
        extra = _visit_extra(visit)
        extra["rescanCount"] = int(extra.get("rescanCount", 0)) + 1
        visit.extra = extra
        visit.visit_step = "reached_location"
        await append_timeline(self.db, order_id, "scan_rescan_requested", "Rescan requested", performed_by=user_id)
        await self.db.flush()
        location = await self._visit_location(order_id, order["patient_id"])
        return {"visit": visit_to_api(visit, location), "scan": None}

    async def mark_unable(
        self,
        order_id: UUID,
        user_id: UUID,
        roles: list[str],
        body: UnableVisitRequest,
    ) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        require_technician_order(order, user_id, roles)
        visit = await self._ensure_visit(order_id, order.get("technician_id"))
        visit.visit_step = "unable_to_complete"
        visit.unable_reason = body.reason
        await append_timeline(self.db, order_id, "scan_failed", body.reason, performed_by=user_id)
        await self.db.flush()
        location = await self._visit_location(order_id, order["patient_id"])
        return visit_to_api(visit, location)

    async def upload_collection_proof(
        self,
        order_id: UUID,
        user_id: UUID,
        roles: list[str],
        body: CollectionProofRequest,
    ) -> dict[str, Any]:
        from app.services.pathology_service import PathologyService

        return await PathologyService(self.db).upload_collection_proof(order_id, user_id, roles, body)

    async def mark_sample_collected(
        self,
        order_id: UUID,
        user_id: UUID,
        roles: list[str],
        body: MarkSampleCollectedRequest,
    ) -> dict[str, Any]:
        from app.services.pathology_service import PathologyService

        return await PathologyService(self.db).mark_sample_collected(order_id, user_id, roles, body)

    async def submit_sample_to_lab(
        self,
        order_id: UUID,
        user_id: UUID,
        roles: list[str],
        body: SubmitSampleToLabRequest,
    ) -> dict[str, Any]:
        from app.services.pathology_service import PathologyService

        return await PathologyService(self.db).technician_submit_sample_to_lab(order_id, user_id, roles, body)

    async def save_operator_intake(
        self,
        order_id: UUID,
        user_id: UUID,
        body: ScanPatientIntakeInput,
    ) -> dict[str, Any]:
        await load_order_row(self.db, order_id)
        payload = body.model_dump(by_alias=True)
        existing = await self.get_patient_intake(order_id)
        if existing:
            payload = {**existing, **payload}
        payload["operatorEnteredAt"] = datetime.now(UTC).isoformat()
        payload["operatorEnteredBy"] = str(user_id)
        payload["operatorVerificationStatus"] = "approved"
        await self._upsert_intake(order_id, payload)
        return await self.get_patient_intake(order_id)  # type: ignore[return-value]

    async def operator_verify_intake(
        self,
        order_id: UUID,
        user_id: UUID,
        status: str,
        notes: str | None,
    ) -> dict[str, Any]:
        existing = await self.get_patient_intake(order_id)
        if not existing:
            raise AppError("Patient intake not found", status_code=404, error="not_found")
        payload = {
            **existing,
            "operatorVerificationStatus": status,
            "operatorVerifiedAt": datetime.now(UTC).isoformat(),
            "operatorVerifiedBy": str(user_id),
            "operatorNotes": notes,
        }
        await self._upsert_intake(order_id, payload)
        await append_timeline(
            self.db,
            order_id,
            "patient_intake_ops_verified",
            f"Ops {status} patient intake",
            performed_by=user_id,
        )
        return payload

    async def operator_verify_fibroscan_intake(
        self,
        order_id: UUID,
        user_id: UUID,
        status: str,
        notes: str | None,
    ) -> dict[str, Any]:
        existing = await self.get_patient_intake(order_id)
        if not existing:
            raise AppError("FibroScan intake not found", status_code=404, error="not_found")
        if not existing.get("fibroscanIntakeSubmittedAt"):
            raise AppError("FibroScan intake not submitted")
        payload = {
            **existing,
            "fibroscanOperatorVerificationStatus": status,
            "fibroscanOperatorVerifiedAt": datetime.now(UTC).isoformat(),
            "fibroscanOperatorVerifiedBy": str(user_id),
            "fibroscanOperatorNotes": notes,
        }
        fibroscan_verified = status == "approved"
        await self._upsert_intake(
            order_id,
            payload,
            fibroscan_intake_verified=fibroscan_verified,
        )
        event_type = (
            "fibroscan_intake_approved" if status == "approved" else "fibroscan_intake_rejected"
        )
        await append_timeline(
            self.db,
            order_id,
            event_type,
            f"Ops {status} FibroScan intake",
            performed_by=user_id,
        )
        return payload

    async def ops_review_scan(
        self,
        order_id: UUID,
        user_id: UUID,
        body: dict[str, Any],
    ) -> dict[str, Any]:
        order = await load_order_row(self.db, order_id)
        existing = await self.get_scan(order_id)
        if not existing:
            raise AppError("Scan record not found", status_code=404, error="not_found")
        if existing.get("locked"):
            raise AppError("Scan record is locked", status_code=409, error="conflict")

        metrics = dict(existing)
        patch_fields = {
            "liverStiffnessKpa": "liver_stiffness_kpa",
            "capDbm": "cap_dbm",
            "fibrosisStage": "fibrosis_stage",
            "steatosisGrade": "steatosis_grade",
            "interpretation": "interpretation",
            "remarks": "remarks",
        }
        updates: dict[str, Any] = {}
        for api_key, _ in patch_fields.items():
            if api_key in body and body[api_key] is not None:
                updates[api_key] = body[api_key]

        lsm = Decimal(str(updates.get("liverStiffnessKpa", existing["liverStiffnessKpa"])))
        cap = Decimal(str(updates.get("capDbm", existing["capDbm"])))
        record = await self._upsert_scan(
            order_id,
            order["patient_id"],
            lsm_kpa=lsm,
            cap_db_m=cap,
            iqr=Decimal(str(existing["iqr"])),
            probe_type=existing.get("probeType") or "M",
            device_serial=existing.get("deviceSerial") or "UNKNOWN",
            fibrosis_stage=updates.get("fibrosisStage", existing["fibrosisStage"]),
            steatosis_grade=updates.get("steatosisGrade", existing["steatosisGrade"]),
            interpretation=updates.get("interpretation", existing["interpretation"]),
            source=existing.get("source") or "manual",
            metrics={
                **{k: existing.get(k) for k in ("rescanCount", "iqrMedianPercent", "validMeasurements", "totalMeasurements", "successRatePercent", "scanAt", "operatorName", "fastingStatus", "bmi", "scanFileId", "scanFileUrl")},
                "remarks": updates.get("remarks", existing.get("remarks")),
            },
        )
        await append_timeline(
            self.db,
            order_id,
            "scan_ops_reviewed",
            f"Ops reviewed scan · {updates.get('fibrosisStage', existing['fibrosisStage'])}",
            performed_by=user_id,
        )
        return scan_to_api(record, order_id, order["patient_id"])

    async def _upsert_intake(
        self,
        order_id: UUID,
        data: dict[str, Any],
        *,
        patient_verified: bool | None = None,
        fibroscan_intake_submitted: bool | None = None,
        fibroscan_intake_verified: bool | None = None,
    ) -> None:
        storage_data = intake_json_storage(data)
        result = await self.db.execute(
            select(ScanPatientIntake).where(ScanPatientIntake.order_id == order_id)
        )
        row = result.scalar_one_or_none()
        if row is None:
            row = ScanPatientIntake(order_id=order_id, data=storage_data)
            self.db.add(row)
        else:
            row.data = storage_data
        if patient_verified is not None:
            row.patient_verified = patient_verified
        if fibroscan_intake_submitted is not None:
            row.fibroscan_intake_submitted = fibroscan_intake_submitted
        if fibroscan_intake_verified is not None:
            row.fibroscan_intake_verified = fibroscan_intake_verified
        await self.db.flush()

    async def _upsert_scan(
        self,
        order_id: UUID,
        patient_id: UUID,
        *,
        lsm_kpa: Decimal,
        cap_db_m: Decimal,
        iqr: Decimal,
        probe_type: str,
        device_serial: str,
        fibrosis_stage: str,
        steatosis_grade: str,
        interpretation: str,
        source: str,
        metrics: dict[str, Any],
    ) -> FibrosisScanRecord:
        result = await self.db.execute(
            select(FibrosisScanRecord).where(FibrosisScanRecord.order_id == order_id)
        )
        record = result.scalar_one_or_none()
        if record is None:
            record = FibrosisScanRecord(order_id=order_id)
            self.db.add(record)
        record.lsm_kpa = lsm_kpa
        record.cap_db_m = cap_db_m
        record.iqr = iqr
        record.probe_type = probe_type
        record.device_serial = device_serial
        record.fibrosis_stage = fibrosis_stage
        record.steatosis_grade = steatosis_grade
        record.interpretation = interpretation
        record.source = source
        record.metrics = metrics
        await self.db.flush()
        return record
