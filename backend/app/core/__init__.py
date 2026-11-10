"""Core utilities: logging, time, declarative base shared across models."""

from __future__ import annotations

from datetime import UTC, datetime


def utcnow() -> datetime:
    """UTC-aware now, used consistently across the backend."""
    return datetime.now(UTC)
