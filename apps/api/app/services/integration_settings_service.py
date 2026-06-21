from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.integration_encryption import decrypt_secret, encrypt_secret, mask_secret
from app.integrations.s3 import S3Service
from app.integrations.s3_config import resolve_s3_config
from app.models.integration_platform import PlatformSettings


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

    async def get_public_settings(self) -> dict[str, Any]:
        row = await self._get_row()
        twilio_token = decrypt_secret(row.twilio_auth_token_enc)
        sendgrid_key = decrypt_secret(row.sendgrid_api_key_enc)
        ai_key = decrypt_secret(row.ai_api_key_enc)
        s3_secret = decrypt_secret(row.s3_secret_access_key_enc)
        payment_qr_url = await self._resolve_file_url(row.payment_qr_file_id)
        s3_configured = bool(
            row.s3_bucket and row.s3_region and row.s3_access_key_id and s3_secret
        )
        return {
            "twilioAccountSid": row.twilio_account_sid,
            "twilioParentAccountSid": row.twilio_parent_account_sid,
            "twilioAuthToken": mask_secret(twilio_token),
            "twilioMessagingServiceSid": row.twilio_messaging_service_sid,
            "twilioFromNumber": row.twilio_from_number,
            "twilioVerifyServiceSid": row.twilio_verify_service_sid,
            "sendgridApiKey": mask_secret(sendgrid_key),
            "sendgridFromEmail": row.sendgrid_from_email,
            "sendgridFromName": row.sendgrid_from_name,
            "aiProvider": row.ai_provider,
            "aiApiKey": mask_secret(ai_key),
            "aiModel": row.ai_model,
            "aiBaseUrl": row.ai_base_url,
            "paymentUpiId": row.payment_upi_id,
            "paymentQrFileId": str(row.payment_qr_file_id) if row.payment_qr_file_id else None,
            "paymentQrUrl": payment_qr_url,
            "paymentPayeeName": row.payment_payee_name,
            "paymentConfigured": bool(row.payment_upi_id),
            "s3Bucket": row.s3_bucket,
            "s3Region": row.s3_region,
            "s3KeyPrefix": row.s3_key_prefix,
            "s3Endpoint": row.s3_endpoint,
            "s3PublicEndpoint": row.s3_public_endpoint,
            "s3AccessKeyId": row.s3_access_key_id,
            "s3SecretAccessKey": mask_secret(s3_secret),
            "s3Configured": s3_configured,
            "twilioConfigured": bool(
                row.twilio_account_sid
                and twilio_token
                and (row.twilio_messaging_service_sid or row.twilio_from_number)
                and (
                    not (row.twilio_account_sid or "").startswith("SK")
                    or bool(row.twilio_parent_account_sid)
                )
            ),
            "sendgridConfigured": bool(sendgrid_key and row.sendgrid_from_email),
            "aiConfigured": bool(ai_key and row.ai_model),
            "updatedAt": row.updated_at.isoformat() if row.updated_at else None,
        }

    async def get_twilio_credentials(self) -> dict[str, str] | None:
        row = await self._get_row()
        token = decrypt_secret(row.twilio_auth_token_enc)
        if not row.twilio_account_sid or not token:
            return None
        creds = {
            "account_sid": row.twilio_account_sid,
            "auth_token": token,
        }
        if row.twilio_parent_account_sid:
            creds["parent_account_sid"] = row.twilio_parent_account_sid
        if row.twilio_messaging_service_sid:
            creds["messaging_service_sid"] = row.twilio_messaging_service_sid
        if row.twilio_from_number:
            creds["from_number"] = row.twilio_from_number
        if row.twilio_verify_service_sid:
            creds["verify_service_sid"] = row.twilio_verify_service_sid
        return creds

    async def get_sendgrid_credentials(self) -> dict[str, str] | None:
        row = await self._get_row()
        api_key = decrypt_secret(row.sendgrid_api_key_enc)
        if not api_key or not row.sendgrid_from_email:
            return None
        return {
            "api_key": api_key,
            "from_email": row.sendgrid_from_email,
            "from_name": row.sendgrid_from_name or "Livotale",
        }

    async def get_ai_credentials(self) -> dict[str, str] | None:
        row = await self._get_row()
        api_key = decrypt_secret(row.ai_api_key_enc)
        if not api_key or not row.ai_model:
            return None
        return {
            "provider": row.ai_provider or "openai",
            "api_key": api_key,
            "model": row.ai_model,
            "base_url": row.ai_base_url or "",
        }

    async def get_s3_credentials(self) -> dict[str, str] | None:
        row = await self._get_row()
        secret = decrypt_secret(row.s3_secret_access_key_enc)
        if not row.s3_bucket or not row.s3_region or not row.s3_access_key_id or not secret:
            return None
        creds: dict[str, str] = {
            "bucket": row.s3_bucket,
            "region": row.s3_region,
            "access_key_id": row.s3_access_key_id,
            "secret_access_key": secret,
        }
        if row.s3_key_prefix:
            creds["key_prefix"] = row.s3_key_prefix
        if row.s3_endpoint:
            creds["endpoint"] = row.s3_endpoint
        if row.s3_public_endpoint:
            creds["public_endpoint"] = row.s3_public_endpoint
        return creds

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
        if payload.get("sendgridFromEmail") is not None:
            row.sendgrid_from_email = payload["sendgridFromEmail"] or None
        if payload.get("sendgridFromName") is not None:
            row.sendgrid_from_name = payload["sendgridFromName"] or None
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
