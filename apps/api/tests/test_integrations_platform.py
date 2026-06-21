from __future__ import annotations

import base64
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.integration_encryption import decrypt_secret, encrypt_secret, mask_secret
from app.domain.pdf_templates import PRESCRIPTION_LETTERHEAD_CODE, REPORT_LETTERHEAD_CODE
from app.integrations.twilio_service import TwilioSmsService
from app.services.template_render_service import TemplateRenderService


@pytest.fixture(autouse=True)
def _encryption_key(monkeypatch: pytest.MonkeyPatch) -> None:
    key = base64.urlsafe_b64encode(b"0" * 32).decode()
    monkeypatch.setenv("INTEGRATIONS_ENCRYPTION_KEY", key)


def test_encrypt_decrypt_round_trip() -> None:
    blob = encrypt_secret("twilio-secret-token")
    assert decrypt_secret(blob) == "twilio-secret-token"


def test_mask_secret() -> None:
    assert mask_secret("abcdefghij") == "••••ghij"


def test_template_render_replaces_variables() -> None:
    renderer = TemplateRenderService()
    body = renderer.render(
        "Hello {{patientName}}, pay ₹{{amount}} for {{orderNumber}}.",
        {"patientName": "Raj", "amount": "100", "orderNumber": "ORD-1"},
    )
    assert "Raj" in body
    assert "ORD-1" in body


def test_pdf_template_codes_are_stable() -> None:
    assert REPORT_LETTERHEAD_CODE == "default-letterhead"
    assert PRESCRIPTION_LETTERHEAD_CODE == "default-rx"


@pytest.mark.asyncio
async def test_twilio_sms_prefers_messaging_service() -> None:
    settings = MagicMock()
    settings.get_twilio_credentials = AsyncMock(
        return_value={
            "account_sid": "AC123",
            "auth_token": "secret",
            "messaging_service_sid": "MG123",
            "from_number": "+12567805633",
        }
    )
    app_settings = MagicMock(effective_integrations_mode="live")
    service = TwilioSmsService(settings, app_settings=app_settings)

    with patch("app.integrations.twilio_service.build_twilio_client") as build_client:
        message = MagicMock(sid="SM123", status="queued")
        build_client.return_value.messages.create.return_value = message
        result = await service.send_sms("+917001638349", "Hello")

    create_kwargs = build_client.return_value.messages.create.call_args.kwargs
    assert create_kwargs["messaging_service_sid"] == "MG123"
    assert "from_" not in create_kwargs
    assert result["senderMode"] == "messaging_service"


@pytest.mark.asyncio
async def test_twilio_sms_falls_back_to_from_number() -> None:
    settings = MagicMock()
    settings.get_twilio_credentials = AsyncMock(
        return_value={
            "account_sid": "AC123",
            "auth_token": "secret",
            "from_number": "+12567805633",
        }
    )
    app_settings = MagicMock(effective_integrations_mode="live")
    service = TwilioSmsService(settings, app_settings=app_settings)

    with patch("app.integrations.twilio_service.build_twilio_client") as build_client:
        message = MagicMock(sid="SM456", status="queued")
        build_client.return_value.messages.create.return_value = message
        result = await service.send_sms("+917001638349", "Hello")

    create_kwargs = build_client.return_value.messages.create.call_args.kwargs
    assert create_kwargs["from_"] == "+12567805633"
    assert "messaging_service_sid" not in create_kwargs
    assert result["senderMode"] == "from_number"
