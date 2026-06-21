from __future__ import annotations

from typing import Any

from app.core.config import Settings, get_settings
from app.core.exceptions import AppError
from app.integrations.twilio_client import build_twilio_client, twilio_account_sid_for_api
from app.services.integration_settings_service import IntegrationSettingsService


class TwilioSmsService:
    def __init__(self, settings: IntegrationSettingsService, app_settings: Settings | None = None):
        self.settings = settings
        self.app_settings = app_settings or get_settings()

    async def send_sms(self, to: str, body: str) -> dict[str, Any]:
        if self.app_settings.effective_integrations_mode == "dummy":
            return {"sid": "dummy-sms", "status": "queued", "dummy": True}

        creds = await self.settings.get_twilio_credentials()
        if not creds:
            raise AppError("Twilio SMS is not configured", status_code=503, error="not_configured")

        has_sender = creds.get("messaging_service_sid") or creds.get("from_number")
        if not has_sender:
            raise AppError(
                "Configure Twilio Messaging Service SID or From phone number",
                status_code=503,
                error="not_configured",
            )

        client = build_twilio_client(creds)
        create_kwargs: dict[str, Any] = {"to": to, "body": body}
        if creds.get("messaging_service_sid"):
            create_kwargs["messaging_service_sid"] = creds["messaging_service_sid"]
        else:
            create_kwargs["from_"] = creds["from_number"]

        try:
            message = client.messages.create(**create_kwargs)
        except Exception as exc:
            raise AppError(f"Twilio SMS failed: {exc}", status_code=502, error="provider_error") from exc

        return {"sid": message.sid, "status": message.status, "senderMode": "messaging_service" if creds.get("messaging_service_sid") else "from_number"}

    async def verify_config(self) -> dict[str, Any]:
        if self.app_settings.effective_integrations_mode == "dummy":
            return {
                "ok": True,
                "mode": "dummy",
                "senderMode": "dummy",
                "accountName": "Dummy Twilio",
            }

        creds = await self.settings.get_twilio_credentials()
        if not creds:
            raise AppError("Twilio is not configured", status_code=503, error="not_configured")

        has_sender = creds.get("messaging_service_sid") or creds.get("from_number")
        if not has_sender:
            raise AppError("Configure a From phone number to send SMS", status_code=503, error="not_configured")

        client = build_twilio_client(creds)
        api_account_sid = twilio_account_sid_for_api(creds)
        account_name = "Twilio"
        if creds["account_sid"].startswith("SK"):
            account_name = "Twilio API Key"
        else:
            try:
                account = client.api.accounts(api_account_sid).fetch()
                account_name = account.friendly_name
            except Exception as exc:
                raise AppError(f"Twilio credentials invalid: {exc}", status_code=502, error="provider_error") from exc

        sender_mode = "messaging_service" if creds.get("messaging_service_sid") else "from_number"
        return {
            "ok": True,
            "mode": "live",
            "accountSid": api_account_sid,
            "fromNumber": creds.get("from_number"),
            "senderMode": sender_mode,
            "accountName": account_name,
        }


class TwilioVerifyService:
    def __init__(self, settings: IntegrationSettingsService, app_settings: Settings | None = None):
        self.settings = settings
        self.app_settings = app_settings or get_settings()

    async def send_verification(self, phone: str) -> dict[str, Any]:
        if self.app_settings.effective_otp_mode == "demo" or self.app_settings.effective_integrations_mode == "dummy":
            return {"sid": "dummy-verify", "status": "pending", "dummy": True}

        creds = await self.settings.get_twilio_credentials()
        if not creds or not creds.get("verify_service_sid"):
            raise AppError(
                "SMS OTP is not configured. Ask an administrator to configure Twilio Verify.",
                status_code=503,
                error="not_configured",
            )

        client = build_twilio_client(creds)
        try:
            verification = client.verify.v2.services(creds["verify_service_sid"]).verifications.create(
                to=phone,
                channel="sms",
            )
        except Exception as exc:
            raise AppError(f"Twilio Verify failed: {exc}", status_code=502, error="provider_error") from exc
        return {"sid": verification.sid, "status": verification.status}

    async def check_verification(self, phone: str, code: str) -> bool:
        if self.app_settings.effective_otp_mode == "demo" or self.app_settings.effective_integrations_mode == "dummy":
            return code == "123456"

        creds = await self.settings.get_twilio_credentials()
        if not creds or not creds.get("verify_service_sid"):
            raise AppError(
                "SMS OTP is not configured. Ask an administrator to configure Twilio Verify.",
                status_code=503,
                error="not_configured",
            )

        client = build_twilio_client(creds)
        try:
            check = client.verify.v2.services(creds["verify_service_sid"]).verification_checks.create(
                to=phone,
                code=code,
            )
        except Exception as exc:
            raise AppError(f"Twilio Verify check failed: {exc}", status_code=502, error="provider_error") from exc
        return check.status == "approved"
