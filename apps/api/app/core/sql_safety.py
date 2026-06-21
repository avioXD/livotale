"""Helpers to guard dynamic SQL fragments against injection."""

from __future__ import annotations

import re

from app.core.exceptions import AppError

_IDENTIFIER_RE = re.compile(r"^[a-z_][a-z0-9_]*$")


def assert_safe_identifier(name: str) -> str:
    if not _IDENTIFIER_RE.match(name):
        raise AppError("Invalid identifier", status_code=400, error="validation_error")
    return name


def assert_safe_sort_column(column: str, allowed: frozenset[str]) -> str:
    if column not in allowed:
        raise AppError("Invalid sort column", status_code=400, error="validation_error")
    return column
