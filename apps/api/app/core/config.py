from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"  # development | production
    database_url: str = "postgresql+asyncpg://livotale_user:password@localhost:5432/livotale"
    redis_url: str = "redis://localhost:6379"
    jwt_secret: str = "livotale-development-jwt-secret-change-me"
    jwt_expires_in: str = "8h"
    jwt_issuer: str = "livotale-api"
    host: str = "0.0.0.0"
    port: int = 4000
    cors_origins: str = "http://localhost:5173,http://localhost:5174,http://localhost:3000"
    s3_bucket: str = "livotale-files"
    s3_region: str = "ap-south-1"
    s3_endpoint: str | None = None
    s3_key_prefix: str = "livotale"
    aws_access_key_id: str = "test"
    aws_secret_access_key: str = "test"
    integrations_mode: str = "dummy"
    otp_mode: str = "demo"  # demo | live (honored only when app_env=development)
    integrations_encryption_key: str | None = None
    bank_details_encryption_key: str | None = None
    notification_test_phone_allowlist: str = "+917001638349"
    seed_packages_on_startup: bool = True
    api_audit_logging: bool = False
    max_failed_login_attempts: int = 5
    account_lockout_minutes: int = 15
    internal_notifications_key: str = "livotale-internal-notifications-dev"
    rate_limit_enabled: bool = True

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_dev(self) -> bool:
        return self.app_env != "production"

    @property
    def effective_otp_mode(self) -> str:
        if not self.is_dev:
            return "live"
        return self.otp_mode

    @property
    def effective_integrations_mode(self) -> str:
        if not self.is_dev:
            return "live"
        return self.integrations_mode


@lru_cache
def get_settings() -> Settings:
    return Settings()
