from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError


def _serialize_value(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return value


def _serialize_consent(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "purposeId": row["purpose_id"],
        "purposeCode": row["purpose_code"],
        "purposeName": row["purpose_name"],
        "purposeDescription": row.get("purpose_description"),
        "accepted": bool(row.get("accepted")),
        "acceptedAt": _serialize_value(row.get("accepted_at")),
        "withdrawnAt": _serialize_value(row.get("withdrawn_at")),
    }


class ConsentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_purposes(self) -> list[dict[str, Any]]:
        result = await self.db.execute(
            text(
                """
                SELECT id, code, name, description, lawful_basis, is_sensitive, status
                FROM audit.data_processing_purposes
                WHERE status = 'active'
                ORDER BY name
                """
            ),
        )
        return [
            {
                "id": row["id"],
                "code": row["code"],
                "name": row["name"],
                "description": row["description"],
                "lawfulBasis": row["lawful_basis"],
                "isSensitive": bool(row["is_sensitive"]),
                "status": row["status"],
            }
            for row in result.mappings().all()
        ]

    async def user_consents(self, user_id: UUID) -> list[dict[str, Any]]:
        result = await self.db.execute(
            text(
                """
                SELECT DISTINCT ON (dp.id)
                  COALESCE(upc.id, dp.id) AS id,
                  dp.id AS purpose_id,
                  dp.code AS purpose_code,
                  dp.name AS purpose_name,
                  dp.description AS purpose_description,
                  COALESCE(upc.accepted, false) AS accepted,
                  upc.accepted_at,
                  upc.withdrawn_at
                FROM audit.data_processing_purposes dp
                LEFT JOIN audit.user_purpose_consents upc
                  ON upc.purpose_id = dp.id
                 AND upc.user_id = :user_id
                 AND upc.privacy_notice_id IS NULL
                WHERE dp.status = 'active'
                ORDER BY dp.id, upc.accepted_at DESC NULLS LAST, dp.name
                """
            ),
            {"user_id": user_id},
        )
        return [_serialize_consent(dict(row)) for row in result.mappings().all()]

    async def _dedupe_user_purpose_rows(self, user_id: UUID, purpose_id: UUID) -> UUID | None:
        result = await self.db.execute(
            text(
                """
                SELECT id
                FROM audit.user_purpose_consents
                WHERE user_id = :user_id
                  AND purpose_id = :purpose_id
                  AND privacy_notice_id IS NULL
                ORDER BY accepted_at DESC NULLS LAST, created_at DESC
                """
            ),
            {"user_id": user_id, "purpose_id": purpose_id},
        )
        rows = [row["id"] for row in result.mappings().all()]
        if not rows:
            return None
        keep_id = rows[0]
        if len(rows) > 1:
            await self.db.execute(
                text(
                    """
                    DELETE FROM audit.user_purpose_consents
                    WHERE id = ANY(:duplicate_ids)
                    """
                ),
                {"duplicate_ids": rows[1:]},
            )
        return keep_id

    async def _write_audit_log(
        self,
        user_id: UUID,
        purpose_id: UUID,
        consent_id: UUID,
        *,
        ip_address: str | None,
        user_agent: str | None,
    ) -> None:
        await self.db.execute(
            text(
                """
                INSERT INTO audit.audit_logs
                  (actor_user_id, action, entity_type, entity_id, new_value, ip_address, user_agent)
                VALUES
                  (:user_id, 'consent.accept', 'user_purpose_consent', :consent_id,
                   jsonb_build_object('purposeId', CAST(:purpose_id AS text), 'accepted', true),
                   CAST(:ip_address AS inet), :user_agent)
                """
            ),
            {
                "user_id": user_id,
                "purpose_id": str(purpose_id),
                "consent_id": consent_id,
                "ip_address": ip_address,
                "user_agent": user_agent,
            },
        )

    async def accept_purpose(
        self,
        user_id: UUID,
        purpose_id: UUID,
        *,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> list[dict[str, Any]]:
        purpose = await self.db.execute(
            text(
                """
                SELECT id, code, name
                FROM audit.data_processing_purposes
                WHERE id = :purpose_id AND status = 'active'
                """
            ),
            {"purpose_id": purpose_id},
        )
        purpose_row = purpose.mappings().first()
        if not purpose_row:
            raise AppError("Purpose not found", status_code=404)

        existing_id = await self._dedupe_user_purpose_rows(user_id, purpose_id)
        if existing_id:
            await self.db.execute(
                text(
                    """
                    UPDATE audit.user_purpose_consents
                    SET accepted = true,
                        accepted_at = now(),
                        withdrawn_at = NULL,
                        ip_address = CAST(:ip_address AS inet),
                        user_agent = :user_agent
                    WHERE id = :id
                    """
                ),
                {
                    "id": existing_id,
                    "ip_address": ip_address,
                    "user_agent": user_agent,
                },
            )
            consent_id = existing_id
        else:
            inserted = await self.db.execute(
                text(
                    """
                    INSERT INTO audit.user_purpose_consents
                      (user_id, purpose_id, accepted, accepted_at, ip_address, user_agent)
                    VALUES
                      (:user_id, :purpose_id, true, now(), CAST(:ip_address AS inet), :user_agent)
                    RETURNING id
                    """
                ),
                {
                    "user_id": user_id,
                    "purpose_id": purpose_id,
                    "ip_address": ip_address,
                    "user_agent": user_agent,
                },
            )
            consent_id = inserted.mappings().first()["id"]

        await self._write_audit_log(
            user_id,
            purpose_id,
            consent_id,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return await self.user_consents(user_id)
