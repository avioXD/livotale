from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.exceptions import AppError
from app.domain.rbac import is_ops_role
from app.schemas.common import DataEnvelope
from app.services.appointment_dashboard_service import AppointmentDashboardService
from app.services.ops_scope_service import resolve_dashboard_scope

router = APIRouter(prefix="/admin", tags=["admin-appointments-dashboard"])


def _service(db: AsyncSession = Depends(get_db)) -> AppointmentDashboardService:
    return AppointmentDashboardService(db)


def _require_ops(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
    if not is_ops_role(user.roles):
        raise AppError("Requires operations or admin role", status_code=403, error="forbidden")
    return user


@router.get("/appointments/dashboard", response_model=DataEnvelope[dict])
async def appointments_dashboard(
    current_user: CurrentUser = Depends(_require_ops),
    service: AppointmentDashboardService = Depends(_service),
    db: AsyncSession = Depends(get_db),
) -> DataEnvelope[dict]:
    scope = await resolve_dashboard_scope(
        db,
        user_id=current_user.user_id,
        roles=current_user.roles,
        active_role=current_user.active_role,
    )
    return DataEnvelope(data=await service.get_dashboard(scope=scope))


@router.get("/analytics/org/appointments", response_model=DataEnvelope[dict])
async def appointment_analytics(
    current_user: CurrentUser = Depends(_require_ops),
    service: AppointmentDashboardService = Depends(_service),
    db: AsyncSession = Depends(get_db),
) -> DataEnvelope[dict]:
    scope = await resolve_dashboard_scope(
        db,
        user_id=current_user.user_id,
        roles=current_user.roles,
        active_role=current_user.active_role,
    )
    return DataEnvelope(data=await service.get_analytics(scope=scope))
