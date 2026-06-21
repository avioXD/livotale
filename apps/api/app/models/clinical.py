from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Patient(Base):
    __tablename__ = "patients"
    __table_args__ = {"schema": "clinical"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("identity.users.id", ondelete="CASCADE"), unique=True
    )
    patient_code: Mapped[str] = mapped_column(String(60), unique=True)
    primary_doctor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clinical.doctors.id", ondelete="SET NULL")
    )
    clinic_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    city_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    height_cm: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    current_weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    bmi: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    blood_group: Mapped[str | None] = mapped_column(String(10))
    alcohol_status: Mapped[str] = mapped_column(String, server_default="unknown")
    smoking_status: Mapped[str] = mapped_column(String, server_default="unknown")
    diabetes: Mapped[bool] = mapped_column(Boolean, server_default="false")
    hypertension: Mapped[bool] = mapped_column(Boolean, server_default="false")
    dyslipidemia: Mapped[bool] = mapped_column(Boolean, server_default="false")
    viral_hepatitis: Mapped[bool] = mapped_column(Boolean, server_default="false")
    known_cirrhosis: Mapped[bool] = mapped_column(Boolean, server_default="false")
    emergency_contact_name: Mapped[str | None] = mapped_column(String(160))
    preferred_language: Mapped[str | None] = mapped_column(String(80))
    emergency_contact_mobile: Mapped[str | None] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String, server_default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    journey_status: Mapped[str] = mapped_column(String(40), server_default="registered")
    journey_timestamps: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default="{}")
    registered_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    occupation: Mapped[str | None] = mapped_column(String(120))
    marital_status: Mapped[str | None] = mapped_column(String(40))
    waist_cm: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    lifestyle_type: Mapped[str | None] = mapped_column(String(40))
    food_preference: Mapped[str | None] = mapped_column(String(40))
    sleep_pattern: Mapped[str | None] = mapped_column(String(80))
    stress_level: Mapped[str | None] = mapped_column(String(40))
    physical_activity_level: Mapped[str | None] = mapped_column(String(40))


class Doctor(Base):
    __tablename__ = "doctors"
    __table_args__ = {"schema": "clinical"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("identity.users.id", ondelete="CASCADE"), unique=True
    )
    clinic_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    registration_number: Mapped[str] = mapped_column(String(120), unique=True)
    qualification: Mapped[str | None] = mapped_column(String(180))
    specialization: Mapped[str | None] = mapped_column(String(160))
    languages_known: Mapped[list[str]] = mapped_column(ARRAY(String), server_default="{}")
    years_experience: Mapped[int | None] = mapped_column(Integer)
    digital_signature_file_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("storage.files.id", ondelete="SET NULL")
    )
    status: Mapped[str] = mapped_column(String, server_default="draft")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class FibrosisScanRecord(Base):
    __tablename__ = "fibrosis_scan_records"
    __table_args__ = {"schema": "clinical"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("commerce.service_orders.id"), unique=True
    )
    lsm_kpa: Mapped[Decimal | None] = mapped_column(Numeric)
    cap_db_m: Mapped[Decimal | None] = mapped_column(Numeric)
    iqr: Mapped[Decimal | None] = mapped_column(Numeric)
    probe_type: Mapped[str | None] = mapped_column(Text)
    device_serial: Mapped[str | None] = mapped_column(Text)
    fibrosis_stage: Mapped[str | None] = mapped_column(Text)
    steatosis_grade: Mapped[str | None] = mapped_column(Text)
    interpretation: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str | None] = mapped_column(Text, server_default="manual")
    locked: Mapped[bool] = mapped_column(Boolean, server_default="false")
    report_file_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("storage.files.id")
    )
    metrics: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ScanPatientIntake(Base):
    __tablename__ = "scan_patient_intake"
    __table_args__ = {"schema": "clinical"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("commerce.service_orders.id"), unique=True
    )
    data: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default="{}")
    patient_verified: Mapped[bool] = mapped_column(Boolean, server_default="false")
    fibroscan_intake_submitted: Mapped[bool] = mapped_column(Boolean, server_default="false")
    fibroscan_intake_verified: Mapped[bool] = mapped_column(Boolean, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class FinalReport(Base):
    __tablename__ = "final_reports"
    __table_args__ = {"schema": "clinical"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("commerce.service_orders.id"))
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    report_type: Mapped[str] = mapped_column(Text)
    report_number: Mapped[str] = mapped_column(Text, unique=True)
    status: Mapped[str] = mapped_column(Text, server_default="draft")
    pdf_url: Mapped[str | None] = mapped_column(Text)
    file_id: Mapped[str | None] = mapped_column(Text)
    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    authorized_by: Mapped[str | None] = mapped_column(Text)
    version: Mapped[int] = mapped_column(Integer, server_default="1")
    qr_code_id: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class OrderConsultation(Base):
    __tablename__ = "order_consultations"
    __table_args__ = {"schema": "clinical"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("commerce.service_orders.id"), unique=True
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    doctor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clinical.doctors.id"))
    doctor_name: Mapped[str] = mapped_column(String(200))
    consultation_type: Mapped[str] = mapped_column(String(40), server_default="video")
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    meeting_link: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(60), server_default="doctor_assigned")
    doctor_notes: Mapped[str | None] = mapped_column(Text)
    symptoms: Mapped[str | None] = mapped_column(Text)
    visit_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    follow_up_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ConsultationVisitLog(Base):
    __tablename__ = "consultation_visit_logs"
    __table_args__ = {"schema": "clinical"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("commerce.service_orders.id")
    )
    consultation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clinical.order_consultations.id")
    )
    visit_type: Mapped[str] = mapped_column(String(40), server_default="initial")
    visit_number: Mapped[int] = mapped_column(Integer, server_default="1")
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    visit_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    follow_up_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    symptoms: Mapped[str | None] = mapped_column(Text)
    doctor_notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(60), server_default="scheduled")
    prescription_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LiverCarePrescription(Base):
    __tablename__ = "liver_care_prescriptions"
    __table_args__ = {"schema": "clinical"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("commerce.service_orders.id")
    )
    visit_log_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clinical.consultation_visit_logs.id")
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    consultation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    doctor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    doctor_name: Mapped[str] = mapped_column(String(200))
    doctor_degree: Mapped[str | None] = mapped_column(String(200))
    doctor_registration: Mapped[str | None] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(String(40), server_default="draft")
    diagnosis: Mapped[str | None] = mapped_column(Text)
    clinical_notes: Mapped[str | None] = mapped_column(Text)
    symptoms: Mapped[str | None] = mapped_column(Text)
    visit_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    follow_up_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    medicines: Mapped[list[Any]] = mapped_column(JSONB, server_default="[]")
    diet_advice: Mapped[str | None] = mapped_column(Text)
    lifestyle_advice: Mapped[str | None] = mapped_column(Text)
    follow_up_advice: Mapped[str | None] = mapped_column(Text)
    warning_signs: Mapped[str | None] = mapped_column(Text)
    pdf_url: Mapped[str | None] = mapped_column(Text)
    file_id: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revision_of: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    version: Mapped[int] = mapped_column(Integer, server_default="1")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
