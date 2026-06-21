from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

ConfigSource = Literal["database", "env"]


class PlatformSettingsResponse(BaseModel):
    twilio_account_sid: str | None = Field(default=None, alias="twilioAccountSid")
    twilio_parent_account_sid: str | None = Field(default=None, alias="twilioParentAccountSid")
    twilio_auth_token: str | None = Field(default=None, alias="twilioAuthToken")
    twilio_messaging_service_sid: str | None = Field(default=None, alias="twilioMessagingServiceSid")
    twilio_from_number: str | None = Field(default=None, alias="twilioFromNumber")
    twilio_verify_service_sid: str | None = Field(default=None, alias="twilioVerifyServiceSid")
    twilio_config_source: ConfigSource = Field(default="database", alias="twilioConfigSource")
    twilio_missing_fields: list[str] = Field(default_factory=list, alias="twilioMissingFields")
    sendgrid_api_key: str | None = Field(default=None, alias="sendgridApiKey")
    sendgrid_from_email: str | None = Field(default=None, alias="sendgridFromEmail")
    sendgrid_from_name: str | None = Field(default=None, alias="sendgridFromName")
    sendgrid_config_source: ConfigSource = Field(default="database", alias="sendgridConfigSource")
    sendgrid_missing_fields: list[str] = Field(default_factory=list, alias="sendgridMissingFields")
    ai_provider: str | None = Field(default=None, alias="aiProvider")
    ai_api_key: str | None = Field(default=None, alias="aiApiKey")
    ai_model: str | None = Field(default=None, alias="aiModel")
    ai_base_url: str | None = Field(default=None, alias="aiBaseUrl")
    ai_config_source: ConfigSource = Field(default="database", alias="aiConfigSource")
    ai_missing_fields: list[str] = Field(default_factory=list, alias="aiMissingFields")
    twilio_configured: bool = Field(default=False, alias="twilioConfigured")
    sendgrid_configured: bool = Field(default=False, alias="sendgridConfigured")
    ai_configured: bool = Field(default=False, alias="aiConfigured")
    payment_upi_id: str | None = Field(default=None, alias="paymentUpiId")
    payment_qr_file_id: str | None = Field(default=None, alias="paymentQrFileId")
    payment_qr_url: str | None = Field(default=None, alias="paymentQrUrl")
    payment_payee_name: str | None = Field(default=None, alias="paymentPayeeName")
    payment_configured: bool = Field(default=False, alias="paymentConfigured")
    s3_bucket: str | None = Field(default=None, alias="s3Bucket")
    s3_region: str | None = Field(default=None, alias="s3Region")
    s3_key_prefix: str | None = Field(default=None, alias="s3KeyPrefix")
    s3_endpoint: str | None = Field(default=None, alias="s3Endpoint")
    s3_public_endpoint: str | None = Field(default=None, alias="s3PublicEndpoint")
    s3_access_key_id: str | None = Field(default=None, alias="s3AccessKeyId")
    s3_secret_access_key: str | None = Field(default=None, alias="s3SecretAccessKey")
    s3_config_source: ConfigSource = Field(default="env", alias="s3ConfigSource")
    s3_missing_fields: list[str] = Field(default_factory=list, alias="s3MissingFields")
    s3_configured: bool = Field(default=False, alias="s3Configured")
    updated_at: str | None = Field(default=None, alias="updatedAt")

    model_config = {"populate_by_name": True}


class PatientPaymentConfigResponse(BaseModel):
    upi_id: str | None = Field(default=None, alias="upiId")
    qr_image_url: str | None = Field(default=None, alias="qrImageUrl")
    payee_name: str | None = Field(default=None, alias="payeeName")

    model_config = {"populate_by_name": True}


class UpdatePlatformSettingsInput(BaseModel):
    twilio_config_source: ConfigSource | None = Field(default=None, alias="twilioConfigSource")
    twilio_account_sid: str | None = Field(default=None, alias="twilioAccountSid")
    twilio_parent_account_sid: str | None = Field(default=None, alias="twilioParentAccountSid")
    twilio_auth_token: str | None = Field(default=None, alias="twilioAuthToken")
    twilio_messaging_service_sid: str | None = Field(default=None, alias="twilioMessagingServiceSid")
    twilio_from_number: str | None = Field(default=None, alias="twilioFromNumber")
    twilio_verify_service_sid: str | None = Field(default=None, alias="twilioVerifyServiceSid")
    sendgrid_config_source: ConfigSource | None = Field(default=None, alias="sendgridConfigSource")
    sendgrid_api_key: str | None = Field(default=None, alias="sendgridApiKey")
    sendgrid_from_email: str | None = Field(default=None, alias="sendgridFromEmail")
    sendgrid_from_name: str | None = Field(default=None, alias="sendgridFromName")
    ai_config_source: ConfigSource | None = Field(default=None, alias="aiConfigSource")
    ai_provider: str | None = Field(default=None, alias="aiProvider")
    ai_api_key: str | None = Field(default=None, alias="aiApiKey")
    ai_model: str | None = Field(default=None, alias="aiModel")
    ai_base_url: str | None = Field(default=None, alias="aiBaseUrl")
    payment_upi_id: str | None = Field(default=None, alias="paymentUpiId")
    payment_qr_file_id: str | None = Field(default=None, alias="paymentQrFileId")
    payment_payee_name: str | None = Field(default=None, alias="paymentPayeeName")
    s3_config_source: ConfigSource | None = Field(default=None, alias="s3ConfigSource")
    s3_bucket: str | None = Field(default=None, alias="s3Bucket")
    s3_region: str | None = Field(default=None, alias="s3Region")
    s3_key_prefix: str | None = Field(default=None, alias="s3KeyPrefix")
    s3_endpoint: str | None = Field(default=None, alias="s3Endpoint")
    s3_public_endpoint: str | None = Field(default=None, alias="s3PublicEndpoint")
    s3_access_key_id: str | None = Field(default=None, alias="s3AccessKeyId")
    s3_secret_access_key: str | None = Field(default=None, alias="s3SecretAccessKey")

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


class S3ConfigTestResponse(BaseModel):
    ok: bool
    bucket: str | None = None
    region: str | None = None
    endpoint: str | None = None
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
    twilio_config_source: ConfigSource = Field(default="database", alias="twilioConfigSource")
    twilio_missing_fields: list[str] = Field(default_factory=list, alias="twilioMissingFields")
    sendgrid_configured: bool = Field(alias="sendgridConfigured")
    sendgrid_config_source: ConfigSource = Field(default="database", alias="sendgridConfigSource")
    sendgrid_missing_fields: list[str] = Field(default_factory=list, alias="sendgridMissingFields")
    ai_configured: bool = Field(alias="aiConfigured")
    ai_config_source: ConfigSource = Field(default="database", alias="aiConfigSource")
    ai_missing_fields: list[str] = Field(default_factory=list, alias="aiMissingFields")
    s3_configured: bool = Field(default=False, alias="s3Configured")
    s3_config_source: ConfigSource = Field(default="env", alias="s3ConfigSource")
    s3_missing_fields: list[str] = Field(default_factory=list, alias="s3MissingFields")
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
