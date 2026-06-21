from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import AppError
from app.integrations.sendgrid_service import SendGridEmailService
from app.integrations.twilio_service import TwilioSmsService
from app.models.integration_platform import MessageTemplate
from app.services.integration_settings_service import IntegrationSettingsService
from app.services.notification_service import NotificationService, UI_ROLE_TO_API
from app.services.template_render_service import TemplateRenderService
from app.utils.phone import normalize_phone


class MessageTemplateService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.renderer = TemplateRenderService()

    async def list_templates(self, *, category: str | None = None) -> list[dict[str, Any]]:
        query = select(MessageTemplate).order_by(MessageTemplate.category, MessageTemplate.code, MessageTemplate.channel)
        if category:
            query = query.where(MessageTemplate.category == category)
        result = await self.db.execute(query)
        return [self._to_api(row) for row in result.scalars().all()]

    async def get_template(self, code: str, channel: str | None = None) -> dict[str, Any] | None:
        query = select(MessageTemplate).where(MessageTemplate.code == code)
        if channel:
            query = query.where(MessageTemplate.channel == channel)
        result = await self.db.execute(query)
        row = result.scalars().first()
        return self._to_api(row) if row else None

    async def get_active_template(self, code: str, channel: str) -> MessageTemplate | None:
        result = await self.db.execute(
            select(MessageTemplate).where(
                MessageTemplate.code == code,
                MessageTemplate.channel == channel,
                MessageTemplate.is_active.is_(True),
            )
        )
        return result.scalars().first()

    async def update_template(self, code: str, channel: str, payload: dict[str, Any]) -> dict[str, Any]:
        result = await self.db.execute(
            select(MessageTemplate).where(MessageTemplate.code == code, MessageTemplate.channel == channel)
        )
        row = result.scalar_one_or_none()
        if not row:
            raise AppError(f"Template not found: {code}/{channel}", status_code=404)
        if payload.get("name") is not None:
            row.name = payload["name"]
        if payload.get("subjectTemplate") is not None:
            row.subject_template = payload["subjectTemplate"]
        if payload.get("bodyTemplate") is not None:
            row.body_template = payload["bodyTemplate"]
        if payload.get("isActive") is not None:
            row.is_active = payload["isActive"]
        await self.db.flush()
        return self._to_api(row)

    @staticmethod
    def _to_api(row: MessageTemplate) -> dict[str, Any]:
        variables = row.variables if isinstance(row.variables, list) else []
        return {
            "id": row.id,
            "code": row.code,
            "name": row.name,
            "category": row.category,
            "channel": row.channel,
            "subjectTemplate": row.subject_template or "",
            "bodyTemplate": row.body_template,
            "variables": variables,
            "isActive": row.is_active,
            "updatedAt": row.updated_at.isoformat() if row.updated_at else None,
        }


class NotificationDispatchService:
    """Unified multi-channel notification dispatcher."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.templates = MessageTemplateService(db)
        self.renderer = TemplateRenderService()
        self.notifications = NotificationService(db)
        self.settings = IntegrationSettingsService(db)
        self.sms = TwilioSmsService(self.settings)
        self.email = SendGridEmailService(self.settings)
        self.app_settings = get_settings()

    async def dispatch(
        self,
        trigger_action: str,
        *,
        context: dict[str, Any],
        channels: list[str],
        recipient_phone: str | None = None,
        recipient_email: str | None = None,
        target_roles: list[str] | None = None,
        target_user_ids: list[UUID] | None = None,
        order_id: UUID | None = None,
        patient_id: UUID | None = None,
    ) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        for channel in channels:
            result = await self._dispatch_channel(
                trigger_action,
                channel=channel,
                context=context,
                recipient_phone=recipient_phone,
                recipient_email=recipient_email,
                target_roles=target_roles,
                target_user_ids=target_user_ids,
                order_id=order_id,
                patient_id=patient_id,
            )
            if result:
                results.append(result)
        if "in_app" in channels:
            await self.notifications.process_pending_outbox(limit=50)
        return results

    async def _dispatch_channel(
        self,
        trigger_action: str,
        *,
        channel: str,
        context: dict[str, Any],
        recipient_phone: str | None,
        recipient_email: str | None,
        target_roles: list[str] | None,
        target_user_ids: list[UUID] | None,
        order_id: UUID | None,
        patient_id: UUID | None,
    ) -> dict[str, Any] | None:
        if channel == "whatsapp":
            await self.notifications._log_channel_send(
                channel="whatsapp",
                recipient=recipient_phone or "unknown",
                template=trigger_action,
                status="skipped",
                order_id=order_id,
                patient_id=patient_id,
                trigger_event=trigger_action,
                payload={"reason": "whatsapp_not_implemented", **context},
            )
            return {"channel": "whatsapp", "status": "skipped"}

        template = await self.templates.get_active_template(trigger_action, channel)
        if not template:
            recipient = recipient_phone or recipient_email or (target_roles[0] if target_roles else "unknown")
            await self.notifications._log_channel_send(
                channel=channel,
                recipient=recipient,
                template=trigger_action,
                status="failed",
                order_id=order_id,
                patient_id=patient_id,
                trigger_event=trigger_action,
                payload={"error": "template_not_found", "triggerAction": trigger_action, "channel": channel},
            )
            return {"channel": channel, "status": "failed", "error": f"Template not found: {trigger_action}/{channel}"}

        subject = self.renderer.render(template.subject_template, context)
        body = self.renderer.render(template.body_template, context)

        if channel == "in_app":
            user_ids = [str(user_id) for user_id in (target_user_ids or [])]
            if target_user_ids:
                scope = "user"
                scope_id = str(target_user_ids[0])
            elif target_roles:
                scope = "role"
                scope_id = UI_ROLE_TO_API.get(target_roles[0].upper(), target_roles[0].lower())
            else:
                scope = "phone"
                scope_id = normalize_phone(recipient_phone or "")
            await self.notifications.enqueue_outbox(
                channel="in_app",
                scope=scope,
                scope_id=scope_id,
                event_type=trigger_action,
                payload={
                    "title": subject or template.name,
                    "body": body,
                    "category": template.category,
                    "triggerAction": trigger_action,
                    "targetRoles": target_roles,
                    "targetUserIds": user_ids,
                    "targetPhone": normalize_phone(recipient_phone) if recipient_phone else None,
                    "orderId": str(order_id) if order_id else None,
                },
            )
            return {"channel": "in_app", "status": "queued"}

        if channel == "sms":
            phone = normalize_phone(recipient_phone or "")
            if not phone:
                return {"channel": "sms", "status": "failed", "error": "missing_phone"}
            try:
                send_result = await self.sms.send_sms(phone, body)
                status = "sent" if send_result.get("dummy") or send_result.get("sid") else "failed"
                await self.notifications._log_channel_send(
                    channel="sms",
                    recipient=phone,
                    template=trigger_action,
                    status=status,
                    order_id=order_id,
                    patient_id=patient_id,
                    trigger_event=trigger_action,
                    payload={"providerRef": send_result.get("sid"), **context},
                )
                return {"channel": "sms", "status": status, **send_result}
            except AppError as exc:
                await self.notifications._log_channel_send(
                    channel="sms",
                    recipient=phone,
                    template=trigger_action,
                    status="failed",
                    order_id=order_id,
                    patient_id=patient_id,
                    trigger_event=trigger_action,
                    payload={"error": exc.message},
                )
                return {"channel": "sms", "status": "failed", "error": exc.message}
            except Exception as exc:
                await self.notifications._log_channel_send(
                    channel="sms",
                    recipient=phone,
                    template=trigger_action,
                    status="failed",
                    order_id=order_id,
                    patient_id=patient_id,
                    trigger_event=trigger_action,
                    payload={"error": str(exc)},
                )
                return {"channel": "sms", "status": "failed", "error": str(exc)}

        if channel == "email":
            email = (recipient_email or "").strip()
            if not email:
                return {"channel": "email", "status": "failed", "error": "missing_email"}
            try:
                send_result = await self.email.send_email(email, subject or template.name, body)
                status = "sent" if send_result.get("dummy") or send_result.get("status") else "failed"
                await self.notifications._log_channel_send(
                    channel="email",
                    recipient=email,
                    template=trigger_action,
                    status=status,
                    order_id=order_id,
                    patient_id=patient_id,
                    trigger_event=trigger_action,
                    payload={**context},
                )
                return {"channel": "email", "status": status, **send_result}
            except AppError as exc:
                await self.notifications._log_channel_send(
                    channel="email",
                    recipient=email,
                    template=trigger_action,
                    status="failed",
                    order_id=order_id,
                    patient_id=patient_id,
                    trigger_event=trigger_action,
                    payload={"error": exc.message},
                )
                return {"channel": "email", "status": "failed", "error": exc.message}
            except Exception as exc:
                await self.notifications._log_channel_send(
                    channel="email",
                    recipient=email,
                    template=trigger_action,
                    status="failed",
                    order_id=order_id,
                    patient_id=patient_id,
                    trigger_event=trigger_action,
                    payload={"error": str(exc)},
                )
                return {"channel": "email", "status": "failed", "error": str(exc)}

        return None

    async def render_for_test(self, code: str, channel: str, context: dict[str, Any]) -> dict[str, str]:
        template = await self.templates.get_active_template(code, channel)
        if not template:
            raise AppError(f"Template not found: {code}/{channel}", status_code=404)
        merged = {**self.renderer.sample_context(list(template.variables or [])), **context}
        return {
            "subject": self.renderer.render(template.subject_template, merged),
            "body": self.renderer.render(template.body_template, merged),
        }
