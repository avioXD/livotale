from __future__ import annotations

import json
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError

ROLE_SLUG_TO_KEY: dict[str, str] = {
    "technicians": "technician",
    "doctors": "doctor",
    "lab-partners": "lab_partner",
    "dieticians": "dietician",
    "health-coaches": "health_coach",
    "pharmacy": "pharmacy",
    "operations": "operations",
    "super-admins": "super_admin",
}

ROLE_KEY_TO_CODE: dict[str, str] = {
    "technician": "technician",
    "doctor": "doctor",
    "lab_partner": "lab_partner",
    "dietician": "dietician",
    "health_coach": "health_coach",
    "pharmacy": "pharmacy",
    "operations": "support",
    "super_admin": "admin",
    "city_manager": "city_manager",
}


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _ops_scope_from_meta(meta: dict[str, Any] | None, zones_by_id: dict[str, dict[str, Any]]) -> dict[str, Any]:
    meta = dict(meta or {})
    zone_ids = _string_list(meta.get("assignedServiceZoneIds"))
    pincodes = _string_list(meta.get("assignedPincodes"))
    city_manager_zone_ids = _string_list(meta.get("cityManagerServiceZoneIds"))

    if not zone_ids and meta.get("assignedCity"):
        assigned_city = str(meta["assignedCity"])
        zone_ids = [
            zone_id
            for zone_id, zone in zones_by_id.items()
            if zone.get("city") == assigned_city and zone.get("active", True)
        ]

    if not city_manager_zone_ids and meta.get("isCityManagerPromoted") and zone_ids:
        city_manager_zone_ids = list(zone_ids)

    city_names = [
        zones_by_id[zone_id]["city"]
        for zone_id in zone_ids
        if zone_id in zones_by_id
    ]
    return {
        "city": ", ".join(dict.fromkeys(city_names)) or None,
        "pincodes": pincodes,
        "is_city_manager_promoted": len(city_manager_zone_ids) > 0,
        "assigned_service_zone_ids": zone_ids,
        "city_manager_service_zone_ids": city_manager_zone_ids,
    }


def _member_row(row: dict[str, Any], role_key: str) -> dict[str, Any]:
    entity_id = row.get("entity_id") or row["id"]
    user_id = row.get("user_id") or row["id"]
    return {
        "id": entity_id,
        "userId": user_id,
        "badgeId": row.get("user_badge_id"),
        "fullName": row["full_name"],
        "subtitle": row.get("subtitle") or ROLE_KEY_TO_CODE.get(role_key, role_key),
        "status": row.get("status") or "inactive",
        "email": row.get("email"),
        "mobile": row.get("mobile"),
        "city": row.get("city"),
        "pincodes": row.get("pincodes") or [],
        "isCityManagerPromoted": bool(row.get("is_city_manager_promoted")),
        "assignedServiceZoneIds": row.get("assigned_service_zone_ids") or [],
        "cityManagerServiceZoneIds": row.get("city_manager_service_zone_ids") or [],
        "metrics": row.get("metrics") or [{"label": "Status", "value": row.get("status") or "inactive"}],
        "profilePath": row.get("profile_path"),
        "archivedAt": row.get("archived_at"),
        "archivedBy": row.get("archived_by"),
    }


class StaffService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self._user_archive_columns: bool | None = None

    async def _users_have_archive_columns(self) -> bool:
        if self._user_archive_columns is not None:
            return self._user_archive_columns
        result = await self.db.execute(
            text(
                """
                SELECT COUNT(*)::int AS cnt
                FROM information_schema.columns
                WHERE table_schema = 'identity'
                  AND table_name = 'users'
                  AND column_name = 'archived_at'
                """
            )
        )
        self._user_archive_columns = int(result.scalar() or 0) > 0
        return self._user_archive_columns

    async def list_users(self, role_slug: str) -> list[dict[str, Any]]:
        role_key = ROLE_SLUG_TO_KEY.get(role_slug)
        if not role_key:
            raise AppError(f"Unsupported staff role slug: {role_slug}", status_code=404)
        role_code = ROLE_KEY_TO_CODE[role_key]

        archive_cols = ""
        if await self._users_have_archive_columns():
            archive_cols = ",\n                  u.archived_at,\n                  u.archived_by"

        if role_key == "technician":
            result = await self.db.execute(
                text(
                    f"""
                    SELECT
                      t.id AS entity_id,
                      u.id AS user_id,
                      u.full_name,
                      u.email,
                      u.mobile,
                      u.user_badge_id,
                      COALESCE(t.status::text, u.status::text) AS status,
                      t.service_zone AS city,
                      t.employee_code
                      {archive_cols}
                    FROM identity.users u
                    JOIN identity.user_roles ur ON ur.user_id = u.id AND ur.ends_at IS NULL
                    JOIN identity.roles r ON r.id = ur.role_id
                    JOIN operations.technicians t ON t.user_id = u.id
                    WHERE r.code = :role_code
                    ORDER BY u.updated_at DESC, u.created_at DESC
                    """
                ),
                {"role_code": role_code},
            )
            rows = []
            for row in result.mappings().all():
                data = dict(row)
                data["subtitle"] = f"{data.get('employee_code') or 'TECH'} · technician"
                data["metrics"] = [
                    {"label": "Badge", "value": data.get("user_badge_id") or "—"},
                    {"label": "Employee", "value": data.get("employee_code") or "—"},
                    {"label": "Status", "value": data.get("status") or "inactive"},
                ]
                rows.append(_member_row(data, role_key))
            return rows

        if role_key == "doctor":
            result = await self.db.execute(
                text(
                    f"""
                    SELECT
                      d.id AS entity_id,
                      u.id AS user_id,
                      u.full_name,
                      u.email,
                      u.mobile,
                      u.user_badge_id,
                      COALESCE(d.status::text, u.status::text) AS status,
                      d.specialization,
                      d.registration_number,
                      d.qualification
                      {archive_cols}
                    FROM identity.users u
                    JOIN identity.user_roles ur ON ur.user_id = u.id AND ur.ends_at IS NULL
                    JOIN identity.roles r ON r.id = ur.role_id
                    JOIN clinical.doctors d ON d.user_id = u.id
                    WHERE r.code = :role_code
                    ORDER BY u.updated_at DESC, u.created_at DESC
                    """
                ),
                {"role_code": role_code},
            )
            rows = []
            for row in result.mappings().all():
                data = dict(row)
                data["subtitle"] = data.get("specialization") or "Doctor"
                data["metrics"] = [
                    {"label": "Registration", "value": data.get("registration_number") or "—"},
                    {"label": "Qualification", "value": data.get("qualification") or "—"},
                    {"label": "Status", "value": data.get("status") or "inactive"},
                ]
                rows.append(_member_row(data, role_key))
            return rows

        if role_key == "lab_partner":
            result = await self.db.execute(
                text(
                    f"""
                    SELECT
                      lp.id AS entity_id,
                      u.id AS user_id,
                      COALESCE(lp.name, u.full_name) AS full_name,
                      lp.email,
                      COALESCE(lp.contact_number, u.mobile) AS mobile,
                      u.user_badge_id,
                      COALESCE(lp.status::text, u.status::text) AS status,
                      lp.registration_number
                      {archive_cols}
                    FROM identity.users u
                    JOIN identity.user_roles ur ON ur.user_id = u.id AND ur.ends_at IS NULL
                    JOIN identity.roles r ON r.id = ur.role_id
                    LEFT JOIN operations.lab_partners lp ON lp.contact_user_id = u.id
                    WHERE r.code = :role_code
                    ORDER BY u.updated_at DESC, u.created_at DESC
                    """
                ),
                {"role_code": role_code},
            )
            rows = []
            for row in result.mappings().all():
                data = dict(row)
                data["subtitle"] = data.get("registration_number") or "Lab partner"
                data["metrics"] = [
                    {"label": "Badge", "value": data.get("user_badge_id") or "—"},
                    {"label": "Registration", "value": data.get("registration_number") or "—"},
                    {"label": "Status", "value": data.get("status") or "inactive"},
                ]
                if data.get("entity_id"):
                    data["profile_path"] = f"/admin/staff/lab-partners/{data['entity_id']}"
                rows.append(_member_row(data, role_key))
            return rows

        if role_key == "operations":
            zones_by_id = {
                str(zone["id"]): zone
                for zone in await self.list_service_zones()
            }
            result = await self.db.execute(
                text(
                    f"""
                    SELECT
                      u.id AS entity_id,
                      u.id AS user_id,
                      u.full_name,
                      u.email,
                      u.mobile,
                      u.user_badge_id,
                      u.status::text AS status,
                      r.code AS role_code,
                      hr.meta AS hr_meta
                      {archive_cols}
                    FROM identity.users u
                    JOIN identity.user_roles ur ON ur.user_id = u.id AND ur.ends_at IS NULL
                    JOIN identity.roles r ON r.id = ur.role_id
                    LEFT JOIN operations.staff_hr_profiles hr
                      ON hr.member_id = u.id
                     AND hr.role = CAST('operations' AS operations.staff_hr_role_enum)
                    WHERE r.code = :role_code
                    ORDER BY u.updated_at DESC, u.created_at DESC
                    """
                ),
                {"role_code": role_code},
            )
            rows = []
            for row in result.mappings().all():
                data = dict(row)
                scope = _ops_scope_from_meta(data.get("hr_meta"), zones_by_id)
                data.update(scope)
                role_label = ROLE_KEY_TO_CODE.get(role_key, role_key)
                data["subtitle"] = (
                    f"{scope['city'] or 'Unscoped'} · city manager"
                    if scope["is_city_manager_promoted"]
                    else f"{scope['city'] or 'Unscoped'} · {role_label}"
                )
                data["metrics"] = [
                    {"label": "Badge", "value": data.get("user_badge_id") or "—"},
                    {"label": "Zones", "value": len(scope["assigned_service_zone_ids"])},
                    {"label": "Pincodes", "value": len(scope["pincodes"])},
                ]
                rows.append(_member_row(data, role_key))
            return rows

        result = await self.db.execute(
            text(
                f"""
                SELECT
                  u.id AS entity_id,
                  u.id AS user_id,
                  u.full_name,
                  u.email,
                  u.mobile,
                  u.user_badge_id,
                  u.status::text AS status,
                  r.code AS role_code
                  {archive_cols}
                FROM identity.users u
                JOIN identity.user_roles ur ON ur.user_id = u.id AND ur.ends_at IS NULL
                JOIN identity.roles r ON r.id = ur.role_id
                WHERE r.code = :role_code
                ORDER BY u.updated_at DESC, u.created_at DESC
                """
            ),
            {"role_code": role_code},
        )
        rows = []
        for row in result.mappings().all():
            data = dict(row)
            role_label = ROLE_KEY_TO_CODE.get(role_key, role_key)
            data["metrics"] = [
                {"label": "Badge", "value": data.get("user_badge_id") or "—"},
                {"label": "Role", "value": role_label},
                {"label": "Status", "value": data.get("status") or "inactive"},
            ]
            rows.append(_member_row(data, role_key))
        return rows

    async def create_member(self, role_slug: str, payload: dict[str, Any]) -> dict[str, Any]:
        role_key = ROLE_SLUG_TO_KEY.get(role_slug)
        if not role_key:
            raise AppError(f"Unsupported staff role slug: {role_slug}", status_code=404)

        user_id = await self._resolve_user_id_for_member(payload)
        await self.db.execute(
            text(
                """
                INSERT INTO identity.users (id, full_name, mobile, email, status)
                VALUES (:id, :full_name, :mobile, :email, :status)
                ON CONFLICT (id) DO UPDATE
                SET full_name = EXCLUDED.full_name,
                    mobile = COALESCE(EXCLUDED.mobile, identity.users.mobile),
                    email = COALESCE(EXCLUDED.email, identity.users.email),
                    status = EXCLUDED.status,
                    updated_at = now()
                """
            ),
            {
                "id": user_id,
                "full_name": payload["fullName"],
                "mobile": payload["mobile"],
                "email": payload.get("email"),
                "status": payload.get("status") or "inactive",
            },
        )
        await self._ensure_role(user_id, ROLE_KEY_TO_CODE[role_key])
        await self._ensure_role_profile(user_id, role_key)
        members = await self.list_users(role_slug)
        member = next(
            (m for m in members if str(m.get("userId") or m["id"]) == str(user_id)),
            None,
        )
        if member:
            return member
        return _member_row(
            {
                "id": user_id,
                "full_name": payload["fullName"],
                "email": payload.get("email"),
                "mobile": payload.get("mobile"),
                "status": payload.get("status") or "inactive",
            },
            role_key,
        )

    async def _resolve_user_id(self, role_slug: str, member_id: UUID) -> UUID:
        members = await self.list_users(role_slug)
        member = next((m for m in members if str(m["id"]) == str(member_id)), None)
        if not member:
            raise AppError("Staff member not found", status_code=404)
        return UUID(str(member["userId"]))

    async def update_member(self, role_slug: str, member_id: UUID, patch: dict[str, Any]) -> dict[str, Any]:
        user_id = await self._resolve_user_id(role_slug, member_id)
        await self.db.execute(
            text(
                """
                UPDATE identity.users
                SET
                  full_name = COALESCE(:full_name, full_name),
                  mobile = COALESCE(:mobile, mobile),
                  email = COALESCE(:email, email),
                  status = COALESCE(:status, status),
                  updated_at = now()
                WHERE id = :id
                """
            ),
            {
                "id": user_id,
                "full_name": patch.get("fullName"),
                "mobile": patch.get("mobile"),
                "email": patch.get("email"),
                "status": patch.get("status"),
            },
        )
        members = await self.list_users(role_slug)
        member = next((m for m in members if str(m["id"]) == str(member_id)), None)
        if not member:
            raise AppError("Staff member not found", status_code=404)
        return member

    async def upsert_member(self, role_slug: str, member: dict[str, Any]) -> dict[str, Any]:
        member_id = member.get("id")
        if member_id:
            return await self.update_member(role_slug, UUID(str(member_id)), member)
        return await self.create_member(role_slug, member)

    async def get_dashboard(self, role_slug: str) -> dict[str, Any]:
        role_key = ROLE_SLUG_TO_KEY.get(role_slug)
        if not role_key:
            raise AppError(f"Unsupported staff role slug: {role_slug}", status_code=404)
        users = await self.list_users(role_slug)
        active = sum(1 for u in users if u.get("status") == "active")
        return {
            "headline": f"{role_key.replace('_', ' ').title()} workspace",
            "kpis": [
                {"label": "Team members", "value": len(users)},
                {"label": "Active", "value": active},
                {"label": "Inactive", "value": len(users) - active},
            ],
        }

    async def create_invite(self, role_slug: str, payload: dict[str, Any], created_by: UUID | None) -> dict[str, Any]:
        role_key = ROLE_SLUG_TO_KEY.get(role_slug)
        if not role_key:
            raise AppError(f"Unsupported staff role slug: {role_slug}", status_code=404)

        token = secrets.token_urlsafe(24)
        expires_at = datetime.now(UTC) + timedelta(days=14)
        member = await self.create_member(
            role_slug,
            {
                "fullName": payload["fullName"],
                "mobile": payload["mobile"],
                "email": payload.get("email"),
                "status": "inactive",
            },
        )
        member_id = member["id"]
        member_user_id = member.get("userId") or member_id
        result = await self.db.execute(
            text(
                """
                INSERT INTO operations.staff_onboarding_invites
                  (token, role_key, full_name, email, mobile, username, member_id, user_id,
                   onboarding_payload, created_by, expires_at)
                VALUES
                  (:token, :role_key, :full_name, :email, :mobile, :username, :member_id, :user_id,
                   CAST(:payload AS jsonb), :created_by, :expires_at)
                RETURNING *
                """
            ),
            {
                "token": token,
                "role_key": role_key,
                "full_name": payload["fullName"],
                "email": payload.get("email"),
                "mobile": payload["mobile"],
                "username": payload.get("username"),
                "member_id": member_id,
                "user_id": member_user_id,
                "payload": json.dumps(payload.get("profile") or {}),
                "created_by": created_by,
                "expires_at": expires_at,
            },
        )
        return self._invite_row(dict(result.mappings().first()))

    async def list_invites(self, role_slug: str) -> list[dict[str, Any]]:
        role_key = ROLE_SLUG_TO_KEY.get(role_slug)
        if not role_key:
            raise AppError(f"Unsupported staff role slug: {role_slug}", status_code=404)
        result = await self.db.execute(
            text(
                """
                SELECT *
                FROM operations.staff_onboarding_invites
                WHERE role_key = :role_key
                ORDER BY created_at DESC
                """
            ),
            {"role_key": role_key},
        )
        return [self._invite_row(dict(row)) for row in result.mappings().all()]

    async def get_invite_by_token(self, token: str) -> dict[str, Any]:
        result = await self.db.execute(
            text("SELECT * FROM operations.staff_onboarding_invites WHERE token = :token LIMIT 1"),
            {"token": token},
        )
        row = result.mappings().first()
        if not row:
            raise AppError("Onboarding invite not found", status_code=404)
        return self._invite_row(dict(row))

    async def send_invite_link(self, token: str) -> dict[str, Any]:
        await self.db.execute(
            text(
                """
                UPDATE operations.staff_onboarding_invites
                SET status = 'link_sent', link_sent_at = now(), updated_at = now()
                WHERE token = :token
                """
            ),
            {"token": token},
        )
        return await self.get_invite_by_token(token)

    async def attach_user_to_invite(self, token: str, user_id: UUID | None) -> dict[str, Any]:
        invite_result = await self.db.execute(
            text("SELECT role_key FROM operations.staff_onboarding_invites WHERE token = :token LIMIT 1"),
            {"token": token},
        )
        invite_row = invite_result.mappings().first()
        if invite_row and user_id:
            role_key = invite_row["role_key"]
            role_code = ROLE_KEY_TO_CODE.get(role_key)
            if role_code:
                await self._ensure_role(user_id, role_code)
            await self._ensure_role_profile(user_id, role_key)

        await self.db.execute(
            text(
                """
                UPDATE operations.staff_onboarding_invites
                SET user_id = :user_id, status = 'registered', registered_at = now(), updated_at = now()
                WHERE token = :token
                """
            ),
            {"token": token, "user_id": user_id},
        )
        return await self.get_invite_by_token(token)

    async def submit_invite_profile(self, token: str, body: dict[str, Any]) -> dict[str, Any]:
        employment_status = body.get("employmentStatus") or (
            "active" if body.get("profileComplete") and body.get("verificationStatus") == "verified" else "inactive"
        )
        await self.db.execute(
            text(
                """
                UPDATE operations.staff_onboarding_invites
                SET profile_complete = :profile_complete,
                    verification_status = :verification_status,
                    employment_status = :employment_status,
                    status = CASE WHEN :employment_status = 'active' THEN 'active' ELSE status END,
                    profile_submitted_at = now(),
                    activated_at = CASE WHEN :employment_status = 'active' THEN now() ELSE activated_at END,
                    updated_at = now()
                WHERE token = :token
                """
            ),
            {
                "token": token,
                "profile_complete": bool(body.get("profileComplete")),
                "verification_status": body.get("verificationStatus") or "pending",
                "employment_status": employment_status,
            },
        )
        return await self.get_invite_by_token(token)

    async def get_onboarding_status(self, user_id: UUID) -> dict[str, Any]:
        result = await self.db.execute(
            text(
                """
                SELECT *
                FROM operations.staff_onboarding_invites
                WHERE user_id = :user_id
                ORDER BY created_at DESC
                LIMIT 1
                """
            ),
            {"user_id": user_id},
        )
        row = result.mappings().first()
        if not row:
            return {
                "required": False,
                "profileComplete": True,
                "verificationComplete": True,
                "employmentStatus": "active",
                "canAccessApp": True,
            }
        invite = self._invite_row(dict(row))
        return {
            "required": invite["employmentStatus"] != "active",
            "inviteId": invite["id"],
            "inviteToken": invite["token"],
            "roleKey": invite["roleKey"],
            "profileComplete": invite["profileComplete"],
            "verificationComplete": invite["verificationStatus"] == "verified",
            "employmentStatus": invite["employmentStatus"],
            "verificationStatus": invite["verificationStatus"],
            "status": invite["status"],
            "canAccessApp": invite["employmentStatus"] == "active",
        }

    async def list_partner_lab_summaries(self, active_only: bool = True) -> list[dict[str, Any]]:
        labs = await self.list_partner_labs(active_only=active_only)
        summaries: list[dict[str, Any]] = []
        for lab in labs:
            stats = await self._partner_lab_stats(lab["id"])
            summaries.append(
                {
                    **lab,
                    "reportsUploaded": stats["reportsUploaded"],
                    "inPipeline": stats["inPipeline"],
                }
            )
        return summaries

    async def list_partner_labs(self, active_only: bool = True) -> list[dict[str, Any]]:
        query = """
            SELECT id, name, contact_number, email, registration_number, status, created_at, updated_at
            FROM operations.lab_partners
        """
        if active_only:
            query += " WHERE status = 'active'"
        query += " ORDER BY updated_at DESC, created_at DESC"
        result = await self.db.execute(text(query))
        return [self._lab_row(dict(row)) for row in result.mappings().all()]

    async def get_partner_lab(self, lab_id: UUID) -> dict[str, Any] | None:
        result = await self.db.execute(
            text(
                """
                SELECT id, name, contact_number, email, registration_number, status, created_at, updated_at
                FROM operations.lab_partners WHERE id = :id
                """
            ),
            {"id": lab_id},
        )
        row = result.mappings().first()
        return self._lab_row(dict(row)) if row else None

    async def get_partner_lab_detail(self, lab_id: UUID) -> dict[str, Any] | None:
        lab = await self.get_partner_lab(lab_id)
        if not lab:
            return None
        stats = await self._partner_lab_stats(lab_id)
        return {**lab, "stats": stats, "estimatedBillingInr": stats["reportsUploaded"] * 500}

    async def create_partner_lab(self, payload: dict[str, Any]) -> dict[str, Any]:
        result = await self.db.execute(
            text(
                """
                INSERT INTO operations.lab_partners (name, contact_number, email, registration_number, status)
                VALUES (:name, :phone, :email, :registration_number, :status)
                RETURNING id, name, contact_number, email, registration_number, status, created_at, updated_at
                """
            ),
            {
                "name": payload["name"],
                "phone": payload.get("phone") or payload.get("contactPerson"),
                "email": payload.get("email") or "",
                "registration_number": payload.get("registrationNumber"),
                "status": "active" if payload.get("active", True) else "inactive",
            },
        )
        return self._lab_row(dict(result.mappings().first()))

    async def update_partner_lab(self, lab_id: UUID, payload: dict[str, Any]) -> dict[str, Any]:
        await self.db.execute(
            text(
                """
                UPDATE operations.lab_partners
                SET
                  name = COALESCE(:name, name),
                  contact_number = COALESCE(:phone, contact_number),
                  email = COALESCE(:email, email),
                  registration_number = COALESCE(:registration_number, registration_number),
                  status = CASE WHEN :active IS NULL THEN status WHEN :active THEN 'active' ELSE 'inactive' END,
                  updated_at = now()
                WHERE id = :id
                """
            ),
            {
                "id": lab_id,
                "name": payload.get("name"),
                "phone": payload.get("phone") or payload.get("contactPerson"),
                "email": payload.get("email"),
                "registration_number": payload.get("registrationNumber"),
                "active": payload.get("active"),
            },
        )
        lab = await self.get_partner_lab(lab_id)
        if not lab:
            raise AppError("Lab not found", status_code=404)
        return lab

    async def list_service_zones(self) -> list[dict[str, Any]]:
        result = await self.db.execute(
            text(
                """
                SELECT id, city_name, state_name, pincodes, active, created_at, updated_at
                FROM operations.service_zones
                ORDER BY updated_at DESC, created_at DESC
                """
            )
        )
        return [self._zone_row(dict(row)) for row in result.mappings().all()]

    async def get_service_zone(self, zone_id: UUID) -> dict[str, Any] | None:
        result = await self.db.execute(
            text(
                """
                SELECT id, city_name, state_name, pincodes, active, created_at, updated_at
                FROM operations.service_zones WHERE id = :id
                """
            ),
            {"id": zone_id},
        )
        row = result.mappings().first()
        return self._zone_row(dict(row)) if row else None

    async def create_service_zone(self, payload: dict[str, Any]) -> dict[str, Any]:
        result = await self.db.execute(
            text(
                """
                INSERT INTO operations.service_zones (city_name, state_name, pincodes, active)
                VALUES (:city, :state, CAST(:pincodes AS jsonb), :active)
                RETURNING id, city_name, state_name, pincodes, active, created_at, updated_at
                """
            ),
            {
                "city": payload["city"],
                "state": payload.get("state") or "",
                "pincodes": json.dumps(payload.get("pincodes") or []),
                "active": payload.get("active", True),
            },
        )
        return self._zone_row(dict(result.mappings().first()))

    async def update_service_zone(self, zone_id: UUID, payload: dict[str, Any]) -> dict[str, Any]:
        await self.db.execute(
            text(
                """
                UPDATE operations.service_zones
                SET
                  city_name = COALESCE(:city, city_name),
                  state_name = COALESCE(:state, state_name),
                  pincodes = COALESCE(CAST(:pincodes AS jsonb), pincodes),
                  active = COALESCE(:active, active),
                  updated_at = now()
                WHERE id = :id
                """
            ),
            {
                "id": zone_id,
                "city": payload.get("city"),
                "state": payload.get("state"),
                "pincodes": json.dumps(payload["pincodes"]) if payload.get("pincodes") is not None else None,
                "active": payload.get("active"),
            },
        )
        zone = await self.get_service_zone(zone_id)
        if not zone:
            raise AppError("Service zone not found", status_code=404)
        return zone

    async def delete_service_zone(self, zone_id: UUID) -> None:
        await self.db.execute(
            text("DELETE FROM operations.service_zones WHERE id = :id"),
            {"id": zone_id},
        )

    async def _resolve_user_id_for_member(self, payload: dict[str, Any]) -> UUID:
        email = payload.get("email")
        if email:
            result = await self.db.execute(
                text(
                    """
                    SELECT id FROM identity.users
                    WHERE lower(email::text) = lower(:email)
                    LIMIT 1
                    """
                ),
                {"email": str(email).strip()},
            )
            existing_id = result.scalar_one_or_none()
            if existing_id:
                return existing_id
        return payload.get("id") or uuid4()

    async def _ensure_role(self, user_id: UUID, role_code: str) -> None:
        await self.db.execute(
            text(
                """
                INSERT INTO identity.user_roles (user_id, role_id)
                SELECT :user_id, r.id
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

    async def _ensure_role_profile(self, user_id: UUID, role_key: str) -> None:
        if role_key == "technician":
            await self.db.execute(
                text(
                    """
                    INSERT INTO operations.technicians (user_id, employee_code)
                    VALUES (:user_id, :employee_code)
                    ON CONFLICT (user_id) DO NOTHING
                    """
                ),
                {"user_id": user_id, "employee_code": f"TECH-{str(user_id)[:8].upper()}"},
            )
        elif role_key == "doctor":
            await self.db.execute(
                text(
                    """
                    INSERT INTO clinical.doctors (user_id, registration_number, status)
                    VALUES (:user_id, :registration_number, 'draft')
                    ON CONFLICT (user_id) DO NOTHING
                    """
                ),
                {"user_id": user_id, "registration_number": f"DR-{str(user_id)[:8].upper()}"},
            )

    async def _partner_lab_stats(self, lab_id: UUID) -> dict[str, int]:
        result = await self.db.execute(
            text(
                """
                SELECT
                  COUNT(*) FILTER (WHERE o.partner_lab_id = :lab_id) AS orders_assigned,
                  COUNT(*) FILTER (WHERE sd.partner_lab_id = :lab_id) AS samples_dispatched,
                  COUNT(*) FILTER (WHERE sd.partner_lab_id = :lab_id AND sd.received_at_lab IS NOT NULL) AS samples_received,
                  (
                    SELECT COUNT(*)::int FROM operations.sample_collections sc
                    WHERE sc.lab_partner_id = :lab_id
                      AND sc.status IN (
                        'report_uploaded','pending_approval','approved',
                        'published_to_patient','completed'
                      )
                  ) AS reports_uploaded,
                  (
                    SELECT COUNT(*)::int FROM operations.sample_collections sc
                    WHERE sc.lab_partner_id = :lab_id
                      AND sc.status IN ('approved','published_to_patient','completed')
                  ) AS reports_verified,
                  (
                    SELECT COUNT(*)::int FROM operations.sample_collections sc
                    WHERE sc.lab_partner_id = :lab_id
                      AND sc.status IN ('published_to_patient','completed')
                  ) AS letterhead_published,
                  COUNT(*) FILTER (WHERE sd.partner_lab_id = :lab_id AND sd.status NOT IN ('completed')) AS in_pipeline
                FROM commerce.service_orders o
                FULL OUTER JOIN operations.sample_dispatches sd ON sd.order_id = o.id
                """
            ),
            {"lab_id": lab_id},
        )
        row = result.mappings().first()
        return {
            "ordersAssigned": int(row["orders_assigned"] or 0),
            "samplesDispatched": int(row["samples_dispatched"] or 0),
            "samplesReceived": int(row["samples_received"] or 0),
            "reportsUploaded": int(row["reports_uploaded"] or 0),
            "reportsVerified": int(row["reports_verified"] or 0),
            "letterheadPublished": int(row["letterhead_published"] or 0),
            "inPipeline": int(row["in_pipeline"] or 0),
        }

    @staticmethod
    def _invite_row(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row["id"],
            "token": row["token"],
            "roleKey": row["role_key"],
            "fullName": row["full_name"],
            "email": row["email"],
            "mobile": row["mobile"],
            "username": row["username"],
            "memberId": row["member_id"],
            "userId": row["user_id"],
            "status": row["status"],
            "profileComplete": row["profile_complete"],
            "verificationStatus": row["verification_status"],
            "employmentStatus": row["employment_status"],
            "expiresAt": row["expires_at"],
            "linkSentAt": row["link_sent_at"],
            "registeredAt": row["registered_at"],
            "profileSubmittedAt": row["profile_submitted_at"],
            "activatedAt": row["activated_at"],
            "createdAt": row["created_at"],
        }

    @staticmethod
    def _lab_row(row: dict[str, Any]) -> dict[str, Any]:
        active = row.get("status") == "active"
        return {
            "id": row["id"],
            "name": row["name"],
            "contactPerson": row.get("contact_number") or "",
            "phone": row.get("contact_number") or "",
            "email": row.get("email") or "",
            "registrationNumber": row.get("registration_number"),
            "active": active,
            "pocContacts": [],
            "address": "",
            "city": "",
            "state": "",
            "pincode": "",
            "supportedTests": [],
            "legalDocuments": [],
            "chargesPerTest": [],
            "billingCycle": "monthly",
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
        }

    @staticmethod
    def _zone_row(row: dict[str, Any]) -> dict[str, Any]:
        pincodes = row.get("pincodes") or []
        if isinstance(pincodes, str):
            pincodes = []
        return {
            "id": row["id"],
            "city": row["city_name"],
            "state": row.get("state_name") or "",
            "pincodes": list(pincodes),
            "active": bool(row.get("active", True)),
            "notes": None,
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
        }
