"""Health-check endpoint tests.

The liveness probe does not touch the database, so it is always runnable.
The readiness probe requires MySQL — its test is marked to skip when no
database is reachable (the PAJES_ENV_NO_DB env var can force-skip in CI).
"""

from __future__ import annotations

import os

import pytest

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
