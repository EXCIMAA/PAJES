from __future__ import annotations

import secrets
import uuid
from datetime import date, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import Column, Date, DateTime, Integer, MetaData, String, Table
from sqlalchemy.orm import Session

from app.core import utcnow
from app.core.config import settings
from app.core.security import hash_password, hash_token
from app.models.auth import AuthSession, Profile
from app.models.auth import UserCredential as User


def _report_tables(db: Session) -> None:
    metadata = MetaData()
    Table(
        "weekly_missions",
        metadata,
        Column("id", Integer, primary_key=True),
        Column("subject", String),
        Column("status", String),
        Column("progress", Integer),
        Column("date", Date),
    )
    Table(
        "leave_requests",
        metadata,
        Column("id", Integer, primary_key=True),
        Column("employee_name", String),
        Column("leave_type", String),
        Column("status", String),
        Column("start_date", Date),
        Column("end_date", Date),
        Column("created_at", DateTime),
    )
    Table(
        "clients",
        metadata,
        Column("id", String(36), primary_key=True),
        Column("name", String),
        Column("created_at", DateTime),
    )
    metadata.create_all(db.get_bind())


def _auth(client: TestClient, db: Session, role: str) -> Profile:
    user_id = str(uuid.uuid4())
    email = f"{user_id}@test.local"
    user = User(
        id=user_id,
        email=email,
        password_hash=hash_password("Test1234!"),
        is_active=True,
    )
    profile = Profile(id=user_id, email=email, full_name="Report User", role=role)
    user.profile = profile
    db.add_all([user, profile])
    db.commit()
    jti = secrets.token_hex(16)
    db.add(
        AuthSession(
            user_id=user_id,
            token_hash=hash_token(jti),
            expires_at=utcnow() + timedelta(minutes=settings.auth_session_ttl_minutes),
        )
    )
    db.commit()
    client.cookies.set(
        settings.auth_cookie_name,
        jti,
    )
    csrf_token = client.cookies.get(settings.csrf_cookie_name)
    assert csrf_token
    client.headers[settings.csrf_header_name] = csrf_token
    return profile


def test_report_catalog_is_allowlisted_and_requires_permission(
    client: TestClient, test_db: Session
):
    _report_tables(test_db)
    _auth(client, test_db, "super_admin")

    response = client.get("/api/v1/reports/catalog")

    assert response.status_code == 200
    assert {row["id"] for row in response.json()} == {
        "missions",
        "leave_requests",
        "clients",
    }


def test_standard_reports_return_only_configured_columns(
    client: TestClient, test_db: Session
):
    _report_tables(test_db)
    _auth(client, test_db, "super_admin")
    test_db.execute(
        Table("weekly_missions", MetaData(), autoload_with=test_db.get_bind())
        .insert()
        .values(subject="Field work", status="open", progress=25, date=date(2026, 5, 2))
    )
    test_db.commit()

    response = client.get("/api/v1/reports/standard/audit")

    assert response.status_code == 200
    assert response.json() == {
        "items": [
            {
                "subject": "Field work",
                "status": "open",
                "progress": 25,
                "date": "2026-05-02",
            }
        ],
        "truncated": False,
    }


def test_custom_report_applies_inclusive_dates_and_limit(
    client: TestClient, test_db: Session
):
    _report_tables(test_db)
    _auth(client, test_db, "super_admin")
    table = Table("clients", MetaData(), autoload_with=test_db.get_bind())
    test_db.execute(
        table.insert(),
        [
            {"id": "inside", "name": "Inside", "created_at": datetime(2026, 5, 2, 23, 59)},
            {"id": "outside", "name": "Outside", "created_at": datetime(2026, 5, 3)},
        ],
    )
    test_db.commit()

    response = client.post(
        "/api/v1/reports/custom",
        json={
            "modules": ["clients"],
            "start_date": "2026-05-01",
            "end_date": "2026-05-02",
            "ignore_dates": False,
            "limit": 1,
        },
    )

    assert response.status_code == 200
    assert response.json()["data"]["clients"][0]["id"] == "inside"
    assert response.json()["truncated"] == []


def test_custom_report_rejects_unknown_modules_and_enforces_permissions(
    client: TestClient, test_db: Session
):
    _report_tables(test_db)
    _auth(client, test_db, "super_admin")
    unknown = client.post(
        "/api/v1/reports/custom",
        json={"modules": ["users"], "ignore_dates": True},
    )
    assert unknown.status_code == 404

    client.cookies.delete(settings.auth_cookie_name)
    _auth(client, test_db, "junior_audit")
    denied = client.post(
        "/api/v1/reports/custom",
        json={"modules": ["leave_requests"], "ignore_dates": True},
    )
    assert denied.status_code == 403
