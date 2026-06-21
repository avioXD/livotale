from datetime import datetime
from uuid import UUID

from pydantic import Field

from app.schemas.common import BaseSchema


class StaffMetric(BaseSchema):
    label: str
    value: str | int


class StaffMemberRow(BaseSchema):
    id: UUID
    user_id: UUID | None = Field(default=None, alias="userId")
    badge_id: str | None = Field(default=None, alias="badgeId")
    full_name: str = Field(alias="fullName")
    subtitle: str
    status: str
    email: str | None = None
    mobile: str | None = None
    city: str | None = None
    pincodes: list[str] = Field(default_factory=list)
    is_city_manager_promoted: bool = Field(default=False, alias="isCityManagerPromoted")
    assigned_service_zone_ids: list[str] = Field(default_factory=list, alias="assignedServiceZoneIds")
    city_manager_service_zone_ids: list[str] = Field(default_factory=list, alias="cityManagerServiceZoneIds")
    metrics: list[StaffMetric] = Field(default_factory=list)
    profile_path: str | None = Field(default=None, alias="profilePath")
    archived_at: datetime | None = Field(default=None, alias="archivedAt")
    archived_by: UUID | None = Field(default=None, alias="archivedBy")


class StaffArchiveBlocker(BaseSchema):
    category: str
    count: int
    message: str


class StaffArchiveEligibility(BaseSchema):
    can_archive: bool = Field(alias="canArchive")
    already_archived: bool = Field(alias="alreadyArchived")
    member_id: UUID = Field(alias="memberId")
    full_name: str = Field(alias="fullName")
    role_key: str = Field(alias="roleKey")
    blockers: list[StaffArchiveBlocker] = Field(default_factory=list)
    message: str


class StaffArchiveResult(BaseSchema):
    member: StaffMemberRow
    archived_at: datetime = Field(alias="archivedAt")
    message: str


class StaffUnarchiveResult(BaseSchema):
    member: StaffMemberRow
    message: str


class StaffMemberCreate(BaseSchema):
    id: UUID | None = None
    full_name: str = Field(alias="fullName")
    mobile: str
    email: str | None = None
    status: str = "inactive"


class StaffMemberUpdate(BaseSchema):
    full_name: str | None = Field(default=None, alias="fullName")
    mobile: str | None = None
    email: str | None = None
    status: str | None = None
    city: str | None = None
    pincodes: list[str] | None = None


class StaffKpi(BaseSchema):
    label: str
    value: str | int
    hint: str | None = None


class StaffRoleDashboard(BaseSchema):
    headline: str
    kpis: list[StaffKpi] = Field(default_factory=list)


class StaffOnboardingInvite(BaseSchema):
    id: UUID
    token: str
    role_key: str = Field(alias="roleKey")
    full_name: str = Field(alias="fullName")
    email: str | None = None
    mobile: str
    username: str | None = None
    member_id: UUID | None = Field(default=None, alias="memberId")
    user_id: UUID | None = Field(default=None, alias="userId")
    status: str
    profile_complete: bool = Field(alias="profileComplete")
    verification_status: str = Field(alias="verificationStatus")
    employment_status: str = Field(alias="employmentStatus")
    expires_at: datetime = Field(alias="expiresAt")
    link_sent_at: datetime | None = Field(default=None, alias="linkSentAt")
    registered_at: datetime | None = Field(default=None, alias="registeredAt")
    profile_submitted_at: datetime | None = Field(default=None, alias="profileSubmittedAt")
    activated_at: datetime | None = Field(default=None, alias="activatedAt")
    created_at: datetime = Field(alias="createdAt")


class CreateStaffInvitePayload(BaseSchema):
    full_name: str = Field(alias="fullName")
    mobile: str
    email: str | None = None
    username: str | None = None
    profile: dict | None = None


class StaffOnboardingStatus(BaseSchema):
    required: bool
    invite_id: UUID | None = Field(default=None, alias="inviteId")
    invite_token: str | None = Field(default=None, alias="inviteToken")
    role_key: str | None = Field(default=None, alias="roleKey")
    profile_complete: bool = Field(alias="profileComplete")
    verification_complete: bool = Field(alias="verificationComplete")
    employment_status: str = Field(alias="employmentStatus")
    verification_status: str | None = Field(default=None, alias="verificationStatus")
    status: str | None = None
    can_access_app: bool = Field(alias="canAccessApp")


class PartnerLabPoc(BaseSchema):
    id: str
    name: str
    designation: str
    phone: str
    email: str


class PartnerLabDocument(BaseSchema):
    id: str
    label: str
    file_name: str = Field(alias="fileName")
    file_url: str = Field(alias="fileUrl")
    uploaded_at: datetime = Field(alias="uploadedAt")


class PartnerLabTestCharge(BaseSchema):
    test_name: str = Field(alias="testName")
    charge_inr: float = Field(alias="chargeInr")


class PartnerLab(BaseSchema):
    id: UUID
    name: str
    contact_person: str = Field(alias="contactPerson")
    contact_designation: str | None = Field(default=None, alias="contactDesignation")
    phone: str
    email: str
    poc_contacts: list[PartnerLabPoc] = Field(default_factory=list, alias="pocContacts")
    address: str = ""
    city: str = ""
    state: str = ""
    pincode: str = ""
    gst_number: str | None = Field(default=None, alias="gstNumber")
    registration_number: str | None = Field(default=None, alias="registrationNumber")
    supported_tests: list[str] = Field(default_factory=list, alias="supportedTests")
    legal_documents: list[PartnerLabDocument] = Field(default_factory=list, alias="legalDocuments")
    agreement_doc: PartnerLabDocument | None = Field(default=None, alias="agreementDoc")
    report_format_sample: PartnerLabDocument | None = Field(default=None, alias="reportFormatSample")
    charges_per_test: list[PartnerLabTestCharge] = Field(default_factory=list, alias="chargesPerTest")
    package_charges: float | None = Field(default=None, alias="packageCharges")
    annual_tieup_charges: float | None = Field(default=None, alias="annualTieupCharges")
    billing_cycle: str = Field(default="monthly", alias="billingCycle")
    contract_start: str | None = Field(default=None, alias="contractStart")
    contract_end: str | None = Field(default=None, alias="contractEnd")
    active: bool = True
    notes: str | None = None
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class PartnerLabStats(BaseSchema):
    orders_assigned: int = Field(default=0, alias="ordersAssigned")
    samples_dispatched: int = Field(default=0, alias="samplesDispatched")
    samples_received: int = Field(default=0, alias="samplesReceived")
    reports_uploaded: int = Field(default=0, alias="reportsUploaded")
    reports_verified: int = Field(default=0, alias="reportsVerified")
    letterhead_published: int = Field(default=0, alias="letterheadPublished")
    in_pipeline: int = Field(default=0, alias="inPipeline")


class PartnerLabDetail(PartnerLab):
    stats: PartnerLabStats
    estimated_billing_inr: float = Field(default=0, alias="estimatedBillingInr")


class CreatePartnerLabInput(BaseSchema):
    name: str
    contact_person: str = Field(alias="contactPerson")
    phone: str
    email: str = ""
    active: bool = True
    city: str = ""
    state: str = ""
    pincode: str = ""
    address: str = ""
    registration_number: str | None = Field(default=None, alias="registrationNumber")
    notes: str | None = None


class UpdatePartnerLabInput(BaseSchema):
    name: str | None = None
    contact_person: str | None = Field(default=None, alias="contactPerson")
    phone: str | None = None
    email: str | None = None
    active: bool | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    address: str | None = None
    registration_number: str | None = Field(default=None, alias="registrationNumber")
    notes: str | None = None


class ServiceZone(BaseSchema):
    id: UUID
    city: str
    state: str
    pincodes: list[str] = Field(default_factory=list)
    active: bool = True
    notes: str | None = None
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")


class CreateServiceZoneInput(BaseSchema):
    city: str
    state: str
    pincodes: list[str] = Field(default_factory=list)
    active: bool = True
    notes: str | None = None


class UpdateServiceZoneInput(BaseSchema):
    city: str | None = None
    state: str | None = None
    pincodes: list[str] | None = None
    active: bool | None = None
    notes: str | None = None
