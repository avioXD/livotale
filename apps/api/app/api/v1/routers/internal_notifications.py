from uuid import UUID

from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.core.exceptions import AppError
from app.schemas.common import DataEnvelope
from app.schemas.notifications import InternalEmitRequest
from app.services.workflow_notifications import WorkflowNotificationService

router = APIRouter(prefix="/internal/notifications", tags=["internal-notifications"])


def _require_internal_key(x_internal_key: str | None) -> None:
    expected = get_settings().internal_notifications_key
    if not x_internal_key or x_internal_key != expected:
        raise AppError("Invalid internal key", status_code=403, error="forbidden")


@router.post("/emit", response_model=DataEnvelope[dict[str, str]])
async def emit_internal_notification(
    body: InternalEmitRequest,
    x_internal_key: str | None = Header(default=None, alias="X-Internal-Key"),
    db: AsyncSession = Depends(get_db),
) -> DataEnvelope[dict[str, str]]:
    _require_internal_key(x_internal_key)
    workflow = WorkflowNotificationService(db)
    await workflow.emit(
        body.trigger_action,
        context=body.context,
        target_roles=body.target_roles or None,
        target_user_ids=body.target_user_ids or None,
        order_id=body.order_id,
        patient_id=body.patient_id,
        channels=body.channels or None,
    )
    return DataEnvelope(data={"status": "queued"})
