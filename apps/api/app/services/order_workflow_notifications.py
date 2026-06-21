from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.order_helpers import load_package_flags
from app.services.workflow_notifications import WorkflowNotificationService

OPS_ROLES = ["OPERATIONS", "CITY_MANAGER", "SUPER_ADMIN"]


def _order_id(order: dict[str, Any]) -> UUID | None:
    raw = order.get("id")
    if raw is None:
        return None
    return UUID(str(raw))


async def resolve_doctor_user_id(db: AsyncSession, order: dict[str, Any]) -> UUID | None:
    doctor_id = order.get("doctorId") or order.get("doctor_id")
    if not doctor_id:
        return None
    result = await db.execute(
        text("SELECT user_id FROM clinical.doctors WHERE id = :doctor_id"),
        {"doctor_id": doctor_id},
    )
    row = result.mappings().first()
    return row["user_id"] if row else None


def resolve_technician_user_id(order: dict[str, Any]) -> UUID | None:
    tech_id = order.get("technicianId") or order.get("technician_id")
    if not tech_id:
        return None
    return UUID(str(tech_id))


async def order_has_pathology(db: AsyncSession, order: dict[str, Any]) -> bool:
    if "pathology_included" in order:
        return bool(order["pathology_included"])
    order_id = _order_id(order)
    if order_id is None:
        return False
    flags = await load_package_flags(db, order_id)
    return flags.pathology


async def order_has_consultation(db: AsyncSession, order: dict[str, Any]) -> bool:
    if "consultation_included" in order:
        return bool(order["consultation_included"])
    order_id = _order_id(order)
    if order_id is None:
        return False
    flags = await load_package_flags(db, order_id)
    return flags.consultation


async def notify_order_trigger(
    db: AsyncSession,
    trigger: str,
    order: dict[str, Any],
    *,
    target_user_ids: list[UUID] | None = None,
    target_roles: list[str] | None = None,
    extra: dict[str, Any] | None = None,
) -> None:
    workflow = WorkflowNotificationService(db)
    await workflow.order_event(
        trigger,
        order=order,
        extra=extra,
        target_user_ids=target_user_ids,
        target_roles=target_roles,
    )


async def notify_doctor_if_consultation(
    db: AsyncSession,
    trigger: str,
    order: dict[str, Any],
    *,
    extra: dict[str, Any] | None = None,
) -> None:
    if not await order_has_consultation(db, order):
        return
    doctor_user_id = await resolve_doctor_user_id(db, order)
    if not doctor_user_id:
        return
    await notify_order_trigger(
        db,
        trigger,
        order,
        target_user_ids=[doctor_user_id],
        target_roles=[],
        extra=extra,
    )


async def notify_technician_user(
    db: AsyncSession,
    trigger: str,
    order: dict[str, Any],
    *,
    extra: dict[str, Any] | None = None,
    include_ops_roles: bool = True,
) -> None:
    tech_user_id = resolve_technician_user_id(order)
    target_user_ids = [tech_user_id] if tech_user_id else None
    await notify_order_trigger(
        db,
        trigger,
        order,
        target_user_ids=target_user_ids,
        target_roles=OPS_ROLES if include_ops_roles else None,
        extra=extra,
    )
