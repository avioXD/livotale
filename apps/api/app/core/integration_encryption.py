from __future__ import annotations

import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import get_settings
from app.core.exceptions import AppError

_ENV_KEY = "INTEGRATIONS_ENCRYPTION_KEY"
_BANK_ENV_KEY = "BANK_DETAILS_ENCRYPTION_KEY"


def _decode_key(raw: str) -> bytes:
    try:
        key = base64.urlsafe_b64decode(raw)
    except Exception as exc:
        raise AppError("INTEGRATIONS_ENCRYPTION_KEY is invalid base64", status_code=500) from exc
    if len(key) != 32:
        raise AppError("INTEGRATIONS_ENCRYPTION_KEY must decode to 32 bytes", status_code=500)
    return key


def _encryption_key_raw() -> str:
    settings = get_settings()
    if settings.integrations_encryption_key:
        return settings.integrations_encryption_key
    bank_key = os.getenv(_BANK_ENV_KEY)
    if bank_key:
        return bank_key
    raise AppError(
        "INTEGRATIONS_ENCRYPTION_KEY is not configured. Set it in api/.env (32-byte base64).",
        status_code=500,
    )


def _aesgcm() -> AESGCM:
    return AESGCM(_decode_key(_encryption_key_raw()))


def encrypt_secret(plaintext: str) -> bytes:
    nonce = os.urandom(12)
    ciphertext = _aesgcm().encrypt(nonce, plaintext.encode("utf-8"), None)
    return nonce + ciphertext


def decrypt_secret(blob: bytes | None) -> str | None:
    if not blob:
        return None
    if len(blob) < 13:
        raise AppError("Invalid encrypted integration secret payload", status_code=500)
    nonce, ciphertext = blob[:12], blob[12:]
    return _aesgcm().decrypt(nonce, ciphertext, None).decode("utf-8")


def mask_secret(value: str | None, *, visible_tail: int = 4) -> str | None:
    if not value:
        return None
    if len(value) <= visible_tail:
        return "••••"
    return f"••••{value[-visible_tail:]}"
