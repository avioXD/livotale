from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import BaseSchema


ConsultationType = Literal["video", "offline"]
ConsultationStatus = Literal[
    "doctor_assignment_pending",
    "doctor_assigned",
    "consultation_scheduled",
    "consultation_in_progress",
    "consultation_completed",
    "prescription_pending",
    "prescription_published",
    "cancelled",
    "rescheduled",
]

ConsultationVisitType = Literal["initial", "follow_up"]
ConsultationVisitStatus = Literal[
    "scheduled",
    "in_progress",
    "completed",
    "prescription_draft",
    "prescription_published",
]

PrescriptionStatus = Literal["draft", "review", "published", "cancelled", "revised"]
MedicineForm = Literal["tablet", "capsule", "syrup", "injection", "sachet"]
MedicineTiming = Literal["before_food", "after_food", "empty_stomach"]

FinalReportType = Literal["fibrosis_scan_only", "combined_scan_pathology", "combined_with_consultation"]
FinalReportStatus = Literal["draft", "generated", "published", "locked"]


class Consultation(BaseSchema):
    id: UUID
    order_id: UUID = Field(alias="orderId")
    patient_id: UUID = Field(alias="patientId")
    doctor_id: UUID = Field(alias="doctorId")
    doctor_name: str = Field(alias="doctorName")
    consultation_type: ConsultationType = Field(alias="consultationType")
    scheduled_at: datetime | None = Field(default=None, alias="scheduledAt")
    meeting_link: str | None = Field(default=None, alias="meetingLink")
    status: ConsultationStatus
    doctor_notes: str | None = Field(default=None, alias="doctorNotes")
    symptoms: str | None = None
    visit_completed_at: datetime | None = Field(default=None, alias="visitCompletedAt")
    follow_up_at: datetime | None = Field(default=None, alias="followUpAt")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class DoctorAssignedPatient(BaseSchema):
    patient_id: UUID = Field(alias="patientId")
    patient_name: str = Field(alias="patientName")
    patient_phone: str = Field(alias="patientPhone")
    order_count: int = Field(alias="orderCount")
    latest_order_id: UUID = Field(alias="latestOrderId")
    latest_order_number: str = Field(alias="latestOrderNumber")
    latest_order_status: str = Field(alias="latestOrderStatus")
    consultation_scheduled_at: datetime | None = Field(default=None, alias="consultationScheduledAt")


class ConsultationVisitLog(BaseSchema):
    id: UUID
    order_id: UUID = Field(alias="orderId")
    consultation_id: UUID = Field(alias="consultationId")
    visit_type: ConsultationVisitType = Field(alias="visitType")
    visit_number: int = Field(alias="visitNumber")
    scheduled_at: datetime | None = Field(default=None, alias="scheduledAt")
    visit_completed_at: datetime | None = Field(default=None, alias="visitCompletedAt")
    follow_up_at: datetime | None = Field(default=None, alias="followUpAt")
    symptoms: str | None = None
    doctor_notes: str | None = Field(default=None, alias="doctorNotes")
    status: ConsultationVisitStatus
    prescription_id: UUID | None = Field(default=None, alias="prescriptionId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class PrescriptionMedicine(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    strength: str | None = None
    form: MedicineForm
    dosage: str
    frequency: str
    timing: MedicineTiming
    duration: str
    instruction: str | None = None


class LiverCarePrescription(BaseSchema):
    id: UUID
    order_id: UUID = Field(alias="orderId")
    visit_log_id: UUID = Field(alias="visitLogId")
    patient_id: UUID = Field(alias="patientId")
    consultation_id: UUID = Field(alias="consultationId")
    doctor_id: UUID = Field(alias="doctorId")
    doctor_name: str = Field(alias="doctorName")
    doctor_degree: str = Field(alias="doctorDegree")
    doctor_registration: str = Field(alias="doctorRegistration")
    status: PrescriptionStatus
    diagnosis: str | None = None
    clinical_notes: str | None = Field(default=None, alias="clinicalNotes")
    symptoms: str | None = None
    visit_date: datetime | None = Field(default=None, alias="visitDate")
    follow_up_date: datetime | None = Field(default=None, alias="followUpDate")
    medicines: list[PrescriptionMedicine] = Field(default_factory=list)
    diet_advice: str | None = Field(default=None, alias="dietAdvice")
    lifestyle_advice: str | None = Field(default=None, alias="lifestyleAdvice")
    follow_up_advice: str | None = Field(default=None, alias="followUpAdvice")
    warning_signs: str | None = Field(default=None, alias="warningSigns")
    pdf_url: str | None = Field(default=None, alias="pdfUrl")
    file_id: str | None = Field(default=None, alias="fileId")
    published_at: datetime | None = Field(default=None, alias="publishedAt")
    revision_of: UUID | None = Field(default=None, alias="revisionOf")
    version: int = 1
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class ConsultationQueueRow(BaseSchema):
    order_id: UUID = Field(alias="orderId")
    order_number: str = Field(alias="orderNumber")
    patient_id: UUID = Field(alias="patientId")
    patient_name: str = Field(alias="patientName")
    package_code: str | None = Field(default=None, alias="packageCode")
    order_status: str = Field(alias="orderStatus")
    doctor_id: UUID | None = Field(default=None, alias="doctorId")
    doctor_name: str | None = Field(default=None, alias="doctorName")
    consultation_status: str | None = Field(default=None, alias="consultationStatus")
    consultation_scheduled_at: datetime | None = Field(default=None, alias="consultationScheduledAt")
    prescription_status: str | None = Field(default=None, alias="prescriptionStatus")
    updated_at: datetime = Field(alias="updatedAt")


class ReportPreviewSection(BaseModel):
    title: str
    rows: list[dict[str, str]]


class FinalReportPreviewData(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    report_number: str = Field(alias="reportNumber")
    report_type: FinalReportType = Field(alias="reportType")
    report_type_label: str = Field(alias="reportTypeLabel")
    patient_name: str = Field(alias="patientName")
    patient_phone: str = Field(alias="patientPhone")
    order_number: str = Field(alias="orderNumber")
    package_name: str = Field(alias="packageName")
    generated_at: datetime = Field(alias="generatedAt")
    authorized_by: str = Field(alias="authorizedBy")
    qr_code_id: str = Field(alias="qrCodeId")
    fibrosis_section: ReportPreviewSection | None = Field(default=None, alias="fibrosisSection")
    pathology_section: ReportPreviewSection | None = Field(default=None, alias="pathologySection")
    interpretation: str
    disclaimer: str
    footer: str


class FinalReport(BaseSchema):
    id: UUID
    order_id: UUID = Field(alias="orderId")
    patient_id: UUID = Field(alias="patientId")
    report_type: FinalReportType = Field(alias="reportType")
    report_number: str = Field(alias="reportNumber")
    status: FinalReportStatus
    pdf_url: str | None = Field(default=None, alias="pdfUrl")
    file_id: str | None = Field(default=None, alias="fileId")
    generated_at: datetime | None = Field(default=None, alias="generatedAt")
    published_at: datetime | None = Field(default=None, alias="publishedAt")
    authorized_by: str | None = Field(default=None, alias="authorizedBy")
    version: int = 1
    qr_code_id: str | None = Field(default=None, alias="qrCodeId")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class UpdateConsultationRequest(BaseModel):
    doctor_notes: str | None = Field(default=None, alias="doctorNotes")
    symptoms: str | None = None
    follow_up_at: datetime | None = Field(default=None, alias="followUpAt")

    model_config = ConfigDict(populate_by_name=True)


class ScheduleConsultationRequest(BaseModel):
    scheduled_at: datetime = Field(alias="scheduledAt")
    type: ConsultationType = "video"

    model_config = ConfigDict(populate_by_name=True)


class CompleteConsultationRequest(UpdateConsultationRequest):
    visit_completed_at: datetime | None = Field(default=None, alias="visitCompletedAt")


class UpdateVisitLogRequest(UpdateConsultationRequest):
    scheduled_at: datetime | None = Field(default=None, alias="scheduledAt")


class FollowUpVisitRequest(BaseModel):
    scheduled_at: datetime = Field(alias="scheduledAt")
    follow_up_at: datetime | None = Field(default=None, alias="followUpAt")

    model_config = ConfigDict(populate_by_name=True)


class PrescriptionInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    diagnosis: str | None = None
    clinical_notes: str | None = Field(default=None, alias="clinicalNotes")
    symptoms: str | None = None
    visit_date: datetime | None = Field(default=None, alias="visitDate")
    follow_up_date: datetime | None = Field(default=None, alias="followUpDate")
    medicines: list[PrescriptionMedicine] = Field(default_factory=list)
    diet_advice: str | None = Field(default=None, alias="dietAdvice")
    lifestyle_advice: str | None = Field(default=None, alias="lifestyleAdvice")
    follow_up_advice: str | None = Field(default=None, alias="followUpAdvice")
    warning_signs: str | None = Field(default=None, alias="warningSigns")


class GenerateFinalReportRequest(BaseModel):
    authorized_by: str = Field(default="operations", alias="authorizedBy")

    model_config = ConfigDict(populate_by_name=True)


class DoctorClinicalBundle(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    scan: dict | None = None
    pathology: dict | None = None
    ai_extraction: dict | None = Field(default=None, alias="aiExtraction")
    final_report: dict | None = Field(default=None, alias="finalReport")


class DoctorConsultationContext(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    order: dict
    consultation: Consultation | None = None
    visit_logs: list[ConsultationVisitLog] = Field(default_factory=list, alias="visitLogs")
    scan: dict | None = None
    pathology: dict | None = None
    ai_extraction: dict | None = Field(default=None, alias="aiExtraction")
    final_report: dict | None = Field(default=None, alias="finalReport")
    liver_health_report: dict | None = Field(default=None, alias="liverHealthReport")
