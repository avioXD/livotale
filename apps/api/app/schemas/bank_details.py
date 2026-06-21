from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.schemas.common import BaseSchema


class UpsertBankDetailsInput(BaseSchema):
    account_holder_name: str = Field(alias="accountHolderName")
    account_number: str = Field(alias="accountNumber")
    ifsc_code: str = Field(alias="ifscCode")
    bank_name: str | None = Field(default=None, alias="bankName")
    branch_name: str | None = Field(default=None, alias="branchName")
    upi_id: str | None = Field(default=None, alias="upiId")
    verification_doc_file_id: UUID | None = Field(default=None, alias="verificationDocFileId")


class VerifyBankDetailsInput(BaseSchema):
    status: str
    notes: str | None = None


class BankDetailsMasked(BaseSchema):
    user_id: UUID = Field(alias="userId")
    account_holder_name: str | None = Field(default=None, alias="accountHolderName")
    account_number_last4: str | None = Field(default=None, alias="accountNumberLast4")
    ifsc_code: str | None = Field(default=None, alias="ifscCode")
    bank_name: str | None = Field(default=None, alias="bankName")
    branch_name: str | None = Field(default=None, alias="branchName")
    upi_id: str | None = Field(default=None, alias="upiId")
    verification_status: str = Field(alias="verificationStatus")
    has_verification_doc: bool = Field(default=False, alias="hasVerificationDoc")
    required_for_payout: bool = Field(default=False, alias="requiredForPayout")
    verified_at: datetime | None = Field(default=None, alias="verifiedAt")


class BankDetailsFull(BankDetailsMasked):
    account_number: str | None = Field(default=None, alias="accountNumber")
    verification_doc_file_id: UUID | None = Field(default=None, alias="verificationDocFileId")
    verification_notes: str | None = Field(default=None, alias="verificationNotes")


class BankDetailsSelfNotConfigured(BaseSchema):
    configured: bool = False
    required_for_payout: bool = Field(default=False, alias="requiredForPayout")


class BankDetailsSelfConfigured(BaseSchema):
    configured: bool = True
    details: BankDetailsFull


class BankDetailsDirectoryRow(BaseSchema):
    user_id: UUID = Field(alias="userId")
    full_name: str = Field(alias="fullName")
    email: str | None = None
    mobile: str | None = None
    role: str
    staff_member_id: UUID | None = Field(default=None, alias="staffMemberId")
    staff_role_slug: str | None = Field(default=None, alias="staffRoleSlug")
    account_holder_name: str | None = Field(default=None, alias="accountHolderName")
    account_number_last4: str | None = Field(default=None, alias="accountNumberLast4")
    ifsc_code: str | None = Field(default=None, alias="ifscCode")
    bank_name: str | None = Field(default=None, alias="bankName")
    verification_status: str | None = Field(default=None, alias="verificationStatus")
    required_for_payout: bool = Field(default=False, alias="requiredForPayout")
    has_verification_doc: bool = Field(default=False, alias="hasVerificationDoc")
    configured: bool = False
