from __future__ import annotations

import pytest

from app.core.exceptions import AppError
from app.core.sql_safety import assert_safe_identifier, assert_safe_sort_column


def test_assert_safe_identifier_accepts_valid_names():
    assert assert_safe_identifier("patient_id") == "patient_id"


def test_assert_safe_identifier_rejects_injection():
    with pytest.raises(AppError):
        assert_safe_identifier("users; DROP TABLE")


def test_assert_safe_sort_column_requires_allowlist():
    allowed = frozenset({"created_at", "full_name"})
    assert assert_safe_sort_column("created_at", allowed) == "created_at"
    with pytest.raises(AppError):
        assert_safe_sort_column("password_hash", allowed)
