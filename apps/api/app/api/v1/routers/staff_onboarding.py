
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.schemas.common import DataEnvelope
from app.schemas.staff import StaffOnboardingInvite, StaffOnboardingStatus
from app.services.staff_service import StaffService

router = APIRouter(tags=["staff-onboarding"])


def _service(db: AsyncSession = Depends(get_db)) -> StaffService:
    return StaffService(db)


@router.get("/staff/onboard/{token}", response_model=DataEnvelope[StaffOnboardingInvite])
async def get_invite(token: str, service: StaffService = Depends(_service)) -> DataEnvelope[StaffOnboardingInvite]:
    data = await service.get_invite_by_token(token)
    return DataEnvelope(data=data)


@router.post("/staff/onboard/{token}/attach", response_model=DataEnvelope[StaffOnboardingInvite])
async def attach_user(
    token: str,
    current_user: CurrentUser = Depends(get_current_user),
    service: StaffService = Depends(_service),
) -> DataEnvelope[StaffOnboardingInvite]:
    data = await service.attach_user_to_invite(token, current_user.user_id)
    return DataEnvelope(data=data)


@router.post("/staff/onboard/{token}/submit", response_model=DataEnvelope[StaffOnboardingInvite])
async def submit_profile(
    token: str,
    body: dict,
    service: StaffService = Depends(_service),
) -> DataEnvelope[StaffOnboardingInvite]:
    data = await service.submit_invite_profile(token, body)
    return DataEnvelope(data=data)


@router.get("/staff/onboarding/status", response_model=DataEnvelope[StaffOnboardingStatus])
async def onboarding_status(
    current_user: CurrentUser = Depends(get_current_user),
    service: StaffService = Depends(_service),
) -> DataEnvelope[StaffOnboardingStatus]:
    data = await service.get_onboarding_status(current_user.user_id)
    return DataEnvelope(data=data)
