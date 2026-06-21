import base64
import os

import pytest

from app.core.field_encryption import decrypt_field, encrypt_field


@pytest.fixture(autouse=True)
def _encryption_key(monkeypatch):
    key = base64.urlsafe_b64encode(b"0" * 32).decode()
    monkeypatch.setenv("BANK_DETAILS_ENCRYPTION_KEY", key)


def test_encrypt_decrypt_round_trip():
    plain = "123456789012"
    blob = encrypt_field(plain)
    assert blob != plain.encode()
    assert decrypt_field(blob) == plain
