from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.deps import require_roles
from app.core.exceptions import AppError
from app.domain.rbac import RoleCode
from app.schemas.common import DataEnvelope
from app.schemas.doctor_availability import (
    DoctorAvailabilityPayload,
    DoctorAvailabilityResponse,
    DoctorHoliday,
    DoctorHolidayCreate,
)
from app.services.doctor_availability_service import DoctorAvailabilityService
from app.services.order_helpers import resolve_doctor_id

router = APIRouter(prefix="/doctor", tags=["doctor-availability"])


def _service(db: AsyncSession = Depends(get_db)) -> DoctorAvailabilityService:
    return DoctorAvailabilityService(db)


async def _resolve_own_doctor_id(service: DoctorAvailabilityService, user: CurrentUser) -> UUID:
    return await resolve_doctor_id(service.db, user.user_id)


@router.get("/availability", response_model=DataEnvelope[DoctorAvailabilityResponse])
async def get_doctor_availability(
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR)),
    service: DoctorAvailabilityService = Depends(_service),
) -> DataEnvelope[DoctorAvailabilityResponse]:
    doctor_id = await _resolve_own_doctor_id(service, current_user)
    return DataEnvelope(data=await service.get_availability(doctor_id))


@router.put("/availability", response_model=DataEnvelope[DoctorAvailabilityResponse])
async def save_doctor_availability(
    body: DoctorAvailabilityPayload,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR)),
    service: DoctorAvailabilityService = Depends(_service),
) -> DataEnvelope[DoctorAvailabilityResponse]:
    doctor_id = await _resolve_own_doctor_id(service, current_user)
    data = await service.replace_availability(
        doctor_id,
        [rule.model_dump(by_alias=True, exclude_none=True) for rule in body.rules],
    )
    return DataEnvelope(data=data)


@router.get("/holidays", response_model=DataEnvelope[list[DoctorHoliday]])
async def list_doctor_holidays(
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR)),
    service: DoctorAvailabilityService = Depends(_service),
) -> DataEnvelope[list[DoctorHoliday]]:
    doctor_id = await _resolve_own_doctor_id(service, current_user)
    return DataEnvelope(data=await service.list_holidays(doctor_id))


@router.post("/holidays", response_model=DataEnvelope[DoctorHoliday])
async def create_doctor_holiday(
    body: DoctorHolidayCreate,
    current_user: CurrentUser = Depends(require_roles(RoleCode.DOCTOR)),
    service: DoctorAvailabilityService = Depends(_service),
) -> DataEnvelope[DoctorHoliday]:
    doctor_id = await _resolve_own_doctor_id(service, current_user)
    data = await service.create_holiday(
        doctor_id,
        current_user.user_id,
        body.model_dump(by_alias=True),
    )
    return DataEnvelope(data=data)
