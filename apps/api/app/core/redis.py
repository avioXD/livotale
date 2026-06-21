from __future__ import annotations

import redis.asyncio as aioredis

from app.core.config import get_settings

_redis: aioredis.Redis | None = None


async def connect_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(get_settings().redis_url, decode_responses=True)
    return _redis


async def disconnect_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None


def get_redis() -> aioredis.Redis:
    if _redis is None:
        raise RuntimeError("Redis is not connected — call connect_redis() during app lifespan")
    return _redis
