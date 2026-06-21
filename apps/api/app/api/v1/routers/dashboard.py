from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.exceptions import AppError
from app.schemas.common import DataEnvelope
from app.services.dashboard_service import DashboardService
from app.services.ops_scope_service import resolve_dashboard_scope

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _service(db: AsyncSession = Depends(get_db)) -> DashboardService:
    return DashboardService(db)


def _require_staff(user: CurrentUser) -> None:
    staff_roles = {
        "admin",
        "support",
        "city_manager",
        "technician",
        "doctor",
        "lab_partner",
        "dietician",
        "health_coach",
        "pharmacy",
    }
    if not staff_roles.intersection(user.roles):
        raise AppError("Requires staff role", status_code=403, error="forbidden")


@router.get("/overview", response_model=DataEnvelope[dict])
async def clinical_overview(
    current_user: CurrentUser = Depends(get_current_user),
    service: DashboardService = Depends(_service),
    db: AsyncSession = Depends(get_db),
) -> DataEnvelope[dict]:
    _require_staff(current_user)
    scope = await resolve_dashboard_scope(
        db,
        user_id=current_user.user_id,
        roles=current_user.roles,
        active_role=current_user.active_role,
    )
    return DataEnvelope(
        data=await service.get_clinical_overview(
            user_id=current_user.user_id,
            roles=current_user.roles,
            active_role=current_user.active_role,
            scope=scope,
        )
    )
