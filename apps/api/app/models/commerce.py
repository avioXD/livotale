from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

LIVER_CARE_ORDER_STATUS_ENUM = SAEnum(
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
    name="liver_care_order_status_enum",
    schema="commerce",
    create_type=False,
)
LIVER_CARE_PAYMENT_MODE_ENUM = SAEnum(
    "offline",
    "online_link",
    "patient_portal",
    name="liver_care_payment_mode_enum",
    schema="commerce",
    create_type=False,
)
LIVER_CARE_PAYMENT_STATUS_ENUM = SAEnum(
    "pending",
    "link_sent",
    "processing",
    "success",
    "failed",
    "refunded",
    "cancelled",
    name="liver_care_payment_status_enum",
    schema="commerce",
    create_type=False,
)


class LiverCarePackage(Base):
    __tablename__ = "liver_care_packages"
    __table_args__ = {"schema": "commerce"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    code: Mapped[str] = mapped_column(String(20), unique=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    discount_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    includes: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default='{"bullets": []}')
    fibrosis_scan_included: Mapped[bool] = mapped_column(Boolean, server_default="true")
    pathology_included: Mapped[bool] = mapped_column(Boolean, server_default="false")
    consultation_included: Mapped[bool] = mapped_column(Boolean, server_default="false")
    visibility_web: Mapped[bool] = mapped_column(Boolean, server_default="true")
    active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    sort_order: Mapped[int] = mapped_column(Integer, server_default="0")
    terms_conditions: Mapped[str | None] = mapped_column(Text)
    recommended_tag: Mapped[bool] = mapped_column(Boolean, server_default="false")
    status: Mapped[str] = mapped_column(String, server_default="active")
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("identity.users.id", ondelete="SET NULL")
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("identity.users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ServiceOrder(Base):
    __tablename__ = "service_orders"
    __table_args__ = {"schema": "commerce"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    order_number: Mapped[str] = mapped_column(String(40), unique=True)
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clinical.patients.id", ondelete="RESTRICT")
    )
    enquiry_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("operations.enquiries.id", ondelete="SET NULL")
    )
    package_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("commerce.liver_care_packages.id", ondelete="RESTRICT")
    )
    package_name: Mapped[str] = mapped_column(String(200))
    package_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    discount: Mapped[Decimal] = mapped_column(Numeric(12, 2), server_default="0")
    final_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    payment_mode: Mapped[str | None] = mapped_column(LIVER_CARE_PAYMENT_MODE_ENUM)
    payment_status: Mapped[str] = mapped_column(LIVER_CARE_PAYMENT_STATUS_ENUM, server_default="pending")
    order_status: Mapped[str] = mapped_column(LIVER_CARE_ORDER_STATUS_ENUM, server_default="draft")
    technician_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("identity.users.id", ondelete="SET NULL")
    )
    partner_lab_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("operations.lab_partners.id", ondelete="SET NULL")
    )
    doctor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clinical.doctors.id", ondelete="SET NULL")
    )
    scan_scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    scan_time_slot: Mapped[str | None] = mapped_column(String)
    scan_patient_preferred_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    pathology_lab_order_ref: Mapped[str | None] = mapped_column(String)
    pathology_external_appointment_id: Mapped[str | None] = mapped_column(String(64))
    pathology_visit_outcome: Mapped[str | None] = mapped_column(String(16))
    pathology_visit_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    pathology_visit_confirmed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("identity.users.id", ondelete="SET NULL")
    )
    pathology_time_slot: Mapped[str | None] = mapped_column(String)
    pathology_patient_preferred_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    pathology_scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    consultation_patient_preferred_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    consultation_time_slot: Mapped[str | None] = mapped_column(String)
    consultation_scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    version: Mapped[int] = mapped_column(Integer, server_default="1")
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("identity.users.id", ondelete="SET NULL")
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("identity.users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class OrderPayment(Base):
    __tablename__ = "order_payments"
    __table_args__ = {"schema": "commerce"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("commerce.service_orders.id", ondelete="CASCADE")
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    method: Mapped[str | None] = mapped_column(String(40))
    provider: Mapped[str] = mapped_column(String(40), server_default="dummy")
    provider_payment_id: Mapped[str | None] = mapped_column(String(120))
    transaction_ref: Mapped[str | None] = mapped_column(String(120))
    status: Mapped[str] = mapped_column(LIVER_CARE_PAYMENT_STATUS_ENUM, server_default="pending")
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    collected_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("identity.users.id", ondelete="SET NULL")
    )
    receipt_file_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("storage.files.id", ondelete="SET NULL")
    )
    remarks: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PaymentLink(Base):
    __tablename__ = "payment_links"
    __table_args__ = {"schema": "commerce"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("commerce.service_orders.id", ondelete="CASCADE")
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clinical.patients.id", ondelete="CASCADE")
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    status: Mapped[str] = mapped_column(String(20), server_default="active")
    url: Mapped[str] = mapped_column(Text)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    sent_via: Mapped[list[Any]] = mapped_column(JSONB, server_default="[]")
    paid: Mapped[bool] = mapped_column(Boolean, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class OrderTimelineEvent(Base):
    __tablename__ = "order_timeline_events"
    __table_args__ = {"schema": "commerce"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("commerce.service_orders.id", ondelete="CASCADE")
    )
    event_type: Mapped[str] = mapped_column(String(80))
    label: Mapped[str] = mapped_column(String(200))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    performed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("identity.users.id", ondelete="SET NULL")
    )
    metadata_: Mapped[dict[str, Any]] = mapped_column("metadata", JSONB, server_default="{}")
