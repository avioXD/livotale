from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.exceptions import AppError
from app.core.integration_encryption import decrypt_secret
from app.models.integration_platform import PlatformSettings
from sqlalchemy import select


@dataclass(frozen=True)
class S3RuntimeConfig:
    bucket: str
    region: str
    key_prefix: str
    endpoint: str | None
    public_endpoint: str | None
    access_key_id: str
    secret_access_key: str

    @classmethod
    def from_env(cls, settings: Settings | None = None) -> S3RuntimeConfig:
        env = settings or get_settings()
        return cls(
            bucket=env.s3_bucket,
            region=env.s3_region,
            key_prefix=env.s3_key_prefix,
            endpoint=env.s3_endpoint,
            public_endpoint=env.s3_public_endpoint,
            access_key_id=env.aws_access_key_id,
            secret_access_key=env.aws_secret_access_key,
        )


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


async def resolve_s3_config(db: AsyncSession | None = None) -> S3RuntimeConfig:
    env = get_settings()
    if db is None:
        return S3RuntimeConfig.from_env(env)

    result = await db.execute(select(PlatformSettings).where(PlatformSettings.id == 1))
    row = result.scalar_one_or_none()
    if row is None:
        return S3RuntimeConfig.from_env(env)

    source = row.s3_config_source if row.s3_config_source in {"database", "env"} else "env"
    if source == "env":
        return S3RuntimeConfig.from_env(env)

    secret = decrypt_secret(row.s3_secret_access_key_enc) if row.s3_secret_access_key_enc else None
    bucket = _clean(row.s3_bucket)
    region = _clean(row.s3_region)
    access_key_id = _clean(row.s3_access_key_id)
    secret_access_key = _clean(secret)
    if not bucket or not region or not access_key_id or not secret_access_key:
        raise AppError(
            "S3 storage is not configured. Ask an administrator to configure storage credentials.",
            status_code=503,
            error="not_configured",
        )

    return S3RuntimeConfig(
        bucket=bucket,
        region=region,
        key_prefix=_clean(row.s3_key_prefix) or "",
        endpoint=_clean(row.s3_endpoint),
        public_endpoint=_clean(row.s3_public_endpoint),
        access_key_id=access_key_id,
        secret_access_key=secret_access_key,
    )
