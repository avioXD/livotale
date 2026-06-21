from dataclasses import dataclass
import ipaddress
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, Request
from jose import JWTError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import AppError
from app.core.security import verify_access_token


@dataclass
class CurrentUser:
    user_id: UUID
    username: str | None
    full_name: str
    roles: list[str]
    active_role: str | None = None

    @property
    def effective_roles(self) -> list[str]:
        if self.active_role:
            return [self.active_role]
        return self.roles


def _bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise AppError("Authorization bearer token is required", status_code=401, error="unauthorized")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise AppError("Authorization bearer token is required", status_code=401, error="unauthorized")
    return token


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    try:
        payload = verify_access_token(_bearer_token(authorization))
    except JWTError as exc:
        raise AppError("Invalid or expired token", status_code=401, error="unauthorized") from exc

    subject = payload.get("sub")
    if not subject:
        raise AppError("Invalid token subject", status_code=401, error="unauthorized")

    result = await db.execute(
        text(
            """
            SELECT u.id, u.full_name, u.username,
                   array_agg(DISTINCT r.code ORDER BY r.code) AS roles
            FROM identity.users u
            JOIN identity.user_roles ur ON ur.user_id = u.id AND ur.ends_at IS NULL
            JOIN identity.roles r ON r.id = ur.role_id
            WHERE u.id = :user_id AND u.status = 'active'
            GROUP BY u.id, u.full_name, u.username
            """
        ),
        {"user_id": subject},
    )
    row = result.mappings().first()
    if not row:
        raise AppError("Invalid or inactive user", status_code=401, error="unauthorized")

    roles = list(row["roles"] or [])
    jwt_active_role = payload.get("activeRole")
    active_role = jwt_active_role if jwt_active_role in roles else None

    return CurrentUser(
        user_id=row["id"],
        username=row["username"],
        full_name=row["full_name"],
        roles=roles,
        active_role=active_role,
    )


def _normalize_ip(raw: str | None) -> str | None:
    if not raw:
        return None
    candidate = raw.split(",")[0].strip()
    try:
        return str(ipaddress.ip_address(candidate))
    except ValueError:
        return None


def request_meta(request: Request) -> dict:
    forwarded = request.headers.get("x-forwarded-for")
    client_ip = request.client.host if request.client else None
    return {
        "ip_address": _normalize_ip(forwarded or client_ip),
        "user_agent": request.headers.get("user-agent"),
        "device_fingerprint": request.headers.get("x-device-fingerprint"),
    }
