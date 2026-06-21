from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.domain.order_workflow import OrderWorkflowEvent
from app.integrations.ai_extraction import get_ai_extraction_service
from app.models.integrations import AIExtractionJob, ExtractedField, LabReportUpload
from app.services.order_helpers import append_timeline, iso, load_order_row, transition_order
from app.services.order_workflow_notifications import (
    notify_doctor_if_consultation,
    notify_order_trigger,
    notify_technician_user,
)


def job_to_api(job: AIExtractionJob, fields: list[ExtractedField]) -> dict[str, Any]:
    return {
        "id": job.id,
        "orderId": job.order_id,
        "sourceType": job.source_type,
        "sourceFileId": job.source_file_id,
        "status": job.status,
        "fields": [
            {
                "id": field.id,
                "fieldName": field.field_name,
                "extractedValue": field.extracted_value or "",
                "editableValue": field.editable_value or field.extracted_value or "",
                "unit": field.unit,
                "referenceRange": field.reference_range,
                "flag": field.flag or "normal",
                "confidenceScore": float(field.confidence_score or 0),
                "sourcePage": field.source_page,
                "verified": field.verified,
            }
            for field in fields
        ],
        "verifiedBy": job.verified_by,
        "verifiedAt": iso(job.verified_at),
        "createdAt": iso(job.created_at),
        "updatedAt": iso(job.updated_at),
    }


class AIExtractionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.ai = get_ai_extraction_service(db=db)

    async def _load_job(self, order_id: UUID) -> tuple[AIExtractionJob | None, list[ExtractedField]]:
        result = await self.db.execute(
            select(AIExtractionJob).where(AIExtractionJob.order_id == order_id).order_by(AIExtractionJob.created_at.desc())
        )
        job = result.scalars().first()
        if not job:
            return None, []
        fields_result = await self.db.execute(select(ExtractedField).where(ExtractedField.job_id == job.id))
        return job, list(fields_result.scalars())

    async def get_job_for_order(self, order_id: UUID) -> dict[str, Any] | None:
        job, fields = await self._load_job(order_id)
        return job_to_api(job, fields) if job else None

    async def list_pending_review(self) -> list[dict[str, Any]]:
        result = await self.db.execute(
            select(AIExtractionJob).where(
                AIExtractionJob.status.in_(["extracted", "review_pending", "processing", "queued"])
            )
        )
        rows: list[dict[str, Any]] = []
        for job in result.scalars():
            fields_result = await self.db.execute(select(ExtractedField).where(ExtractedField.job_id == job.id))
            rows.append(job_to_api(job, list(fields_result.scalars())))
        return rows

    async def trigger_extraction(self, order_id: UUID, user_id: UUID | None = None) -> dict[str, Any]:
        report_result = await self.db.execute(
            select(LabReportUpload).where(LabReportUpload.order_id == order_id).order_by(LabReportUpload.uploaded_at.desc())
        )
        report = report_result.scalars().first()
        if not report:
            raise AppError("Upload pathology report first")

        queued = await self.ai.queue_extraction(str(order_id), "pathology", report.file_id)
        job = AIExtractionJob(
            id=UUID(queued["id"]) if _is_uuid(queued["id"]) else uuid4(),
            order_id=order_id,
            source_type="pathology",
            source_file_id=report.file_id,
            status="queued",
        )
        self.db.add(job)
        await self.db.flush()

        extracted = await self.ai.process_job(str(job.id), str(order_id))
        fields: list[ExtractedField] = []
        for item in extracted:
            field = ExtractedField(
                job_id=job.id,
                field_name=item.field_name,
                extracted_value=item.extracted_value,
                editable_value=item.editable_value,
                unit=item.unit,
                reference_range=item.reference_range,
                flag=item.flag,
                confidence_score=item.confidence_score,
                source_page=item.source_page,
            )
            self.db.add(field)
            fields.append(field)

        job.status = "review_pending"
        report.extraction_status = "review_pending"

        try:
            await transition_order(
                self.db,
                order_id,
                OrderWorkflowEvent.TRIGGER_AI,
                performed_by=user_id,
                timeline_label=f"{len(fields)} pathology fields extracted and saved for review",
                timeline_metadata={"fieldCount": str(len(fields)), "jobId": str(job.id)},
            )
        except AppError:
            pass

        await append_timeline(
            self.db,
            order_id,
            "ai_extraction",
            f"{len(fields)} pathology fields extracted and saved for review",
            performed_by=user_id,
            metadata={"fieldCount": str(len(fields)), "jobId": str(job.id)},
        )
        order = await load_order_row(self.db, order_id)
        await notify_order_trigger(self.db, "ai_extraction_ready", order)
        await self.db.flush()
        return job_to_api(job, fields)

    async def update_fields(self, order_id: UUID, fields_payload: list[dict[str, Any]]) -> dict[str, Any]:
        job, _ = await self._load_job(order_id)
        if not job:
            raise AppError("No extraction job for this order")

        existing_result = await self.db.execute(select(ExtractedField).where(ExtractedField.job_id == job.id))
        for field in existing_result.scalars():
            await self.db.delete(field)

        fields: list[ExtractedField] = []
        for payload in fields_payload:
            field = ExtractedField(
                id=UUID(payload["id"]) if payload.get("id") and _is_uuid(str(payload["id"])) else uuid4(),
                job_id=job.id,
                field_name=payload.get("fieldName") or payload.get("field_name"),
                extracted_value=payload.get("extractedValue") or payload.get("extracted_value"),
                editable_value=payload.get("editableValue") or payload.get("editable_value"),
                unit=payload.get("unit"),
                reference_range=payload.get("referenceRange") or payload.get("reference_range"),
                flag=payload.get("flag", "normal"),
                confidence_score=Decimal(str(payload.get("confidenceScore", 0))),
                source_page=payload.get("sourcePage") or payload.get("source_page"),
                verified=bool(payload.get("verified", False)),
            )
            self.db.add(field)
            fields.append(field)

        job.updated_at = datetime.now(UTC)
        await self.db.flush()
        return job_to_api(job, fields)

    async def request_reupload(self, order_id: UUID, user_id: UUID) -> dict[str, Any]:
        job, fields = await self._load_job(order_id)
        if not job:
            raise AppError("No extraction job for this order")
        job.status = "reupload_required"
        job.updated_at = datetime.now(UTC)

        report_result = await self.db.execute(select(LabReportUpload).where(LabReportUpload.order_id == order_id))
        report = report_result.scalars().first()
        if report:
            report.extraction_status = "reupload_required"
            report.final_status = "pending"

        await append_timeline(
            self.db,
            order_id,
            "ai_reupload_required",
            "Previous PDF could not be processed — upload a clearer lab report",
            performed_by=user_id,
        )
        order = await load_order_row(self.db, order_id)
        await notify_technician_user(self.db, "ai_reupload_required", order)
        await self.db.flush()
        return job_to_api(job, fields)

    async def verify_extraction(
        self,
        order_id: UUID,
        user_id: UUID,
        verified_by: str | None = None,
    ) -> dict[str, Any]:
        job, fields = await self._load_job(order_id)
        if not job:
            raise AppError("No extraction job for this order")

        actor = verified_by or "operations"
        for field in fields:
            field.verified = True
        job.status = "verified"
        job.verified_by = actor
        job.verified_at = datetime.now(UTC)
        job.updated_at = job.verified_at

        report_result = await self.db.execute(select(LabReportUpload).where(LabReportUpload.order_id == order_id))
        report = report_result.scalars().first()
        if report:
            report.extraction_status = "verified"
            report.final_status = "verified"
            report.verified_by = actor
            report.verified_at = job.verified_at

        try:
            await transition_order(
                self.db,
                order_id,
                OrderWorkflowEvent.VERIFY_AI,
                performed_by=user_id,
                timeline_label=f"{len(fields)} fields verified — ready for letterhead report",
            )
        except AppError:
            pass

        await append_timeline(
            self.db,
            order_id,
            "ai_verified",
            f"{len(fields)} fields verified — ready for letterhead report",
            performed_by=user_id,
            metadata={"fieldCount": str(len(fields)), "verifiedBy": actor},
        )
        order = await load_order_row(self.db, order_id)
        await notify_order_trigger(self.db, "ai_verified", order)
        await notify_doctor_if_consultation(self.db, "ai_verified", order)
        await self.db.flush()
        return job_to_api(job, fields)


def _is_uuid(value: str) -> bool:
    try:
        UUID(str(value))
        return True
    except ValueError:
        return False
