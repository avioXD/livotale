from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.core.exceptions import AppError
from app.domain.rbac import RoleCode
from app.integrations.s3 import S3Service
from app.integrations.s3_config import resolve_s3_config
from app.integrations.twilio_service import TwilioSmsService
from app.integrations.sendgrid_service import SendGridEmailService
from app.models.integration_platform import LetterheadTemplate
from app.schemas.common import DataEnvelope
from app.schemas.integrations_platform import (
    IntegrationStatusResponse,
    LetterheadTemplateResponse,
    MessageTemplateResponse,
    PlatformSettingsResponse,
    SmsTestLogEntry,
    S3ConfigTestResponse,
    TestEmailInput,
    TestSmsInput,
    UpdateLetterheadTemplateInput,
    UpdateMessageTemplateInput,
    UpdatePlatformSettingsInput,
    TwilioConfigTestResponse,
)
from app.services.appointment_notification_service import AppointmentNotificationService
from app.services.integration_settings_service import IntegrationSettingsService
from app.services.notification_dispatch_service import MessageTemplateService, NotificationDispatchService
from app.services.notification_service import NotificationService
from app.utils.phone import normalize_phone, to_twilio_e164

router = APIRouter(prefix="/admin/integrations", tags=["admin-integrations"])


def _require_super_admin(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if RoleCode.ADMIN not in user.effective_roles:
        raise AppError("Requires super admin role", status_code=403, error="forbidden")
    return user


def _require_template_editor(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if RoleCode.ADMIN not in user.effective_roles and RoleCode.CITY_MANAGER not in user.effective_roles:
        raise AppError("Requires admin role", status_code=403, error="forbidden")
    return user


def _settings_service(db: AsyncSession = Depends(get_db)) -> IntegrationSettingsService:
    return IntegrationSettingsService(db)


def _template_service(db: AsyncSession = Depends(get_db)) -> MessageTemplateService:
    return MessageTemplateService(db)


def _dispatch_service(db: AsyncSession = Depends(get_db)) -> NotificationDispatchService:
    return NotificationDispatchService(db)


def _notification_service(db: AsyncSession = Depends(get_db)) -> NotificationService:
    return NotificationService(db)


INTEGRATION_TEST_SMS_TRIGGER = "integration_test_sms"


def _is_phone_allowlisted(phone: str) -> bool:
    settings = get_settings()
    normalized = normalize_phone(phone)
    allowlist = {normalize_phone(p.strip()) for p in settings.notification_test_phone_allowlist.split(",") if p.strip()}
    return normalized in allowlist


@router.get("/status", response_model=DataEnvelope[IntegrationStatusResponse])
async def integration_status(
    _: CurrentUser = Depends(_require_template_editor),
    service: IntegrationSettingsService = Depends(_settings_service),
) -> DataEnvelope[IntegrationStatusResponse]:
    app_settings = get_settings()
    public = await service.get_public_settings()
    return DataEnvelope(
        data=IntegrationStatusResponse(
            integrationsMode=app_settings.effective_integrations_mode,
            otpMode=app_settings.effective_otp_mode,
            twilioConfigured=public["twilioConfigured"],
            sendgridConfigured=public["sendgridConfigured"],
            aiConfigured=public["aiConfigured"],
            s3Configured=public["s3Configured"],
            whatsappEnabled=False,
            razorpayEnabled=False,
        )
    )


@router.get("/settings", response_model=DataEnvelope[PlatformSettingsResponse])
async def get_settings_endpoint(
    user: CurrentUser = Depends(_require_super_admin),
    service: IntegrationSettingsService = Depends(_settings_service),
) -> DataEnvelope[PlatformSettingsResponse]:
    data = await service.get_public_settings()
    return DataEnvelope(data=PlatformSettingsResponse.model_validate(data))


@router.put("/settings", response_model=DataEnvelope[PlatformSettingsResponse])
async def update_settings_endpoint(
    body: UpdatePlatformSettingsInput,
    user: CurrentUser = Depends(_require_super_admin),
    service: IntegrationSettingsService = Depends(_settings_service),
) -> DataEnvelope[PlatformSettingsResponse]:
    payload = body.model_dump(by_alias=True, exclude_unset=True)
    data = await service.update_settings(payload, updated_by=user.user_id)
    return DataEnvelope(data=PlatformSettingsResponse.model_validate(data))


@router.post("/settings/test-config", response_model=DataEnvelope[TwilioConfigTestResponse])
async def test_twilio_config(
    _: CurrentUser = Depends(_require_super_admin),
    settings_svc: IntegrationSettingsService = Depends(_settings_service),
) -> DataEnvelope[TwilioConfigTestResponse]:
    sms = TwilioSmsService(settings_svc)
    try:
        result = await sms.verify_config()
        return DataEnvelope(data=TwilioConfigTestResponse.model_validate(result))
    except AppError as exc:
        return DataEnvelope(
            data=TwilioConfigTestResponse(ok=False, mode=get_settings().effective_integrations_mode, error=exc.message)
        )


@router.post("/settings/test-storage", response_model=DataEnvelope[S3ConfigTestResponse])
async def test_storage_config(
    _: CurrentUser = Depends(_require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> DataEnvelope[S3ConfigTestResponse]:
    config = await resolve_s3_config(db)
    s3 = S3Service(config)
    result = s3.test_connection()
    return DataEnvelope(data=S3ConfigTestResponse.model_validate(result))


@router.post("/settings/test-sms")
async def test_sms(
    body: TestSmsInput,
    user: CurrentUser = Depends(_require_super_admin),
    dispatch: NotificationDispatchService = Depends(_dispatch_service),
    settings_svc: IntegrationSettingsService = Depends(_settings_service),
    notifications: NotificationService = Depends(_notification_service),
) -> DataEnvelope[dict[str, Any]]:
    if not _is_phone_allowlisted(body.phone):
        raise AppError("Phone number is not in the test allowlist", status_code=403, error="forbidden")
    try:
        phone_e164 = to_twilio_e164(body.phone)
    except ValueError as exc:
        raise AppError(str(exc), status_code=400, error="validation_error") from exc
    rendered = await dispatch.render_for_test(body.template_code, "sms", body.context)
    sms = TwilioSmsService(settings_svc)

    async def _log(status: str, *, result: dict[str, Any] | None = None, error: str | None = None) -> None:
        payload: dict[str, Any] = {
            "body": rendered["body"],
            "sentByUserId": str(user.user_id),
            "test": True,
        }
        if result:
            payload.update(
                {
                    "providerSid": result.get("sid"),
                    "providerStatus": result.get("status"),
                    "senderMode": result.get("senderMode"),
                }
            )
        if error:
            payload["error"] = error
        await notifications._log_channel_send(
            channel="sms",
            recipient=phone_e164,
            template=body.template_code,
            status=status,
            trigger_event=INTEGRATION_TEST_SMS_TRIGGER,
            payload=payload,
        )

    try:
        result = await sms.send_sms(phone_e164, rendered["body"])
        status = "sent" if result.get("sid") else "failed"
        await _log(status, result=result)
        return DataEnvelope(data={"phone": phone_e164, "body": rendered["body"], **result})
    except AppError as exc:
        await _log("failed", error=exc.message)
        raise
    except Exception as exc:
        await _log("failed", error=str(exc))
        raise AppError(f"Twilio SMS failed: {exc}", status_code=502, error="provider_error") from exc


@router.get("/settings/sms-test-logs", response_model=DataEnvelope[list[SmsTestLogEntry]])
async def list_sms_test_logs(
    template_code: str | None = Query(default=None, alias="templateCode"),
    limit: int = Query(default=100, ge=1, le=500),
    _: CurrentUser = Depends(_require_super_admin),
    notifications: NotificationService = Depends(_notification_service),
) -> DataEnvelope[list[SmsTestLogEntry]]:
    rows = await notifications.list_channel_logs(
        channel="sms",
        template=template_code,
        trigger_event=INTEGRATION_TEST_SMS_TRIGGER,
        limit=limit,
    )
    entries: list[SmsTestLogEntry] = []
    for row in rows:
        payload = row.get("payload") or {}
        sent_at = row.get("sentAt")
        entries.append(
            SmsTestLogEntry(
                id=row["id"],
                template=row.get("template"),
                recipient=row["recipient"],
                body=payload.get("body"),
                status=row["status"],
                providerSid=payload.get("providerSid"),
                providerStatus=payload.get("providerStatus"),
                senderMode=payload.get("senderMode"),
                error=payload.get("error"),
                sentAt=sent_at.isoformat() if hasattr(sent_at, "isoformat") else str(sent_at),
            )
        )
    return DataEnvelope(data=entries)


@router.post("/settings/test-email")
async def test_email(
    body: TestEmailInput,
    user: CurrentUser = Depends(_require_super_admin),
    dispatch: NotificationDispatchService = Depends(_dispatch_service),
    settings_svc: IntegrationSettingsService = Depends(_settings_service),
) -> DataEnvelope[dict[str, Any]]:
    rendered = await dispatch.render_for_test(body.template_code, "email", body.context)
    email_svc = SendGridEmailService(settings_svc)
    result = await email_svc.send_email(body.email, rendered["subject"], rendered["body"])
    return DataEnvelope(data={"email": body.email, **rendered, **result})


@router.get("/message-templates", response_model=DataEnvelope[list[MessageTemplateResponse]])
async def list_message_templates(
    category: str | None = Query(default=None),
    _: CurrentUser = Depends(_require_template_editor),
    service: MessageTemplateService = Depends(_template_service),
) -> DataEnvelope[list[MessageTemplateResponse]]:
    rows = await service.list_templates(category=category)
    return DataEnvelope(data=[MessageTemplateResponse.model_validate(row) for row in rows])


@router.get("/message-templates/{code}", response_model=DataEnvelope[list[MessageTemplateResponse]])
async def get_message_templates_by_code(
    code: str,
    channel: str | None = Query(default=None),
    _: CurrentUser = Depends(_require_template_editor),
    service: MessageTemplateService = Depends(_template_service),
) -> DataEnvelope[list[MessageTemplateResponse]]:
    if channel:
        row = await service.get_template(code, channel)
        if not row:
            raise AppError("Template not found", status_code=404)
        return DataEnvelope(data=[MessageTemplateResponse.model_validate(row)])
    rows = [row for row in await service.list_templates() if row["code"] == code]
    if not rows:
        raise AppError("Template not found", status_code=404)
    return DataEnvelope(data=[MessageTemplateResponse.model_validate(row) for row in rows])


@router.put("/message-templates/{code}", response_model=DataEnvelope[MessageTemplateResponse])
async def update_message_template(
    code: str,
    body: UpdateMessageTemplateInput,
    channel: str = Query(default="in_app"),
    _: CurrentUser = Depends(_require_template_editor),
    service: MessageTemplateService = Depends(_template_service),
) -> DataEnvelope[MessageTemplateResponse]:
    row = await service.update_template(code, channel, body.model_dump(by_alias=True, exclude_none=True))
    return DataEnvelope(data=MessageTemplateResponse.model_validate(row))


@router.get("/pdf-templates", response_model=DataEnvelope[list[LetterheadTemplateResponse]])
async def list_pdf_templates(
    user: CurrentUser = Depends(_require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> DataEnvelope[list[LetterheadTemplateResponse]]:
    result = await db.execute(select(LetterheadTemplate).order_by(LetterheadTemplate.code))
    rows = [
        LetterheadTemplateResponse(
            id=row.id,
            code=row.code,
            name=row.name,
            htmlBody=row.html_body,
            active=row.active,
            updatedAt=row.updated_at.isoformat() if row.updated_at else None,
        )
        for row in result.scalars().all()
    ]
    return DataEnvelope(data=rows)


@router.put("/pdf-templates/{code}", response_model=DataEnvelope[LetterheadTemplateResponse])
async def update_pdf_template(
    code: str,
    body: UpdateLetterheadTemplateInput,
    user: CurrentUser = Depends(_require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> DataEnvelope[LetterheadTemplateResponse]:
    result = await db.execute(select(LetterheadTemplate).where(LetterheadTemplate.code == code))
    row = result.scalar_one_or_none()
    if not row:
        raise AppError("PDF template not found", status_code=404)
    if body.name is not None:
        row.name = body.name
    if body.html_body is not None:
        row.html_body = body.html_body
    if body.active is not None:
        row.active = body.active
    await db.flush()
    return DataEnvelope(
        data=LetterheadTemplateResponse(
            id=row.id,
            code=row.code,
            name=row.name,
            htmlBody=row.html_body,
            active=row.active,
            updatedAt=row.updated_at.isoformat() if row.updated_at else None,
        )
    )


@router.post("/appointments/{appointment_id}/remind")
async def manual_appointment_reminder(
    appointment_id: UUID,
    user: CurrentUser = Depends(_require_template_editor),
    db: AsyncSession = Depends(get_db),
) -> DataEnvelope[dict[str, Any]]:
    service = AppointmentNotificationService(db)
    data = await service.send_reminder(appointment_id, reminder_type="custom")
    return DataEnvelope(data=data)
