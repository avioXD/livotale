from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
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


def _pick_str(db_value: str | None, env_value: str) -> str:
    if db_value is not None and db_value.strip():
        return db_value.strip()
    return env_value


def _pick_optional(db_value: str | None, env_value: str | None) -> str | None:
    if db_value is not None:
        stripped = db_value.strip()
        return stripped or None
    return env_value


async def resolve_s3_config(db: AsyncSession | None = None) -> S3RuntimeConfig:
    env = get_settings()
    if db is None:
        return S3RuntimeConfig.from_env(env)

    result = await db.execute(select(PlatformSettings).where(PlatformSettings.id == 1))
    row = result.scalar_one_or_none()
    if row is None:
        return S3RuntimeConfig.from_env(env)

    secret = decrypt_secret(row.s3_secret_access_key_enc) if row.s3_secret_access_key_enc else None
    return S3RuntimeConfig(
        bucket=_pick_str(row.s3_bucket, env.s3_bucket),
        region=_pick_str(row.s3_region, env.s3_region),
        key_prefix=_pick_str(row.s3_key_prefix, env.s3_key_prefix),
        endpoint=_pick_optional(row.s3_endpoint, env.s3_endpoint),
        public_endpoint=_pick_optional(row.s3_public_endpoint, env.s3_public_endpoint),
        access_key_id=_pick_str(row.s3_access_key_id, env.aws_access_key_id),
        secret_access_key=secret or env.aws_secret_access_key,
    )
