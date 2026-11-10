from __future__ import annotations

import secrets
import uuid
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Boolean, Column, Date, DateTime, MetaData, Numeric, String, Table
from sqlalchemy.orm import Session

from app.core import utcnow
from app.core.config import settings
from app.core.security import create_session_token, hash_password
from app.models.auth import AuthSession, Profile, User
from app.services.bi_service import BusinessIntelligenceService


def _create_admin_session(db: Session, client: TestClient) -> None:
    user_id = str(uuid.uuid4())
    email = "bi-admin@test.example"
    user = User(id=user_id, email=email, password_hash=hash_password("Test1234!"))
    profile = Profile(id=user_id, email=email, full_name="BI Admin", role="super_admin")
    jti = secrets.token_hex(16)
    auth_session = AuthSession(
        user_id=user_id,
        token_jti=jti,
        expires_at=utcnow() + timedelta(minutes=settings.auth_session_ttl_minutes),
    )
    db.add_all([user, profile, auth_session])
    db.commit()
    client.cookies.set(
        settings.auth_cookie_name,
        create_session_token(user_id, profile.role, jti),
    )


def test_business_intelligence_requires_authentication(client: TestClient):
    response = client.get("/api/v1/business-intelligence/overview")
    assert response.status_code == 401


def test_business_intelligence_enforces_existing_role_permissions(
    client: TestClient,
    test_db: Session,
):
    user_id = str(uuid.uuid4())
    email = "bi-no-role@test.example"
    user = User(id=user_id, email=email, password_hash=hash_password("Test1234!"))
    profile = Profile(id=user_id, email=email, full_name="No BI Role", role=None)
    jti = secrets.token_hex(16)
    auth_session = AuthSession(
        user_id=user_id,
        token_jti=jti,
        expires_at=utcnow() + timedelta(minutes=settings.auth_session_ttl_minutes),
    )
    test_db.add_all([user, profile, auth_session])
    test_db.commit()
    client.cookies.set(
        settings.auth_cookie_name,
        create_session_token(user_id, profile.role, jti),
    )

    response = client.get("/api/v1/business-intelligence/overview")
    assert response.status_code == 403


def test_overview_reports_missing_business_tables_without_fabricating_data(
    client: TestClient,
    test_db: Session,
):
    _create_admin_session(test_db, client)
    response = client.get("/api/v1/business-intelligence/overview")
    assert response.status_code == 200
    result = response.json()
    assert result["metrics"]["revenue"]["available"] is False
    assert result["metrics"]["revenue"]["value"] is None
    assert result["sources"]["invoices"]["available"] is False


def test_reports_are_explicitly_unconfigured_when_credentials_are_missing(
    client: TestClient,
    test_db: Session,
):
    _create_admin_session(test_db, client)
    response = client.get("/api/v1/business-intelligence/reports")
    assert response.status_code == 200
    assert response.json() == {"configured": False, "reports": []}


def test_unknown_report_id_is_rejected_before_powerbi_request(
    client: TestClient,
    test_db: Session,
    monkeypatch,
):
    _create_admin_session(test_db, client)
    monkeypatch.setattr(settings, "powerbi_tenant_id", "test-tenant")
    monkeypatch.setattr(settings, "powerbi_client_id", "test-client")
    monkeypatch.setattr(settings, "powerbi_client_secret", "test-secret")
    monkeypatch.setattr(settings, "powerbi_workspace_id", "test-workspace")
    monkeypatch.setattr(settings, "powerbi_default_report_id", "configured-report")
    response = client.get("/api/v1/business-intelligence/reports/not-allowlisted")
    assert response.status_code == 404


def test_embed_token_is_not_generated_when_powerbi_is_unconfigured(
    client: TestClient,
    test_db: Session,
):
    _create_admin_session(test_db, client)
    csrf_token = secrets.token_hex(32)
    client.cookies.set(settings.csrf_cookie_name, csrf_token)
    client.headers[settings.csrf_header_name] = csrf_token
    response = client.post("/api/v1/business-intelligence/reports/configured-report/embed-token")
    assert response.status_code == 503


def test_date_range_validation_rejects_reversed_period(
    client: TestClient,
    test_db: Session,
):
    _create_admin_session(test_db, client)
    response = client.get(
        "/api/v1/business-intelligence/overview",
        params={"start_date": "2026-12-01", "end_date": "2026-01-01"},
    )
    assert response.status_code == 422


def test_financial_analytics_keeps_currency_totals_separate(test_db: Session):
    metadata = MetaData()
    invoices = Table(
        "invoices",
        metadata,
        Column("id", String, primary_key=True),
        Column("client_id", String),
        Column("date_emission", Date),
        Column("created_at", DateTime),
        Column("total_ttc", Numeric(14, 2)),
        Column("acompte_regle", Numeric(14, 2)),
        Column("currency", String),
        Column("status", String),
        Column("archived", Boolean),
    )
    clients = Table(
        "clients",
        metadata,
        Column("id", String, primary_key=True),
        Column("name", String),
        Column("status", String),
        Column("created_at", DateTime),
    )
    metadata.create_all(test_db.get_bind())
    test_db.execute(
        clients.insert(),
        [{"id": "client-1", "name": "Fictional Client", "status": "active"}],
    )
    test_db.execute(
        invoices.insert(),
        [
            {
                "id": "invoice-xaf-paid",
                "client_id": "client-1",
                "date_emission": date(2026, 2, 1),
                "total_ttc": 100,
                "acompte_regle": 0,
                "currency": "XAF",
                "status": "paid",
                "archived": False,
            },
            {
                "id": "invoice-xaf-open",
                "client_id": "client-1",
                "date_emission": date(2026, 2, 3),
                "total_ttc": 80,
                "acompte_regle": 20,
                "currency": "XAF",
                "status": "sent",
                "archived": False,
            },
            {
                "id": "invoice-usd-paid",
                "client_id": "client-1",
                "date_emission": date(2026, 2, 5),
                "total_ttc": 50,
                "acompte_regle": 0,
                "currency": "USD",
                "status": "paid",
                "archived": False,
            },
        ],
    )
    test_db.commit()

    result = BusinessIntelligenceService(test_db).overview(
        date(2026, 2, 1),
        date(2026, 2, 28),
        {"factures", "clients"},
    )
    assert result["metrics"]["revenue"]["value"] is None
    assert result["metrics"]["revenue"]["by_currency"] == {"XAF": 100.0, "USD": 50.0}
    assert result["metrics"]["outstanding_invoices"]["value"] == 60.0
    assert result["metrics"]["outstanding_invoices"]["currency"] == "XAF"
    assert result["metrics"]["gross_profit"]["available"] is False
    assert result["metrics"]["collection_rate"]["by_currency"]["XAF"] == pytest.approx(55.5556)
    assert result["charts"]["comparison_available"] is False
    assert result["charts"]["revenue"] == []
