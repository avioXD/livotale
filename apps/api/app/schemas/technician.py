from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import BaseSchema


TechnicianVisitStep = Literal[
    "assigned",
    "visit_started",
    "reached_location",
    "scan_in_progress",
    "scan_completed",
    "unable_to_complete",
]

FibrosisScanSource = Literal["manual", "device", "upload"]
ScanReportDocumentType = Literal["scanner_pdf", "report_photo", "letter"]
PatientSex = Literal["male", "female", "other"]
OperatorVerificationStatus = Literal["pending", "approved", "rejected"]
CollectionProofPhotoType = Literal[
    "order_id_label",
    "sample_tube",
    "technician_collector",
    "lab_handover",
    "container_label",
]


class ComorbidityFlags(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    blood_pressure: bool = Field(alias="bloodPressure", default=False)
    sugar: bool = False
    thyroid: bool = False


class TechnicianOrder(BaseSchema):
    id: UUID
    order_number: str = Field(alias="orderNumber")
    patient_id: UUID = Field(alias="patientId")
    patient_name: str = Field(alias="patientName")
    patient_phone: str = Field(alias="patientPhone")
    patient_email: str | None = Field(default=None, alias="patientEmail")
    package_id: UUID = Field(alias="packageId")
    package_code: str = Field(alias="packageCode")
    package_name: str = Field(alias="packageName")
    order_status: str = Field(alias="orderStatus")
    technician_id: UUID | None = Field(default=None, alias="technicianId")
    scan_scheduled_at: datetime | None = Field(default=None, alias="scanScheduledAt")
    scan_time_slot: str | None = Field(default=None, alias="scanTimeSlot")
    address: str | None = None
    city: str | None = None
    pincode: str | None = None
    updated_at: datetime = Field(alias="updatedAt")


class TechnicianOrderDetail(BaseSchema):
    id: UUID
    order_number: str = Field(alias="orderNumber")
    patient_id: UUID = Field(alias="patientId")
    patient_name: str = Field(alias="patientName")
    patient_phone: str = Field(alias="patientPhone")
    patient_email: str | None = Field(default=None, alias="patientEmail")
    package_id: UUID = Field(alias="packageId")
    package_code: str = Field(alias="packageCode")
    package_name: str = Field(alias="packageName")
    order_status: str = Field(alias="orderStatus")
    payment_status: str = Field(alias="paymentStatus")
    technician_id: UUID | None = Field(default=None, alias="technicianId")
    scan_scheduled_at: datetime | None = Field(default=None, alias="scanScheduledAt")
    scan_time_slot: str | None = Field(default=None, alias="scanTimeSlot")
    scan_patient_preferred_at: datetime | None = Field(default=None, alias="scanPatientPreferredAt")
    visit_step: TechnicianVisitStep | None = Field(default=None, alias="visitStep")
    address: str | None = None
    city: str | None = None
    pincode: str | None = None
    updated_at: datetime = Field(alias="updatedAt")


class VisitStep(BaseSchema):
    order_id: UUID = Field(alias="orderId")
    technician_id: UUID | None = Field(default=None, alias="technicianId")
    visit_step: TechnicianVisitStep = Field(alias="visitStep")
    unable_reason: str | None = Field(default=None, alias="unableReason")
    rescan_count: int = Field(default=0, alias="rescanCount")
    visit_started_at: datetime | None = Field(default=None, alias="visitStartedAt")
    reached_at: datetime | None = Field(default=None, alias="reachedAt")
    completed_at: datetime | None = Field(default=None, alias="completedAt")
    visit_completion_otp_sent_at: datetime | None = Field(default=None, alias="visitCompletionOtpSentAt")
    visit_completion_otp_verified: bool = Field(default=False, alias="visitCompletionOtpVerified")
    visit_completion_otp_verified_at: datetime | None = Field(
        default=None, alias="visitCompletionOtpVerifiedAt"
    )
    address: str | None = None
    city: str | None = None
    pincode: str | None = None
    patient_email: str | None = Field(default=None, alias="patientEmail")
    patient_intake_otp_sent_at: datetime | None = Field(default=None, alias="patientIntakeOtpSentAt")
    retry_after_seconds: int | None = Field(default=None, alias="retryAfterSeconds")
    demo_otp: str | None = Field(default=None, alias="demoOtp")


class FibrosisScanRecord(BaseSchema):
    id: UUID
    order_id: UUID = Field(alias="orderId")
    patient_id: UUID = Field(alias="patientId")
    rescan_count: int = Field(default=0, alias="rescanCount")
    liver_stiffness_kpa: Decimal = Field(alias="liverStiffnessKpa")
    cap_dbm: Decimal = Field(alias="capDbm")
    iqr: Decimal
    iqr_median_percent: Decimal = Field(alias="iqrMedianPercent")
    valid_measurements: int = Field(alias="validMeasurements")
    total_measurements: int = Field(alias="totalMeasurements")
    success_rate_percent: Decimal = Field(alias="successRatePercent")
    probe_type: str = Field(alias="probeType")
    scan_at: datetime = Field(alias="scanAt")
    operator_name: str = Field(alias="operatorName")
    device_serial: str = Field(alias="deviceSerial")
    fasting_status: bool = Field(alias="fastingStatus")
    bmi: Decimal
    interpretation: str
    steatosis_grade: str = Field(alias="steatosisGrade")
    fibrosis_stage: str = Field(alias="fibrosisStage")
    remarks: str | None = None
    scan_file_id: str | None = Field(default=None, alias="scanFileId")
    scan_file_url: str | None = Field(default=None, alias="scanFileUrl")
    scan_report_document_type: ScanReportDocumentType | None = Field(
        default=None, alias="scanReportDocumentType"
    )
    source: FibrosisScanSource
    locked: bool = False
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class ScanPatientIntake(BaseSchema):
    order_id: UUID = Field(alias="orderId")
    name: str
    sex: PatientSex
    age: int
    phone: str
    weight_kg: Decimal | None = Field(default=None, alias="weightKg")
    height_meters: Decimal | None = Field(default=None, alias="heightMeters")
    comorbidities: ComorbidityFlags
    operator_entered_at: datetime | None = Field(default=None, alias="operatorEnteredAt")
    operator_entered_by: str | None = Field(default=None, alias="operatorEnteredBy")
    phone_otp_verified: bool = Field(default=False, alias="phoneOtpVerified")
    technician_verified_at: datetime | None = Field(default=None, alias="technicianVerifiedAt")
    technician_verified_by: str | None = Field(default=None, alias="technicianVerifiedBy")
    machine_patient_name: str | None = Field(default=None, alias="machinePatientName")
    machine_patient_age: int | None = Field(default=None, alias="machinePatientAge")
    machine_patient_sex: PatientSex | None = Field(default=None, alias="machinePatientSex")
    machine_patient_phone: str | None = Field(default=None, alias="machinePatientPhone")
    device_patient_code: str | None = Field(default=None, alias="devicePatientCode")
    fibroscan_intake_submitted_at: datetime | None = Field(default=None, alias="fibroscanIntakeSubmittedAt")
    fibroscan_intake_submitted_by: str | None = Field(default=None, alias="fibroscanIntakeSubmittedBy")
    operator_verification_status: OperatorVerificationStatus = Field(
        default="pending", alias="operatorVerificationStatus"
    )
    operator_verified_at: datetime | None = Field(default=None, alias="operatorVerifiedAt")
    operator_verified_by: str | None = Field(default=None, alias="operatorVerifiedBy")
    operator_notes: str | None = Field(default=None, alias="operatorNotes")
    fibroscan_operator_verification_status: OperatorVerificationStatus | None = Field(
        default=None, alias="fibroscanOperatorVerificationStatus"
    )
    fibroscan_operator_verified_at: datetime | None = Field(default=None, alias="fibroscanOperatorVerifiedAt")
    fibroscan_operator_verified_by: str | None = Field(default=None, alias="fibroscanOperatorVerifiedBy")
    fibroscan_operator_notes: str | None = Field(default=None, alias="fibroscanOperatorNotes")


class ScanPatientIntakeInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str
    sex: PatientSex
    age: int
    phone: str
    weight_kg: Decimal | None = Field(default=None, alias="weightKg")
    height_meters: Decimal | None = Field(default=None, alias="heightMeters")
    comorbidities: ComorbidityFlags


class VerifyPatientIntakeRequest(ScanPatientIntakeInput):
    otp: str


class FibroScanIntakeInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    device_patient_code: str = Field(alias="devicePatientCode")
    machine_patient_name: str = Field(alias="machinePatientName")
    machine_patient_age: int = Field(alias="machinePatientAge")
    machine_patient_sex: PatientSex = Field(alias="machinePatientSex")
    machine_patient_phone: str = Field(alias="machinePatientPhone")


class FibrosisScanInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    liver_stiffness_kpa: Decimal = Field(alias="liverStiffnessKpa")
    cap_dbm: Decimal = Field(alias="capDbm")
    iqr: Decimal
    iqr_median_percent: Decimal = Field(alias="iqrMedianPercent")
    valid_measurements: int = Field(alias="validMeasurements")
    total_measurements: int = Field(alias="totalMeasurements")
    success_rate_percent: Decimal = Field(alias="successRatePercent")
    probe_type: str = Field(alias="probeType")
    scan_at: datetime = Field(alias="scanAt")
    operator_name: str = Field(alias="operatorName")
    device_serial: str = Field(alias="deviceSerial")
    fasting_status: bool = Field(alias="fastingStatus")
    bmi: Decimal
    interpretation: str
    steatosis_grade: str = Field(alias="steatosisGrade")
    fibrosis_stage: str = Field(alias="fibrosisStage")
    remarks: str | None = None
    source: FibrosisScanSource = "manual"
    rescan_count: int = Field(default=0, alias="rescanCount")
    scan_file_id: str | None = Field(default=None, alias="scanFileId")
    scan_file_url: str | None = Field(default=None, alias="scanFileUrl")


class FetchDeviceScanRequest(BaseModel):
    device_serial: str | None = Field(default=None, alias="deviceSerial")


class AttachScanFileRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    file_name: str = Field(alias="fileName")
    file_type: str | None = Field(default=None, alias="fileType")
    file_id: str | None = Field(default=None, alias="fileId")
    storage_url: str | None = Field(default=None, alias="storageUrl")
    scan_report_document_type: ScanReportDocumentType | None = Field(
        default=None, alias="scanReportDocumentType"
    )


class CompleteVisitRequest(BaseModel):
    otp: str


class UnableVisitRequest(BaseModel):
    reason: str


class CollectionProofRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    file_name: str = Field(alias="fileName")
    photo_type: CollectionProofPhotoType = Field(alias="photoType")
    order_label_verified: bool | None = Field(default=None, alias="orderLabelVerified")
    file_id: str | None = Field(default=None, alias="fileId")
    storage_url: str | None = Field(default=None, alias="storageUrl")


class MarkSampleCollectedRequest(BaseModel):
    collected_by: str = Field(alias="collectedBy")


class SubmitSampleToLabRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    partner_lab_id: UUID = Field(alias="partnerLabId")
    dispatched_by: str = Field(alias="dispatchedBy")
    courier_ref: str | None = Field(default=None, alias="courierRef")


class OperatorVerifyIntakeInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    status: OperatorVerificationStatus
    notes: str | None = None


class OpsScanReviewInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    liver_stiffness_kpa: Decimal | None = Field(default=None, alias="liverStiffnessKpa")
    cap_dbm: Decimal | None = Field(default=None, alias="capDbm")
    fibrosis_stage: str | None = Field(default=None, alias="fibrosisStage")
    steatosis_grade: str | None = Field(default=None, alias="steatosisGrade")
    interpretation: str | None = None
    remarks: str | None = None
