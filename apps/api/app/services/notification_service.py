from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import get_redis
from app.core.exceptions import AppError
from app.utils.phone import normalize_phone

# UI AppRole -> identity role code
UI_ROLE_TO_API: dict[str, str] = {
    "PATIENT": "patient",
    "TECHNICIAN": "technician",
    "DOCTOR": "doctor",
    "DIETICIAN": "dietician",
    "HEALTH_COACH": "health_coach",
    "PHARMACY": "pharmacy",
    "LAB_PARTNER": "lab_partner",
    "OPERATIONS": "support",
    "CITY_MANAGER": "city_manager",
    "SUPER_ADMIN": "admin",
}

API_ROLE_TO_UI: dict[str, str] = {v: k for k, v in UI_ROLE_TO_API.items()}


def _inbox_row(row: dict[str, Any]) -> dict[str, Any]:
    target_roles: list[str] = []
    target_phone: str | None = None
    target_user_id: str | None = None
    if row["recipient_type"] == "role":
        ui_role = API_ROLE_TO_UI.get(row["recipient_id"], row["recipient_id"].upper())
        target_roles = [ui_role]
    elif row["recipient_type"] == "phone":
        target_phone = row["recipient_id"]
    elif row["recipient_type"] == "user":
        target_user_id = row["recipient_id"]

    return {
        "id": row["id"],
        "title": row["title"],
        "body": row["body"] or "",
        "category": row["category"],
        "channel": "in_app",
        "targetRoles": target_roles,
        "targetUserId": target_user_id,
        "orderId": row["order_id"],
        "targetPhone": target_phone,
        "triggerAction": row.get("trigger_action") or row["category"],
        "read": row["read_at"] is not None,
        "createdAt": row["created_at"],
    }


async def flush_in_app_notifications(db: AsyncSession, limit: int = 50) -> int:
    """Drain pending in-app outbox rows (inline after workflow events)."""
    return await NotificationService(db).process_pending_outbox(limit=limit)


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_for_role(self, role: str | None) -> list[dict[str, Any]]:
        if not role:
            return []
        api_role = UI_ROLE_TO_API.get(role.upper(), role.lower())
        result = await self.db.execute(
            text(
                """
                SELECT id, recipient_type, recipient_id, category, title, body,
                       order_id, read_at, created_at, trigger_action
                FROM audit.inbox_notifications
                WHERE recipient_type = 'role' AND recipient_id = :role
                ORDER BY created_at DESC
                LIMIT 200
                """
            ),
            {"role": api_role},
        )
        return [_inbox_row(dict(row)) for row in result.mappings().all()]

    async def list_for_user(self, user_id: UUID, role: str | None) -> list[dict[str, Any]]:
        seen: set[UUID] = set()
        merged: list[dict[str, Any]] = []
        for row in await self.list_for_role(role):
            row_id = row["id"]
            if row_id not in seen:
                seen.add(row_id)
                merged.append(row)

        result = await self.db.execute(
            text(
                """
                SELECT id, recipient_type, recipient_id, category, title, body,
                       order_id, read_at, created_at, trigger_action
                FROM audit.inbox_notifications
                WHERE recipient_type = 'user' AND recipient_id = :user_id
                ORDER BY created_at DESC
                LIMIT 200
                """
            ),
            {"user_id": str(user_id)},
        )
        for row in result.mappings().all():
            api_row = _inbox_row(dict(row))
            if api_row["id"] not in seen:
                seen.add(api_row["id"])
                merged.append(api_row)

        merged.sort(key=lambda item: item["createdAt"], reverse=True)
        return merged[:200]

    async def list_for_patient_phone(self, phone: str) -> list[dict[str, Any]]:
        normalized = normalize_phone(phone)
        result = await self.db.execute(
            text(
                """
                SELECT id, recipient_type, recipient_id, category, title, body,
                       order_id, read_at, created_at, trigger_action
                FROM audit.inbox_notifications
                WHERE recipient_type = 'phone' AND recipient_id = :phone
                ORDER BY created_at DESC
                LIMIT 200
                """
            ),
            {"phone": normalized},
        )
        return [_inbox_row(dict(row)) for row in result.mappings().all()]

    async def mark_read(
        self,
        notification_id: UUID,
        *,
        user_id: UUID | None = None,
        role: str | None = None,
    ) -> None:
        api_role = UI_ROLE_TO_API.get(role.upper(), role.lower()) if role else None
        ownership: list[str] = []
        params: dict[str, Any] = {"id": notification_id}
        if user_id:
            ownership.append("(recipient_type = 'user' AND recipient_id = :user_id)")
            params["user_id"] = str(user_id)
        if api_role:
            ownership.append("(recipient_type = 'role' AND recipient_id = :api_role)")
            params["api_role"] = api_role
        if not ownership:
            raise AppError("Notification not found", status_code=404)

        result = await self.db.execute(
            text(
                f"""
                UPDATE audit.inbox_notifications
                SET read_at = COALESCE(read_at, now())
                WHERE id = :id
                  AND ({' OR '.join(ownership)})
                RETURNING id
                """
            ),
            params,
        )
        if result.scalar_one_or_none() is None:
            raise AppError("Notification not found", status_code=404)

    async def mark_read_for_patient(self, notification_id: UUID, phone: str) -> None:
        normalized = normalize_phone(phone)
        result = await self.db.execute(
            text(
                """
                UPDATE audit.inbox_notifications
                SET read_at = COALESCE(read_at, now())
                WHERE id = :id
                  AND recipient_type = 'phone'
                  AND recipient_id = :phone
                RETURNING id
                """
            ),
            {"id": notification_id, "phone": normalized},
        )
        if result.scalar_one_or_none() is None:
            raise AppError("Notification not found", status_code=404)

    async def mark_all_read(self, role: str | None, user_id: UUID | None = None) -> None:
        if role:
            api_role = UI_ROLE_TO_API.get(role.upper(), role.lower())
            await self.db.execute(
                text(
                    """
                    UPDATE audit.inbox_notifications
                    SET read_at = COALESCE(read_at, now())
                    WHERE recipient_type = 'role' AND recipient_id = :role AND read_at IS NULL
                    """
                ),
                {"role": api_role},
            )
        if user_id:
            await self.db.execute(
                text(
                    """
                    UPDATE audit.inbox_notifications
                    SET read_at = COALESCE(read_at, now())
                    WHERE recipient_type = 'user' AND recipient_id = :user_id AND read_at IS NULL
                    """
                ),
                {"user_id": str(user_id)},
            )

    async def push_inbox(
        self,
        *,
        title: str,
        body: str,
        category: str,
        trigger_action: str,
        target_roles: list[str] | None = None,
        target_user_ids: list[UUID] | None = None,
        order_id: UUID | None = None,
        target_phone: str | None = None,
    ) -> list[dict[str, Any]]:
        created: list[dict[str, Any]] = []
        roles = target_roles or []
        if target_phone:
            row = await self._insert_inbox(
                recipient_type="phone",
                recipient_id=normalize_phone(target_phone),
                title=title,
                body=body,
                category=category,
                order_id=order_id,
                trigger_action=trigger_action,
            )
            created.append(row)
            await self._publish_ws(f"ws:patient-portal:{normalize_phone(target_phone)}", row)

        for ui_role in roles:
            api_role = UI_ROLE_TO_API.get(ui_role.upper(), ui_role.lower())
            row = await self._insert_inbox(
                recipient_type="role",
                recipient_id=api_role,
                title=title,
                body=body,
                category=category,
                order_id=order_id,
                trigger_action=trigger_action,
            )
            created.append(row)
            await self._publish_ws(f"ws:notifications:{api_role}", row)

        for user_id in target_user_ids or []:
            row = await self._insert_inbox(
                recipient_type="user",
                recipient_id=str(user_id),
                title=title,
                body=body,
                category=category,
                order_id=order_id,
                trigger_action=trigger_action,
            )
            created.append(row)
            await self._publish_ws(f"ws:notifications:user:{user_id}", row)

        if order_id:
            await self._publish_ws(f"ws:operations:orders:{order_id}", {"type": "notification", "items": created})
            await self._publish_ws(f"ws:technician:orders:{order_id}", {"type": "notification", "items": created})

        return created

    async def enqueue_outbox(
        self,
        *,
        channel: str,
        scope: str,
        scope_id: str,
        event_type: str,
        payload: dict[str, Any],
    ) -> UUID:
        order_id: UUID | None = None
        raw_order_id = payload.get("orderId")
        if raw_order_id:
            try:
                order_id = UUID(str(raw_order_id))
            except ValueError:
                order_id = None
        await self._log_channel_send(
            channel=channel,
            recipient=scope_id,
            template=event_type,
            status="queued",
            order_id=order_id,
            trigger_event=event_type,
            payload=payload,
        )
        result = await self.db.execute(
            text(
                """
                INSERT INTO audit.notification_outbox (channel, scope, scope_id, event_type, payload)
                VALUES (:channel, :scope, :scope_id, :event_type, CAST(:payload AS jsonb))
                RETURNING id
                """
            ),
            {
                "channel": channel,
                "scope": scope,
                "scope_id": scope_id,
                "event_type": event_type,
                "payload": json.dumps(payload),
            },
        )
        return result.mappings().first()["id"]

    async def notify_ops(self, title: str, body: str, trigger_action: str, order_id: UUID | None = None) -> None:
        await self.enqueue_outbox(
            channel="in_app",
            scope="role",
            scope_id="support",
            event_type=trigger_action,
            payload={
                "title": title,
                "body": body,
                "category": "order",
                "triggerAction": trigger_action,
                "targetRoles": ["OPERATIONS", "CITY_MANAGER", "SUPER_ADMIN"],
                "orderId": str(order_id) if order_id else None,
            },
        )

    async def notify_technician(self, title: str, body: str, trigger_action: str, order_id: UUID | None = None) -> None:
        await self.enqueue_outbox(
            channel="in_app",
            scope="role",
            scope_id="technician",
            event_type=trigger_action,
            payload={
                "title": title,
                "body": body,
                "category": "scan",
                "triggerAction": trigger_action,
                "targetRoles": ["TECHNICIAN"],
                "orderId": str(order_id) if order_id else None,
            },
        )

    async def notify_doctor(self, title: str, body: str, trigger_action: str, order_id: UUID | None = None) -> None:
        await self.enqueue_outbox(
            channel="in_app",
            scope="role",
            scope_id="doctor",
            event_type=trigger_action,
            payload={
                "title": title,
                "body": body,
                "category": "consultation",
                "triggerAction": trigger_action,
                "targetRoles": ["DOCTOR"],
                "orderId": str(order_id) if order_id else None,
            },
        )

    async def notify_patient(
        self,
        phone: str,
        title: str,
        body: str,
        trigger_action: str,
        order_id: UUID | None = None,
    ) -> None:
        await self.enqueue_outbox(
            channel="in_app",
            scope="phone",
            scope_id=normalize_phone(phone),
            event_type=trigger_action,
            payload={
                "title": title,
                "body": body,
                "category": "order",
                "triggerAction": trigger_action,
                "targetPhone": normalize_phone(phone),
                "orderId": str(order_id) if order_id else None,
            },
        )

    async def process_pending_outbox(self, limit: int = 50) -> int:
        result = await self.db.execute(
            text(
                """
                SELECT id, channel, scope, scope_id, event_type, payload
                FROM audit.notification_outbox
                WHERE status = 'pending'
                ORDER BY created_at ASC
                LIMIT :limit
                FOR UPDATE SKIP LOCKED
                """
            ),
            {"limit": limit},
        )
        rows = result.mappings().all()
        processed = 0
        for row in rows:
            payload = row["payload"] or {}
            order_id = payload.get("orderId")
            target_user_ids: list[UUID] = []
            for raw_user_id in payload.get("targetUserIds") or []:
                try:
                    target_user_ids.append(UUID(str(raw_user_id)))
                except ValueError:
                    continue
            await self.push_inbox(
                title=payload.get("title", row["event_type"]),
                body=payload.get("body", ""),
                category=payload.get("category", "system"),
                trigger_action=payload.get("triggerAction", row["event_type"]),
                target_roles=payload.get("targetRoles"),
                target_user_ids=target_user_ids or None,
                order_id=UUID(order_id) if order_id else None,
                target_phone=payload.get("targetPhone"),
            )
            await self.db.execute(
                text(
                    """
                    UPDATE audit.notification_outbox
                    SET status = 'processed', processed_at = :processed_at
                    WHERE id = :id
                    """
                ),
                {"id": row["id"], "processed_at": datetime.now(UTC)},
            )
            processed += 1
        return processed

    async def list_channel_logs(
        self,
        *,
        order_id: UUID | None = None,
        channel: str | None = None,
        template: str | None = None,
        trigger_event: str | None = None,
        limit: int = 200,
    ) -> list[dict[str, Any]]:
        conditions = ["1=1"]
        params: dict[str, Any] = {"limit": limit}
        if order_id:
            conditions.append("order_id = :order_id")
            params["order_id"] = order_id
        if channel:
            conditions.append("channel = :channel")
            params["channel"] = channel
        if template:
            conditions.append("template = :template")
            params["template"] = template
        if trigger_event:
            conditions.append("trigger_event = :trigger_event")
            params["trigger_event"] = trigger_event

        where_clause = " AND ".join(conditions)
        result = await self.db.execute(
            text(
                f"""
                SELECT id, channel, template, recipient, payload, status,
                       order_id, patient_id, trigger_event, sent_at
                FROM integrations.notifications_log
                WHERE {where_clause}
                ORDER BY sent_at DESC
                LIMIT :limit
                """
            ),
            params,
        )
        rows: list[dict[str, Any]] = []
        for row in result.mappings().all():
            payload = row["payload"] or {}
            rows.append(
                {
                    "id": row["id"],
                    "channel": row["channel"],
                    "template": row["template"] or row["trigger_event"] or "",
                    "recipient": row["recipient"],
                    "payload": payload if isinstance(payload, dict) else {},
                    "status": row["status"],
                    "sentAt": row["sent_at"],
                    "orderId": row["order_id"],
                    "patientId": row["patient_id"],
                    "triggerEvent": row["trigger_event"],
                }
            )
        return rows

    async def _log_channel_send(
        self,
        *,
        channel: str,
        recipient: str,
        template: str,
        status: str,
        order_id: UUID | None = None,
        patient_id: UUID | None = None,
        trigger_event: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> None:
        await self.db.execute(
            text(
                """
                INSERT INTO integrations.notifications_log
                  (channel, template, recipient, payload, status, order_id, patient_id, trigger_event)
                VALUES
                  (:channel, :template, :recipient, CAST(:payload AS jsonb), :status,
                   :order_id, :patient_id, :trigger_event)
                """
            ),
            {
                "channel": channel,
                "template": template,
                "recipient": recipient,
                "payload": json.dumps(payload or {}),
                "status": status,
                "order_id": order_id,
                "patient_id": patient_id,
                "trigger_event": trigger_event,
            },
        )

    async def _insert_inbox(
        self,
        *,
        recipient_type: str,
        recipient_id: str,
        title: str,
        body: str,
        category: str,
        order_id: UUID | None,
        trigger_action: str,
    ) -> dict[str, Any]:
        result = await self.db.execute(
            text(
                """
                INSERT INTO audit.inbox_notifications
                  (recipient_type, recipient_id, category, title, body, order_id, trigger_action)
                VALUES
                  (:recipient_type, :recipient_id, :category, :title, :body, :order_id, :trigger_action)
                RETURNING id, recipient_type, recipient_id, category, title, body,
                          order_id, read_at, created_at, trigger_action
                """
            ),
            {
                "recipient_type": recipient_type,
                "recipient_id": recipient_id,
                "category": category,
                "title": title,
                "body": body,
                "order_id": order_id,
                "trigger_action": trigger_action,
            },
        )
        row = dict(result.mappings().first())
        return _inbox_row(row)

    async def _publish_ws(self, channel: str, payload: dict[str, Any]) -> None:
        try:
            redis = get_redis()
            await redis.publish(channel, json.dumps(payload, default=str))
        except RuntimeError:
            pass
