from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.exceptions import AppError
from app.domain.rbac import is_ops_role
from app.schemas.common import DataEnvelope
from app.schemas.notifications import NotificationLogEntry
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/admin/notifications", tags=["admin-notifications"])


def _service(db: AsyncSession = Depends(get_db)) -> NotificationService:
    return NotificationService(db)


def _require_ops(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
    if not is_ops_role(user.roles):
        raise AppError("Requires operations or admin role", status_code=403, error="forbidden")
    return user


@router.get("/log", response_model=DataEnvelope[list[NotificationLogEntry]])
async def list_notification_log(
    order_id: Annotated[UUID | None, Query(alias="orderId")] = None,
    channel: str | None = Query(default=None),
    limit: Annotated[int, Query(ge=1, le=500)] = 200,
    _: CurrentUser = Depends(_require_ops),
    service: NotificationService = Depends(_service),
) -> DataEnvelope[list[NotificationLogEntry]]:
    data = await service.list_channel_logs(order_id=order_id, channel=channel, limit=limit)
    return DataEnvelope(data=data)
