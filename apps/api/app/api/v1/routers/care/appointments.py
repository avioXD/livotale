from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.core.database import get_db
from app.core.deps import require_roles
from app.domain.rbac import RoleCode
from app.schemas.common import DataEnvelope
from app.services.care_appointment_service import CareAppointmentService

router = APIRouter(prefix="/care/org", tags=["care-appointments"])


class CareSessionNoteInput(BaseModel):
    note: str
    visible_to_patient: bool | None = Field(default=None, alias="visibleToPatient")

    model_config = {"populate_by_name": True}


class RecommendFollowUpInput(BaseModel):
    reason: str
    notes: str | None = None
    follow_up_days: int | None = Field(default=None, alias="followUpDays")

    model_config = {"populate_by_name": True}


def _service(db: AsyncSession = Depends(get_db)) -> CareAppointmentService:
    return CareAppointmentService(db)


@router.get("/appointments", response_model=DataEnvelope[list[dict]])
async def list_care_appointments(
    filter: str = "upcoming",
    current_user: CurrentUser = Depends(require_roles(RoleCode.DIETICIAN, RoleCode.HEALTH_COACH)),
    service: CareAppointmentService = Depends(_service),
) -> DataEnvelope[list[dict]]:
    member_id = await service.resolve_care_team_member_id(current_user.user_id)
    return DataEnvelope(data=await service.list_appointments(member_id, filter=filter))


@router.get("/appointments/{appointment_id}", response_model=DataEnvelope[dict])
async def get_care_appointment(
    appointment_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DIETICIAN, RoleCode.HEALTH_COACH)),
    service: CareAppointmentService = Depends(_service),
) -> DataEnvelope[dict]:
    member_id = await service.resolve_care_team_member_id(current_user.user_id)
    return DataEnvelope(data=await service.get_appointment(member_id, appointment_id))


@router.post("/appointments/{appointment_id}/notes", response_model=DataEnvelope[dict])
async def add_care_session_note(
    appointment_id: UUID,
    body: CareSessionNoteInput,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DIETICIAN, RoleCode.HEALTH_COACH)),
    service: CareAppointmentService = Depends(_service),
) -> DataEnvelope[dict]:
    member_id = await service.resolve_care_team_member_id(current_user.user_id)
    data = await service.add_session_note(
        member_id,
        current_user.user_id,
        appointment_id,
        body.model_dump(by_alias=True),
    )
    return DataEnvelope(data=data)


@router.post("/appointments/{appointment_id}/recommend-follow-up", response_model=DataEnvelope[dict])
async def recommend_care_follow_up(
    appointment_id: UUID,
    body: RecommendFollowUpInput,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DIETICIAN, RoleCode.HEALTH_COACH)),
    service: CareAppointmentService = Depends(_service),
) -> DataEnvelope[dict]:
    member_id = await service.resolve_care_team_member_id(current_user.user_id)
    data = await service.recommend_follow_up(
        member_id,
        current_user.user_id,
        appointment_id,
        body.model_dump(by_alias=True),
    )
    return DataEnvelope(data=data)
