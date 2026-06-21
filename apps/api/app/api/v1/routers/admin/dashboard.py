from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.exceptions import AppError
from app.domain.rbac import is_ops_role
from app.schemas.common import DataEnvelope
from app.schemas.dashboard import LiverCareDashboardSummary, OperationsOverview
from app.services.dashboard_filters import parse_dashboard_filters
from app.services.dashboard_service import DashboardService
from app.services.ops_scope_service import resolve_dashboard_scope

router = APIRouter(prefix="/admin", tags=["admin-dashboard"])


def _service(db: AsyncSession = Depends(get_db)) -> DashboardService:
    return DashboardService(db)


def _require_ops(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
    if not is_ops_role(user.roles):
        raise AppError("Requires operations or admin role", status_code=403, error="forbidden")
    return user


@router.get("/dashboard/summary", response_model=DataEnvelope[LiverCareDashboardSummary])
async def dashboard_summary(
    date_from: str | None = Query(default=None, alias="dateFrom"),
    date_to: str | None = Query(default=None, alias="dateTo"),
    package_id: str | None = Query(default=None, alias="packageId"),
    order_status: str | None = Query(default=None, alias="orderStatus"),
    technician_id: str | None = Query(default=None, alias="technicianId"),
    doctor_id: str | None = Query(default=None, alias="doctorId"),
    partner_lab_id: str | None = Query(default=None, alias="partnerLabId"),
    payment_status: str | None = Query(default=None, alias="paymentStatus"),
    current_user: CurrentUser = Depends(_require_ops),
    service: DashboardService = Depends(_service),
    db: AsyncSession = Depends(get_db),
) -> DataEnvelope[LiverCareDashboardSummary]:
    filters = {
        "dateFrom": date_from,
        "dateTo": date_to,
        "packageId": package_id,
        "orderStatus": order_status,
        "technicianId": technician_id,
        "doctorId": doctor_id,
        "partnerLabId": partner_lab_id,
        "paymentStatus": payment_status,
    }
    parsed = parse_dashboard_filters(filters)
    scope = await resolve_dashboard_scope(
        db,
        user_id=current_user.user_id,
        roles=current_user.roles,
        active_role=current_user.active_role,
    )
    return DataEnvelope(data=await service.get_summary(parsed, scope=scope))


@router.get("/operations/overview", response_model=DataEnvelope[OperationsOverview])
async def operations_overview(
    current_user: CurrentUser = Depends(_require_ops),
    service: DashboardService = Depends(_service),
    db: AsyncSession = Depends(get_db),
) -> DataEnvelope[OperationsOverview]:
    scope = await resolve_dashboard_scope(
        db,
        user_id=current_user.user_id,
        roles=current_user.roles,
        active_role=current_user.active_role,
    )
    return DataEnvelope(data=await service.get_operations_overview(scope=scope))
