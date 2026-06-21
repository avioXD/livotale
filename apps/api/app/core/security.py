import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

from jose import JWTError, jwt

from app.core.config import get_settings

KEY_LENGTH = 64
REFRESH_TOKEN_TTL_DAYS = 30


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1, dklen=KEY_LENGTH)
    return f"scrypt${salt}${key.hex()}"


def verify_password(password: str, stored_hash: str | None) -> bool:
    if not password or not stored_hash:
        return False
    parts = stored_hash.split("$")
    if len(parts) != 3 or parts[0] != "scrypt":
        return False
    _, salt, stored_key = parts
    candidate = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1, dklen=KEY_LENGTH)
    try:
        return hmac.compare_digest(candidate.hex(), stored_key)
    except ValueError:
        return False


def _expires_delta() -> timedelta:
    raw = get_settings().jwt_expires_in
    if raw.endswith("h"):
        return timedelta(hours=int(raw[:-1]))
    if raw.endswith("m"):
        return timedelta(minutes=int(raw[:-1]))
    if raw.endswith("d"):
        return timedelta(days=int(raw[:-1]))
    return timedelta(hours=8)


def sign_access_token(
    subject: str,
    roles: list[str],
    username: str | None = None,
    *,
    active_role: str | None = None,
) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": subject,
        "roles": roles,
        "iat": int(now.timestamp()),
        "exp": int((now + _expires_delta()).timestamp()),
        "iss": settings.jwt_issuer,
    }
    if username:
        payload["username"] = username
    if active_role:
        payload["activeRole"] = active_role
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def sign_refresh_token(subject: str) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": subject,
        "type": "refresh",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=30)).timestamp()),
        "iss": settings.jwt_issuer,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def verify_access_token(token: str) -> dict:
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"], issuer=settings.jwt_issuer)


def verify_refresh_token(token: str) -> dict:
    payload = verify_access_token(token)
    if payload.get("type") != "refresh":
        raise JWTError("Invalid refresh token")
    return payload


def assert_password_policy(password: str) -> None:
    from app.core.exceptions import AppError

    if not password:
        raise AppError("Password is required")
    if len(password) < 8:
        raise AppError("Password must be at least 8 characters")
    if len(password) > 128:
        raise AppError("Password must be at most 128 characters")
    if not any(c.islower() for c in password):
        raise AppError("Password must include a lowercase letter")
    if not any(c.isupper() for c in password):
        raise AppError("Password must include an uppercase letter")
    if not any(c.isdigit() for c in password):
        raise AppError("Password must include a number")
    if not any(not c.isalnum() for c in password):
        raise AppError("Password must include a special character")
