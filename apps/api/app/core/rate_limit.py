"""Redis-backed rate limiting with in-memory fallback for tests."""

from __future__ import annotations

import logging
from collections import defaultdict
from time import time

from fastapi import HTTPException, Request

from app.core.config import get_settings
from app.core.rate_limit_config import RateLimitRule, match_rate_limit_rules

logger = logging.getLogger(__name__)

_memory_buckets: dict[str, list[float]] = defaultdict(list)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _memory_check(key: str, *, max_requests: int, window_seconds: int) -> int | None:
    now = time()
    window_start = now - window_seconds
    _memory_buckets[key] = [t for t in _memory_buckets[key] if t > window_start]
    if len(_memory_buckets[key]) >= max_requests:
        return max(1, int(window_seconds - (now - _memory_buckets[key][0])))
    _memory_buckets[key].append(now)
    return None


async def _redis_check(key: str, *, max_requests: int, window_seconds: int) -> int | None:
    try:
        from app.core.redis import get_redis

        redis = get_redis()
        count = await redis.incr(key)
        if count == 1:
            await redis.expire(key, window_seconds)
        if count > max_requests:
            ttl = await redis.ttl(key)
            return max(1, int(ttl)) if ttl and ttl > 0 else window_seconds
        return None
    except Exception as exc:
        logger.debug("Redis rate limit fallback to memory: %s", exc)
        return _memory_check(key, max_requests=max_requests, window_seconds=window_seconds)


async def check_rate_limit_async(
    request: Request,
    *,
    key_prefix: str,
    max_requests: int = 10,
    window_seconds: int = 60,
    key_suffix: str | None = None,
) -> None:
    settings = get_settings()
    if not settings.rate_limit_enabled:
        return

    client_ip = _client_ip(request)
    suffix = key_suffix or client_ip
    key = f"{key_prefix}:{suffix}"

    retry_after = await _redis_check(key, max_requests=max_requests, window_seconds=window_seconds)
    if retry_after is not None:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later.",
            headers={"Retry-After": str(retry_after)},
        )


def check_rate_limit(
    request: Request,
    *,
    key_prefix: str,
    max_requests: int = 10,
    window_seconds: int = 60,
) -> None:
    """Sync wrapper for legacy per-route calls (uses in-memory only)."""
    settings = get_settings()
    if not settings.rate_limit_enabled:
        return

    client_ip = _client_ip(request)
    key = f"{key_prefix}:{client_ip}"
    retry_after = _memory_check(key, max_requests=max_requests, window_seconds=window_seconds)
    if retry_after is not None:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later.",
            headers={"Retry-After": str(retry_after)},
        )


async def enforce_request_rate_limits(request: Request) -> None:
    rules = match_rate_limit_rules(request.method, request.url.path)
    for rule in rules:
        await check_rate_limit_async(
            request,
            key_prefix=rule.key_prefix,
            max_requests=rule.max_requests,
            window_seconds=rule.window_seconds,
        )


def clear_rate_limit_buckets() -> None:
    _memory_buckets.clear()
