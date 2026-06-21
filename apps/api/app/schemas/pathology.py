from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import BaseSchema


SampleDispatchStatus = Literal[
    "not_required",
    "pending_dispatch",
    "sample_collected",
    "dispatched",
    "received_at_lab",
    "awaiting_report",
    "report_uploaded",
    "cancelled",
]

AIExtractionStatus = Literal[
    "not_started",
    "queued",
    "processing",
    "extracted",
    "review_pending",
    "verified",
    "failed",
    "reupload_required",
]

LabReportFinalStatus = Literal["pending", "verified", "rejected"]
ExtractionFieldFlag = Literal["normal", "high", "low", "critical"]


class CollectionProofPhoto(BaseSchema):
    id: str
    order_id: UUID = Field(alias="orderId")
    photo_type: str = Field(alias="photoType")
    file_name: str = Field(alias="fileName")
    storage_url: str | None = Field(default=None, alias="storageUrl")
    created_at: datetime = Field(alias="createdAt")


class SampleDispatch(BaseSchema):
    id: UUID
    order_id: UUID = Field(alias="orderId")
    partner_lab_id: UUID | None = Field(default=None, alias="partnerLabId")
    partner_lab_name: str | None = Field(default=None, alias="partnerLabName")
    status: SampleDispatchStatus
    collected_by: str | None = Field(default=None, alias="collectedBy")
    collected_at: datetime | None = Field(default=None, alias="collectedAt")
    collection_proof_file_id: str | None = Field(default=None, alias="collectionProofFileId")
    collection_proof_file_name: str | None = Field(default=None, alias="collectionProofFileName")
    collection_proof_uploaded_at: datetime | None = Field(default=None, alias="collectionProofUploadedAt")
    order_label_verified: bool = Field(default=False, alias="orderLabelVerified")
    collection_photos: list[CollectionProofPhoto] = Field(default_factory=list, alias="collectionPhotos")
    dispatched_by: str | None = Field(default=None, alias="dispatchedBy")
    dispatched_at: datetime | None = Field(default=None, alias="dispatchedAt")
    received_at_lab_at: datetime | None = Field(default=None, alias="receivedAtLabAt")
    awaiting_report_since: datetime | None = Field(default=None, alias="awaitingReportSince")
    courier_ref: str | None = Field(default=None, alias="courierRef")
    notes: str | None = None
    updated_at: datetime = Field(alias="updatedAt")


class LabReportUpload(BaseSchema):
    id: UUID
    order_id: UUID = Field(alias="orderId")
    patient_id: UUID = Field(alias="patientId")
    partner_lab_id: UUID | None = Field(default=None, alias="partnerLabId")
    partner_lab_name: str | None = Field(default=None, alias="partnerLabName")
    file_name: str = Field(alias="fileName")
    file_url: str | None = Field(default=None, alias="fileUrl")
    file_id: str | None = Field(default=None, alias="fileId")
    uploaded_by: str | None = Field(default=None, alias="uploadedBy")
    uploaded_at: datetime = Field(alias="uploadedAt")
    extraction_status: AIExtractionStatus = Field(alias="extractionStatus")
    final_status: LabReportFinalStatus = Field(alias="finalStatus")
    verified_by: str | None = Field(default=None, alias="verifiedBy")
    verified_at: datetime | None = Field(default=None, alias="verifiedAt")
    source_type: str | None = Field(default=None, alias="sourceType")
    email_from: str | None = Field(default=None, alias="emailFrom")
    email_subject: str | None = Field(default=None, alias="emailSubject")
    email_received_at: datetime | None = Field(default=None, alias="emailReceivedAt")
    file_size_bytes: int | None = Field(default=None, alias="fileSizeBytes")


class ExtractedField(BaseSchema):
    id: UUID
    field_name: str = Field(alias="fieldName")
    extracted_value: str = Field(alias="extractedValue")
    editable_value: str = Field(alias="editableValue")
    unit: str | None = None
    reference_range: str | None = Field(default=None, alias="referenceRange")
    flag: ExtractionFieldFlag = "normal"
    confidence_score: float = Field(alias="confidenceScore")
    source_page: int | None = Field(default=None, alias="sourcePage")
    verified: bool = False


class AIExtractionJob(BaseSchema):
    id: UUID
    order_id: UUID = Field(alias="orderId")
    source_type: str = Field(alias="sourceType")
    source_file_id: str | None = Field(default=None, alias="sourceFileId")
    status: AIExtractionStatus
    fields: list[ExtractedField] = Field(default_factory=list)
    verified_by: str | None = Field(default=None, alias="verifiedBy")
    verified_at: datetime | None = Field(default=None, alias="verifiedAt")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class AssignLabRequest(BaseModel):
    partner_lab_id: UUID = Field(alias="partnerLabId")

    model_config = ConfigDict(populate_by_name=True)


class SchedulePathologyRequest(BaseModel):
    scheduled_at: datetime = Field(alias="scheduledAt")
    time_slot: str = Field(alias="timeSlot")

    model_config = ConfigDict(populate_by_name=True)


class DispatchSampleRequest(BaseModel):
    dispatched_by: str = Field(alias="dispatchedBy")
    courier_ref: str | None = Field(default=None, alias="courierRef")

    model_config = ConfigDict(populate_by_name=True)


class LabReportQueueRow(BaseSchema):
    id: UUID
    order_id: UUID = Field(alias="orderId")
    order_number: str = Field(alias="orderNumber")
    patient_id: UUID = Field(alias="patientId")
    patient_name: str = Field(alias="patientName")
    package_code: str = Field(alias="packageCode")
    partner_lab_id: UUID | None = Field(default=None, alias="partnerLabId")
    partner_lab_name: str | None = Field(default=None, alias="partnerLabName")
    dispatch_status: str = Field(alias="dispatchStatus")
    extraction_status: str | None = Field(default=None, alias="extractionStatus")
    report_file_name: str | None = Field(default=None, alias="reportFileName")
    report_uploaded_at: datetime | None = Field(default=None, alias="reportUploadedAt")
    courier_ref: str | None = Field(default=None, alias="courierRef")
    updated_at: datetime = Field(alias="updatedAt")
    pathology_external_appointment_id: str | None = Field(default=None, alias="pathologyExternalAppointmentId")
    pathology_visit_outcome: str | None = Field(default=None, alias="pathologyVisitOutcome")
    pathology_visit_confirmed_at: datetime | None = Field(default=None, alias="pathologyVisitConfirmedAt")


class UpdateExtractedFieldsRequest(BaseModel):
    fields: list[ExtractedField]

    model_config = ConfigDict(populate_by_name=True)


class VerifyExtractionRequest(BaseModel):
    verified_by: str | None = Field(default=None, alias="verifiedBy")

    model_config = ConfigDict(populate_by_name=True)


PathologyVisitOutcome = Literal["visited", "no_show"]


class UpdateExternalAppointmentRequest(BaseModel):
    external_appointment_id: str = Field(alias="externalAppointmentId", min_length=1, max_length=64)

    model_config = ConfigDict(populate_by_name=True)


class LabPartnerVisitRequest(BaseModel):
    outcome: PathologyVisitOutcome
    notes: str | None = None

    model_config = ConfigDict(populate_by_name=True)
