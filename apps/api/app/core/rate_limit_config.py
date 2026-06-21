"""Route-class rate limit rules for public and auth endpoints."""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class RateLimitRule:
    methods: frozenset[str]
    path_pattern: re.Pattern[str]
    key_prefix: str
    max_requests: int
    window_seconds: int


def _normalize_path(path: str) -> str:
    if path.startswith("/api/v1"):
        return path[len("/api/v1") :] or "/"
    return path


def match_rate_limit_rules(method: str, path: str) -> list[RateLimitRule]:
    normalized = _normalize_path(path)
    upper_method = method.upper()
    return [rule for rule in RATE_LIMIT_RULES if upper_method in rule.methods and rule.path_pattern.match(normalized)]


RATE_LIMIT_RULES: tuple[RateLimitRule, ...] = (
    RateLimitRule(
        frozenset({"POST"}),
        re.compile(r"^/public/enquiries$"),
        "rl:public:enquiry",
        10,
        60,
    ),
    RateLimitRule(
        frozenset({"GET"}),
        re.compile(r"^/public/(packages|slots/.*)$"),
        "rl:public:read",
        60,
        60,
    ),
    RateLimitRule(
        frozenset({"POST"}),
        re.compile(r"^/auth/(login|register|refresh|logout)$"),
        "rl:auth",
        20,
        60,
    ),
    RateLimitRule(
        frozenset({"POST"}),
        re.compile(r"^/auth/patient/login$"),
        "rl:auth:patient",
        10,
        60,
    ),
    RateLimitRule(
        frozenset({"POST"}),
        re.compile(r"^/patient/register$"),
        "rl:auth:register",
        10,
        60,
    ),
    RateLimitRule(
        frozenset({"POST"}),
        re.compile(r"^/patient-portal/otp/send$"),
        "rl:otp:ip",
        20,
        60,
    ),
    RateLimitRule(
        frozenset({"POST"}),
        re.compile(r"^/patient-portal/otp/verify$"),
        "rl:otp:verify:ip",
        30,
        60,
    ),
    RateLimitRule(
        frozenset({"GET"}),
        re.compile(r"^/staff/onboard/[^/]+$"),
        "rl:staff:onboard",
        30,
        60,
    ),
    RateLimitRule(
        frozenset({"POST"}),
        re.compile(r"^/staff/onboard/[^/]+/submit$"),
        "rl:staff:onboard:submit",
        10,
        60,
    ),
    RateLimitRule(
        frozenset({"GET"}),
        re.compile(r"^/health(/ready)?$"),
        "rl:health",
        120,
        60,
    ),
)
