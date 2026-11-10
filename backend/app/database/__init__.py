"""Database engine, session factory, and declarative base.

Uses SQLAlchemy 2.x style with PostgreSQL (psycopg3 driver).
The engine is created lazily from settings to avoid connection
attempts at import time (important for tests).
"""

from __future__ import annotations

from collections.abc import Generator
from functools import lru_cache
from typing import Optional

from sqlalchemy import MetaData, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

metadata = MetaData(naming_convention=NAMING_CONVENTION)


class Base(DeclarativeBase):
    metadata = metadata


@lru_cache(maxsize=1)
def get_engine():
    """Lazily create the database engine. Not called at import time."""
    return create_engine(
        settings.effective_database_url(),
        pool_pre_ping=settings.db_pool_pre_ping,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        pool_recycle=settings.db_pool_recycle,
        future=True,
    )


_SessionLocal: Optional[sessionmaker] = None


def get_session_factory():
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(bind=get_engine(), autoflush=False, expire_on_commit=False)
    return _SessionLocal


def SessionLocal() -> Session:  # type: ignore[misc]
    """Backward-compatible callable — returns a new session."""
    return get_session_factory()()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a database session per request."""
    factory = get_session_factory()
    db = factory()
    try:
        yield db
    finally:
        db.close()
