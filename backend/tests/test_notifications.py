from __future__ import annotations

import secrets
import uuid
from datetime import timedelta

from fastapi.testclient import TestClient
from sqlalchemy import JSON, Boolean, Column, DateTime, MetaData, String, Table
from sqlalchemy.orm import Session

from app.core import utcnow
from app.core.config import settings
from app.core.security import hash_password, hash_token
from app.models.auth import AuthSession, Profile
from app.models.auth import UserCredential as User


def _notifications_table(db: Session) -> Table:
    metadata = MetaData()
    table = Table(
        "notifications",
        metadata,
        Column("id", String(36), primary_key=True),
        Column("user_id", String(36), nullable=False),
        Column("title", String(255), nullable=False),
        Column("message", String, nullable=False),
        Column("type", String(100), nullable=False),
        Column("read", Boolean, nullable=False),
        Column("created_at", DateTime, nullable=False),
        Column("updated_at", DateTime),
        Column("metadata", JSON),
    )
    metadata.create_all(db.get_bind())
    return table


def _auth(client: TestClient, db: Session) -> Profile:
    client.cookies.delete(settings.auth_cookie_name)
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
        full_name="Notifications User",
        role="super_admin",
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
    client.cookies.set(
        settings.auth_cookie_name,
        jti,
    )
    csrf_token = client.cookies.get(settings.csrf_cookie_name)
    assert csrf_token
    client.headers[settings.csrf_header_name] = csrf_token
    return profile


def test_notifications_are_authenticated_and_scoped_to_the_current_user(
    client: TestClient,
    test_db: Session,
):
    table = _notifications_table(test_db)
    assert client.get("/api/v1/notifications").status_code == 401
    profile = _auth(client, test_db)
    own_id = uuid.uuid4()
    other_id = uuid.uuid4()
    other_user_id = uuid.uuid4()
    test_db.execute(
        table.insert(),
        [
            {
                "id": str(own_id),
                "user_id": profile.id,
                "title": "Own",
                "message": "My message",
                "type": "alert",
                "read": False,
                "created_at": utcnow(),
            },
            {
                "id": str(other_id),
                "user_id": str(other_user_id),
                "title": "Private",
                "message": "Other user's message",
                "type": "alert",
                "read": False,
                "created_at": utcnow(),
            },
        ],
    )
    test_db.commit()

    listed = client.get("/api/v1/notifications")
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()] == [str(own_id)]
    assert client.get("/api/v1/notifications/unread-count").json() == {"count": 1}
    cross_user_update = client.patch(f"/api/v1/notifications/{other_id}/read")
    assert cross_user_update.status_code == 404, cross_user_update.text
    assert client.delete(f"/api/v1/notifications/{other_id}").status_code == 404

    marked = client.patch(f"/api/v1/notifications/{own_id}/read")
    assert marked.status_code == 200
    assert marked.json()["read"] is True
    assert client.get("/api/v1/notifications/unread-count").json() == {"count": 0}

    created = client.post(
        "/api/v1/notifications",
        json={"title": "Created", "message": "Created through API", "type": "client"},
    )
    assert created.status_code == 201
    assert created.json()["user_id"] == profile.id

    assert client.patch("/api/v1/notifications/read-all").json() == {"count": 1}
    assert client.delete(f"/api/v1/notifications/{own_id}").status_code == 204
    assert client.get("/api/v1/notifications/unread-count").json() == {"count": 0}
