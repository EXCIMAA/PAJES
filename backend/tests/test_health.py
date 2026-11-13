"""Health-check endpoint tests.

The liveness probe does not touch the database, so it is always runnable.
The readiness probe requires MySQL — its test is marked to skip when no
database is reachable (the PAJES_ENV_NO_DB env var can force-skip in CI).
"""

from __future__ import annotations

import os

import pytest
from sqlalchemy.exc import OperationalError

from app.database import get_db

NO_DB = os.environ.get("PAJES_ENV_NO_DB", "0") == "1"


def test_liveness_ok(client_no_db):
    r = client_no_db.get("/api/v1/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "version" in body


def test_liveness_has_app_name(client_no_db):
    r = client_no_db.get("/api/v1/health")
    assert r.json()["app"]


def test_readiness_returns_service_unavailable_without_database_details(client_no_db):
    class UnavailableDatabase:
        def execute(self, _statement):
            raise OperationalError("SELECT 1", {}, Exception("sensitive connection detail"))

    def override_get_db():
        yield UnavailableDatabase()

    from app.main import api_app

    api_app.dependency_overrides[get_db] = override_get_db
    try:
        response = client_no_db.get("/api/v1/health/ready")
    finally:
        api_app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 503
    assert response.json() == {
        "status": "degraded",
        "db": {"ok": False, "detail": "database unavailable"},
        "code": 503,
    }
    assert "sensitive connection detail" not in response.text


@pytest.mark.skipif(NO_DB, reason="no database configured in this environment")
def test_readiness_needs_db():
    """Readiness hits the DB; skipped where MySQL is unavailable.

    This test is intentionally not run inside the Bolt sandbox. It is
    here for the operator's local environment where MySQL is available.
    To run it locally: `PAJES_ENV_NO_DB=0` (or unset) with a live DB.
    """
    from fastapi.testclient import TestClient

    from app.main import app

    with TestClient(app) as c:
        r = c.get("/api/v1/health/ready")
    assert r.status_code in (200, 503)
    body = r.json()
    assert "db" in body
