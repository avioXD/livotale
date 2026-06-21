from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, LargeBinary, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

MessageTemplateCategory = Enum(
    "otp",
    "enquiry",
    "order",
    "scan",
    "lab",
    "report",
    "appointment",
    "system",
    name="message_template_category_enum",
    schema="integrations",
    create_type=False,
)

NotificationChannel = Enum(
    "in_app",
    "sms",
    "whatsapp",
    "email",
    "push",
    name="notification_channel_enum",
    schema="core",
    create_type=False,
)


class PlatformSettings(Base):
    __tablename__ = "platform_settings"
    __table_args__ = {"schema": "integrations"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    twilio_account_sid: Mapped[str | None] = mapped_column(Text)
    twilio_parent_account_sid: Mapped[str | None] = mapped_column(Text)
    twilio_auth_token_enc: Mapped[bytes | None] = mapped_column(LargeBinary)
    twilio_messaging_service_sid: Mapped[str | None] = mapped_column(Text)
    twilio_from_number: Mapped[str | None] = mapped_column(Text)
    twilio_verify_service_sid: Mapped[str | None] = mapped_column(Text)
    sendgrid_api_key_enc: Mapped[bytes | None] = mapped_column(LargeBinary)
    sendgrid_from_email: Mapped[str | None] = mapped_column(Text)
    sendgrid_from_name: Mapped[str | None] = mapped_column(Text)
    ai_provider: Mapped[str | None] = mapped_column(Text)
    ai_api_key_enc: Mapped[bytes | None] = mapped_column(LargeBinary)
    ai_model: Mapped[str | None] = mapped_column(Text)
    ai_base_url: Mapped[str | None] = mapped_column(Text)
    updated_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("identity.users.id"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class MessageTemplate(Base):
    __tablename__ = "message_templates"
    __table_args__ = {"schema": "integrations"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    code: Mapped[str] = mapped_column(Text)
    name: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(MessageTemplateCategory, server_default="system")
    channel: Mapped[str] = mapped_column(NotificationChannel, server_default="in_app")
    subject_template: Mapped[str] = mapped_column(Text, server_default="")
    body_template: Mapped[str] = mapped_column(Text)
    variables: Mapped[list] = mapped_column(JSONB, server_default="[]")
    is_active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class LetterheadTemplate(Base):
    __tablename__ = "letterhead_templates"
    __table_args__ = {"schema": "clinical"}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    code: Mapped[str] = mapped_column(Text, unique=True)
    name: Mapped[str] = mapped_column(Text)
    html_body: Mapped[str | None] = mapped_column(Text)
    active: Mapped[bool] = mapped_column(Boolean, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
