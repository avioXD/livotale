from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class AuditService:
    """Write auth and activity audit trails (matches legacy auditService.js format)."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def log_login(
        self,
        *,
        user_id: UUID | None = None,
        identifier: str | None = None,
        login_method: str = "password",
        success: bool,
        failure_reason: str | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
        session_id: UUID | None = None,
    ) -> None:
        await self.db.execute(
            text(
                """
                INSERT INTO identity.login_logs
                  (user_id, identifier_used, login_method, success, failure_reason,
                   ip_address, user_agent, session_id)
                VALUES
                  (:user_id, :identifier, :login_method, :success, :failure_reason,
                   CAST(:ip_address AS inet), :user_agent, :session_id)
                """
            ),
            {
                "user_id": user_id,
                "identifier": identifier,
                "login_method": login_method,
                "success": success,
                "failure_reason": failure_reason,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "session_id": session_id,
            },
        )

    async def log_activity(
        self,
        user_id: UUID | None,
        action: str,
        *,
        entity_type: str | None = None,
        entity_id: UUID | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        await self.db.execute(
            text(
                """
                INSERT INTO audit.activity_logs
                  (user_id, action, entity_type, entity_id, ip_address, user_agent, metadata)
                VALUES
                  (:user_id, :action, :entity_type, :entity_id,
                   CAST(:ip_address AS inet), :user_agent, CAST(:metadata AS jsonb))
                """
            ),
            {
                "user_id": user_id,
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "ip_address": ip_address,
                "user_agent": user_agent,
                "metadata": json.dumps(metadata or {}),
            },
        )
