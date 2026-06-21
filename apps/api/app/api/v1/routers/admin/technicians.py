from __future__ import annotations

from typing import Annotated, Any

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.exceptions import AppError
from app.domain.rbac import is_ops_role
from app.schemas.common import BaseSchema, DataEnvelope
from app.services.slot_availability_service import SlotAvailabilityService

router = APIRouter(prefix="/admin/technicians", tags=["admin-technicians"])


class AssignableTechnician(BaseSchema):
    id: str
    name: str
    zone: str
    status: str


def _require_ops(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
    if not is_ops_role(user.roles):
        raise AppError("Requires operations or admin role", status_code=403, error="forbidden")
    return user


@router.get("/assignable", response_model=DataEnvelope[list[AssignableTechnician]])
async def list_assignable_technicians(
    _: CurrentUser = Depends(_require_ops),
    db: AsyncSession = Depends(get_db),
) -> DataEnvelope[list[AssignableTechnician]]:
    result = await db.execute(
        text(
            """
            SELECT t.user_id AS id, u.full_name AS name,
                   COALESCE(sz.city_name, 'Unassigned') AS zone,
                   CASE
                     WHEN EXISTS (
                     SELECT 1 FROM commerce.service_orders o
                     WHERE o.technician_id = t.user_id
                         AND o.order_status NOT IN ('completed', 'cancelled')
                         AND o.deleted_at IS NULL
                     ) THEN 'on_visit'
                     WHEN t.status = 'available' THEN 'available'
                     ELSE 'off_duty'
                   END AS status
            FROM operations.technicians t
            JOIN identity.users u ON u.id = t.user_id
            LEFT JOIN operations.technician_service_pincodes tsp ON tsp.technician_id = t.id AND tsp.is_active = true
            LEFT JOIN operations.service_zones sz ON sz.pincodes @> jsonb_build_array(tsp.pincode)
            WHERE t.status = 'available'
              AND u.archived_at IS NULL
            GROUP BY t.user_id, u.full_name, sz.city_name, t.status
            ORDER BY u.full_name ASC
            """
        )
    )
    items = [
        AssignableTechnician(
            id=str(row["id"]),
            name=row["name"],
            zone=row["zone"] or "Unassigned",
            status=row["status"],
        )
        for row in result.mappings().all()
    ]
    return DataEnvelope(data=items)


@router.get("/available-for-slot", response_model=DataEnvelope[list[AssignableTechnician]])
async def list_technicians_available_for_slot(
    scheduled_at: datetime = Query(..., alias="scheduledAt"),
    order_id: UUID | None = Query(default=None, alias="orderId"),
    _: CurrentUser = Depends(_require_ops),
    db: AsyncSession = Depends(get_db),
) -> DataEnvelope[list[AssignableTechnician]]:
    slot_service = SlotAvailabilityService(db)
    rows = await slot_service.list_technicians_available_for_slot(
        scheduled_at,
        exclude_order_id=order_id,
    )
    items = [
        AssignableTechnician(
            id=row["id"],
            name=row["name"],
            zone=row["zone"],
            status=row["status"],
        )
        for row in rows
    ]
    return DataEnvelope(data=items)
