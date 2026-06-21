from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

ENQUIRY_SOURCE_ENUM = SAEnum(
    "website",
    "whatsapp",
    "manual",
    name="enquiry_source_enum",
    schema="operations",
    create_type=False,
)
ENQUIRY_STATUS_ENUM = SAEnum(
    "new",
    "contacted",
    "interested",
    "not_interested",
    "follow_up_required",
    "converted",
    "closed",
    name="enquiry_status_enum",
    schema="operations",
    create_type=False,
)


class Enquiry(Base):
    __tablename__ = "enquiries"
    __table_args__ = {"schema": "operations"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    enquiry_number: Mapped[str] = mapped_column(String(40), unique=True)
    source: Mapped[str] = mapped_column(ENQUIRY_SOURCE_ENUM)
    patient_name: Mapped[str] = mapped_column(String(160))
    phone: Mapped[str] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(160))
    age: Mapped[int | None] = mapped_column(Integer)
    gender: Mapped[str | None] = mapped_column(String(20))
    city: Mapped[str | None] = mapped_column(String(100))
    address: Mapped[str | None] = mapped_column(Text)
    preferred_package_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("commerce.liver_care_packages.id", ondelete="SET NULL")
    )
    message: Mapped[str | None] = mapped_column(Text)
    enquiry_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    assigned_executive_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("identity.users.id", ondelete="SET NULL")
    )
    status: Mapped[str] = mapped_column(ENQUIRY_STATUS_ENUM, server_default="new")
    follow_up_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    internal_notes: Mapped[str | None] = mapped_column(Text)
    call_remarks: Mapped[str | None] = mapped_column(Text)
    patient_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clinical.patients.id", ondelete="SET NULL")
    )
    order_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("commerce.service_orders.id", ondelete="SET NULL")
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("identity.users.id", ondelete="SET NULL")
    )
    updated_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("identity.users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    order_outcome: Mapped[str | None] = mapped_column(String(40))
    order_outcome_remarks: Mapped[str | None] = mapped_column(Text)


class EnquiryFollowUpLog(Base):
    __tablename__ = "enquiry_follow_up_logs"
    __table_args__ = {"schema": "operations"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    enquiry_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("operations.enquiries.id", ondelete="CASCADE")
    )
    status: Mapped[str] = mapped_column(ENQUIRY_STATUS_ENUM)
    internal_notes: Mapped[str | None] = mapped_column(Text)
    call_remarks: Mapped[str | None] = mapped_column(Text)
    follow_up_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("identity.users.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LabPartner(Base):
    __tablename__ = "lab_partners"
    __table_args__ = {"schema": "operations"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    name: Mapped[str] = mapped_column(String(180))
    contact_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("identity.users.id", ondelete="SET NULL")
    )
    clinic_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    city_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    registration_number: Mapped[str | None] = mapped_column(String(120))
    contact_number: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, server_default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ServiceZone(Base):
    __tablename__ = "service_zones"
    __table_args__ = {"schema": "operations"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    city_name: Mapped[str] = mapped_column(String)
    state_name: Mapped[str | None] = mapped_column(String)
    pincodes: Mapped[list[Any]] = mapped_column(JSONB, server_default="[]")
    active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SampleDispatch(Base):
    __tablename__ = "sample_dispatches"
    __table_args__ = {"schema": "operations"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("commerce.service_orders.id")
    )
    partner_lab_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("operations.lab_partners.id")
    )
    status: Mapped[str] = mapped_column(Text, server_default="pending_dispatch")
    collected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dispatched_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    received_at_lab: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    awaiting_report_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    extra: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class TechnicianOrderVisit(Base):
    __tablename__ = "technician_order_visits"
    __table_args__ = {"schema": "operations"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("commerce.service_orders.id")
    )
    technician_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("identity.users.id")
    )
    visit_step: Mapped[str] = mapped_column(Text, server_default="assigned")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    reached_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    unable_reason: Mapped[str | None] = mapped_column(Text)
    extra: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
