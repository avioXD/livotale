from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.database import get_db
from app.core.exceptions import AppError
from app.schemas.auth import LoginLogInfo
from app.schemas.common import DataEnvelope

router = APIRouter(prefix="/audit", tags=["audit"])


def _row_to_login_log(row: dict) -> LoginLogInfo:
    return LoginLogInfo(
        id=row["id"],
        user_id=row.get("user_id"),
        identifier_used=row.get("identifier_used"),
        login_method=row.get("login_method") or "password",
        success=row.get("success"),
        failure_reason=row.get("failure_reason"),
        ip_address=str(row["ip_address"]) if row.get("ip_address") else None,
        user_agent=row.get("user_agent"),
        session_id=row.get("session_id"),
        created_at=row.get("created_at"),
        username=row.get("username"),
        full_name=row.get("full_name"),
    )


def _row_to_activity_log(row: dict) -> dict:
    return {
        "id": row["id"],
        "userId": row.get("user_id"),
        "action": row.get("action"),
        "entityType": row.get("entity_type"),
        "entityId": row.get("entity_id"),
        "ipAddress": str(row["ip_address"]) if row.get("ip_address") else None,
        "userAgent": row.get("user_agent"),
        "metadata": row.get("metadata") or {},
        "createdAt": row.get("created_at"),
    }


@router.get("/login-logs", response_model=DataEnvelope[list[LoginLogInfo]])
async def login_logs(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    all_users: Annotated[bool, Query(alias="all")] = False,
) -> DataEnvelope[list[LoginLogInfo]]:
    is_admin = "admin" in current_user.roles
    if all_users and not is_admin:
        raise AppError("Admin role required to view all login logs", status_code=403, error="forbidden")

    if all_users and is_admin:
        result = await db.execute(
            text(
                """
                SELECT l.*, u.username, u.full_name
                FROM identity.login_logs l
                LEFT JOIN identity.users u ON u.id = l.user_id
                ORDER BY l.created_at DESC
                LIMIT :limit
                """
            ),
            {"limit": limit},
        )
    else:
        result = await db.execute(
            text(
                """
                SELECT l.*, NULL AS username, NULL AS full_name
                FROM identity.login_logs l
                WHERE l.user_id = :user_id
                ORDER BY l.created_at DESC
                LIMIT :limit
                """
            ),
            {"user_id": current_user.user_id, "limit": limit},
        )
    return DataEnvelope(data=[_row_to_login_log(dict(row)) for row in result.mappings().all()])


@router.get("/activity", response_model=DataEnvelope[list[dict]])
async def activity_logs(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: Annotated[int, Query(ge=1, le=500)] = 50,
    action: Annotated[str | None, Query()] = None,
    all_users: Annotated[bool, Query(alias="all")] = False,
) -> DataEnvelope[list[dict]]:
    is_admin = "admin" in current_user.roles
    if all_users and not is_admin:
        raise AppError("Admin role required to view all activity logs", status_code=403, error="forbidden")

    params: dict = {"limit": limit}
    action_filter = "AND al.action = :action" if action else ""
    if action:
        params["action"] = action

    if all_users and is_admin:
        result = await db.execute(
            text(
                f"""
                SELECT al.*
                FROM audit.activity_logs al
                WHERE 1=1 {action_filter}
                ORDER BY al.created_at DESC
                LIMIT :limit
                """
            ),
            params,
        )
    else:
        params["user_id"] = current_user.user_id
        result = await db.execute(
            text(
                f"""
                SELECT al.*
                FROM audit.activity_logs al
                WHERE al.user_id = :user_id {action_filter}
                ORDER BY al.created_at DESC
                LIMIT :limit
                """
            ),
            params,
        )
    return DataEnvelope(data=[_row_to_activity_log(dict(row)) for row in result.mappings().all()])
