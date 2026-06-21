from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.exceptions import AppError
from app.schemas.common import DataEnvelope
from app.services.staff_profile_service import STAFF_PROFILE_SLUGS, StaffProfileService

router = APIRouter(tags=["staff-profile"])


def _service(db: AsyncSession = Depends(get_db)) -> StaffProfileService:
    return StaffProfileService(db)


def _require_admin(user: CurrentUser) -> None:
    if not any(role in user.roles for role in ("admin", "support", "city_manager")):
        raise AppError("Requires admin or operations role", status_code=403, error="forbidden")


def _register_role_routes(role_slug: str) -> None:
    @router.get(f"/admin/staff/{role_slug}/{{member_id}}/profile", response_model=DataEnvelope[dict])
    async def admin_get_profile(
        member_id: UUID,
        current_user: CurrentUser = Depends(get_current_user),
        service: StaffProfileService = Depends(_service),
    ) -> DataEnvelope[dict]:
        _require_admin(current_user)
        role = service.resolve_hr_role(role_slug)
        return DataEnvelope(data=await service.load_bundle(role, member_id))

    @router.patch(f"/admin/staff/{role_slug}/{{member_id}}/profile", response_model=DataEnvelope[dict])
    async def admin_update_profile(
        member_id: UUID,
        body: dict,
        current_user: CurrentUser = Depends(get_current_user),
        service: StaffProfileService = Depends(_service),
    ) -> DataEnvelope[dict]:
        _require_admin(current_user)
        role = service.resolve_hr_role(role_slug)
        return DataEnvelope(data=await service.update_profile(role, member_id, body, actor_role="admin"))

    @router.post(f"/admin/staff/{role_slug}/{{member_id}}/documents", response_model=DataEnvelope[dict])
    async def admin_upload_document(
        member_id: UUID,
        body: dict,
        current_user: CurrentUser = Depends(get_current_user),
        service: StaffProfileService = Depends(_service),
    ) -> DataEnvelope[dict]:
        _require_admin(current_user)
        role = service.resolve_hr_role(role_slug)
        return DataEnvelope(
            data=await service.add_document(role, member_id, current_user.user_id, body),
        )

    @router.post(f"/admin/staff/{role_slug}/{{member_id}}/verify", response_model=DataEnvelope[dict])
    async def admin_mark_verified(
        member_id: UUID,
        current_user: CurrentUser = Depends(get_current_user),
        service: StaffProfileService = Depends(_service),
    ) -> DataEnvelope[dict]:
        _require_admin(current_user)
        role = service.resolve_hr_role(role_slug)
        return DataEnvelope(data=await service.mark_profile_verified(role, member_id))

    @router.get(f"/staff/{role_slug}/profile", response_model=DataEnvelope[dict])
    async def self_get_profile(
        current_user: CurrentUser = Depends(get_current_user),
        service: StaffProfileService = Depends(_service),
    ) -> DataEnvelope[dict]:
        role = service.resolve_hr_role(role_slug)
        member_id = await service.resolve_member_id_for_user(role, current_user.user_id)
        return DataEnvelope(data=await service.load_bundle(role, member_id))

    @router.patch(f"/staff/{role_slug}/profile", response_model=DataEnvelope[dict])
    async def self_update_profile(
        body: dict,
        current_user: CurrentUser = Depends(get_current_user),
        service: StaffProfileService = Depends(_service),
    ) -> DataEnvelope[dict]:
        role = service.resolve_hr_role(role_slug)
        member_id = await service.resolve_member_id_for_user(role, current_user.user_id)
        return DataEnvelope(
            data=await service.update_profile(role, member_id, body, actor_role="self"),
        )

    @router.post(f"/staff/{role_slug}/profile/documents", response_model=DataEnvelope[dict])
    async def self_upload_document(
        body: dict,
        current_user: CurrentUser = Depends(get_current_user),
        service: StaffProfileService = Depends(_service),
    ) -> DataEnvelope[dict]:
        role = service.resolve_hr_role(role_slug)
        member_id = await service.resolve_member_id_for_user(role, current_user.user_id)
        return DataEnvelope(
            data=await service.add_document(role, member_id, current_user.user_id, body),
        )


for slug in STAFF_PROFILE_SLUGS:
    _register_role_routes(slug)


@router.post("/admin/staff/documents/{document_id}/verify", response_model=DataEnvelope[dict])
async def verify_staff_document(
    document_id: UUID,
    body: dict,
    current_user: CurrentUser = Depends(get_current_user),
    service: StaffProfileService = Depends(_service),
) -> DataEnvelope[dict]:
    _require_admin(current_user)
    return DataEnvelope(
        data=await service.verify_document(
            document_id,
            current_user.user_id,
            body.get("status", "verified"),
            body.get("notes"),
        ),
    )
