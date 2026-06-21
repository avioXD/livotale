from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import Field

from app.domain.order_workflow import OrderWorkflowEvent
from app.schemas.common import BaseSchema

OrderStatus = Literal[
    "draft",
    "created",
    "payment_pending",
    "payment_completed",
    "technician_assigned",
    "scan_scheduled",
    "scan_in_progress",
    "scan_completed",
    "pathology_pending",
    "lab_report_uploaded",
    "ai_extraction_pending",
    "ai_extraction_completed",
    "report_review_pending",
    "final_report_generated",
    "doctor_assignment_pending",
    "doctor_assigned",
    "consultation_pending",
    "prescription_pending",
    "prescription_generated",
    "completed",
    "cancelled",
]
ScanVisitMode = Literal["home"]
PaymentMode = Literal["offline", "online_link", "patient_portal"]
LiverCarePaymentStatus = Literal[
    "pending",
    "link_sent",
    "processing",
    "success",
    "failed",
    "refunded",
    "cancelled",
]
OrderTimelineCategory = Literal[
    "order",
    "payment",
    "scan",
    "pathology",
    "ai",
    "report",
    "consultation",
    "prescription",
    "system",
]
OfflinePaymentMethod = Literal["cash", "upi", "bank_transfer", "card"]


class LiverCareOrder(BaseSchema):
    id: UUID
    order_number: str = Field(alias="orderNumber")
    patient_id: UUID = Field(alias="patientId")
    patient_name: str = Field(alias="patientName")
    patient_phone: str = Field(alias="patientPhone")
    enquiry_id: UUID | None = Field(default=None, alias="enquiryId")
    package_id: UUID = Field(alias="packageId")
    package_code: str = Field(alias="packageCode")
    package_name: str = Field(alias="packageName")
    package_price: float = Field(alias="packagePrice")
    discount: float
    final_amount: float = Field(alias="finalAmount")
    payment_mode: PaymentMode | None = Field(default=None, alias="paymentMode")
    payment_status: LiverCarePaymentStatus = Field(alias="paymentStatus")
    order_status: OrderStatus = Field(alias="orderStatus")
    technician_id: UUID | None = Field(default=None, alias="technicianId")
    technician_name: str | None = Field(default=None, alias="technicianName")
    partner_lab_id: UUID | None = Field(default=None, alias="partnerLabId")
    partner_lab_name: str | None = Field(default=None, alias="partnerLabName")
    doctor_id: UUID | None = Field(default=None, alias="doctorId")
    doctor_name: str | None = Field(default=None, alias="doctorName")
    scan_visit_mode: ScanVisitMode | None = Field(default=None, alias="scanVisitMode")
    scan_time_slot: str | None = Field(default=None, alias="scanTimeSlot")
    scan_clinic_location: str | None = Field(default=None, alias="scanClinicLocation")
    scan_patient_preferred_at: datetime | None = Field(default=None, alias="scanPatientPreferredAt")
    scan_scheduled_at: datetime | None = Field(default=None, alias="scanScheduledAt")
    pathology_lab_order_ref: str | None = Field(default=None, alias="pathologyLabOrderRef")
    pathology_external_appointment_id: str | None = Field(default=None, alias="pathologyExternalAppointmentId")
    pathology_visit_outcome: str | None = Field(default=None, alias="pathologyVisitOutcome")
    pathology_visit_confirmed_at: datetime | None = Field(default=None, alias="pathologyVisitConfirmedAt")
    pathology_time_slot: str | None = Field(default=None, alias="pathologyTimeSlot")
    pathology_patient_preferred_at: datetime | None = Field(default=None, alias="pathologyPatientPreferredAt")
    pathology_scheduled_at: datetime | None = Field(default=None, alias="pathologyScheduledAt")
    consultation_patient_preferred_at: datetime | None = Field(
        default=None, alias="consultationPatientPreferredAt"
    )
    consultation_time_slot: str | None = Field(default=None, alias="consultationTimeSlot")
    consultation_scheduled_at: datetime | None = Field(default=None, alias="consultationScheduledAt")
    created_by: UUID | None = Field(default=None, alias="createdBy")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    version: int | None = None


class CreateOrderInput(BaseSchema):
    patient_id: UUID | None = Field(default=None, alias="patientId")
    patient_name: str | None = Field(default=None, alias="patientName")
    patient_phone: str | None = Field(default=None, alias="patientPhone")
    patient_intake: dict[str, Any] | None = Field(default=None, alias="patientIntake")
    enquiry_id: UUID | None = Field(default=None, alias="enquiryId")
    skip_patient_creation: bool = Field(default=False, alias="skipPatientCreation")
    package_id: UUID = Field(alias="packageId")
    discount: float = 0
    payment_mode: PaymentMode | None = Field(default=None, alias="paymentMode")
    scan_scheduled_at: datetime | None = Field(default=None, alias="scanScheduledAt")
    scan_visit_mode: ScanVisitMode | None = Field(default=None, alias="scanVisitMode")


class OrderTransitionInput(BaseSchema):
    event: OrderWorkflowEvent
    meta: dict[str, str] | None = None
    expected_version: int | None = Field(default=None, alias="expectedVersion")


class OrderTransition(BaseSchema):
    order: LiverCareOrder
    event: OrderWorkflowEvent
    previous_status: OrderStatus = Field(alias="previousStatus")
    new_status: OrderStatus = Field(alias="newStatus")


class OrderTimelineEvent(BaseSchema):
    id: UUID
    order_id: UUID = Field(alias="orderId")
    event_type: str = Field(alias="eventType")
    label: str
    occurred_at: datetime = Field(alias="occurredAt")
    performed_by: UUID | None = Field(default=None, alias="performedBy")
    detail: str | None = None
    category: OrderTimelineCategory | None = None
    metadata: dict[str, str] | None = None


class ScheduleScanInput(BaseSchema):
    scheduled_at: datetime = Field(alias="scheduledAt")
    visit_mode: ScanVisitMode = Field(default="home", alias="visitMode")
    time_slot: str = Field(alias="timeSlot")


class ConfirmScanScheduleInput(ScheduleScanInput):
    technician_id: UUID = Field(alias="technicianId")
    technician_name: str = Field(alias="technicianName")


class ScanTimeSlotOption(BaseSchema):
    code: str
    label: str
    available: bool
    scheduled_at: datetime = Field(alias="scheduledAt")
    is_patient_preference: bool = Field(default=False, alias="isPatientPreference")


class AssignTechnicianInput(BaseSchema):
    technician_id: UUID = Field(alias="technicianId")
    technician_name: str = Field(alias="technicianName")


class AssignDoctorInput(BaseSchema):
    doctor_id: UUID = Field(alias="doctorId")
    doctor_name: str = Field(alias="doctorName")


class ScheduleConsultationInput(BaseSchema):
    scheduled_at: datetime = Field(alias="scheduledAt")
    slot_label: str | None = Field(default=None, alias="slotLabel")


class ConfirmConsultationScheduleInput(BaseSchema):
    doctor_id: UUID = Field(alias="doctorId")
    doctor_name: str = Field(alias="doctorName")
    scheduled_at: datetime = Field(alias="scheduledAt")
    time_slot: str = Field(alias="timeSlot")


class ConsultTimeSlotOption(BaseSchema):
    code: str
    label: str
    available: bool
    scheduled_at: datetime | None = Field(default=None, alias="scheduledAt")
    is_patient_preference: bool = Field(default=False, alias="isPatientPreference")
    is_patient_preference: bool = Field(default=False, alias="isPatientPreference")


class AssignableDoctor(BaseSchema):
    id: UUID
    name: str
    languages: list[str] = Field(default_factory=list)
    specialty: str | None = None


class OfflinePaymentInput(BaseSchema):
    method: OfflinePaymentMethod
    amount: float
    collected_by: str = Field(alias="collectedBy")
    transaction_ref: str | None = Field(default=None, alias="transactionRef")
    remarks: str | None = None


class OfflinePaymentRecord(BaseSchema):
    id: UUID
    order_id: UUID = Field(alias="orderId")
    amount: float
    method: OfflinePaymentMethod
    transaction_ref: str | None = Field(default=None, alias="transactionRef")
    paid_at: datetime = Field(alias="paidAt")
    collected_by: str = Field(alias="collectedBy")
    receipt_file_id: UUID | None = Field(default=None, alias="receiptFileId")
    remarks: str | None = None
