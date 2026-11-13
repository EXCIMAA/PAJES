"""Password hashing and opaque authentication-token helpers."""

from __future__ import annotations

import hashlib
import secrets

from passlib.context import CryptContext
from passlib.exc import InvalidHashError, UnknownHashError

from app.core.config import settings

_pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__type="ID",
    argon2__time_cost=settings.argon2_time_cost,
    argon2__memory_cost=settings.argon2_memory_cost,
    argon2__parallelism=settings.argon2_parallelism,
)


def hash_password(password: str) -> str:
    return _pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    try:
        return _pwd_context.verify(password, hashed)
    except (InvalidHashError, UnknownHashError, ValueError):
        return False


def create_opaque_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
