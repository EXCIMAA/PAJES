from __future__ import annotations

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
    String,
    Table,
    Text,
    text,
)
from sqlalchemy.orm import Session

from app.core import utcnow
from app.core.config import settings
from app.core.security import create_opaque_token, hash_password, hash_token
from app.models.auth import AuthSession, Profile
from app.models.auth import UserCredential as User


def _client_tables(db: Session) -> None:
    metadata = MetaData()
    Table(
        "clients",
        metadata,
        Column("id", String(36), primary_key=True),
        Column("client_code", String(20)),
        Column("name", String(255), nullable=False),
        Column("country", String(10)),
        Column("nature", Text),
        Column("manager_name", String(255)),
        Column("created_by", String(36)),
        Column("created_at", DateTime),
        Column("updated_at", DateTime),
    )
    for table_name in (
        "ref_formes_juridiques",
        "ref_statuts_fiscaux",
        "ref_regimes_fiscaux",
        "ref_natures",
        "ref_categories_documents",
    ):
        Table(
            table_name,
            metadata,
            Column("id", Integer, primary_key=True),
            Column("label", String),
        )
    Table(
        "ref_taxes",
        metadata,
        Column("id", Integer, primary_key=True),
        Column("code", String),
        Column("libelle", String),
        Column("obligation", Text),
        Column("deadline", Text),
        Column("assujettis_condition", Text),
        Column("legal_ref", Text),
        Column("periodicite", Text),
    )
    Table(
        "ref_documents",
        metadata,
        Column("id", Integer, primary_key=True),
        Column("category_id", Integer),
        Column("label", String),
    )
    Table(
        "client_documents",
        metadata,
        Column("id", Integer, primary_key=True, autoincrement=True),
        Column("client_id", String(36)),
        Column("document_id", Integer),
        Column("status", String),
        Column("date_fourni", Date),
        Column("commentaire", Text),
    )
    Table(
        "client_taxes",
        metadata,
        Column("id", Integer, primary_key=True, autoincrement=True),
        Column("client_id", String(36)),
        Column("taxe_id", Integer),
        Column("assujetti", Boolean),
        Column("date_derniere_declaration", Date),
        Column("commentaire", Text),
    )
    Table(
        "etablissements",
        metadata,
        Column("id", String(36), primary_key=True),
        Column("client_id", String(36)),
        Column("code", String(20)),
        Column("name", String(255), nullable=False),
        Column("type", String(100), nullable=False),
        Column("address", Text),
        Column("city", String(100)),
        Column("region", String(100)),
        Column("country", String(100)),
        Column("phone", String(50)),
        Column("email", String(255)),
        Column("responsable", String(255)),
        Column("date_ouverture", Date),
        Column("is_active", Boolean),
        Column("latitude", String(30)),
        Column("longitude", String(30)),
        Column("notes", Text),
        Column("created_at", DateTime),
        Column("updated_at", DateTime),
    )
    metadata.create_all(db.get_bind())


def _auth(client: TestClient, db: Session, role: str) -> Profile:
    user_id = str(uuid.uuid4())
    email = f"{user_id}@test.local"
    user = User(id=user_id, email=email, password_hash=hash_password("Test1234!"), is_active=True)
    profile = Profile(id=user_id, email=email, full_name="Test User", role=role)
    user.profile = profile
    db.add_all([user, profile])
    db.commit()
    token = create_opaque_token()
    session = AuthSession(
        user_id=user_id,
        token_hash=hash_token(token),
        expires_at=utcnow() + timedelta(minutes=settings.auth_session_ttl_minutes),
    )
    db.add(session)
    db.commit()
    client.cookies.set("pajes_session", token)
    csrf_token = client.cookies.get("pajes_csrf")
    assert csrf_token
    client.headers["X-CSRF-Token"] = csrf_token
    return profile


def test_clients_require_authentication(client: TestClient, test_db: Session):
    _client_tables(test_db)
    response = client.get("/api/v1/clients")
    assert response.status_code == 401


def test_clients_endpoint_enforces_existing_role_permissions(
    client: TestClient, test_db: Session
):
    _client_tables(test_db)
    _auth(client, test_db, "junior_audit")
    response = client.get("/api/v1/clients")
    assert response.status_code == 403


def test_clients_crud_links_and_establishments(
    client: TestClient, test_db: Session
):
    _client_tables(test_db)
    admin = _auth(client, test_db, "super_admin")
    test_db.execute(
        text(
            "INSERT INTO ref_categories_documents (id, label) VALUES (1, 'Juridique')"
        )
    )
    test_db.execute(
        text(
            "INSERT INTO ref_documents (id, category_id, label) "
            "VALUES (1, 1, 'Statuts')"
        )
    )
    test_db.execute(
        text(
            "INSERT INTO ref_taxes (id, code, libelle, obligation, deadline, "
            "assujettis_condition, legal_ref, periodicite) "
            "VALUES (1, 'TVA', 'TVA', '', '', '', '', 'mensuelle')"
        )
    )
    test_db.commit()

    created = client.post(
        "/api/v1/clients",
        json={"name": "Regression client", "client_code": "TST00001", "country": "CMR"},
    )
    assert created.status_code == 201, created.text
    client_id = created.json()["id"]
    assert created.json()["created_by"] == admin.id

    listed = client.get("/api/v1/clients?search=Regression")
    assert listed.status_code == 200
    assert [row["id"] for row in listed.json()] == [client_id]
    next_code = client.get("/api/v1/clients/next-code?country=CMR")
    assert next_code.status_code == 200
    assert next_code.json()["client_code"] == "CMR00001"

    references = client.get("/api/v1/clients/references")
    assert references.status_code == 200
    assert references.json()["documents"][0]["ref_categories_documents"]["label"] == "Juridique"

    saved_links = client.put(
        f"/api/v1/clients/{client_id}/links",
        json={
            "documents": [{"document_id": 1, "status": "fourni"}],
            "taxes": [{"taxe_id": 1, "assujetti": True}],
        },
    )
    assert saved_links.status_code == 200, saved_links.text
    assert saved_links.json()["documents"][0]["status"] == "fourni"
    assert saved_links.json()["taxes"][0]["assujetti"] is True

    establishment = client.post(
        f"/api/v1/clients/{client_id}/establishments",
        json={"name": "Head office", "type": "siege", "code": "ETS001"},
    )
    assert establishment.status_code == 201, establishment.text
    establishment_id = establishment.json()["id"]
    assert (
        client.get(
            f"/api/v1/clients/{client_id}/establishments?active_only=true"
        ).json()[0]["id"]
        == establishment_id
    )

    updated = client.put(
        f"/api/v1/clients/{client_id}",
        json={"name": "Regression client updated", "country": "FRA"},
    )
    assert updated.status_code == 200
    assert updated.json()["name"] == "Regression client updated"

    assert client.delete(
        f"/api/v1/clients/{client_id}/establishments/{establishment_id}"
    ).status_code == 204
    assert client.delete(f"/api/v1/clients/{client_id}").status_code == 204
