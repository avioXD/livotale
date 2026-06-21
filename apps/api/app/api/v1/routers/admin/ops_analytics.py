from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.exceptions import AppError
from app.schemas.common import DataEnvelope
from app.schemas.doctor_availability import (
    DoctorAvailabilityCalendar,
    DoctorAvailabilityPayload,
    DoctorAvailabilityResponse,
    DoctorHoliday,
    DoctorHolidayCreate,
    DoctorTimeSlot,
)
from app.services.doctor_availability_service import DoctorAvailabilityService
from app.services.ops_analytics_service import OpsAnalyticsService
from app.services.ops_scope_service import resolve_dashboard_scope

router = APIRouter(prefix="/admin", tags=["admin-ops-analytics"])


def _service(db: AsyncSession = Depends(get_db)) -> OpsAnalyticsService:
    return OpsAnalyticsService(db)


def _availability_service(db: AsyncSession = Depends(get_db)) -> DoctorAvailabilityService:
    return DoctorAvailabilityService(db)


def _require_admin(user: CurrentUser) -> None:
    if not any(role in user.roles for role in ("admin", "support", "city_manager")):
        raise AppError("Requires admin or operations role", status_code=403, error="forbidden")


VALID_ANALYTICS_PERIODS = frozenset({"daily", "monthly", "yearly"})


@router.get("/sample-collections/analytics", response_model=DataEnvelope[dict])
async def sample_collection_analytics(
    period: str = Query(default="monthly"),
    lab_partner_id: UUID | None = Query(default=None, alias="labPartnerId"),
    current_user: CurrentUser = Depends(get_current_user),
    service: OpsAnalyticsService = Depends(_service),
    db: AsyncSession = Depends(get_db),
) -> DataEnvelope[dict]:
    _require_admin(current_user)
    if period not in VALID_ANALYTICS_PERIODS:
        raise AppError(
            f"period must be one of: {', '.join(sorted(VALID_ANALYTICS_PERIODS))}",
            status_code=422,
            error="validation_error",
        )
    scope = await resolve_dashboard_scope(
        db,
        user_id=current_user.user_id,
        roles=current_user.roles,
        active_role=current_user.active_role,
    )
    data = await service.sample_collection_analytics(
        period=period,
        lab_partner_id=lab_partner_id,
        scope=scope,
    )
    return DataEnvelope(data=data)


@router.get("/staff/technicians", response_model=DataEnvelope[list[dict]])
async def list_staff_technicians(
    current_user: CurrentUser = Depends(get_current_user),
    service: OpsAnalyticsService = Depends(_service),
) -> DataEnvelope[list[dict]]:
    _require_admin(current_user)
    return DataEnvelope(data=await service.list_technicians())


@router.patch("/staff/technicians/{technician_id}", response_model=DataEnvelope[dict])
async def update_staff_technician(
    technician_id: UUID,
    body: dict,
    current_user: CurrentUser = Depends(get_current_user),
    service: OpsAnalyticsService = Depends(_service),
) -> DataEnvelope[dict]:
    _require_admin(current_user)
    data = await service.update_technician(technician_id, body)
    return DataEnvelope(data=data)


@router.get("/staff/lab-partners/roster", response_model=DataEnvelope[list[dict]])
async def list_staff_lab_partners_roster(
    current_user: CurrentUser = Depends(get_current_user),
    service: OpsAnalyticsService = Depends(_service),
) -> DataEnvelope[list[dict]]:
    _require_admin(current_user)
    return DataEnvelope(data=await service.list_lab_partners_with_stats())


@router.get("/doctors", response_model=DataEnvelope[list[dict]])
async def list_admin_doctors(
    language: str | None = Query(default=None),
    current_user: CurrentUser = Depends(get_current_user),
    service: OpsAnalyticsService = Depends(_service),
) -> DataEnvelope[list[dict]]:
    _require_admin(current_user)
    return DataEnvelope(data=await service.list_doctors(language=language))


@router.get("/doctors/available-for-slot", response_model=DataEnvelope[list[dict]])
async def list_doctors_available_for_slot(
    scheduled_at: str = Query(..., alias="scheduledAt"),
    language: str | None = Query(default=None),
    exclude_order_id: UUID | None = Query(default=None, alias="excludeOrderId"),
    current_user: CurrentUser = Depends(get_current_user),
    service: DoctorAvailabilityService = Depends(_availability_service),
) -> DataEnvelope[list[dict]]:
    _require_admin(current_user)
    from datetime import datetime

    parsed = datetime.fromisoformat(scheduled_at.replace("Z", "+00:00"))
    rows = await service.list_doctors_available_for_slot(
        parsed,
        language=language,
        exclude_order_id=exclude_order_id,
    )
    return DataEnvelope(data=rows)


@router.get("/doctors/{doctor_id}/availability", response_model=DataEnvelope[DoctorAvailabilityCalendar])
async def get_admin_doctor_availability_calendar(
    doctor_id: UUID,
    from_date: str | None = Query(default=None, alias="fromDate"),
    to_date: str | None = Query(default=None, alias="toDate"),
    current_user: CurrentUser = Depends(get_current_user),
    service: DoctorAvailabilityService = Depends(_availability_service),
) -> DataEnvelope[DoctorAvailabilityCalendar]:
    _require_admin(current_user)
    return DataEnvelope(data=await service.get_availability_calendar(doctor_id, from_date, to_date))


@router.get("/doctors/{doctor_id}/schedule", response_model=DataEnvelope[DoctorAvailabilityResponse])
async def get_admin_doctor_schedule(
    doctor_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: DoctorAvailabilityService = Depends(_availability_service),
) -> DataEnvelope[DoctorAvailabilityResponse]:
    _require_admin(current_user)
    return DataEnvelope(data=await service.get_availability(doctor_id))


@router.put("/doctors/{doctor_id}/schedule", response_model=DataEnvelope[DoctorAvailabilityResponse])
async def save_admin_doctor_schedule(
    doctor_id: UUID,
    body: DoctorAvailabilityPayload,
    current_user: CurrentUser = Depends(get_current_user),
    service: DoctorAvailabilityService = Depends(_availability_service),
) -> DataEnvelope[DoctorAvailabilityResponse]:
    _require_admin(current_user)
    data = await service.replace_availability(
        doctor_id,
        [rule.model_dump(by_alias=True, exclude_none=True) for rule in body.rules],
    )
    return DataEnvelope(data=data)


@router.get("/doctors/{doctor_id}/holidays", response_model=DataEnvelope[list[DoctorHoliday]])
async def list_admin_doctor_holidays(
    doctor_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: DoctorAvailabilityService = Depends(_availability_service),
) -> DataEnvelope[list[DoctorHoliday]]:
    _require_admin(current_user)
    return DataEnvelope(data=await service.list_holidays(doctor_id))


@router.post("/doctors/{doctor_id}/holidays", response_model=DataEnvelope[DoctorHoliday])
async def create_admin_doctor_holiday(
    doctor_id: UUID,
    body: DoctorHolidayCreate,
    current_user: CurrentUser = Depends(get_current_user),
    service: DoctorAvailabilityService = Depends(_availability_service),
) -> DataEnvelope[DoctorHoliday]:
    _require_admin(current_user)
    data = await service.create_holiday(
        doctor_id,
        current_user.user_id,
        body.model_dump(by_alias=True),
    )
    return DataEnvelope(data=data)


@router.get("/doctors/{doctor_id}/slots", response_model=DataEnvelope[list[DoctorTimeSlot]])
async def list_admin_doctor_slots(
    doctor_id: UUID,
    date: str = Query(...),
    visit_mode: str = Query(default="clinic", alias="visitMode"),
    current_user: CurrentUser = Depends(get_current_user),
    service: DoctorAvailabilityService = Depends(_availability_service),
) -> DataEnvelope[list[DoctorTimeSlot]]:
    _require_admin(current_user)
    return DataEnvelope(data=await service.list_doctor_slots(doctor_id, date, visit_mode))
