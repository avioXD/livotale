from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import AppError
from app.core.security import verify_access_token
from app.domain.rbac import require_role

_bearer = HTTPBearer(auto_error=False)

_USER_QUERY = text(
    """
    SELECT
      u.id,
      u.full_name,
      u.username,
      array_agg(DISTINCT r.code ORDER BY r.code) AS roles
    FROM identity.users u
    JOIN identity.user_roles ur ON ur.user_id = u.id AND ur.ends_at IS NULL
    JOIN identity.roles r ON r.id = ur.role_id
    WHERE u.id = :user_id
      AND u.status = 'active'
    GROUP BY u.id, u.full_name, u.username
    """
)

_PERMISSIONS_QUERY = text(
    """
    SELECT DISTINCT p.code
    FROM identity.permissions p
    JOIN identity.role_permissions rp ON rp.permission_id = p.id
    JOIN identity.roles r ON r.id = rp.role_id
    WHERE r.code = ANY(:role_codes)
    ORDER BY p.code
    """
)


@dataclass(frozen=True, slots=True)
class CurrentUser:
    user_id: UUID
    username: str | None
    full_name: str
    roles: list[str]
    permissions: list[str]
    active_role: str | None = None

    @property
    def effective_roles(self) -> list[str]:
        if self.active_role:
            return [self.active_role]
        return self.roles

    def has_role(self, *roles: str) -> bool:
        allowed = set(roles)
        return any(role in allowed for role in self.effective_roles)

    def require_roles(self, *roles: str) -> None:
        require_role(self.effective_roles, *roles)


def _extract_bearer_token(
    credentials: HTTPAuthorizationCredentials | None,
) -> str | None:
    if credentials is None or credentials.scheme.lower() != "bearer":
        return None
    token = credentials.credentials.strip()
    return token or None


async def _load_user(
    session: AsyncSession,
    user_id: str,
    *,
    active_role: str | None = None,
) -> CurrentUser | None:
    result = await session.execute(_USER_QUERY, {"user_id": user_id})
    row = result.mappings().first()
    if row is None:
        return None

    roles = list(row["roles"] or [])
    resolved_active = active_role if active_role in roles else None
    permission_roles = [resolved_active] if resolved_active else roles
    permissions_result = await session.execute(_PERMISSIONS_QUERY, {"role_codes": permission_roles})
    permissions = [perm_row["code"] for perm_row in permissions_result.mappings()]

    return CurrentUser(
        user_id=row["id"],
        username=row["username"],
        full_name=row["full_name"],
        roles=roles,
        permissions=permissions,
        active_role=resolved_active,
    )


async def get_current_user_optional(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    session: Annotated[AsyncSession, Depends(get_db)],
) -> CurrentUser | None:
    token = _extract_bearer_token(credentials)
    if not token:
        return None

    try:
        payload = verify_access_token(token)
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc

    subject = payload.get("sub")
    if not subject:
        raise HTTPException(status_code=401, detail="Invalid token subject")

    user = await _load_user(session, str(subject), active_role=payload.get("activeRole"))
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or inactive user")
    return user


async def get_current_user(
    user: Annotated[CurrentUser | None, Depends(get_current_user_optional)],
) -> CurrentUser:
    if user is None:
        raise HTTPException(status_code=401, detail="Authorization bearer token is required")
    return user


def require_roles(*roles: str):
    async def _dependency(
        current_user: Annotated[CurrentUser, Depends(get_current_user)],
    ) -> CurrentUser:
        try:
            current_user.require_roles(*roles)
        except AppError as exc:
            raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
        return current_user

    return _dependency


async def get_request_meta(request: Request) -> dict[str, str | None]:
    return {
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "device_fingerprint": request.headers.get("x-device-fingerprint"),
    }
