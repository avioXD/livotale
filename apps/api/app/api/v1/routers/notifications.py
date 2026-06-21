from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.exceptions import AppError
from app.domain.rbac import OPS_ROLES
from app.schemas.common import DataEnvelope
from app.schemas.notifications import InboxNotification, MarkAllReadRequest, PushNotificationRequest
from app.services.notification_service import NotificationService
from app.services.patient_portal_access import ensure_patient_portal_phone

router = APIRouter(prefix="/notifications", tags=["notifications"])


def _service(db: AsyncSession = Depends(get_db)) -> NotificationService:
    return NotificationService(db)


@router.get("/inbox", response_model=DataEnvelope[list[InboxNotification]])
async def list_inbox_for_role(
    role: str | None = Query(default=None),
    current_user: CurrentUser = Depends(get_current_user),
    service: NotificationService = Depends(_service),
) -> DataEnvelope[list[InboxNotification]]:
    effective_role = role
    if not effective_role and current_user.effective_roles:
        effective_role = current_user.effective_roles[0].upper()
    data = await service.list_for_user(current_user.user_id, effective_role)
    return DataEnvelope(data=data)


@router.get("/inbox/patient", response_model=DataEnvelope[list[InboxNotification]])
async def list_inbox_for_patient(
    phone: str = Query(...),
    db: AsyncSession = Depends(get_db),
    service: NotificationService = Depends(_service),
) -> DataEnvelope[list[InboxNotification]]:
    normalized = await ensure_patient_portal_phone(db, phone)
    data = await service.list_for_patient_phone(normalized)
    return DataEnvelope(data=data)


def _require_ops_admin(user: CurrentUser) -> None:
    if not any(role in user.effective_roles for role in OPS_ROLES):
        raise AppError("Requires admin or operations role", status_code=403, error="forbidden")


@router.post("/inbox", response_model=DataEnvelope[list[InboxNotification]])
async def push_notification(
    body: PushNotificationRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: NotificationService = Depends(_service),
) -> DataEnvelope[list[InboxNotification]]:
    _require_ops_admin(current_user)
    data = await service.push_inbox(
        title=body.title,
        body=body.body,
        category=body.category,
        trigger_action=body.trigger_action,
        target_roles=body.target_roles,
        order_id=body.order_id,
        target_phone=body.target_phone,
    )
    return DataEnvelope(data=data)


@router.patch("/inbox/{notification_id}/read")
async def mark_read(
    notification_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
    service: NotificationService = Depends(_service),
) -> DataEnvelope[dict[str, bool]]:
    effective_role = current_user.effective_roles[0].upper() if current_user.effective_roles else None
    await service.mark_read(notification_id, user_id=current_user.user_id, role=effective_role)
    return DataEnvelope(data={"read": True})


@router.patch("/inbox/read-all")
async def mark_all_read(
    body: MarkAllReadRequest,
    current_user: CurrentUser = Depends(get_current_user),
    service: NotificationService = Depends(_service),
) -> DataEnvelope[dict[str, bool]]:
    role = body.role
    if not role and current_user.effective_roles:
        role = current_user.effective_roles[0].upper()
    await service.mark_all_read(role, user_id=current_user.user_id)
    return DataEnvelope(data={"read": True})
