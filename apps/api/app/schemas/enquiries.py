from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import Field

from app.schemas.common import BaseSchema

EnquirySource = Literal["website", "whatsapp", "manual"]
EnquiryStatus = Literal[
    "new",
    "contacted",
    "interested",
    "not_interested",
    "follow_up_required",
    "converted",
    "closed",
]
EnquiryOrderOutcome = Literal["confirmed", "cancelled", "payment_failed", "defaulter"]


class EnquiryFollowUpLog(BaseSchema):
    id: UUID
    status: EnquiryStatus
    internal_notes: str | None = Field(default=None, alias="internalNotes")
    call_remarks: str | None = Field(default=None, alias="callRemarks")
    follow_up_at: datetime | None = Field(default=None, alias="followUpAt")
    created_at: datetime = Field(alias="createdAt")
    created_by_name: str | None = Field(default=None, alias="createdByName")


class Enquiry(BaseSchema):
    id: UUID
    enquiry_number: str = Field(alias="enquiryNumber")
    thread_id: str = Field(alias="threadId")
    thread_sequence: int = Field(alias="threadSequence")
    source: EnquirySource
    patient_name: str = Field(alias="patientName")
    phone: str
    email: str | None = None
    age: int | None = None
    gender: str | None = None
    city: str | None = None
    address: str | None = None
    preferred_package_id: UUID | None = Field(default=None, alias="preferredPackageId")
    preferred_package_code: str | None = Field(default=None, alias="preferredPackageCode")
    message: str | None = None
    enquiry_at: datetime = Field(alias="enquiryAt")
    assigned_executive_id: UUID | None = Field(default=None, alias="assignedExecutiveId")
    assigned_executive_name: str | None = Field(default=None, alias="assignedExecutiveName")
    status: EnquiryStatus
    follow_up_at: datetime | None = Field(default=None, alias="followUpAt")
    follow_up_logs: list[EnquiryFollowUpLog] | None = Field(default=None, alias="followUpLogs")
    internal_notes: str | None = Field(default=None, alias="internalNotes")
    call_remarks: str | None = Field(default=None, alias="callRemarks")
    patient_id: UUID | None = Field(default=None, alias="patientId")
    order_id: UUID | None = Field(default=None, alias="orderId")
    order_outcome: EnquiryOrderOutcome | None = Field(default=None, alias="orderOutcome")
    order_outcome_remarks: str | None = Field(default=None, alias="orderOutcomeRemarks")
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")
    thread_count: int | None = Field(default=None, alias="threadCount")


class CreateEnquiryInput(BaseSchema):
    source: EnquirySource
    patient_name: str = Field(alias="patientName")
    phone: str
    email: str | None = None
    age: int | None = None
    gender: str | None = None
    city: str | None = None
    address: str | None = None
    preferred_package_id: UUID | None = Field(default=None, alias="preferredPackageId")
    message: str | None = None


class AddEnquiryFollowUpInput(BaseSchema):
    status: EnquiryStatus
    internal_notes: str | None = Field(default=None, alias="internalNotes")
    call_remarks: str | None = Field(default=None, alias="callRemarks")
    follow_up_at: datetime | None = Field(default=None, alias="followUpAt")
    created_by_name: str | None = Field(default=None, alias="createdByName")


class UpdateEnquiryInput(BaseSchema):
    status: EnquiryStatus | None = None
    assigned_executive_id: UUID | None = Field(default=None, alias="assignedExecutiveId")
    follow_up_at: datetime | None = Field(default=None, alias="followUpAt")
    internal_notes: str | None = Field(default=None, alias="internalNotes")
    call_remarks: str | None = Field(default=None, alias="callRemarks")
    patient_name: str | None = Field(default=None, alias="patientName")
    phone: str | None = None
    email: str | None = None
    age: int | None = None
    gender: str | None = None
    city: str | None = None
    address: str | None = None
    message: str | None = None
    preferred_package_id: UUID | None = Field(default=None, alias="preferredPackageId")
    order_outcome: EnquiryOrderOutcome | None = Field(default=None, alias="orderOutcome")
    order_outcome_remarks: str | None = Field(default=None, alias="orderOutcomeRemarks")


class NewEnquiryThreadInput(BaseSchema):
    message: str | None = None


class PublicCreateEnquiryInput(BaseSchema):
    """Public website enquiry form — source is always website."""

    patient_name: str = Field(alias="patientName", min_length=1, max_length=200)
    phone: str = Field(min_length=10, max_length=15)
    email: str | None = Field(default=None, max_length=254)
    age: int | None = Field(default=None, ge=1, le=120)
    gender: str | None = Field(default=None, max_length=32)
    city: str | None = Field(default=None, max_length=100)
    address: str | None = Field(default=None, max_length=500)
    preferred_package_id: UUID | None = Field(default=None, alias="preferredPackageId")
    message: str | None = Field(default=None, max_length=2000)
