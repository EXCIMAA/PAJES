"""Security utilities: password hashing (Argon2id) and JWT session tokens."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta, timezone
from typing import Any

import jwt
from passlib.context import CryptContext

from app.core.config import settings

_pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__time_cost=settings.argon2_time_cost,
    argon2__memory_cost=settings.argon2_memory_cost,
    argon2__parallelism=settings.argon2_parallelism,
)


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return _pwd_context.verify(password, hashed)
    except Exception:
        return False


def create_session_token(user_id: str, role: str | None, jti: str) -> str:
    """Create a signed JWT with a JTI for session revocation."""
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": user_id,
        "role": role,
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.auth_session_ttl_minutes)).timestamp()),
    }
    return jwt.encode(payload, settings.auth_secret_key, algorithm="HS256")


def decode_session_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, settings.auth_secret_key, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def generate_password_reset_token(user_id: str) -> str:
    """Create a short-lived (15 min) token for password reset flows."""
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": user_id,
        "purpose": "password_reset",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=15)).timestamp()),
    }
    return jwt.encode(payload, settings.auth_secret_key, algorithm="HS256")


def decode_password_reset_token(token: str) -> dict[str, Any] | None:
    try:
        payload = jwt.decode(token, settings.auth_secret_key, algorithms=["HS256"])
        if payload.get("purpose") != "password_reset":
            return None
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
