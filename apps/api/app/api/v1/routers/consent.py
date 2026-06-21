from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user, request_meta
from app.core.database import get_db
from app.schemas.common import DataEnvelope
from app.schemas.consent import AcceptConsentRequest, ConsentPurposeResponse, UserConsentResponse
from app.services.consent_service import ConsentService

router = APIRouter(prefix="/consent", tags=["consent"])


def _service(db: AsyncSession = Depends(get_db)) -> ConsentService:
    return ConsentService(db)


@router.get("/purposes", response_model=DataEnvelope[list[ConsentPurposeResponse]])
async def list_purposes(
    current_user: CurrentUser = Depends(get_current_user),
    service: ConsentService = Depends(_service),
) -> DataEnvelope[list[ConsentPurposeResponse]]:
    _ = current_user
    return DataEnvelope(data=await service.list_purposes())


@router.get("/mine", response_model=DataEnvelope[list[UserConsentResponse]])
async def list_my_consents(
    current_user: CurrentUser = Depends(get_current_user),
    service: ConsentService = Depends(_service),
) -> DataEnvelope[list[UserConsentResponse]]:
    return DataEnvelope(data=await service.user_consents(current_user.user_id))


@router.post("/accept", response_model=DataEnvelope[list[UserConsentResponse]])
async def accept_consent(
    body: AcceptConsentRequest,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    service: ConsentService = Depends(_service),
) -> DataEnvelope[list[UserConsentResponse]]:
    meta = request_meta(request)
    data = await service.accept_purpose(
        current_user.user_id,
        body.purpose_id,
        ip_address=meta["ip_address"],
        user_agent=meta["user_agent"],
    )
    return DataEnvelope(data=data)
