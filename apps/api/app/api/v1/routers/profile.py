from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.exceptions import AppError
from app.schemas.common import DataEnvelope
from app.services.profile_service import ProfileService

router = APIRouter(tags=["profile"])


def _service(db: AsyncSession = Depends(get_db)) -> ProfileService:
    return ProfileService(db)


@router.get("/profile", response_model=DataEnvelope[dict])
async def get_profile(
    current_user: CurrentUser = Depends(get_current_user),
    service: ProfileService = Depends(_service),
) -> DataEnvelope[dict]:
    return DataEnvelope(data=await service.get_profile(current_user.user_id))


@router.patch("/profile/basic", response_model=DataEnvelope[dict])
async def update_basic(
    body: dict,
    current_user: CurrentUser = Depends(get_current_user),
    service: ProfileService = Depends(_service),
) -> DataEnvelope[dict]:
    return DataEnvelope(data=await service.update_basic(current_user.user_id, body))


@router.patch("/profile/emergency-contact", response_model=DataEnvelope[dict])
async def update_emergency_contact(
    body: dict,
    current_user: CurrentUser = Depends(get_current_user),
    service: ProfileService = Depends(_service),
) -> DataEnvelope[dict]:
    return DataEnvelope(data=await service.update_emergency_contact(current_user.user_id, body))


@router.post("/profile/photo", response_model=DataEnvelope[dict])
async def update_profile_photo(
    body: dict,
    current_user: CurrentUser = Depends(get_current_user),
    service: ProfileService = Depends(_service),
) -> DataEnvelope[dict]:
    photo_url = body.get("profilePhotoUrl") or body.get("storageUrl")
    if not photo_url:
        raise AppError("profilePhotoUrl is required")
    return DataEnvelope(
        data=await service.update_basic(current_user.user_id, {"profilePhotoUrl": photo_url}),
    )
