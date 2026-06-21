"""OTP challenge storage and validation via identity.otp_challenges."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.exceptions import AppError
from app.core.security import hash_token

RESEND_COOLDOWN_SECONDS = 60
MAX_SENDS_PER_WINDOW = 3
SEND_WINDOW_MINUTES = 15
CHALLENGE_TTL_MINUTES = 10

PURPOSE_PATIENT_PORTAL = "patient_portal"
PURPOSE_TECHNICIAN_INTAKE = "technician_intake"
PURPOSE_TECHNICIAN_COMPLETION = "technician_completion"

DEMO_OTP_CODE = "123456"


def _send_rate_limits_enabled() -> bool:
    return get_settings().effective_otp_mode != "demo"


class OtpChallengeService:
    def __init__(self, db: AsyncSession):
        self.db = db

    @staticmethod
    def demo_code() -> str | None:
        settings = get_settings()
        if settings.effective_otp_mode != "demo":
            return None
        return DEMO_OTP_CODE

    @staticmethod
    def send_response_fields() -> dict[str, Any]:
        retry_after = RESEND_COOLDOWN_SECONDS if _send_rate_limits_enabled() else 0
        fields: dict[str, Any] = {"retryAfterSeconds": retry_after}
        demo = OtpChallengeService.demo_code()
        if demo:
            fields["demoOtp"] = demo
        return fields

    async def check_send_allowed(self, mobile: str, purpose: str) -> None:
        if not _send_rate_limits_enabled():
            return

        latest = await self.db.execute(
            text(
                """
                SELECT created_at
                FROM identity.otp_challenges
                WHERE mobile = :mobile AND purpose = :purpose
                ORDER BY created_at DESC
                LIMIT 1
                """
            ),
            {"mobile": mobile, "purpose": purpose},
        )
        row = latest.mappings().first()
        if row:
            created_at = row["created_at"]
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=UTC)
            elapsed = (datetime.now(UTC) - created_at).total_seconds()
            if elapsed < RESEND_COOLDOWN_SECONDS:
                retry_after = int(RESEND_COOLDOWN_SECONDS - elapsed)
                raise AppError(
                    "Please wait before requesting another OTP.",
                    status_code=429,
                    error="rate_limited",
                    extra={"retryAfterSeconds": max(retry_after, 1)},
                )

        count_result = await self.db.execute(
            text(
                """
                SELECT COUNT(*) AS send_count
                FROM identity.otp_challenges
                WHERE mobile = :mobile
                  AND purpose = :purpose
                  AND created_at > now() - make_interval(mins => :window_minutes)
                """
            ),
            {"mobile": mobile, "purpose": purpose, "window_minutes": SEND_WINDOW_MINUTES},
        )
        send_count = int(count_result.scalar_one())
        if send_count >= MAX_SENDS_PER_WINDOW:
            raise AppError(
                "Too many OTP requests. Please try again later.",
                status_code=429,
                error="rate_limited",
                extra={"retryAfterSeconds": RESEND_COOLDOWN_SECONDS},
            )

    async def create_challenge(
        self,
        mobile: str,
        purpose: str,
        code: str,
        *,
        ttl_minutes: int = CHALLENGE_TTL_MINUTES,
    ) -> None:
        expires_at = datetime.now(UTC) + timedelta(minutes=ttl_minutes)
        await self.db.execute(
            text(
                """
                INSERT INTO identity.otp_challenges (mobile, otp_hash, purpose, expires_at)
                VALUES (:mobile, :otp_hash, :purpose, :expires_at)
                """
            ),
            {
                "mobile": mobile,
                "otp_hash": hash_token(code),
                "purpose": purpose,
                "expires_at": expires_at,
            },
        )

    async def verify_challenge(
        self, mobile: str, purpose: str, code: str, *, status_code: int = 401
    ) -> None:
        result = await self.db.execute(
            text(
                """
                SELECT id, otp_hash, attempts, max_attempts, expires_at, consumed_at
                FROM identity.otp_challenges
                WHERE mobile = :mobile AND purpose = :purpose AND consumed_at IS NULL
                ORDER BY created_at DESC
                LIMIT 1
                """
            ),
            {"mobile": mobile, "purpose": purpose},
        )
        row = result.mappings().first()
        if not row:
            raise AppError("OTP expired or not found. Request a new code.", status_code=status_code)

        expires_at = row["expires_at"]
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if datetime.now(UTC) >= expires_at:
            raise AppError("OTP expired. Request a new code.", status_code=status_code)

        if row["attempts"] >= row["max_attempts"]:
            raise AppError("Too many OTP attempts. Request a new code.", status_code=status_code)

        await self.db.execute(
            text("UPDATE identity.otp_challenges SET attempts = attempts + 1 WHERE id = :id"),
            {"id": row["id"]},
        )

        if hash_token(code.strip()) != row["otp_hash"]:
            await self.db.commit()
            raise AppError("Invalid OTP", status_code=status_code)

        await self.db.execute(
            text("UPDATE identity.otp_challenges SET consumed_at = now() WHERE id = :id"),
            {"id": row["id"]},
        )
