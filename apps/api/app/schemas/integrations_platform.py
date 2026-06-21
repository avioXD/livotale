from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class PlatformSettingsResponse(BaseModel):
    twilio_account_sid: str | None = Field(default=None, alias="twilioAccountSid")
    twilio_parent_account_sid: str | None = Field(default=None, alias="twilioParentAccountSid")
    twilio_auth_token: str | None = Field(default=None, alias="twilioAuthToken")
    twilio_messaging_service_sid: str | None = Field(default=None, alias="twilioMessagingServiceSid")
    twilio_from_number: str | None = Field(default=None, alias="twilioFromNumber")
    twilio_verify_service_sid: str | None = Field(default=None, alias="twilioVerifyServiceSid")
    sendgrid_api_key: str | None = Field(default=None, alias="sendgridApiKey")
    sendgrid_from_email: str | None = Field(default=None, alias="sendgridFromEmail")
    sendgrid_from_name: str | None = Field(default=None, alias="sendgridFromName")
    ai_provider: str | None = Field(default=None, alias="aiProvider")
    ai_api_key: str | None = Field(default=None, alias="aiApiKey")
    ai_model: str | None = Field(default=None, alias="aiModel")
    ai_base_url: str | None = Field(default=None, alias="aiBaseUrl")
    twilio_configured: bool = Field(default=False, alias="twilioConfigured")
    sendgrid_configured: bool = Field(default=False, alias="sendgridConfigured")
    ai_configured: bool = Field(default=False, alias="aiConfigured")
    updated_at: str | None = Field(default=None, alias="updatedAt")

    model_config = {"populate_by_name": True}


class UpdatePlatformSettingsInput(BaseModel):
    twilio_account_sid: str | None = Field(default=None, alias="twilioAccountSid")
    twilio_parent_account_sid: str | None = Field(default=None, alias="twilioParentAccountSid")
    twilio_auth_token: str | None = Field(default=None, alias="twilioAuthToken")
    twilio_messaging_service_sid: str | None = Field(default=None, alias="twilioMessagingServiceSid")
    twilio_from_number: str | None = Field(default=None, alias="twilioFromNumber")
    twilio_verify_service_sid: str | None = Field(default=None, alias="twilioVerifyServiceSid")
    sendgrid_api_key: str | None = Field(default=None, alias="sendgridApiKey")
    sendgrid_from_email: str | None = Field(default=None, alias="sendgridFromEmail")
    sendgrid_from_name: str | None = Field(default=None, alias="sendgridFromName")
    ai_provider: str | None = Field(default=None, alias="aiProvider")
    ai_api_key: str | None = Field(default=None, alias="aiApiKey")
    ai_model: str | None = Field(default=None, alias="aiModel")
    ai_base_url: str | None = Field(default=None, alias="aiBaseUrl")

    model_config = {"populate_by_name": True}


class TestSmsInput(BaseModel):
    phone: str
    template_code: str = Field(default="payment_link_sent", alias="templateCode")
    context: dict[str, Any] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}


class SmsTestLogEntry(BaseModel):
    id: UUID
    template: str | None = None
    recipient: str
    body: str | None = Field(default=None, alias="body")
    status: str
    provider_sid: str | None = Field(default=None, alias="providerSid")
    provider_status: str | None = Field(default=None, alias="providerStatus")
    sender_mode: str | None = Field(default=None, alias="senderMode")
    error: str | None = None
    sent_at: str = Field(alias="sentAt")

    model_config = {"populate_by_name": True}


class TwilioConfigTestResponse(BaseModel):
    ok: bool
    mode: str
    account_sid: str | None = Field(default=None, alias="accountSid")
    from_number: str | None = Field(default=None, alias="fromNumber")
    sender_mode: str | None = Field(default=None, alias="senderMode")
    account_name: str | None = Field(default=None, alias="accountName")
    error: str | None = None

    model_config = {"populate_by_name": True}


class TestEmailInput(BaseModel):
    email: str
    template_code: str = Field(default="payment_link_sent", alias="templateCode")
    context: dict[str, Any] = Field(default_factory=dict)

    model_config = {"populate_by_name": True}


class IntegrationStatusResponse(BaseModel):
    integrations_mode: str = Field(alias="integrationsMode")
    otp_mode: str = Field(alias="otpMode")
    twilio_configured: bool = Field(alias="twilioConfigured")
    sendgrid_configured: bool = Field(alias="sendgridConfigured")
    ai_configured: bool = Field(alias="aiConfigured")
    whatsapp_enabled: bool = Field(default=False, alias="whatsappEnabled")
    razorpay_enabled: bool = Field(default=False, alias="razorpayEnabled")

    model_config = {"populate_by_name": True}


class MessageTemplateResponse(BaseModel):
    id: UUID
    code: str
    name: str
    category: str
    channel: str
    subject_template: str = Field(alias="subjectTemplate")
    body_template: str = Field(alias="bodyTemplate")
    variables: list[str]
    is_active: bool = Field(alias="isActive")
    updated_at: str | None = Field(default=None, alias="updatedAt")

    model_config = {"populate_by_name": True}


class UpdateMessageTemplateInput(BaseModel):
    name: str | None = None
    subject_template: str | None = Field(default=None, alias="subjectTemplate")
    body_template: str | None = Field(default=None, alias="bodyTemplate")
    is_active: bool | None = Field(default=None, alias="isActive")

    model_config = {"populate_by_name": True}


class LetterheadTemplateResponse(BaseModel):
    id: UUID
    code: str
    name: str
    html_body: str | None = Field(default=None, alias="htmlBody")
    active: bool
    updated_at: str | None = Field(default=None, alias="updatedAt")

    model_config = {"populate_by_name": True}


class UpdateLetterheadTemplateInput(BaseModel):
    name: str | None = None
    html_body: str | None = Field(default=None, alias="htmlBody")
    active: bool | None = None

    model_config = {"populate_by_name": True}


class SendPaymentLinkInput(BaseModel):
    channels: list[str] = Field(default_factory=lambda: ["sms", "email"])

    model_config = {"populate_by_name": True}
