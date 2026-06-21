from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.schemas.common import BaseSchema


class InboxNotification(BaseSchema):
    id: UUID
    title: str
    body: str
    category: str
    channel: str
    target_roles: list[str] = Field(default_factory=list, alias="targetRoles")
    order_id: UUID | None = Field(default=None, alias="orderId")
    target_phone: str | None = Field(default=None, alias="targetPhone")
    trigger_action: str = Field(alias="triggerAction")
    read: bool
    created_at: datetime = Field(alias="createdAt")


class PushNotificationRequest(BaseSchema):
    title: str
    body: str
    category: str
    trigger_action: str = Field(alias="triggerAction")
    target_roles: list[str] = Field(default_factory=list, alias="targetRoles")
    order_id: UUID | None = Field(default=None, alias="orderId")
    target_phone: str | None = Field(default=None, alias="targetPhone")


class MarkAllReadRequest(BaseSchema):
    role: str | None = None


class InternalEmitRequest(BaseSchema):
    trigger_action: str = Field(alias="triggerAction")
    context: dict = Field(default_factory=dict)
    target_roles: list[str] = Field(default_factory=list, alias="targetRoles")
    target_user_ids: list[UUID] = Field(default_factory=list, alias="targetUserIds")
    order_id: UUID | None = Field(default=None, alias="orderId")
    patient_id: UUID | None = Field(default=None, alias="patientId")
    channels: list[str] | None = None


class NotificationLogEntry(BaseSchema):
    id: UUID
    channel: str
    template: str | None = None
    recipient: str
    payload: dict = Field(default_factory=dict)
    status: str
    sent_at: datetime = Field(alias="sentAt")
    order_id: UUID | None = Field(default=None, alias="orderId")
    patient_id: UUID | None = Field(default=None, alias="patientId")
    trigger_event: str | None = Field(default=None, alias="triggerEvent")
