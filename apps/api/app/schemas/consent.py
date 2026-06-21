from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.schemas.common import BaseSchema


class ConsentPurposeResponse(BaseSchema):
    id: UUID
    code: str
    name: str
    description: str | None = None
    lawful_basis: str | None = None
    is_sensitive: bool = True
    status: str = "active"


class UserConsentResponse(BaseSchema):
    id: UUID
    purpose_id: UUID = Field(alias="purposeId")
    purpose_code: str = Field(alias="purposeCode")
    purpose_name: str = Field(alias="purposeName")
    purpose_description: str | None = Field(default=None, alias="purposeDescription")
    accepted: bool
    accepted_at: datetime | None = Field(default=None, alias="acceptedAt")
    withdrawn_at: datetime | None = Field(default=None, alias="withdrawnAt")


class AcceptConsentRequest(BaseSchema):
    purpose_id: UUID = Field(alias="purposeId")
