from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "dev"  # dev | production
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
    s3_public_endpoint: str | None = None
    s3_key_prefix: str = "livotale"
    aws_access_key_id: str = "test"
    aws_secret_access_key: str = "test"
    twilio_account_sid: str | None = None
    twilio_parent_account_sid: str | None = None
    twilio_auth_token: str | None = None
    twilio_messaging_service_sid: str | None = None
    twilio_from_number: str | None = None
    twilio_verify_service_sid: str | None = None
    sendgrid_api_key: str | None = None
    sendgrid_from_email: str | None = None
    sendgrid_from_name: str | None = None
    ai_provider: str | None = None
    ai_api_key: str | None = None
    ai_model: str | None = None
    ai_base_url: str | None = None
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
        return self.app_env.strip().lower() == "dev"

    @property
    def effective_otp_mode(self) -> str:
        return "demo" if self.is_dev else "live"

    @property
    def effective_integrations_mode(self) -> str:
        return "dummy" if self.is_dev else "live"


@lru_cache
def get_settings() -> Settings:
    return Settings()
