from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.config import Settings
from app.core.exceptions import AppError
from app.integrations.twilio_service import TwilioSmsService, TwilioVerifyService


def test_dev_app_env_enables_demo_modes() -> None:
    settings = Settings(app_env="dev")

    assert settings.is_dev is True
    assert settings.effective_otp_mode == "demo"
    assert settings.effective_integrations_mode == "dummy"


def test_non_dev_app_env_uses_live_modes() -> None:
    settings = Settings(app_env="production")

    assert settings.is_dev is False
    assert settings.effective_otp_mode == "live"
    assert settings.effective_integrations_mode == "live"


@pytest.mark.asyncio
async def test_dev_app_env_bypasses_sms_send() -> None:
    service = TwilioSmsService(settings=None, app_settings=Settings(app_env="dev"))

    result = await service.send_sms("+917001638349", "Hello")

    assert result["dummy"] is True
    assert result["sid"] == "dummy-sms"


@pytest.mark.asyncio
async def test_non_dev_app_env_requires_live_sms_credentials() -> None:
    integration_settings = MagicMock()
    integration_settings.get_twilio_credentials = AsyncMock(return_value=None)
    service = TwilioSmsService(settings=integration_settings, app_settings=Settings(app_env="production"))

    with pytest.raises(AppError) as exc_info:
        await service.send_sms("+917001638349", "Hello")

    assert "Twilio SMS is not configured" in str(exc_info.value)


@pytest.mark.asyncio
async def test_dev_app_env_bypasses_verify() -> None:
    service = TwilioVerifyService(settings=None, app_settings=Settings(app_env="dev"))

    send_result = await service.send_verification("+917001638349")
    approved = await service.check_verification("+917001638349", "123456")

    assert send_result["dummy"] is True
    assert approved is True
