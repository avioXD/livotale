from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class LabReportUpload(Base):
    __tablename__ = "lab_report_uploads"
    __table_args__ = {"schema": "integrations"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("commerce.service_orders.id", ondelete="CASCADE")
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    partner_lab_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    file_name: Mapped[str] = mapped_column(Text)
    file_url: Mapped[str | None] = mapped_column(Text)
    file_id: Mapped[str | None] = mapped_column(Text)
    uploaded_by: Mapped[str | None] = mapped_column(Text)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    extraction_status: Mapped[str] = mapped_column(Text, server_default="not_started")
    final_status: Mapped[str] = mapped_column(Text, server_default="pending")
    verified_by: Mapped[str | None] = mapped_column(Text)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    extra: Mapped[dict[str, Any]] = mapped_column(JSONB, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AIExtractionJob(Base):
    __tablename__ = "ai_extraction_jobs"
    __table_args__ = {"schema": "integrations"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("commerce.service_orders.id", ondelete="CASCADE")
    )
    source_type: Mapped[str] = mapped_column(Text)
    source_file_id: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, server_default="queued")
    verified_by: Mapped[str | None] = mapped_column(Text)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ExtractedField(Base):
    __tablename__ = "extracted_fields"
    __table_args__ = {"schema": "integrations"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("integrations.ai_extraction_jobs.id", ondelete="CASCADE")
    )
    field_name: Mapped[str] = mapped_column(Text)
    extracted_value: Mapped[str | None] = mapped_column(Text)
    editable_value: Mapped[str | None] = mapped_column(Text)
    unit: Mapped[str | None] = mapped_column(Text)
    reference_range: Mapped[str | None] = mapped_column(Text)
    flag: Mapped[str | None] = mapped_column(Text, server_default="normal")
    confidence_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    source_page: Mapped[int | None] = mapped_column(Integer)
    verified: Mapped[bool] = mapped_column(Boolean, server_default="false")
