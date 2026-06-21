from __future__ import annotations

import asyncio
import os
from collections.abc import Iterator
from pathlib import Path
from typing import Any

_env_path = Path(__file__).resolve().parents[1] / ".env"
if _env_path.is_file():
    for line in _env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://livotale_user:password@localhost:5432/livotale",
)
os.environ["SEED_PACKAGES_ON_STARTUP"] = "false"
os.environ["API_AUDIT_LOGGING"] = "false"
os.environ["MAX_FAILED_LOGIN_ATTEMPTS"] = "10000"
os.environ["ACCOUNT_LOCKOUT_MINUTES"] = "0"
os.environ["APP_ENV"] = "dev"

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


class _FakePubSub:
    async def psubscribe(self, *_args: Any, **_kwargs: Any) -> None:
        return None

    async def punsubscribe(self, *_args: Any, **_kwargs: Any) -> None:
        return None

    async def aclose(self) -> None:
        return None

    async def get_message(self, **_kwargs: Any) -> None:
        await asyncio.sleep(0.01)
        return None


class _FakeRedis:
    def __init__(self) -> None:
        self._counters: dict[str, int] = {}
        self._expiry: dict[str, int] = {}

    def pubsub(self) -> _FakePubSub:
        return _FakePubSub()

    async def publish(self, *_args: Any, **_kwargs: Any) -> int:
        return 1

    async def incr(self, key: str) -> int:
        self._counters[key] = self._counters.get(key, 0) + 1
        return self._counters[key]

    async def expire(self, key: str, seconds: int) -> bool:
        self._expiry[key] = seconds
        return True

    async def ttl(self, key: str) -> int:
        return self._expiry.get(key, 60)

    async def aclose(self) -> None:
        return None


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture(autouse=True)
def _mock_redis(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    fake = _FakeRedis()

    async def _connect() -> _FakeRedis:
        return fake

    async def _disconnect() -> None:
        return None

    def _get() -> _FakeRedis:
        return fake

    monkeypatch.setattr("app.core.redis.connect_redis", _connect)
    monkeypatch.setattr("app.core.redis.disconnect_redis", _disconnect)
    monkeypatch.setattr("app.core.redis.get_redis", _get)
    monkeypatch.setattr("app.core.redis._redis", fake, raising=False)
    fake._counters.clear()
    fake._expiry.clear()
    yield


@pytest.fixture(scope="session")
def app() -> Any:
    os.environ.setdefault("APP_ENV", "dev")
    from app.core.config import get_settings

    get_settings.cache_clear()
    return create_app()


@pytest.fixture(scope="session")
def client(app: Any) -> Iterator[TestClient]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def _mock_s3_for_uploads(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    class _FakeS3:
        async def generate_presigned_upload(self, key: str, content_type: str, *, expires_in: int = 3600) -> str:
            del content_type, expires_in
            return f"https://storage.test/upload/{key}"

        async def upload_file(self, file_bytes: bytes, key: str, content_type: str) -> None:
            del file_bytes, key, content_type

        def get_public_url(self, key: str) -> str:
            return f"https://storage.test/files/{key}"

        async def presigned_get_url(self, key: str, *, expires_in: int = 3600) -> str:
            del expires_in
            return f"https://storage.test/files/{key}"

        def head_object_sync(self, key: str) -> dict[str, Any] | None:
            del key
            return {"ContentLength": 1234}

    class _FakeS3Service:
        @classmethod
        async def from_db(cls, db: Any) -> _FakeS3:
            del db
            return _FakeS3()

    monkeypatch.setattr("app.services.storage_service.S3Service", _FakeS3Service)
    monkeypatch.setattr("app.integrations.s3.S3Service", _FakeS3Service)
    yield


@pytest.fixture(autouse=True)
def _clear_rate_limits(_mock_redis: None) -> Iterator[None]:
    from app.core.rate_limit import clear_rate_limit_buckets
    from app.core.redis import get_redis

    clear_rate_limit_buckets()
    redis = get_redis()
    if hasattr(redis, "_counters"):
        redis._counters.clear()
        redis._expiry.clear()
    yield
    clear_rate_limit_buckets()
    if hasattr(redis, "_counters"):
        redis._counters.clear()
        redis._expiry.clear()
