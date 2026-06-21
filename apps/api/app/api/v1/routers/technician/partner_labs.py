from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.deps import require_roles
from app.domain.rbac import RoleCode
from app.schemas.common import DataEnvelope
from app.schemas.staff import PartnerLab
from app.services.staff_service import StaffService

router = APIRouter(prefix="/technician/partner-labs", tags=["technician-partner-labs"])


def _staff_service(db: AsyncSession = Depends(get_db)) -> StaffService:
    return StaffService(db)


@router.get("", response_model=DataEnvelope[list[PartnerLab]])
async def list_partner_labs_for_technician(
    _: Annotated[CurrentUser, Depends(require_roles(RoleCode.TECHNICIAN, RoleCode.ADMIN, RoleCode.SUPPORT))],
    service: StaffService = Depends(_staff_service),
) -> DataEnvelope[list[PartnerLab]]:
    data = await service.list_partner_labs(active_only=True)
    return DataEnvelope(data=data)
