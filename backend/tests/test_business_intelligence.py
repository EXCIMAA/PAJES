from __future__ import annotations

import secrets
import uuid
from datetime import date, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Integer,
    MetaData,
    Numeric,
    String,
    Table,
    create_engine,
)
from sqlalchemy.orm import Session, sessionmaker

from app.core import utcnow
from app.core.config import settings
from app.core.security import hash_password, hash_token
from app.models.auth import AuthSession, Profile
from app.models.auth import UserCredential as User
from app.services.bi_service import BusinessIntelligenceService


def _create_admin_session(db: Session, client: TestClient) -> None:
    user_id = str(uuid.uuid4())
    email = "bi-admin@test.example"
    user = User(
        id=user_id,
        email=email,
        password_hash=hash_password("Test1234!"),
        is_active=True,
    )
    profile = Profile(id=user_id, email=email, full_name="BI Admin", role="super_admin")
    user.profile = profile
    jti = secrets.token_hex(16)
    auth_session = AuthSession(
        user_id=user_id,
        token_hash=hash_token(jti),
        expires_at=utcnow() + timedelta(minutes=settings.auth_session_ttl_minutes),
    )
    db.add_all([user, profile, auth_session])
    db.commit()
    client.cookies.set(
        settings.auth_cookie_name,
        jti,
    )


def test_business_intelligence_requires_authentication(client: TestClient):
    response = client.get("/api/v1/business-intelligence/overview")
    assert response.status_code == 401
    assert client.get("/api/v1/business-intelligence/dashboard").status_code == 401


def test_business_intelligence_enforces_existing_role_permissions(
    client: TestClient,
    test_db: Session,
):
    user_id = str(uuid.uuid4())
    email = "bi-no-role@test.example"
    user = User(
        id=user_id,
        email=email,
        password_hash=hash_password("Test1234!"),
        is_active=True,
    )
    profile = Profile(id=user_id, email=email, full_name="No BI Role", role="unassigned")
    user.profile = profile
    jti = secrets.token_hex(16)
    auth_session = AuthSession(
        user_id=user_id,
        token_hash=hash_token(jti),
        expires_at=utcnow() + timedelta(minutes=settings.auth_session_ttl_minutes),
    )
    test_db.add_all([user, profile, auth_session])
    test_db.commit()
    client.cookies.set(
        settings.auth_cookie_name,
        jti,
    )

    response = client.get("/api/v1/business-intelligence/overview")
    assert response.status_code == 403
    assert client.get("/api/v1/business-intelligence/dashboard").status_code == 403


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
    csrf_token = client.cookies.get(settings.csrf_cookie_name)
    assert csrf_token
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


def test_dashboard_uses_database_metrics_and_respects_module_permissions():
    engine = create_engine("sqlite://")
    metadata = MetaData()
    missions = Table(
        "weekly_missions",
        metadata,
        Column("id", String, primary_key=True),
        Column("status", String),
        Column("client_name", String),
        Column("progress", Integer),
    )
    review_notes = Table(
        "review_notes",
        metadata,
        Column("id", String, primary_key=True),
        Column("status", String),
    )
    findings = Table(
        "findings",
        metadata,
        Column("id", String, primary_key=True),
        Column("status", String),
        Column("risk_level", String),
    )
    clients = Table(
        "clients",
        metadata,
        Column("id", String, primary_key=True),
        Column("name", String),
        Column("status", String),
    )
    stock = Table(
        "stock_items",
        metadata,
        Column("id", String, primary_key=True),
        Column("remaining_value", Numeric),
    )
    assets = Table(
        "fixed_assets",
        metadata,
        Column("id", String, primary_key=True),
        Column("status", String),
        Column("purchase_value", Numeric),
        Column("useful_life_years", Integer),
        Column("acquisition_date", Date),
        Column("currency", String),
    )
    expenses = Table(
        "expense_reports",
        metadata,
        Column("id", String, primary_key=True),
        Column("status", String),
    )
    invoices = Table(
        "invoices",
        metadata,
        Column("id", String, primary_key=True),
        Column("client_id", String),
        Column("status", String),
        Column("total_general", Numeric),
        Column("currency", String),
        Column("date_emission", Date),
        Column("archived", Boolean),
    )
    notifications = Table(
        "notifications",
        metadata,
        Column("id", String, primary_key=True),
        Column("user_id", String),
        Column("title", String),
        Column("message", String),
        Column("created_at", DateTime),
    )
    metadata.create_all(engine)
    today = date.today()
    with engine.begin() as connection:
        connection.execute(
            missions.insert(),
            [
                {
                    "id": "m1",
                    "status": "in_progress",
                    "client_name": "Client A",
                    "progress": 70,
                },
                {
                    "id": "m2",
                    "status": "Terminé",
                    "client_name": "Client B",
                    "progress": 100,
                },
            ],
        )
        connection.execute(
            review_notes.insert(),
            [{"id": "r1", "status": "open"}, {"id": "r2", "status": "closed"}],
        )
        connection.execute(
            findings.insert(),
            [{"id": "f1", "status": "open", "risk_level": "high"}],
        )
        connection.execute(
            clients.insert(),
            [{"id": "c1", "name": "Client A", "status": "active"}],
        )
        connection.execute(stock.insert(), [{"id": "s1", "remaining_value": 250}])
        connection.execute(
            assets.insert(),
            [
                {
                    "id": "a1",
                    "status": "Active",
                    "purchase_value": 100,
                    "useful_life_years": 10,
                    "acquisition_date": date(today.year - 2, 1, 1),
                    "currency": "XAF",
                }
            ],
        )
        connection.execute(
            expenses.insert(),
            [{"id": "e1", "status": "soumis"}, {"id": "e2", "status": "paid"}],
        )
        connection.execute(
            invoices.insert(),
            [
                {
                    "id": "i1",
                    "client_id": "c1",
                    "status": "sent",
                    "total_general": 100,
                    "currency": "XAF",
                    "date_emission": today,
                    "archived": False,
                },
                {
                    "id": "i2",
                    "client_id": "c1",
                    "status": "paid",
                    "total_general": 50,
                    "currency": "XAF",
                    "date_emission": today,
                    "archived": False,
                },
                {
                    "id": "i3",
                    "client_id": "c1",
                    "status": "cancelled",
                    "total_general": 900,
                    "currency": "XAF",
                    "date_emission": today,
                    "archived": False,
                },
            ],
        )
        connection.execute(
            notifications.insert(),
            [
                {
                    "id": "n1",
                    "user_id": "dashboard-user",
                    "title": "My notification",
                    "message": "Visible only to me",
                    "created_at": datetime.now(),
                },
                {
                    "id": "n2",
                    "user_id": "other-user",
                    "title": "Other notification",
                    "message": "Must stay private",
                    "created_at": datetime.now(),
                },
            ],
        )

    SessionLocal = sessionmaker(bind=engine)
    with SessionLocal() as db:
        allowed = {
            "missions",
            "review_notes",
            "findings",
            "clients",
            "stock",
            "immobilisations",
            "notes_frais",
            "factures",
        }
        result = BusinessIntelligenceService(db).dashboard("dashboard-user", allowed)
        assert result["metrics"]["active_engagements"]["value"] == 1
        assert result["metrics"]["open_review_notes"]["value"] == 1
        assert result["metrics"]["open_findings"]["value"] == 1
        assert result["metrics"]["active_clients"]["value"] == 1
        assert result["metrics"]["inventory_value"]["value"] == 250
        assert result["metrics"]["asset_value"]["value"] == pytest.approx(80)
        assert result["metrics"]["open_expenses"]["value"] == 1
        assert result["charts"]["engagements"] == [
            {"name": "Client B", "value": 100},
            {"name": "Client A", "value": 70},
        ]
        assert result["top_clients"][0]["invoiceCount"] == 2
        assert result["top_clients"][0]["averageInvoice"] == 75
        assert result["activities"][0]["id"] == "n1"

        restricted = BusinessIntelligenceService(db).dashboard(
            "dashboard-user", {"missions"}
        )
        assert restricted["metrics"]["active_clients"]["available"] is False
        assert restricted["top_clients"] == []
        assert restricted["charts"]["review_notes"] == []

    engine.dispose()


def test_expense_analytics_uses_existing_french_workflow_statuses():
    engine = create_engine("sqlite://")
    metadata = MetaData()
    expenses = Table(
        "expense_reports",
        metadata,
        Column("id", String, primary_key=True),
        Column("status", String),
        Column("total_ttc", Numeric(15, 2)),
        Column("created_at", DateTime),
    )
    metadata.create_all(engine)
    start_date = date(2026, 11, 1)
    end_date = date(2026, 11, 30)
    with engine.begin() as connection:
        connection.execute(
            expenses.insert(),
            [
                {
                    "id": "submitted",
                    "status": "soumis",
                    "total_ttc": 10,
                    "created_at": datetime(2026, 11, 1),
                },
                {
                    "id": "validated",
                    "status": "valide",
                    "total_ttc": 20,
                    "created_at": datetime(2026, 11, 2),
                },
                {
                    "id": "reimbursed",
                    "status": "rembourse",
                    "total_ttc": 30,
                    "created_at": datetime(2026, 11, 3),
                },
                {
                    "id": "draft",
                    "status": "brouillon",
                    "total_ttc": 40,
                    "created_at": datetime(2026, 11, 4),
                },
            ],
        )
    SessionLocal = sessionmaker(bind=engine)
    with SessionLocal() as db:
        result = BusinessIntelligenceService(db).expenses(start_date, end_date)
        assert result["total"]["available"] is True
        assert result["total"]["value"] == 60
    engine.dispose()
