from __future__ import annotations

import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.exceptions import AppError

_ENV_KEY = "BANK_DETAILS_ENCRYPTION_KEY"


def _decode_key(raw: str) -> bytes:
    try:
        key = base64.urlsafe_b64decode(raw)
    except Exception as exc:
        raise AppError("BANK_DETAILS_ENCRYPTION_KEY is invalid base64", status_code=500) from exc
    if len(key) != 32:
        raise AppError("BANK_DETAILS_ENCRYPTION_KEY must decode to 32 bytes", status_code=500)
    return key


def _aesgcm() -> AESGCM:
    raw = os.getenv(_ENV_KEY)
    if not raw:
        raise AppError("BANK_DETAILS_ENCRYPTION_KEY is not configured", status_code=500)
    return AESGCM(_decode_key(raw))


def encrypt_field(plaintext: str) -> bytes:
    nonce = os.urandom(12)
    ciphertext = _aesgcm().encrypt(nonce, plaintext.encode("utf-8"), None)
    return nonce + ciphertext


def decrypt_field(blob: bytes) -> str:
    if not blob or len(blob) < 13:
        raise AppError("Invalid encrypted bank account payload", status_code=500)
    nonce, ciphertext = blob[:12], blob[12:]
    return _aesgcm().decrypt(nonce, ciphertext, None).decode("utf-8")
