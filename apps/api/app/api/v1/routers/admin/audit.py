from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.exceptions import AppError
from app.schemas.common import DataEnvelope

router = APIRouter(prefix="/admin", tags=["admin-audit"])


def _require_ops(user: CurrentUser) -> None:
    if not any(role in user.roles for role in ("admin", "support", "city_manager")):
        raise AppError("Requires admin or operations role", status_code=403, error="forbidden")


def _row_to_audit_entry(row: dict) -> dict:
    old_value = row.get("old_value")
    new_value = row.get("new_value")
    return {
        "id": str(row["id"]),
        "action": row["action"],
        "entityType": row.get("entity_type") or "",
        "entityId": str(row["entity_id"]) if row.get("entity_id") else "",
        "oldValue": _json_preview(old_value),
        "newValue": _json_preview(new_value),
        "performedBy": row.get("performer_name") or row.get("performer_username") or "system",
        "performedAt": row["created_at"],
        "ipAddress": str(row["ip_address"]) if row.get("ip_address") else None,
    }


def _json_preview(value: object | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    import json

    try:
        return json.dumps(value, default=str)
    except TypeError:
        return str(value)


@router.get("/audit", response_model=DataEnvelope[list[dict]])
async def list_admin_audit(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    entity_type: Annotated[str | None, Query(alias="entityType")] = None,
    entity_id: Annotated[str | None, Query(alias="entityId")] = None,
    performed_by: Annotated[str | None, Query(alias="performedBy")] = None,
    date_from: Annotated[str | None, Query(alias="dateFrom")] = None,
    date_to: Annotated[str | None, Query(alias="dateTo")] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 200,
) -> DataEnvelope[list[dict]]:
    _require_ops(current_user)

    conditions = ["1=1"]
    params: dict[str, object] = {"limit": limit}

    if entity_type:
        conditions.append("al.entity_type = :entity_type")
        params["entity_type"] = entity_type
    if entity_id:
        conditions.append("CAST(al.entity_id AS text) = :entity_id")
        params["entity_id"] = entity_id
    if performed_by:
        conditions.append("(u.username ILIKE :performed_by OR u.full_name ILIKE :performed_by)")
        params["performed_by"] = f"%{performed_by}%"
    if date_from:
        conditions.append("al.created_at >= CAST(:date_from AS timestamptz)")
        params["date_from"] = date_from
    if date_to:
        conditions.append("al.created_at <= CAST(:date_to AS timestamptz)")
        params["date_to"] = date_to

    where_clause = " AND ".join(conditions)
    result = await db.execute(
        text(
            f"""
            SELECT al.*, u.username AS performer_username, u.full_name AS performer_name
            FROM audit.audit_logs al
            LEFT JOIN identity.users u ON u.id = al.actor_user_id
            WHERE {where_clause}
            ORDER BY al.created_at DESC
            LIMIT :limit
            """
        ),
        params,
    )
    rows = [_row_to_audit_entry(dict(row)) for row in result.mappings().all()]
    return DataEnvelope(data=rows)
