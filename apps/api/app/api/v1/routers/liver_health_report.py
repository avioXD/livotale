from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.core.database import get_db
from app.core.deps import get_current_user_optional
from app.core.exceptions import AppError
from app.schemas.common import DataEnvelope
from app.services.liver_health_report_service import LiverHealthReportService

router = APIRouter(prefix="/orders", tags=["liver-health-report"])


def _service(db: AsyncSession = Depends(get_db)) -> LiverHealthReportService:
    return LiverHealthReportService(db)


@router.get("/{order_id}/liver-health-report", response_model=DataEnvelope[dict[str, Any] | None])
async def get_liver_health_report(
    order_id: UUID,
    require_published: bool = Query(default=False, alias="requirePublished"),
    patient_phone: str | None = Query(default=None, alias="patientPhone"),
    user: Annotated[CurrentUser | None, Depends(get_current_user_optional)] = None,
    service: LiverHealthReportService = Depends(_service),
) -> DataEnvelope[dict[str, Any] | None]:
    if patient_phone:
        data = await service.get_for_order_with_auth(
            order_id,
            user.user_id if user else order_id,
            user.roles if user else [],
            require_published=require_published,
            patient_phone=patient_phone,
        )
        return DataEnvelope(data=data)
    if user is None:
        raise AppError("Authentication required", status_code=401, error="unauthorized")
    data = await service.get_for_order_with_auth(
        order_id,
        user.user_id,
        user.roles,
        require_published=require_published,
    )
    return DataEnvelope(data=data)
