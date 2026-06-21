from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.integration_encryption import decrypt_secret, encrypt_secret, mask_secret
from app.integrations.s3 import S3Service
from app.models.integration_platform import PlatformSettings

ConfigSource = str


class IntegrationSettingsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _resolve_file_url(self, file_id) -> str | None:
        if not file_id:
            return None
        result = await self.db.execute(
            text("SELECT storage_url FROM storage.files WHERE id = :file_id"),
            {"file_id": file_id},
        )
        row = result.mappings().first()
        if not row:
            return None
        s3 = await S3Service.from_db(self.db)
        return s3.rewrite_url_for_browser(row["storage_url"])

    async def _get_row(self) -> PlatformSettings:
        result = await self.db.execute(select(PlatformSettings).where(PlatformSettings.id == 1))
        row = result.scalar_one_or_none()
        if row is None:
            row = PlatformSettings(id=1)
            self.db.add(row)
            await self.db.flush()
        return row

    def _source(self, value: str | None, default: ConfigSource) -> ConfigSource:
        return value if value in {"database", "env"} else default

    def _masked(self, value: str | None) -> str | None:
        return mask_secret(value) if value else None

    def _missing(self, values: dict[str, str | None]) -> list[str]:
        return [field for field, value in values.items() if not value]

    def _twilio_missing(self, creds: dict[str, str | None]) -> list[str]:
        missing = self._missing(
            {
                "twilioAccountSid": creds.get("account_sid"),
                "twilioAuthToken": creds.get("auth_token"),
                "twilioVerifyServiceSid": creds.get("verify_service_sid"),
            }
        )
        if not (creds.get("messaging_service_sid") or creds.get("from_number")):
            missing.append("twilioMessagingServiceSidOrFromNumber")
        if (creds.get("account_sid") or "").startswith("SK") and not creds.get("parent_account_sid"):
            missing.append("twilioParentAccountSid")
        return missing

    def _s3_missing(self, creds: dict[str, str | None]) -> list[str]:
        return self._missing(
            {
                "s3Bucket": creds.get("bucket"),
                "s3Region": creds.get("region"),
                "s3AccessKeyId": creds.get("access_key_id"),
                "s3SecretAccessKey": creds.get("secret_access_key"),
            }
        )

    def _env_twilio_credentials(self) -> dict[str, str | None]:
        settings = get_settings()
        return {
            "account_sid": settings.twilio_account_sid,
            "parent_account_sid": settings.twilio_parent_account_sid,
            "auth_token": settings.twilio_auth_token,
            "messaging_service_sid": settings.twilio_messaging_service_sid,
            "from_number": settings.twilio_from_number,
            "verify_service_sid": settings.twilio_verify_service_sid,
        }

    def _env_sendgrid_credentials(self) -> dict[str, str | None]:
        settings = get_settings()
        return {
            "api_key": settings.sendgrid_api_key,
            "from_email": settings.sendgrid_from_email,
            "from_name": settings.sendgrid_from_name or "Livotale",
        }

    def _env_ai_credentials(self) -> dict[str, str | None]:
        settings = get_settings()
        return {
            "provider": settings.ai_provider or "openai",
            "api_key": settings.ai_api_key,
            "model": settings.ai_model,
            "base_url": settings.ai_base_url or "",
        }

    def _env_s3_credentials(self) -> dict[str, str | None]:
        settings = get_settings()
        return {
            "bucket": settings.s3_bucket,
            "region": settings.s3_region,
            "key_prefix": settings.s3_key_prefix,
            "endpoint": settings.s3_endpoint,
            "public_endpoint": settings.s3_public_endpoint,
            "access_key_id": settings.aws_access_key_id,
            "secret_access_key": settings.aws_secret_access_key,
        }

    async def get_public_settings(self) -> dict[str, Any]:
        row = await self._get_row()
        twilio_source = self._source(row.twilio_config_source, "database")
        sendgrid_source = self._source(row.sendgrid_config_source, "database")
        ai_source = self._source(row.ai_config_source, "database")
        s3_source = self._source(row.s3_config_source, "env")

        db_twilio_token = decrypt_secret(row.twilio_auth_token_enc) if twilio_source == "database" else None
        db_sendgrid_key = decrypt_secret(row.sendgrid_api_key_enc) if sendgrid_source == "database" else None
        db_ai_key = decrypt_secret(row.ai_api_key_enc) if ai_source == "database" else None
        db_s3_secret = decrypt_secret(row.s3_secret_access_key_enc) if s3_source == "database" else None
        env_twilio = self._env_twilio_credentials()
        env_sendgrid = self._env_sendgrid_credentials()
        env_ai = self._env_ai_credentials()
        env_s3 = self._env_s3_credentials()

        twilio_creds = env_twilio if twilio_source == "env" else {
            "account_sid": row.twilio_account_sid,
            "parent_account_sid": row.twilio_parent_account_sid,
            "auth_token": db_twilio_token,
            "messaging_service_sid": row.twilio_messaging_service_sid,
            "from_number": row.twilio_from_number,
            "verify_service_sid": row.twilio_verify_service_sid,
        }
        sendgrid_creds = env_sendgrid if sendgrid_source == "env" else {
            "api_key": db_sendgrid_key,
            "from_email": row.sendgrid_from_email,
            "from_name": row.sendgrid_from_name or "Livotale",
        }
        ai_creds = env_ai if ai_source == "env" else {
            "provider": row.ai_provider or "openai",
            "api_key": db_ai_key,
            "model": row.ai_model,
            "base_url": row.ai_base_url or "",
        }
        s3_creds = env_s3 if s3_source == "env" else {
            "bucket": row.s3_bucket,
            "region": row.s3_region,
            "key_prefix": row.s3_key_prefix,
            "endpoint": row.s3_endpoint,
            "public_endpoint": row.s3_public_endpoint,
            "access_key_id": row.s3_access_key_id,
            "secret_access_key": db_s3_secret,
        }

        twilio_missing = self._twilio_missing(twilio_creds)
        sendgrid_missing = self._missing(
            {"sendgridApiKey": sendgrid_creds.get("api_key"), "sendgridFromEmail": sendgrid_creds.get("from_email")}
        )
        ai_missing = self._missing({"aiApiKey": ai_creds.get("api_key"), "aiModel": ai_creds.get("model")})
        s3_missing = self._s3_missing(s3_creds)
        payment_qr_url = await self._resolve_file_url(row.payment_qr_file_id)
        return {
            "twilioAccountSid": twilio_creds.get("account_sid"),
            "twilioParentAccountSid": twilio_creds.get("parent_account_sid"),
            "twilioAuthToken": self._masked(twilio_creds.get("auth_token")),
            "twilioMessagingServiceSid": twilio_creds.get("messaging_service_sid"),
            "twilioFromNumber": twilio_creds.get("from_number"),
            "twilioVerifyServiceSid": twilio_creds.get("verify_service_sid"),
            "twilioConfigSource": twilio_source,
            "twilioMissingFields": twilio_missing,
            "sendgridApiKey": self._masked(sendgrid_creds.get("api_key")),
            "sendgridFromEmail": sendgrid_creds.get("from_email"),
            "sendgridFromName": sendgrid_creds.get("from_name"),
            "sendgridConfigSource": sendgrid_source,
            "sendgridMissingFields": sendgrid_missing,
            "aiProvider": ai_creds.get("provider"),
            "aiApiKey": self._masked(ai_creds.get("api_key")),
            "aiModel": ai_creds.get("model"),
            "aiBaseUrl": ai_creds.get("base_url"),
            "aiConfigSource": ai_source,
            "aiMissingFields": ai_missing,
            "paymentUpiId": row.payment_upi_id,
            "paymentQrFileId": str(row.payment_qr_file_id) if row.payment_qr_file_id else None,
            "paymentQrUrl": payment_qr_url,
            "paymentPayeeName": row.payment_payee_name,
            "paymentConfigured": bool(row.payment_upi_id),
            "s3Bucket": s3_creds.get("bucket"),
            "s3Region": s3_creds.get("region"),
            "s3KeyPrefix": s3_creds.get("key_prefix"),
            "s3Endpoint": s3_creds.get("endpoint"),
            "s3PublicEndpoint": s3_creds.get("public_endpoint"),
            "s3AccessKeyId": s3_creds.get("access_key_id"),
            "s3SecretAccessKey": self._masked(s3_creds.get("secret_access_key")),
            "s3ConfigSource": s3_source,
            "s3MissingFields": s3_missing,
            "s3Configured": not s3_missing,
            "twilioConfigured": not twilio_missing,
            "sendgridConfigured": not sendgrid_missing,
            "aiConfigured": not ai_missing,
            "updatedAt": row.updated_at.isoformat() if row.updated_at else None,
        }

    async def get_twilio_credentials(self) -> dict[str, str] | None:
        row = await self._get_row()
        source = self._source(row.twilio_config_source, "database")
        raw = self._env_twilio_credentials() if source == "env" else {
            "account_sid": row.twilio_account_sid,
            "parent_account_sid": row.twilio_parent_account_sid,
            "auth_token": decrypt_secret(row.twilio_auth_token_enc),
            "messaging_service_sid": row.twilio_messaging_service_sid,
            "from_number": row.twilio_from_number,
            "verify_service_sid": row.twilio_verify_service_sid,
        }
        required = {
            "twilioAccountSid": raw.get("account_sid"),
            "twilioAuthToken": raw.get("auth_token"),
        }
        if (raw.get("account_sid") or "").startswith("SK"):
            required["twilioParentAccountSid"] = raw.get("parent_account_sid")
        if self._missing(required):
            return None
        return {key: value for key, value in raw.items() if value}

    async def get_sendgrid_credentials(self) -> dict[str, str] | None:
        row = await self._get_row()
        source = self._source(row.sendgrid_config_source, "database")
        raw = self._env_sendgrid_credentials() if source == "env" else {
            "api_key": decrypt_secret(row.sendgrid_api_key_enc),
            "from_email": row.sendgrid_from_email,
            "from_name": row.sendgrid_from_name or "Livotale",
        }
        if not raw.get("api_key") or not raw.get("from_email"):
            return None
        return {key: value for key, value in raw.items() if value}

    async def get_ai_credentials(self) -> dict[str, str] | None:
        row = await self._get_row()
        source = self._source(row.ai_config_source, "database")
        raw = self._env_ai_credentials() if source == "env" else {
            "provider": row.ai_provider or "openai",
            "api_key": decrypt_secret(row.ai_api_key_enc),
            "model": row.ai_model,
            "base_url": row.ai_base_url or "",
        }
        if not raw.get("api_key") or not raw.get("model"):
            return None
        return {key: value for key, value in raw.items() if value is not None}

    async def get_s3_credentials(self) -> dict[str, str] | None:
        row = await self._get_row()
        source = self._source(row.s3_config_source, "env")
        raw = self._env_s3_credentials() if source == "env" else {
            "bucket": row.s3_bucket,
            "region": row.s3_region,
            "access_key_id": row.s3_access_key_id,
            "secret_access_key": decrypt_secret(row.s3_secret_access_key_enc),
            "key_prefix": row.s3_key_prefix,
            "endpoint": row.s3_endpoint,
            "public_endpoint": row.s3_public_endpoint,
        }
        if self._s3_missing(raw):
            return None
        return {key: value for key, value in raw.items() if value}

    async def get_payment_config(self) -> dict[str, Any]:
        row = await self._get_row()
        qr_url = await self._resolve_file_url(row.payment_qr_file_id)
        return {
            "upiId": row.payment_upi_id,
            "qrImageUrl": qr_url,
            "payeeName": row.payment_payee_name or "Livotale",
        }

    async def update_settings(self, payload: dict[str, Any], *, updated_by: UUID) -> dict[str, Any]:
        row = await self._get_row()

        if payload.get("twilioConfigSource") is not None:
            row.twilio_config_source = self._source(payload["twilioConfigSource"], "database")
        if payload.get("twilioAccountSid") is not None:
            row.twilio_account_sid = payload["twilioAccountSid"] or None
        if payload.get("twilioParentAccountSid") is not None:
            row.twilio_parent_account_sid = payload["twilioParentAccountSid"] or None
        if payload.get("twilioMessagingServiceSid") is not None:
            row.twilio_messaging_service_sid = payload["twilioMessagingServiceSid"] or None
        if payload.get("twilioFromNumber") is not None:
            row.twilio_from_number = payload["twilioFromNumber"] or None
        if payload.get("twilioVerifyServiceSid") is not None:
            row.twilio_verify_service_sid = payload["twilioVerifyServiceSid"] or None
        if payload.get("sendgridConfigSource") is not None:
            row.sendgrid_config_source = self._source(payload["sendgridConfigSource"], "database")
        if payload.get("sendgridFromEmail") is not None:
            row.sendgrid_from_email = payload["sendgridFromEmail"] or None
        if payload.get("sendgridFromName") is not None:
            row.sendgrid_from_name = payload["sendgridFromName"] or None
        if payload.get("aiConfigSource") is not None:
            row.ai_config_source = self._source(payload["aiConfigSource"], "database")
        if payload.get("aiProvider") is not None:
            row.ai_provider = payload["aiProvider"] or None
        if payload.get("aiModel") is not None:
            row.ai_model = payload["aiModel"] or None
        if payload.get("aiBaseUrl") is not None:
            row.ai_base_url = payload["aiBaseUrl"] or None
        if payload.get("paymentUpiId") is not None:
            row.payment_upi_id = payload["paymentUpiId"] or None
        if payload.get("paymentPayeeName") is not None:
            row.payment_payee_name = payload["paymentPayeeName"] or None
        if payload.get("paymentQrFileId") is not None:
            raw = payload["paymentQrFileId"]
            row.payment_qr_file_id = UUID(str(raw)) if raw else None
        if payload.get("s3ConfigSource") is not None:
            row.s3_config_source = self._source(payload["s3ConfigSource"], "env")
        if payload.get("s3Bucket") is not None:
            row.s3_bucket = payload["s3Bucket"] or None
        if payload.get("s3Region") is not None:
            row.s3_region = payload["s3Region"] or None
        if payload.get("s3KeyPrefix") is not None:
            row.s3_key_prefix = payload["s3KeyPrefix"] or None
        if payload.get("s3Endpoint") is not None:
            row.s3_endpoint = payload["s3Endpoint"] or None
        if payload.get("s3PublicEndpoint") is not None:
            row.s3_public_endpoint = payload["s3PublicEndpoint"] or None
        if payload.get("s3AccessKeyId") is not None:
            row.s3_access_key_id = payload["s3AccessKeyId"] or None

        token = payload.get("twilioAuthToken")
        if token and not token.startswith("••••"):
            row.twilio_auth_token_enc = encrypt_secret(token)

        sendgrid_key = payload.get("sendgridApiKey")
        if sendgrid_key and not str(sendgrid_key).startswith("••••"):
            row.sendgrid_api_key_enc = encrypt_secret(sendgrid_key)

        ai_key = payload.get("aiApiKey")
        if ai_key and not str(ai_key).startswith("••••"):
            row.ai_api_key_enc = encrypt_secret(ai_key)

        s3_secret = payload.get("s3SecretAccessKey")
        if s3_secret and not str(s3_secret).startswith("••••"):
            row.s3_secret_access_key_enc = encrypt_secret(s3_secret)

        row.updated_by = updated_by
        row.updated_at = datetime.now(UTC)
        await self.db.flush()
        return await self.get_public_settings()
