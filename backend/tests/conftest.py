"""Test fixtures for auth tests.

Uses SQLite in-memory as the test database so tests can run without MySQL.
The engine/session are overridden via FastAPI dependency injection.
StaticPool ensures all sessions share the same in-memory SQLite connection.
"""

from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.auth import AuthSession, Profile, RolePermission, User  # noqa: F401


@pytest.fixture()
def test_engine():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)


@pytest.fixture()
def test_db(test_engine) -> Generator[Session, None, None]:
    TestSession = sessionmaker(bind=test_engine, autoflush=False, expire_on_commit=False)
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def client(test_db: Session) -> Generator[TestClient, None, None]:
    def _override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = _override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def client_no_db() -> Generator[TestClient, None, None]:
    """Client for tests that don't touch the database (health checks)."""
    with TestClient(app) as c:
        yield c
