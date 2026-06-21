from __future__ import annotations

from typing import Any

from app.core.config import Settings, get_settings
from app.core.exceptions import AppError
from app.services.integration_settings_service import IntegrationSettingsService


class SendGridEmailService:
    def __init__(self, settings: IntegrationSettingsService, app_settings: Settings | None = None):
        self.settings = settings
        self.app_settings = app_settings or get_settings()

    async def send_email(
        self,
        to: str,
        subject: str,
        body_html: str,
        *,
        body_text: str | None = None,
    ) -> dict[str, Any]:
        if self.app_settings.effective_integrations_mode == "dummy":
            return {"status": "queued", "dummy": True}

        creds = await self.settings.get_sendgrid_credentials()
        if not creds:
            raise AppError("SendGrid is not configured", status_code=503, error="not_configured")

        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Content, Email, Mail, To

        message = Mail(
            from_email=Email(creds["from_email"], creds["from_name"]),
            to_emails=To(to),
            subject=subject,
            plain_text_content=Content("text/plain", body_text or body_html),
            html_content=Content("text/html", body_html),
        )
        client = SendGridAPIClient(creds["api_key"])
        try:
            response = client.send(message)
        except Exception as exc:
            raise AppError(f"SendGrid failed: {exc}", status_code=502, error="provider_error") from exc
        return {"status": response.status_code}
