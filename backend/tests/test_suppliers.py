from __future__ import annotations

import secrets
import uuid
from datetime import timedelta

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
)
from sqlalchemy.orm import Session

from app.core import utcnow
from app.core.config import settings
from app.core.security import hash_password, hash_token
from app.models.auth import AuthSession, Profile
from app.models.auth import UserCredential as User


def _supplier_table(db: Session) -> None:
    metadata = MetaData()
    Table(
        "fournisseurs",
        metadata,
        Column("id", String(36), primary_key=True),
        Column("name", String(255), nullable=False),
        Column("alert_date", Date),
        Column("message", String),
        Column("total_depenses", Numeric(15, 2)),
        Column("is_done", Boolean),
        Column("created_at", DateTime),
        Column("updated_at", DateTime),
        Column("created_by", String(36)),
        Column("is_recurring", Boolean),
        Column("recurring_day", Integer),
        Column("last_alert_date", Date),
    )
    metadata.create_all(db.get_bind())


def _auth(client: TestClient, db: Session, role: str) -> Profile:
    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        email=f"{user_id}@test.local",
        password_hash=hash_password("Test1234!"),
        is_active=True,
    )
    profile = Profile(
        id=user_id,
        email=user.email,
        full_name="Supplier User",
        role=role,
    )
    user.profile = profile
    jti = secrets.token_hex(16)
    auth_session = AuthSession(
        user_id=user_id,
        token_hash=hash_token(jti),
        expires_at=utcnow() + timedelta(minutes=settings.auth_session_ttl_minutes),
    )
    db.add_all([user, profile, auth_session])
    db.commit()
    client.cookies.delete(settings.auth_cookie_name)
    client.cookies.set(
        settings.auth_cookie_name,
        jti,
    )
    csrf_token = client.cookies.get(settings.csrf_cookie_name)
    assert csrf_token
    client.headers[settings.csrf_header_name] = csrf_token
    return profile


def test_supplier_crud_permissions_and_alert_state(client: TestClient, test_db: Session):
    _supplier_table(test_db)
    _auth(client, test_db, "junior_audit")
    assert client.get("/api/v1/suppliers").status_code == 403

    client.cookies.delete(settings.auth_cookie_name)
    profile = _auth(client, test_db, "super_admin")
    payload = {
        "name": "Office supplier",
        "alert_date": "2026-12-01",
        "recurring_day": None,
        "is_recurring": False,
        "message": "Monthly invoice",
        "total_depenses": "1250.75",
    }
    created = client.post("/api/v1/suppliers", json=payload)
    assert created.status_code == 201
    supplier = created.json()
    assert supplier["created_by"] == profile.id
    assert supplier["total_depenses"] == "1250.75"

    listed = client.get("/api/v1/suppliers")
    assert listed.status_code == 200
    assert [row["id"] for row in listed.json()] == [supplier["id"]]

    invalid = client.post(
        "/api/v1/suppliers",
        json={**payload, "alert_date": None, "is_recurring": True},
    )
    assert invalid.status_code == 422

    marked = client.patch(
        f"/api/v1/suppliers/{supplier['id']}",
        json={"is_done": True, "last_alert_date": None},
    )
    assert marked.status_code == 200
    assert marked.json()["is_done"] is True

    updated = client.put(
        f"/api/v1/suppliers/{supplier['id']}",
        json={**payload, "name": "Updated supplier", "total_depenses": "1300.00"},
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Updated supplier"
    assert updated.json()["is_done"] is True
    assert updated.json()["last_alert_date"] is None

    assert client.delete(f"/api/v1/suppliers/{supplier['id']}").status_code == 204
    assert client.get("/api/v1/suppliers").json() == []
