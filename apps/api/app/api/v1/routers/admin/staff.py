from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.exceptions import AppError
from app.schemas.common import DataEnvelope
from app.schemas.staff import (
    CreatePartnerLabInput,
    CreateServiceZoneInput,
    CreateStaffInvitePayload,
    PartnerLab,
    PartnerLabDetail,
    ServiceZone,
    StaffArchiveEligibility,
    StaffArchiveResult,
    StaffMemberCreate,
    StaffMemberRow,
    StaffMemberUpdate,
    StaffOnboardingInvite,
    StaffRoleDashboard,
    StaffUnarchiveResult,
    UpdatePartnerLabInput,
    UpdateServiceZoneInput,
)
from app.services.staff_archive_service import StaffArchiveService
from app.services.staff_service import StaffService

router = APIRouter(prefix="/admin", tags=["admin-staff"])


def _staff_service(db: AsyncSession = Depends(get_db)) -> StaffService:
    return StaffService(db)


def _archive_service(db: AsyncSession = Depends(get_db)) -> StaffArchiveService:
    return StaffArchiveService(db)


def _require_admin(user: CurrentUser) -> None:
    if not any(role in user.roles for role in ("admin", "support", "city_manager")):
        raise AppError("Requires admin or operations role", status_code=403, error="forbidden")


def _require_archive_actor(user: CurrentUser) -> None:
    if not any(role in user.effective_roles for role in ("admin", "support")):
        raise AppError(
            "Only super admins and operations staff can archive or unarchive users",
            status_code=403,
            error="forbidden",
        )


@router.get("/staff/{role_slug}/users", response_model=DataEnvelope[list[StaffMemberRow]])
async def list_staff_users(
    role_slug: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: StaffService = Depends(_staff_service),
) -> DataEnvelope[list[StaffMemberRow]]:
    _require_admin(current_user)
    data = await service.list_users(role_slug)
    return DataEnvelope(data=data)


@router.post("/staff/{role_slug}/users", response_model=DataEnvelope[StaffMemberRow])
async def create_staff_user(
    role_slug: str,
    body: StaffMemberCreate,
    current_user: CurrentUser = Depends(get_current_user),
    service: StaffService = Depends(_staff_service),
) -> DataEnvelope[StaffMemberRow]:
    _require_admin(current_user)
    data = await service.create_member(role_slug, body.model_dump(by_alias=True))
    return DataEnvelope(data=data)


@router.patch("/staff/{role_slug}/users/{member_id}", response_model=DataEnvelope[StaffMemberRow])
async def update_staff_user(
    role_slug: str,
    member_id: UUID,
    body: StaffMemberUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    service: StaffService = Depends(_staff_service),
) -> DataEnvelope[StaffMemberRow]:
    _require_admin(current_user)
    data = await service.update_member(role_slug, member_id, body.model_dump(by_alias=True, exclude_none=True))
    return DataEnvelope(data=data)


@router.get(
    "/staff/{role_slug}/users/{member_id}/archive-check",
    response_model=DataEnvelope[StaffArchiveEligibility],
)
async def check_staff_archive_eligibility(
    role_slug: str,
    member_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: StaffArchiveService = Depends(_archive_service),
) -> DataEnvelope[StaffArchiveEligibility]:
    _require_archive_actor(current_user)
    data = await service.check_archive_eligibility(
        role_slug,
        member_id,
        current_user.effective_roles,
        current_user.user_id,
    )
    return DataEnvelope(data=data)


@router.post(
    "/staff/{role_slug}/users/{member_id}/archive",
    response_model=DataEnvelope[StaffArchiveResult],
)
async def archive_staff_user(
    role_slug: str,
    member_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: StaffArchiveService = Depends(_archive_service),
) -> DataEnvelope[StaffArchiveResult]:
    _require_archive_actor(current_user)
    data = await service.archive_member(
        role_slug,
        member_id,
        current_user.effective_roles,
        current_user.user_id,
    )
    return DataEnvelope(data=data)


@router.post(
    "/staff/{role_slug}/users/{member_id}/unarchive",
    response_model=DataEnvelope[StaffUnarchiveResult],
)
async def unarchive_staff_user(
    role_slug: str,
    member_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: StaffArchiveService = Depends(_archive_service),
) -> DataEnvelope[StaffUnarchiveResult]:
    _require_archive_actor(current_user)
    data = await service.unarchive_member(
        role_slug,
        member_id,
        current_user.effective_roles,
        current_user.user_id,
    )
    return DataEnvelope(data=data)


@router.put("/staff/{role_slug}/users/{member_id}", response_model=DataEnvelope[StaffMemberRow])
async def upsert_staff_user(
    role_slug: str,
    member_id: UUID,
    body: StaffMemberRow,
    current_user: CurrentUser = Depends(get_current_user),
    service: StaffService = Depends(_staff_service),
) -> DataEnvelope[StaffMemberRow]:
    _require_admin(current_user)
    payload = body.model_dump(by_alias=True)
    payload["id"] = member_id
    data = await service.upsert_member(role_slug, payload)
    return DataEnvelope(data=data)


@router.get("/staff/{role_slug}/org/dashboard", response_model=DataEnvelope[StaffRoleDashboard])
async def staff_dashboard(
    role_slug: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: StaffService = Depends(_staff_service),
) -> DataEnvelope[StaffRoleDashboard]:
    _require_admin(current_user)
    data = await service.get_dashboard(role_slug)
    return DataEnvelope(data=data)


@router.post("/staff/{role_slug}/onboard", response_model=DataEnvelope[StaffOnboardingInvite])
async def create_staff_invite(
    role_slug: str,
    body: CreateStaffInvitePayload,
    current_user: CurrentUser = Depends(get_current_user),
    service: StaffService = Depends(_staff_service),
) -> DataEnvelope[StaffOnboardingInvite]:
    _require_admin(current_user)
    data = await service.create_invite(role_slug, body.model_dump(by_alias=True), current_user.user_id)
    return DataEnvelope(data=data)


@router.get("/staff/{role_slug}/onboard", response_model=DataEnvelope[list[StaffOnboardingInvite]])
async def list_staff_invites(
    role_slug: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: StaffService = Depends(_staff_service),
) -> DataEnvelope[list[StaffOnboardingInvite]]:
    _require_admin(current_user)
    data = await service.list_invites(role_slug)
    return DataEnvelope(data=data)


@router.post("/staff/onboard/{token}/send-link", response_model=DataEnvelope[StaffOnboardingInvite])
async def send_staff_invite_link(
    token: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: StaffService = Depends(_staff_service),
) -> DataEnvelope[StaffOnboardingInvite]:
    _require_admin(current_user)
    data = await service.send_invite_link(token)
    return DataEnvelope(data=data)


@router.get("/staff/lab-partners", response_model=DataEnvelope[list[PartnerLab]])
async def list_partner_labs(
    active_only: bool = True,
    current_user: CurrentUser = Depends(get_current_user),
    service: StaffService = Depends(_staff_service),
) -> DataEnvelope[list[PartnerLab]]:
    _require_admin(current_user)
    data = await service.list_partner_labs(active_only=active_only)
    return DataEnvelope(data=data)


@router.get("/staff/lab-partners/summaries", response_model=DataEnvelope[list[PartnerLab]])
async def list_partner_lab_summaries(
    active_only: bool = True,
    current_user: CurrentUser = Depends(get_current_user),
    service: StaffService = Depends(_staff_service),
) -> DataEnvelope[list[PartnerLab]]:
    _require_admin(current_user)
    labs = await service.list_partner_lab_summaries(active_only=active_only)
    return DataEnvelope(data=labs)


@router.get("/staff/lab-partners/{lab_id}", response_model=DataEnvelope[PartnerLab])
async def get_partner_lab(
    lab_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: StaffService = Depends(_staff_service),
) -> DataEnvelope[PartnerLab]:
    _require_admin(current_user)
    data = await service.get_partner_lab(lab_id)
    if not data:
        raise AppError("Lab not found", status_code=404)
    return DataEnvelope(data=data)


@router.get("/staff/lab-partners/{lab_id}/detail", response_model=DataEnvelope[PartnerLabDetail])
async def get_partner_lab_detail(
    lab_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: StaffService = Depends(_staff_service),
) -> DataEnvelope[PartnerLabDetail]:
    _require_admin(current_user)
    data = await service.get_partner_lab_detail(lab_id)
    if not data:
        raise AppError("Lab not found", status_code=404)
    return DataEnvelope(data=data)


@router.post("/staff/lab-partners", response_model=DataEnvelope[PartnerLab])
async def create_partner_lab(
    body: CreatePartnerLabInput,
    current_user: CurrentUser = Depends(get_current_user),
    service: StaffService = Depends(_staff_service),
) -> DataEnvelope[PartnerLab]:
    _require_admin(current_user)
    data = await service.create_partner_lab(body.model_dump(by_alias=True))
    return DataEnvelope(data=data)


@router.patch("/staff/lab-partners/{lab_id}", response_model=DataEnvelope[PartnerLab])
async def update_partner_lab(
    lab_id: UUID,
    body: UpdatePartnerLabInput,
    current_user: CurrentUser = Depends(get_current_user),
    service: StaffService = Depends(_staff_service),
) -> DataEnvelope[PartnerLab]:
    _require_admin(current_user)
    data = await service.update_partner_lab(lab_id, body.model_dump(by_alias=True, exclude_none=True))
    return DataEnvelope(data=data)


@router.get("/service-zones", response_model=DataEnvelope[list[ServiceZone]])
async def list_service_zones(
    current_user: CurrentUser = Depends(get_current_user),
    service: StaffService = Depends(_staff_service),
) -> DataEnvelope[list[ServiceZone]]:
    _require_admin(current_user)
    data = await service.list_service_zones()
    return DataEnvelope(data=data)


@router.get("/service-zones/{zone_id}", response_model=DataEnvelope[ServiceZone])
async def get_service_zone(
    zone_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: StaffService = Depends(_staff_service),
) -> DataEnvelope[ServiceZone]:
    _require_admin(current_user)
    data = await service.get_service_zone(zone_id)
    if not data:
        raise AppError("Service zone not found", status_code=404)
    return DataEnvelope(data=data)


@router.post("/service-zones", response_model=DataEnvelope[ServiceZone])
async def create_service_zone(
    body: CreateServiceZoneInput,
    current_user: CurrentUser = Depends(get_current_user),
    service: StaffService = Depends(_staff_service),
) -> DataEnvelope[ServiceZone]:
    _require_admin(current_user)
    data = await service.create_service_zone(body.model_dump(by_alias=True))
    return DataEnvelope(data=data)


@router.patch("/service-zones/{zone_id}", response_model=DataEnvelope[ServiceZone])
async def update_service_zone(
    zone_id: UUID,
    body: UpdateServiceZoneInput,
    current_user: CurrentUser = Depends(get_current_user),
    service: StaffService = Depends(_staff_service),
) -> DataEnvelope[ServiceZone]:
    _require_admin(current_user)
    data = await service.update_service_zone(zone_id, body.model_dump(by_alias=True, exclude_none=True))
    return DataEnvelope(data=data)


@router.delete("/service-zones/{zone_id}")
async def delete_service_zone(
    zone_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: StaffService = Depends(_staff_service),
) -> DataEnvelope[dict[str, bool]]:
    _require_admin(current_user)
    await service.delete_service_zone(zone_id)
    return DataEnvelope(data={"deleted": True})
