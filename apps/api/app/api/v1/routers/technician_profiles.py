from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.exceptions import AppError
from app.schemas.common import DataEnvelope
from app.services.technician_profile_service import TechnicianProfileService

router = APIRouter(tags=["technician-profile"])


def _service(db: AsyncSession = Depends(get_db)) -> TechnicianProfileService:
    return TechnicianProfileService(db)


def _require_admin(user: CurrentUser) -> None:
    if not any(role in user.roles for role in ("admin", "support", "city_manager")):
        raise AppError("Requires admin or operations role", status_code=403, error="forbidden")


def _require_technician(user: CurrentUser) -> None:
    if "technician" not in user.roles:
        raise AppError("Requires technician role", status_code=403, error="forbidden")


@router.get("/technician/profile", response_model=DataEnvelope[dict])
async def get_my_profile(
    current_user: CurrentUser = Depends(get_current_user),
    service: TechnicianProfileService = Depends(_service),
) -> DataEnvelope[dict]:
    _require_technician(current_user)
    technician_id = await service.resolve_technician_id(current_user.user_id, by_user=True)
    return DataEnvelope(data=await service.load_bundle(technician_id))


@router.patch("/technician/profile", response_model=DataEnvelope[dict])
async def update_my_profile(
    body: dict,
    current_user: CurrentUser = Depends(get_current_user),
    service: TechnicianProfileService = Depends(_service),
) -> DataEnvelope[dict]:
    _require_technician(current_user)
    technician_id = await service.resolve_technician_id(current_user.user_id, by_user=True)
    return DataEnvelope(
        data=await service.update_profile(technician_id, body, actor_role="technician"),
    )


@router.post("/technician/profile/documents", response_model=DataEnvelope[dict])
async def upload_my_document(
    body: dict,
    current_user: CurrentUser = Depends(get_current_user),
    service: TechnicianProfileService = Depends(_service),
) -> DataEnvelope[dict]:
    _require_technician(current_user)
    technician_id = await service.resolve_technician_id(current_user.user_id, by_user=True)
    return DataEnvelope(
        data=await service.add_document(technician_id, current_user.user_id, body),
    )


@router.get("/admin/staff/technicians/{technician_id}/profile", response_model=DataEnvelope[dict])
async def admin_get_profile(
    technician_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: TechnicianProfileService = Depends(_service),
) -> DataEnvelope[dict]:
    _require_admin(current_user)
    resolved_id = await service.resolve_technician_id_flexible(technician_id)
    return DataEnvelope(data=await service.load_bundle(resolved_id))


@router.patch("/admin/staff/technicians/{technician_id}/profile", response_model=DataEnvelope[dict])
async def admin_update_profile(
    technician_id: UUID,
    body: dict,
    current_user: CurrentUser = Depends(get_current_user),
    service: TechnicianProfileService = Depends(_service),
) -> DataEnvelope[dict]:
    _require_admin(current_user)
    resolved_id = await service.resolve_technician_id_flexible(technician_id)
    return DataEnvelope(data=await service.update_profile(resolved_id, body, actor_role="admin"))


@router.put("/admin/staff/technicians/{technician_id}/pincodes", response_model=DataEnvelope[dict])
async def admin_set_pincodes(
    technician_id: UUID,
    body: dict,
    current_user: CurrentUser = Depends(get_current_user),
    service: TechnicianProfileService = Depends(_service),
) -> DataEnvelope[dict]:
    _require_admin(current_user)
    resolved_id = await service.resolve_technician_id_flexible(technician_id)
    return DataEnvelope(
        data=await service.set_service_pincodes(resolved_id, body.get("pincodes") or []),
    )


@router.post("/admin/staff/technicians/{technician_id}/documents", response_model=DataEnvelope[dict])
async def admin_upload_document(
    technician_id: UUID,
    body: dict,
    current_user: CurrentUser = Depends(get_current_user),
    service: TechnicianProfileService = Depends(_service),
) -> DataEnvelope[dict]:
    _require_admin(current_user)
    resolved_id = await service.resolve_technician_id_flexible(technician_id)
    return DataEnvelope(
        data=await service.add_document(resolved_id, current_user.user_id, body),
    )


@router.post("/admin/staff/technicians/{technician_id}/verify", response_model=DataEnvelope[dict])
async def admin_mark_verified(
    technician_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: TechnicianProfileService = Depends(_service),
) -> DataEnvelope[dict]:
    _require_admin(current_user)
    resolved_id = await service.resolve_technician_id_flexible(technician_id)
    return DataEnvelope(data=await service.mark_profile_verified(resolved_id))


@router.post("/admin/staff/technicians/documents/{document_id}/verify", response_model=DataEnvelope[dict])
async def verify_technician_document(
    document_id: UUID,
    body: dict,
    current_user: CurrentUser = Depends(get_current_user),
    service: TechnicianProfileService = Depends(_service),
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
