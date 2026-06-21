from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field

from app.schemas.common import BaseSchema


class PatientPortalSession(BaseSchema):
    phone: str
    patient_id: UUID = Field(alias="patientId")
    patient_name: str = Field(alias="patientName")
    needs_onboarding: bool = Field(default=False, alias="needsOnboarding")


class PatientOrder(BaseSchema):
    id: UUID
    order_number: str = Field(alias="orderNumber")
    patient_id: UUID = Field(alias="patientId")
    patient_name: str = Field(alias="patientName")
    patient_phone: str = Field(alias="patientPhone")
    enquiry_id: UUID | None = Field(default=None, alias="enquiryId")
    package_id: UUID = Field(alias="packageId")
    package_code: str = Field(alias="packageCode")
    package_name: str = Field(alias="packageName")
    package_price: Decimal = Field(alias="packagePrice")
    discount: Decimal = Field(default=Decimal("0"))
    final_amount: Decimal = Field(alias="finalAmount")
    payment_mode: str | None = Field(default=None, alias="paymentMode")
    payment_status: str = Field(alias="paymentStatus")
    order_status: str = Field(alias="orderStatus")
    technician_id: UUID | None = Field(default=None, alias="technicianId")
    technician_name: str | None = Field(default=None, alias="technicianName")
    partner_lab_id: UUID | None = Field(default=None, alias="partnerLabId")
    partner_lab_name: str | None = Field(default=None, alias="partnerLabName")
    doctor_id: UUID | None = Field(default=None, alias="doctorId")
    doctor_name: str | None = Field(default=None, alias="doctorName")
    scan_visit_mode: str | None = Field(default=None, alias="scanVisitMode")
    scan_time_slot: str | None = Field(default=None, alias="scanTimeSlot")
    scan_clinic_location: str | None = Field(default=None, alias="scanClinicLocation")
    scan_patient_preferred_at: datetime | None = Field(default=None, alias="scanPatientPreferredAt")
    scan_scheduled_at: datetime | None = Field(default=None, alias="scanScheduledAt")
    pathology_lab_order_ref: str | None = Field(default=None, alias="pathologyLabOrderRef")
    pathology_external_appointment_id: str | None = Field(default=None, alias="pathologyExternalAppointmentId")
    pathology_visit_outcome: str | None = Field(default=None, alias="pathologyVisitOutcome")
    pathology_visit_confirmed_at: datetime | None = Field(default=None, alias="pathologyVisitConfirmedAt")
    pathology_time_slot: str | None = Field(default=None, alias="pathologyTimeSlot")
    pathology_patient_preferred_at: datetime | None = Field(
        default=None, alias="pathologyPatientPreferredAt"
    )
    pathology_scheduled_at: datetime | None = Field(default=None, alias="pathologyScheduledAt")
    consultation_patient_preferred_at: datetime | None = Field(
        default=None, alias="consultationPatientPreferredAt"
    )
    consultation_time_slot: str | None = Field(default=None, alias="consultationTimeSlot")
    consultation_scheduled_at: datetime | None = Field(default=None, alias="consultationScheduledAt")
    created_by: UUID | None = Field(default=None, alias="createdBy")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class OtpSendRequest(BaseSchema):
    phone: str


class OtpVerifyRequest(BaseSchema):
    phone: str
    otp: str


class OtpSendResponse(BaseSchema):
    sent: bool
    retry_after_seconds: int = Field(default=60, alias="retryAfterSeconds")
    demo_otp: str | None = Field(default=None, alias="demoOtp")


class PatientProfile(BaseSchema):
    patient_id: UUID = Field(alias="patientId")
    phone: str
    name: str
    email: str | None = None
    city: str | None = None
    date_of_birth: str | None = Field(default=None, alias="dateOfBirth")
    gender: str | None = None
    updated_at: datetime = Field(alias="updatedAt")


class PatientProfileUpdate(BaseSchema):
    phone: str
    email: str | None = None
    city: str | None = None
    date_of_birth: str | None = Field(default=None, alias="dateOfBirth")


class PatientOnboardingStatus(BaseSchema):
    needs_onboarding: bool = Field(alias="needsOnboarding")
    patient_id: UUID = Field(alias="patientId")
    patient_name: str = Field(alias="patientName")


class PatientOnboardingCompleteRequest(BaseSchema):
    phone: str
    full_name: str = Field(min_length=1, alias="fullName")
    email: str | None = None
    city: str | None = None
    date_of_birth: str | None = Field(default=None, alias="dateOfBirth")
    gender: str | None = None


class PatientScanDateRequest(BaseSchema):
    preferred_at: datetime = Field(alias="preferredAt")
    visit_mode: str = Field(default="home", alias="visitMode")
    time_slot: str = Field(alias="timeSlot")


class PatientPathologyDateRequest(BaseSchema):
    preferred_at: datetime = Field(alias="preferredAt")
    time_slot: str = Field(alias="timeSlot")


class PatientConsultDateRequest(BaseSchema):
    preferred_at: datetime = Field(alias="preferredAt")
    time_slot: str = Field(alias="timeSlot")


class PatientPayRequest(BaseSchema):
    phone: str | None = None
    method: str = Field(default="upi")
    receipt_file_id: UUID | None = Field(default=None, alias="receiptFileId")
    transaction_ref: str | None = Field(default=None, alias="transactionRef")
    outcome: str | None = Field(default=None)


class OrderInvoice(BaseSchema):
    order_id: UUID = Field(alias="orderId")
    order_number: str = Field(alias="orderNumber")
    patient_name: str = Field(alias="patientName")
    amount: Decimal
    paid_at: datetime | None = Field(default=None, alias="paidAt")
    pdf_url: str = Field(alias="pdfUrl")
    file_id: str = Field(alias="fileId")


class PatientDownloadItem(BaseSchema):
    id: str
    type: str
    label: str
    order_id: UUID = Field(alias="orderId")
    order_number: str = Field(alias="orderNumber")
    pdf_url: str = Field(alias="pdfUrl")
    available_at: datetime = Field(alias="availableAt")


class PatientNotification(BaseSchema):
    id: UUID
    channel: str
    title: str
    body: str
    order_id: UUID | None = Field(default=None, alias="orderId")
    read: bool
    sent_at: datetime = Field(alias="sentAt")


PATIENT_ENQUIRY_STATUS_LABELS: dict[str, str] = {
    "new": "Submitted",
    "contacted": "Team reviewing",
    "interested": "In progress",
    "follow_up_required": "Follow-up scheduled",
    "converted": "Order created",
    "not_interested": "Closed",
    "closed": "Closed",
}


def patient_enquiry_status_label(status: str) -> str:
    return PATIENT_ENQUIRY_STATUS_LABELS.get(status, status.replace("_", " ").title())


class PatientEnquiry(BaseSchema):
    id: UUID
    enquiry_number: str = Field(alias="enquiryNumber")
    status: str
    patient_status_label: str = Field(alias="patientStatusLabel")
    enquiry_at: datetime = Field(alias="enquiryAt")
    preferred_package_name: str | None = Field(default=None, alias="preferredPackageName")
    preferred_package_code: str | None = Field(default=None, alias="preferredPackageCode")
    message: str | None = None
    order_id: UUID | None = Field(default=None, alias="orderId")
    order_number: str | None = Field(default=None, alias="orderNumber")
