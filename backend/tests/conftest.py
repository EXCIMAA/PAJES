"""Test fixtures for auth tests.

Uses SQLite in-memory as the test database so tests can run without MySQL.
The engine/session are overridden via FastAPI dependency injection.
StaticPool ensures all sessions share the same in-memory SQLite connection.
"""

from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.database import Base, get_db
from app.main import api_app, create_app
from app.models.auth import (  # noqa: F401
    AccountActivationToken,
    AuthSession,
    PasswordResetToken,
    Profile,
    RolePermission,
    UserCredential,
)
from app.services.email_service import clear_development_mailbox


@pytest.fixture(autouse=True)
def isolated_auth_email(monkeypatch):
    monkeypatch.setattr(settings, "app_env", "development")
    monkeypatch.setattr(settings, "email_provider", "none")
    clear_development_mailbox()
    yield
    clear_development_mailbox()


@pytest.fixture()
def test_engine():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    ).execution_options(schema_translate_map={"public": None})
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE auth_users (id TEXT PRIMARY KEY, email TEXT)"))
        connection.execute(
            text("CREATE VIEW users AS SELECT id, email, '' AS role FROM auth_users")
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
    test_app = create_app()
    request_sessions = sessionmaker(
        bind=test_db.get_bind(),
        autoflush=False,
        expire_on_commit=False,
    )

    def _override_get_db():
        db = request_sessions()
        try:
            yield db
        finally:
            db.close()

    test_app.dependency_overrides[get_db] = _override_get_db
    with TestClient(test_app) as c:
        response = c.get("/api/v1/health")
        csrf_token = response.headers["X-CSRF-Token"]
        c.headers["X-CSRF-Token"] = csrf_token
        yield c
    test_app.dependency_overrides.clear()


@pytest.fixture()
def client_no_db() -> Generator[TestClient, None, None]:
    """Client for tests that don't touch the database (health checks)."""
    with TestClient(api_app) as c:
        yield c
