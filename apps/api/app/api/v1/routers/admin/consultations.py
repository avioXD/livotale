from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.core.database import get_db
from app.core.deps import require_roles
from app.domain.rbac import RoleCode
from app.schemas.clinical import ConsultationQueueRow
from app.schemas.common import DataEnvelope
from app.services.consultation_service import ConsultationService

router = APIRouter(prefix="/admin/consultations", tags=["admin-consultations"])


def _service(db: AsyncSession = Depends(get_db)) -> ConsultationService:
    return ConsultationService(db)


@router.get("/queue", response_model=DataEnvelope[list[ConsultationQueueRow]])
async def list_consultation_queue(
    search: str | None = None,
    order_status: str | None = Query(default=None, alias="orderStatus"),
    stage: str | None = None,
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: ConsultationService = Depends(_service),
) -> DataEnvelope[list[ConsultationQueueRow]]:
    data = await service.list_consultation_queue(search=search, order_status=order_status, stage=stage)
    return DataEnvelope(data=data)


@router.get("/queue/{order_id}", response_model=DataEnvelope[ConsultationQueueRow | None])
async def get_consultation_queue_row(
    order_id: UUID,
    current_user: CurrentUser = Depends(require_roles(RoleCode.ADMIN, RoleCode.SUPPORT, RoleCode.CITY_MANAGER)),
    service: ConsultationService = Depends(_service),
) -> DataEnvelope[ConsultationQueueRow | None]:
    return DataEnvelope(data=await service.get_consultation_queue_row(order_id))
