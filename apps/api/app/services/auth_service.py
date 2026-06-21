from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import AppError
from app.core.security import (
    assert_password_policy,
    hash_password,
    hash_token,
    sign_access_token,
    verify_password,
)
from app.services.audit_service import AuditService
REFRESH_TOKEN_TTL_DAYS = 30

PORTALS: dict[str, dict[str, Any]] = {
    "patient": {
        "code": "patient",
        "allowed_roles": ["patient"],
        "layout": "patient-web",
        "landing_path": "/patient/dashboard",
    },
    "clinic": {
        "code": "clinic",
        "allowed_roles": [
            "doctor",
            "technician",
            "dietician",
            "health_coach",
            "pharmacy",
            "lab_partner",
            "support",
            "city_manager",
        ],
        "layout": "clinic-workspace",
        "landing_path": "/clinic/today",
    },
    "admin": {
        "code": "admin",
        "allowed_roles": ["admin"],
        "layout": "admin-console",
        "landing_path": "/admin/dashboard",
    },
}


def _parse_user_agent(user_agent: str | None) -> str:
    if not user_agent:
        return "Unknown device"
    if "Mobile" in user_agent:
        return "Mobile browser"
    if "Macintosh" in user_agent:
        return "Mac browser"
    if "Windows" in user_agent:
        return "Windows browser"
    if "Linux" in user_agent:
        return "Linux browser"
    return "Web browser"


def _require_selected_role(roles: list[str], requested: str | None) -> str:
    if not requested:
        raise AppError("activeRole is required", status_code=400)
    if requested not in roles:
        raise AppError(
            f"Role '{requested}' is not assigned to this user",
            status_code=403,
            error="forbidden",
        )
    return requested


def _resolve_active_role(roles: list[str], requested: str | None) -> tuple[str | None, bool]:
    if not roles:
        return None, False
    if len(roles) == 1:
        return roles[0], False
    if requested:
        return _require_selected_role(roles, requested), False
    return None, True


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.settings = get_settings()
        self.audit = AuditService(db)

    async def login(
        self,
        identifier: str,
        password: str,
        *,
        portal_code: str | None = None,
        active_role: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
        device_fingerprint: str | None = None,
    ) -> dict[str, Any]:
        normalized = identifier.strip().lower()
        if not normalized or not password:
            raise AppError("identifier and password are required")

        requested_portal = self._resolve_portal(portal_code)
        user_row = await self._find_user_by_identifier(normalized, identifier.strip())

        if not user_row or user_row["status"] != "active":
            await self._record_failed_login(user_row, normalized, ip_address, user_agent, "invalid_credentials")
            raise AppError("Invalid credentials", status_code=401, error="unauthorized")

        locked_until = user_row.get("locked_until")
        if locked_until is not None:
            if locked_until.tzinfo is None:
                locked_until = locked_until.replace(tzinfo=UTC)
            if locked_until > datetime.now(UTC):
                await self.audit.log_login(
                    user_id=user_row["id"],
                    identifier=normalized,
                    success=False,
                    failure_reason="account_locked",
                    ip_address=ip_address,
                    user_agent=user_agent,
                )
                await self._commit_auth_audit()
                raise AppError(
                    f"Account locked until {locked_until.isoformat()}",
                    status_code=423,
                    error="locked",
                )

        if not verify_password(password, user_row.get("password_hash")):
            await self._record_failed_login(user_row, normalized, ip_address, user_agent, "invalid_password")
            raise AppError("Invalid credentials", status_code=401, error="unauthorized")

        roles = list(user_row.get("roles") or [])
        if requested_portal and not any(role in requested_portal["allowed_roles"] for role in roles):
            await self.audit.log_login(
                user_id=user_row["id"],
                identifier=normalized,
                success=False,
                failure_reason="portal_denied",
                ip_address=ip_address,
                user_agent=user_agent,
            )
            await self._commit_auth_audit()
            raise AppError(
                f"User is not allowed to access {requested_portal['code']} portal",
                status_code=401,
                error="unauthorized",
            )

        return await self._issue_tokens(
            user_row,
            roles=roles,
            requested_active_role=active_role,
            requested_portal=requested_portal,
            ip_address=ip_address,
            user_agent=user_agent,
            device_fingerprint=device_fingerprint,
        )

    async def register(
        self,
        username: str,
        password: str,
        full_name: str,
        *,
        email: str | None = None,
        mobile: str | None = None,
        role_code: str = "patient",
        ip_address: str | None = None,
        user_agent: str | None = None,
        device_fingerprint: str | None = None,
    ) -> dict[str, Any]:
        normalized_username = username.strip().lower()
        normalized_email = email.strip().lower() if email else None
        normalized_mobile = mobile.strip() if mobile else None

        if not normalized_username or not password or not full_name.strip():
            raise AppError("username, password, and fullName are required")
        if not normalized_email and not normalized_mobile:
            raise AppError("email or mobile is required")
        assert_password_policy(password)

        if role_code != "patient":
            raise AppError("Invalid role for public registration", status_code=403, error="forbidden")

        existing = None
        if normalized_email:
            existing = await self._find_user_by_email(normalized_email)
        if not existing and normalized_mobile:
            existing = await self._find_user_by_mobile(normalized_mobile)

        if existing:
            user_id = existing["id"]
            if existing.get("password_hash"):
                if not verify_password(password, existing["password_hash"]):
                    raise AppError(
                        "An account with this email already exists. Sign in with your existing password.",
                        status_code=409,
                        error="account_exists",
                    )
            else:
                await self.db.execute(
                    text(
                        """
                        UPDATE identity.users
                        SET
                          username = COALESCE(username, :username),
                          password_hash = :password_hash,
                          full_name = COALESCE(NULLIF(:full_name, ''), full_name),
                          mobile = COALESCE(:mobile, mobile),
                          status = 'active',
                          updated_at = now()
                        WHERE id = :user_id
                        """
                    ),
                    {
                        "user_id": user_id,
                        "username": normalized_username,
                        "password_hash": hash_password(password),
                        "full_name": full_name.strip(),
                        "mobile": normalized_mobile,
                    },
                )
            await self._assign_role(user_id, role_code)
            if role_code == "patient":
                await self._ensure_patient_record(user_id)
        else:
            username_taken = await self._find_user_by_username(normalized_username)
            if username_taken:
                raise AppError("Username is already taken", status_code=409, error="username_taken")

            from uuid import uuid4

            user_id = uuid4()
            await self.db.execute(
                text(
                    """
                    INSERT INTO identity.users (
                      id, username, password_hash, full_name, mobile, email, status
                    )
                    VALUES (
                      :id, :username, :password_hash, :full_name, :mobile, :email, 'active'
                    )
                    """
                ),
                {
                    "id": user_id,
                    "username": normalized_username,
                    "password_hash": hash_password(password),
                    "full_name": full_name.strip(),
                    "mobile": normalized_mobile,
                    "email": normalized_email,
                },
            )
            await self._assign_role(user_id, role_code)
            if role_code == "patient":
                await self._ensure_patient_record(user_id)

        user_row = await self._load_user_row(user_id)
        if not user_row:
            raise AppError("Registration failed", status_code=500)

        roles = list(user_row.get("roles") or [])
        await self.audit.log_activity(
            user_id,
            "auth.register",
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={"role": role_code, "linkedExisting": existing is not None},
        )
        return await self._issue_tokens(
            user_row,
            roles=roles,
            requested_active_role=None,
            requested_portal=None,
            ip_address=ip_address,
            user_agent=user_agent,
            device_fingerprint=device_fingerprint,
        )

    async def select_role(self, user_id: UUID, role_code: str) -> dict[str, Any]:
        result = await self.db.execute(
            text(
                """
                SELECT u.id, u.username, u.full_name, u.email, u.mobile, u.user_badge_id,
                       array_agg(DISTINCT r.code ORDER BY r.code) AS roles
                FROM identity.users u
                JOIN identity.user_roles ur ON ur.user_id = u.id AND ur.ends_at IS NULL
                JOIN identity.roles r ON r.id = ur.role_id
                WHERE u.id = :user_id AND u.status = 'active'
                GROUP BY u.id
                """
            ),
            {"user_id": user_id},
        )
        row = result.mappings().first()
        if not row:
            raise AppError("Invalid session", status_code=401, error="unauthorized")

        roles = list(row["roles"] or [])
        active_role = _require_selected_role(roles, role_code)

        permissions = await self._get_permissions([active_role])
        access_token = sign_access_token(
            str(row["id"]),
            roles,
            row["username"],
            active_role=active_role,
        )
        return {
            "accessToken": access_token,
            "tokenType": "Bearer",
            "expiresIn": self.settings.jwt_expires_in,
            "activeRole": active_role,
            "permissions": permissions,
            "user": {
                "id": row["id"],
                "username": row["username"],
                "fullName": row["full_name"],
                "email": row["email"],
                "mobile": row["mobile"],
                "badgeId": row.get("user_badge_id"),
                "roles": roles,
            },
        }

    async def get_me(self, user_id: UUID, *, active_role: str | None = None) -> dict[str, Any]:
        result = await self.db.execute(
            text(
                """
                SELECT
                  u.id,
                  u.username,
                  u.full_name,
                  u.email,
                  u.mobile,
                  u.user_badge_id,
                  u.gender,
                  u.dob,
                  u.twofa_enabled,
                  u.last_login_at,
                  array_agg(DISTINCT r.code ORDER BY r.code) AS roles
                FROM identity.users u
                JOIN identity.user_roles ur ON ur.user_id = u.id AND ur.ends_at IS NULL
                JOIN identity.roles r ON r.id = ur.role_id
                WHERE u.id = :user_id AND u.status = 'active'
                GROUP BY u.id
                """
            ),
            {"user_id": user_id},
        )
        row = result.mappings().first()
        if not row:
            raise AppError("Invalid session", status_code=401, error="unauthorized")

        roles = list(row["roles"] or [])
        resolved_active, requires_selection = _resolve_active_role(roles, active_role)
        permission_roles = [resolved_active] if resolved_active else roles
        permissions = await self._get_permissions(permission_roles)
        return {
            "id": row["id"],
            "username": row["username"],
            "fullName": row["full_name"],
            "email": row["email"],
            "mobile": row["mobile"],
            "badgeId": row.get("user_badge_id"),
            "gender": row["gender"],
            "dob": row["dob"],
            "twofaEnabled": bool(row["twofa_enabled"]),
            "lastLoginAt": row["last_login_at"],
            "roles": roles,
            "permissions": permissions,
            "allowedPortals": self._allowed_portals(roles),
            "context": await self._profile_context(user_id, roles),
            "activeRole": resolved_active,
            "requiresRoleSelection": requires_selection,
        }

    async def refresh_token(
        self,
        refresh_token: str,
        *,
        active_role: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
        device_fingerprint: str | None = None,
    ) -> dict[str, Any]:
        if not refresh_token:
            raise AppError("refreshToken is required")

        session = await self._rotate_refresh_token(
            refresh_token,
            ip_address=ip_address,
            user_agent=user_agent,
            device_fingerprint=device_fingerprint,
        )

        user_result = await self.db.execute(
            text(
                """
                SELECT u.id, u.username,
                       array_agg(DISTINCT r.code ORDER BY r.code) AS roles
                FROM identity.users u
                JOIN identity.user_roles ur ON ur.user_id = u.id AND ur.ends_at IS NULL
                JOIN identity.roles r ON r.id = ur.role_id
                WHERE u.id = :user_id
                GROUP BY u.id
                """
            ),
            {"user_id": session["user_id"]},
        )
        user_row = user_result.mappings().first()
        if not user_row:
            raise AppError("Invalid refresh token", status_code=401, error="unauthorized")

        roles = list(user_row["roles"] or [])
        resolved_active, requires_selection = _resolve_active_role(roles, active_role)
        access_token = sign_access_token(
            str(user_row["id"]),
            roles,
            user_row["username"],
            active_role=resolved_active,
        )
        return {
            "accessToken": access_token,
            "refreshToken": session["refresh_token"],
            "expiresIn": self.settings.jwt_expires_in,
            "sessionId": session["session_id"],
            "activeRole": resolved_active,
            "requiresRoleSelection": requires_selection,
        }

    async def logout(
        self,
        session_id: UUID,
        *,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict[str, bool]:
        session_row = await self.db.execute(
            text(
                """
                SELECT user_id FROM identity.web_sessions
                WHERE id = :session_id AND status = 'active'
                LIMIT 1
                """
            ),
            {"session_id": session_id},
        )
        row = session_row.mappings().first()
        await self.db.execute(
            text(
                """
                UPDATE identity.web_sessions
                SET status = 'revoked', revoked_at = now()
                WHERE id = :session_id AND status = 'active'
                """
            ),
            {"session_id": session_id},
        )
        if row:
            await self.audit.log_activity(
                row["user_id"],
                "auth.logout",
                entity_type="web_session",
                entity_id=session_id,
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={"method": "session_id"},
            )
        return {"loggedOut": True}

    async def logout_by_refresh_token(
        self,
        refresh_token: str,
        *,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict[str, bool]:
        refresh_token_hash = hash_token(refresh_token)
        session_row = await self.db.execute(
            text(
                """
                SELECT id, user_id FROM identity.web_sessions
                WHERE refresh_token_hash = :refresh_token_hash AND status = 'active'
                LIMIT 1
                """
            ),
            {"refresh_token_hash": refresh_token_hash},
        )
        row = session_row.mappings().first()
        await self.db.execute(
            text(
                """
                UPDATE identity.web_sessions
                SET status = 'revoked', revoked_at = now()
                WHERE refresh_token_hash = :refresh_token_hash AND status = 'active'
                """
            ),
            {"refresh_token_hash": refresh_token_hash},
        )
        if row:
            await self.audit.log_activity(
                row["user_id"],
                "auth.logout",
                entity_type="web_session",
                entity_id=row["id"],
                ip_address=ip_address,
                user_agent=user_agent,
                metadata={"method": "refresh_token"},
            )
        return {"loggedOut": True}

    async def list_sessions(self, user_id: UUID) -> list[dict[str, Any]]:
        result = await self.db.execute(
            text(
                """
                SELECT s.id, s.ip_address, s.user_agent, s.status, s.created_at, s.expires_at,
                       d.device_label, d.is_trusted
                FROM identity.web_sessions s
                LEFT JOIN identity.user_devices d ON d.id = s.device_id
                WHERE s.user_id = :user_id AND s.status = 'active' AND s.expires_at > now()
                ORDER BY s.created_at DESC
                """
            ),
            {"user_id": user_id},
        )
        return [
            {
                "id": row["id"],
                "ipAddress": str(row["ip_address"]) if row["ip_address"] else None,
                "userAgent": row["user_agent"],
                "status": row["status"],
                "createdAt": row["created_at"],
                "expiresAt": row["expires_at"],
                "deviceLabel": row["device_label"],
                "isTrusted": row["is_trusted"],
            }
            for row in result.mappings().all()
        ]

    async def revoke_session(
        self,
        user_id: UUID,
        session_id: UUID,
        *,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict[str, bool]:
        await self.db.execute(
            text(
                """
                UPDATE identity.web_sessions
                SET status = 'revoked', revoked_at = now()
                WHERE id = :session_id AND user_id = :user_id AND status = 'active'
                """
            ),
            {"session_id": session_id, "user_id": user_id},
        )
        await self.audit.log_activity(
            user_id,
            "auth.session.revoke",
            entity_type="web_session",
            entity_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return {"revoked": True}

    async def change_password(
        self,
        user_id: UUID,
        old_password: str,
        new_password: str,
        *,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> dict[str, bool]:
        if not old_password or not new_password:
            raise AppError("currentPassword and newPassword are required")
        assert_password_policy(new_password)

        result = await self.db.execute(
            text("SELECT password_hash FROM identity.users WHERE id = :user_id"),
            {"user_id": user_id},
        )
        row = result.mappings().first()
        if not row or not verify_password(old_password, row["password_hash"]):
            raise AppError("Current password is incorrect", status_code=401, error="unauthorized")

        await self.db.execute(
            text(
                """
                UPDATE identity.users
                SET password_hash = :password_hash, password_changed_at = now()
                WHERE id = :user_id
                """
            ),
            {"user_id": user_id, "password_hash": hash_password(new_password)},
        )
        await self.db.execute(
            text(
                """
                UPDATE identity.web_sessions
                SET status = 'revoked', revoked_at = now()
                WHERE user_id = :user_id AND status = 'active'
                """
            ),
            {"user_id": user_id},
        )
        await self.audit.log_activity(
            user_id,
            "auth.password.change",
            entity_type="user",
            entity_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={"sessionsRevoked": True},
        )
        return {"updated": True}

    def _resolve_portal(self, portal_code: str | None) -> dict[str, Any] | None:
        if not portal_code:
            return None
        portal = PORTALS.get(portal_code)
        if not portal:
            raise AppError(f"Unsupported portal: {portal_code}")
        return portal

    def _allowed_portals(self, roles: list[str]) -> list[dict[str, str]]:
        portals: list[dict[str, str]] = []
        for portal in PORTALS.values():
            if any(role in portal["allowed_roles"] for role in roles):
                portals.append(
                    {
                        "code": portal["code"],
                        "layout": portal["layout"],
                        "landingPath": portal["landing_path"],
                    }
                )
        return portals

    async def _find_user_by_email(self, email: str) -> dict[str, Any] | None:
        result = await self.db.execute(
            text(
                """
                SELECT id, username, password_hash, status
                FROM identity.users
                WHERE lower(email::text) = :email
                LIMIT 1
                """
            ),
            {"email": email},
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def _find_user_by_mobile(self, mobile: str) -> dict[str, Any] | None:
        result = await self.db.execute(
            text(
                """
                SELECT id, username, password_hash, status
                FROM identity.users
                WHERE mobile = :mobile
                LIMIT 1
                """
            ),
            {"mobile": mobile},
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def _find_user_by_username(self, username: str) -> dict[str, Any] | None:
        result = await self.db.execute(
            text(
                """
                SELECT id
                FROM identity.users
                WHERE lower(username::text) = :username
                LIMIT 1
                """
            ),
            {"username": username},
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def _load_user_row(self, user_id: UUID) -> dict[str, Any] | None:
        result = await self.db.execute(
            text(
                """
                SELECT
                  u.id,
                  u.username,
                  u.full_name,
                  u.email,
                  u.mobile,
                  u.user_badge_id,
                  u.password_hash,
                  u.status,
                  u.failed_login_attempts,
                  u.locked_until,
                  array_agg(DISTINCT r.code ORDER BY r.code) AS roles
                FROM identity.users u
                JOIN identity.user_roles ur ON ur.user_id = u.id AND ur.ends_at IS NULL
                JOIN identity.roles r ON r.id = ur.role_id
                WHERE u.id = :user_id
                GROUP BY u.id
                """
            ),
            {"user_id": user_id},
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def _assign_role(self, user_id: UUID, role_code: str) -> None:
        await self.db.execute(
            text(
                """
                INSERT INTO identity.user_roles (user_id, role_id, is_primary)
                SELECT :user_id, r.id, false
                FROM identity.roles r
                WHERE r.code = :role_code
                  AND NOT EXISTS (
                    SELECT 1 FROM identity.user_roles ur
                    WHERE ur.user_id = :user_id AND ur.role_id = r.id AND ur.ends_at IS NULL
                  )
                """
            ),
            {"user_id": user_id, "role_code": role_code},
        )

    async def _ensure_patient_record(self, user_id: UUID) -> None:
        await self.db.execute(
            text(
                """
                INSERT INTO clinical.patients (
                  user_id, patient_code, journey_status, registered_at
                )
                VALUES (:user_id, :patient_code, 'registered', now())
                ON CONFLICT (user_id) DO NOTHING
                """
            ),
            {"user_id": user_id, "patient_code": f"MR-{str(user_id)[:8].upper()}"},
        )

    async def _find_user_by_identifier(self, normalized: str, raw_identifier: str) -> dict[str, Any] | None:
        result = await self.db.execute(
            text(
                """
                SELECT
                  u.id,
                  u.username,
                  u.full_name,
                  u.email,
                  u.mobile,
                  u.user_badge_id,
                  u.password_hash,
                  u.status,
                  u.failed_login_attempts,
                  u.locked_until,
                  array_agg(DISTINCT r.code ORDER BY r.code) AS roles
                FROM identity.users u
                JOIN identity.user_roles ur ON ur.user_id = u.id AND ur.ends_at IS NULL
                JOIN identity.roles r ON r.id = ur.role_id
                WHERE lower(u.username::text) = :normalized
                   OR lower(u.email::text) = :normalized
                   OR u.mobile = :mobile
                GROUP BY u.id
                LIMIT 1
                """
            ),
            {"normalized": normalized, "mobile": raw_identifier},
        )
        row = result.mappings().first()
        return dict(row) if row else None

    async def _get_permissions(self, role_codes: list[str]) -> list[str]:
        if not role_codes:
            return []
        result = await self.db.execute(
            text(
                """
                SELECT DISTINCT p.code
                FROM identity.permissions p
                JOIN identity.role_permissions rp ON rp.permission_id = p.id
                JOIN identity.roles r ON r.id = rp.role_id
                WHERE r.code = ANY(:role_codes)
                ORDER BY p.code
                """
            ),
            {"role_codes": role_codes},
        )
        return [row["code"] for row in result.mappings().all()]

    async def _profile_context(self, user_id: UUID, roles: list[str]) -> dict[str, Any]:
        context: dict[str, Any] = {}

        if "patient" in roles:
            result = await self.db.execute(
                text(
                    """
                    SELECT id, patient_code
                    FROM clinical.patients
                    WHERE user_id = :user_id AND status = 'active'
                    ORDER BY created_at DESC
                    LIMIT 1
                    """
                ),
                {"user_id": user_id},
            )
            row = result.mappings().first()
            context["patient"] = dict(row) if row else None

        if "doctor" in roles:
            result = await self.db.execute(
                text(
                    """
                    SELECT id, registration_number, specialization
                    FROM clinical.doctors
                    WHERE user_id = :user_id AND status = 'active'
                    ORDER BY created_at DESC
                    LIMIT 1
                    """
                ),
                {"user_id": user_id},
            )
            row = result.mappings().first()
            context["doctor"] = dict(row) if row else None

        if "technician" in roles:
            result = await self.db.execute(
                text(
                    """
                    SELECT id, employee_code, status
                    FROM operations.technicians
                    WHERE user_id = :user_id
                    ORDER BY created_at DESC
                    LIMIT 1
                    """
                ),
                {"user_id": user_id},
            )
            row = result.mappings().first()
            context["technician"] = dict(row) if row else None

        if any(role in roles for role in ("dietician", "health_coach")):
            result = await self.db.execute(
                text(
                    """
                    SELECT id, member_type
                    FROM care.care_team_members
                    WHERE user_id = :user_id AND status = 'active'
                    ORDER BY created_at DESC
                    LIMIT 1
                    """
                ),
                {"user_id": user_id},
            )
            row = result.mappings().first()
            context["careTeamMember"] = dict(row) if row else None

        if "pharmacy" in roles:
            result = await self.db.execute(
                text(
                    """
                    SELECT id, license_number
                    FROM commerce.pharmacy_profiles
                    WHERE user_id = :user_id AND status = 'active'
                    ORDER BY created_at DESC
                    LIMIT 1
                    """
                ),
                {"user_id": user_id},
            )
            row = result.mappings().first()
            context["pharmacy"] = dict(row) if row else None

        if "lab_partner" in roles:
            result = await self.db.execute(
                text(
                    """
                    SELECT id, name, registration_number
                    FROM operations.lab_partners
                    WHERE contact_user_id = :user_id AND status = 'active'
                    ORDER BY created_at DESC
                    LIMIT 1
                    """
                ),
                {"user_id": user_id},
            )
            row = result.mappings().first()
            context["labPartner"] = dict(row) if row else None

        return context

    async def _issue_tokens(
        self,
        user_row: dict[str, Any],
        *,
        roles: list[str],
        requested_active_role: str | None = None,
        requested_portal: dict[str, Any] | None,
        ip_address: str | None,
        user_agent: str | None,
        device_fingerprint: str | None,
    ) -> dict[str, Any]:
        portals = self._allowed_portals(roles)
        active_portal = requested_portal or (PORTALS[portals[0]["code"]] if portals else None)
        if not active_portal:
            raise AppError("User has no portal access", status_code=401, error="unauthorized")

        active_role, requires_role_selection = _resolve_active_role(roles, requested_active_role)
        permission_roles = [active_role] if active_role else roles
        permissions = await self._get_permissions(permission_roles)
        session = await self._create_session(
            user_row["id"],
            ip_address=ip_address,
            user_agent=user_agent,
            device_fingerprint=device_fingerprint,
        )
        access_token = sign_access_token(
            str(user_row["id"]),
            roles,
            user_row["username"],
            active_role=active_role,
        )

        await self.db.execute(
            text(
                """
                UPDATE identity.users
                SET last_login_at = now(), failed_login_attempts = 0, locked_until = NULL
                WHERE id = :user_id
                """
            ),
            {"user_id": user_row["id"]},
        )

        identifier = user_row.get("email") or user_row.get("username") or str(user_row["id"])
        await self.audit.log_login(
            user_id=user_row["id"],
            identifier=str(identifier),
            success=True,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session["session_id"],
        )
        await self.audit.log_activity(
            user_row["id"],
            "auth.login",
            ip_address=ip_address,
            user_agent=user_agent,
            metadata={"method": "password"},
        )

        return {
            "accessToken": access_token,
            "refreshToken": session["refresh_token"],
            "tokenType": "Bearer",
            "expiresIn": self.settings.jwt_expires_in,
            "sessionId": session["session_id"],
            "portal": {
                "code": active_portal["code"],
                "layout": active_portal["layout"],
                "landingPath": active_portal["landing_path"],
            },
            "allowedPortals": portals,
            "permissions": permissions,
            "user": {
                "id": user_row["id"],
                "username": user_row["username"],
                "fullName": user_row["full_name"],
                "email": user_row["email"],
                "mobile": user_row["mobile"],
                "badgeId": user_row.get("user_badge_id"),
                "roles": roles,
            },
            "roles": roles,
            "activeRole": active_role,
            "requiresRoleSelection": requires_role_selection,
            "context": await self._profile_context(user_row["id"], roles),
        }

    async def _record_failed_login(
        self,
        user_row: dict[str, Any] | None,
        identifier: str,
        ip_address: str | None,
        user_agent: str | None,
        reason: str,
    ) -> None:
        log_reason = reason
        if user_row:
            attempts = int(user_row.get("failed_login_attempts") or 0) + 1
            if attempts >= self.settings.max_failed_login_attempts:
                log_reason = "account_lockout_triggered"

        await self.audit.log_login(
            user_id=user_row["id"] if user_row else None,
            identifier=identifier,
            success=False,
            failure_reason=log_reason,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        if not user_row:
            await self._commit_auth_audit()
            return

        attempts = int(user_row.get("failed_login_attempts") or 0) + 1
        locked_until = None
        if attempts >= self.settings.max_failed_login_attempts and self.settings.account_lockout_minutes > 0:
            locked_until = datetime.now(UTC) + timedelta(minutes=self.settings.account_lockout_minutes)

        await self.db.execute(
            text(
                """
                UPDATE identity.users
                SET failed_login_attempts = :attempts, locked_until = :locked_until
                WHERE id = :user_id
                """
            ),
            {"user_id": user_row["id"], "attempts": attempts, "locked_until": locked_until},
        )
        await self._commit_auth_audit()

    async def _commit_auth_audit(self) -> None:
        """Persist login audit rows before auth errors roll back the request session."""
        await self.db.commit()

    async def _upsert_device(
        self,
        user_id: UUID,
        *,
        user_agent: str | None,
        ip_address: str | None,
        fingerprint: str | None,
    ) -> UUID | None:
        if fingerprint:
            existing = await self.db.execute(
                text(
                    """
                    SELECT id
                    FROM identity.user_devices
                    WHERE user_id = :user_id AND device_fingerprint = :fingerprint
                    LIMIT 1
                    """
                ),
                {"user_id": user_id, "fingerprint": fingerprint},
            )
            row = existing.mappings().first()
            if row:
                await self.db.execute(
                    text(
                        """
                        UPDATE identity.user_devices
                        SET last_ip = :ip_address, last_seen_at = now(),
                            user_agent = COALESCE(:user_agent, user_agent)
                        WHERE id = :device_id
                        """
                    ),
                    {
                        "device_id": row["id"],
                        "ip_address": ip_address,
                        "user_agent": user_agent,
                    },
                )
                return row["id"]

        inserted = await self.db.execute(
            text(
                """
                INSERT INTO identity.user_devices (user_id, device_label, device_fingerprint, user_agent, last_ip)
                VALUES (:user_id, :device_label, :fingerprint, :user_agent, :ip_address)
                RETURNING id
                """
            ),
            {
                "user_id": user_id,
                "device_label": _parse_user_agent(user_agent),
                "fingerprint": fingerprint,
                "user_agent": user_agent,
                "ip_address": ip_address,
            },
        )
        return inserted.mappings().first()["id"]

    async def _create_session(
        self,
        user_id: UUID,
        *,
        ip_address: str | None,
        user_agent: str | None,
        device_fingerprint: str | None,
    ) -> dict[str, Any]:
        refresh_token = secrets.token_urlsafe(48)
        refresh_token_hash = hash_token(refresh_token)
        expires_at = datetime.now(UTC) + timedelta(days=REFRESH_TOKEN_TTL_DAYS)
        device_id = await self._upsert_device(
            user_id,
            user_agent=user_agent,
            ip_address=ip_address,
            fingerprint=device_fingerprint,
        )

        result = await self.db.execute(
            text(
                """
                INSERT INTO identity.web_sessions
                  (user_id, refresh_token_hash, ip_address, user_agent, device_id, expires_at)
                VALUES
                  (:user_id, :refresh_token_hash, :ip_address, :user_agent, :device_id, :expires_at)
                RETURNING id
                """
            ),
            {
                "user_id": user_id,
                "refresh_token_hash": refresh_token_hash,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "device_id": device_id,
                "expires_at": expires_at,
            },
        )
        session_id = result.mappings().first()["id"]
        return {
            "session_id": session_id,
            "refresh_token": refresh_token,
            "expires_at": expires_at,
        }

    async def _rotate_refresh_token(
        self,
        refresh_token: str,
        *,
        ip_address: str | None,
        user_agent: str | None,
        device_fingerprint: str | None,
    ) -> dict[str, Any]:
        refresh_token_hash = hash_token(refresh_token)
        result = await self.db.execute(
            text(
                """
                SELECT id, user_id, status, expires_at
                FROM identity.web_sessions
                WHERE refresh_token_hash = :refresh_token_hash
                """
            ),
            {"refresh_token_hash": refresh_token_hash},
        )
        row = result.mappings().first()
        if not row:
            raise AppError("Invalid refresh token", status_code=401, error="unauthorized")

        expires_at = row["expires_at"]
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)

        if row["status"] != "active" or expires_at <= datetime.now(UTC):
            raise AppError("Session expired or revoked", status_code=401, error="unauthorized")

        await self.db.execute(
            text(
                """
                UPDATE identity.web_sessions
                SET status = 'revoked', revoked_at = now()
                WHERE id = :session_id
                """
            ),
            {"session_id": row["id"]},
        )

        session = await self._create_session(
            row["user_id"],
            ip_address=ip_address,
            user_agent=user_agent,
            device_fingerprint=device_fingerprint,
        )
        session["user_id"] = row["user_id"]
        return session
