from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.domain.rbac import ROLE_HIERARCHY, RoleCode
from app.services.staff_service import ROLE_KEY_TO_CODE, ROLE_SLUG_TO_KEY, StaffService

ARCHIVE_AUTHORIZED_ROLES = frozenset({"admin", "support"})

_ASSIGNMENT_CHECKS: list[tuple[str, str, str]] = [
    (
        "Home visits",
        "{count} active home visit(s) assigned",
        """
        SELECT COUNT(*)::int AS cnt
        FROM operations.home_visits hv
        JOIN operations.technicians t ON t.id = hv.technician_id
        WHERE t.user_id = :user_id
          AND hv.status NOT IN ('completed', 'cancelled', 'no_show', 'rescheduled')
        """,
    ),
    (
        "Appointments",
        "{count} active appointment(s) assigned as technician",
        """
        SELECT COUNT(*)::int AS cnt
        FROM operations.appointments a
        JOIN operations.technicians t ON t.id = a.technician_id
        WHERE t.user_id = :user_id
          AND a.status NOT IN (
            'completed', 'closed', 'cancelled_by_patient', 'cancelled_by_admin',
            'cancelled_by_doctor', 'no_show', 'missed', 'rescheduled'
          )
        """,
    ),
    (
        "Sample collections",
        "{count} active sample collection(s) in progress",
        """
        SELECT COUNT(*)::int AS cnt
        FROM operations.sample_collections sc
        JOIN operations.technicians t ON t.id = sc.technician_id
        WHERE t.user_id = :user_id
          AND sc.status NOT IN ('completed', 'cancelled', 'failed', 'published_to_patient', 'approved')
        """,
    ),
    (
        "Service orders",
        "{count} active liver care order(s) assigned as technician",
        """
        SELECT COUNT(*)::int AS cnt
        FROM commerce.service_orders o
        WHERE o.deleted_at IS NULL
          AND o.order_status NOT IN ('completed', 'cancelled')
          AND o.technician_id = :user_id
        """,
    ),
    (
        "Doctor orders",
        "{count} active liver care order(s) assigned as doctor",
        """
        SELECT COUNT(*)::int AS cnt
        FROM commerce.service_orders o
        JOIN clinical.doctors d ON d.id = o.doctor_id
        WHERE o.deleted_at IS NULL
          AND o.order_status NOT IN ('completed', 'cancelled')
          AND d.user_id = :user_id
        """,
    ),
    (
        "Enquiries",
        "{count} open enquiry(ies) assigned as executive",
        """
        SELECT COUNT(*)::int AS cnt
        FROM operations.enquiries e
        WHERE e.deleted_at IS NULL
          AND e.assigned_executive_id = :user_id
          AND e.status NOT IN ('converted', 'closed', 'not_interested')
        """,
    ),
    (
        "Doctor patients",
        "{count} active patient assignment(s) as doctor",
        """
        SELECT COUNT(*)::int AS cnt
        FROM clinical.doctor_patient_assignments dpa
        JOIN clinical.doctors d ON d.id = dpa.doctor_id
        WHERE d.user_id = :user_id
          AND dpa.status = 'active'
        """,
    ),
    (
        "Consultations",
        "{count} upcoming or in-progress consultation(s) as doctor",
        """
        SELECT COUNT(*)::int AS cnt
        FROM care.consultations c
        JOIN clinical.doctors d ON d.id = c.doctor_id
        WHERE d.user_id = :user_id
          AND c.status IN ('scheduled', 'in_progress')
        """,
    ),
    (
        "AI safety flags",
        "{count} open AI safety flag(s) assigned as doctor",
        """
        SELECT COUNT(*)::int AS cnt
        FROM ai.ai_safety_flags f
        JOIN clinical.doctors d ON d.id = f.assigned_doctor_id
        WHERE d.user_id = :user_id
          AND f.status IN ('open', 'acknowledged')
        """,
    ),
    (
        "Care tasks",
        "{count} open care task(s) assigned",
        """
        SELECT COUNT(*)::int AS cnt
        FROM care.care_tasks ct
        WHERE ct.assigned_to = :user_id
          AND ct.status IN ('pending', 'rescheduled')
        """,
    ),
    (
        "Care team",
        "{count} active care team assignment(s)",
        """
        SELECT COUNT(*)::int AS cnt
        FROM care.care_team_assignments cta
        JOIN care.care_team_members ctm ON ctm.id = cta.care_team_member_id
        WHERE ctm.user_id = :user_id
          AND cta.status = 'active'
          AND cta.ended_at IS NULL
        """,
    ),
    (
        "Chat threads",
        "{count} open chat thread(s) assigned",
        """
        SELECT COUNT(*)::int AS cnt
        FROM care.chat_threads ct
        WHERE ct.assigned_user_id = :user_id
          AND ct.status IN ('open', 'escalated')
        """,
    ),
    (
        "Lab partner contact",
        "{count} active lab partner record(s) linked as contact",
        """
        SELECT COUNT(*)::int AS cnt
        FROM operations.lab_partners lp
        WHERE lp.contact_user_id = :user_id
          AND lp.status = 'active'
        """,
    ),
    (
        "Onboarding invites",
        "{count} pending onboarding invite(s)",
        """
        SELECT COUNT(*)::int AS cnt
        FROM operations.staff_onboarding_invites i
        WHERE i.user_id = :user_id
          AND i.employment_status <> 'active'
          AND i.status NOT IN ('active', 'expired', 'cancelled')
        """,
    ),
]


class StaffArchiveService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self._staff = StaffService(db)

    async def check_archive_eligibility(
        self,
        role_slug: str,
        member_id: UUID,
        actor_roles: list[str],
        actor_user_id: UUID,
    ) -> dict[str, Any]:
        role_key, _, member = await self._load_target_member(role_slug, member_id)
        user_id = UUID(str(member["userId"]))
        await self._assert_can_manage_archive(actor_roles, actor_user_id, user_id, role_key)

        if member.get("status") == "archived":
            return {
                "canArchive": False,
                "alreadyArchived": True,
                "memberId": member_id,
                "fullName": member.get("fullName"),
                "roleKey": role_key,
                "blockers": [],
                "message": "This user is already archived.",
            }

        blockers = await self._collect_blockers(UUID(str(member["userId"])))
        return {
            "canArchive": len(blockers) == 0,
            "alreadyArchived": False,
            "memberId": member_id,
            "fullName": member.get("fullName"),
            "roleKey": role_key,
            "blockers": blockers,
            "message": (
                "User is clear of active assignments and can be archived."
                if not blockers
                else "Resolve active assignments before archiving this user."
            ),
        }

    async def archive_member(
        self,
        role_slug: str,
        member_id: UUID,
        actor_roles: list[str],
        actor_user_id: UUID,
    ) -> dict[str, Any]:
        eligibility = await self.check_archive_eligibility(role_slug, member_id, actor_roles, actor_user_id)
        if eligibility.get("alreadyArchived"):
            raise AppError(eligibility["message"], status_code=409, error="already_archived")
        if not eligibility["canArchive"]:
            raise AppError(
                "Cannot archive user while active assignments exist",
                status_code=409,
                error="archive_blocked",
            )

        _, _, member = await self._load_target_member(role_slug, member_id)
        user_id = UUID(str(member["userId"]))
        now = datetime.now(UTC)
        if await self._staff._users_have_archive_columns():
            await self.db.execute(
                text(
                    """
                    UPDATE identity.users
                    SET status = 'archived',
                        archived_at = :archived_at,
                        archived_by = :archived_by,
                        updated_at = now()
                    WHERE id = :user_id
                    """
                ),
                {"user_id": user_id, "archived_at": now, "archived_by": actor_user_id},
            )
        else:
            await self.db.execute(
                text(
                    """
                    UPDATE identity.users
                    SET status = 'inactive',
                        updated_at = now()
                    WHERE id = :user_id
                    """
                ),
                {"user_id": user_id},
            )
        await self.db.execute(
            text(
                """
                UPDATE identity.web_sessions
                SET status = 'revoked', revoked_at = :revoked_at
                WHERE user_id = :user_id AND status = 'active'
                """
            ),
            {"user_id": user_id, "revoked_at": now},
        )

        members = await self._staff.list_users(role_slug)
        member = next((m for m in members if str(m["id"]) == str(member_id)), None)
        if not member:
            raise AppError("Staff member not found after archive", status_code=404)
        return {
            "member": member,
            "archivedAt": now,
            "message": f"{eligibility['fullName']} has been archived.",
        }

    async def unarchive_member(
        self,
        role_slug: str,
        member_id: UUID,
        actor_roles: list[str],
        actor_user_id: UUID,
    ) -> dict[str, Any]:
        role_key, _, member = await self._load_target_member(role_slug, member_id)
        user_id = UUID(str(member["userId"]))
        await self._assert_can_manage_archive(actor_roles, actor_user_id, user_id, role_key)

        if member.get("status") != "archived":
            raise AppError("This user is not archived", status_code=409, error="not_archived")

        if await self._staff._users_have_archive_columns():
            await self.db.execute(
                text(
                    """
                    UPDATE identity.users
                    SET status = 'inactive',
                        archived_at = NULL,
                        archived_by = NULL,
                        updated_at = now()
                    WHERE id = :user_id
                    """
                ),
                {"user_id": user_id},
            )
        else:
            await self.db.execute(
                text(
                    """
                    UPDATE identity.users
                    SET status = 'inactive',
                        updated_at = now()
                    WHERE id = :user_id
                    """
                ),
                {"user_id": user_id},
            )

        members = await self._staff.list_users(role_slug)
        member = next((m for m in members if str(m["id"]) == str(member_id)), None)
        if not member:
            raise AppError("Staff member not found after unarchive", status_code=404)
        return {
            "member": member,
            "message": f"{member['fullName']} has been unarchived and can be reactivated.",
        }

    async def _load_target_member(
        self, role_slug: str, member_id: UUID
    ) -> tuple[str, str, dict[str, Any]]:
        role_key = ROLE_SLUG_TO_KEY.get(role_slug)
        if not role_key:
            raise AppError(f"Unsupported staff role slug: {role_slug}", status_code=404)

        members = await self._staff.list_users(role_slug)
        member = next((m for m in members if str(m["id"]) == str(member_id)), None)
        if not member:
            raise AppError("Staff member not found", status_code=404)

        target_role_code = ROLE_KEY_TO_CODE[role_key]
        return role_key, target_role_code, member

    async def _resolve_target_role_level(self, user_id: UUID, role_key: str) -> int:
        result = await self.db.execute(
            text(
                """
                SELECT r.code
                FROM identity.user_roles ur
                JOIN identity.roles r ON r.id = ur.role_id
                WHERE ur.user_id = :user_id
                  AND ur.ends_at IS NULL
                """
            ),
            {"user_id": user_id},
        )
        role_codes = [str(row[0]) for row in result.fetchall()]
        levels: list[int] = []
        for code in role_codes:
            try:
                levels.append(ROLE_HIERARCHY[RoleCode(code)])
            except ValueError:
                continue
        if levels:
            return max(levels)
        try:
            return ROLE_HIERARCHY[RoleCode(ROLE_KEY_TO_CODE[role_key])]
        except ValueError as exc:
            raise AppError("Unsupported target role for archive", status_code=400) from exc

    async def _collect_blockers(self, user_id: UUID) -> list[dict[str, Any]]:
        blockers: list[dict[str, Any]] = []
        for category, message_template, query in _ASSIGNMENT_CHECKS:
            result = await self.db.execute(text(query), {"user_id": user_id})
            count = int(result.scalar() or 0)
            if count > 0:
                blockers.append(
                    {
                        "category": category,
                        "count": count,
                        "message": message_template.format(count=count),
                    }
                )
        return blockers

    async def _assert_can_manage_archive(
        self,
        actor_roles: list[str],
        actor_user_id: UUID,
        target_user_id: UUID,
        role_key: str,
    ) -> None:
        if str(actor_user_id) == str(target_user_id):
            raise AppError("You cannot archive or unarchive your own account", status_code=403, error="forbidden")

        if not ARCHIVE_AUTHORIZED_ROLES.intersection(actor_roles):
            raise AppError(
                "Only super admins and operations staff can archive or unarchive users",
                status_code=403,
                error="forbidden",
            )

        target_level = await self._resolve_target_role_level(target_user_id, role_key)

        actor_level = 0
        for role in actor_roles:
            try:
                actor_level = max(actor_level, ROLE_HIERARCHY[RoleCode(role)])
            except ValueError:
                continue

        if actor_level <= target_level:
            raise AppError(
                "You cannot archive a user at or above your role level",
                status_code=403,
                error="forbidden",
            )
