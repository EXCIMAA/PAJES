from __future__ import annotations

import secrets
import uuid
from datetime import date, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    Date,
    DateTime,
    Integer,
    MetaData,
    Numeric,
    String,
    Table,
    text,
)
from sqlalchemy.orm import Session

from app.core import utcnow
from app.core.config import settings
from app.core.security import hash_password, hash_token
from app.models.auth import AuthSession, Profile
from app.models.auth import UserCredential as User


def _invoice_tables(db: Session) -> None:
    metadata = MetaData()
    Table(
        "clients",
        metadata,
        Column("id", String(36), primary_key=True),
        Column("name", String(255), nullable=False),
        Column("address_bp", String(255)),
        Column("nui", String(100)),
        Column("rccm", String(100)),
        Column("contract_ref", String(100)),
        Column("country", String(10)),
    )
    Table(
        "invoices",
        metadata,
        Column("id", String(36), primary_key=True),
        Column("invoice_number", String(50)),
        Column("ref_pf", String(50)),
        Column("date_emission", Date),
        Column("date_contrat", Date),
        Column("client_id", String(36)),
        Column("created_by", String(36)),
        Column("total_general", Numeric(14, 2)),
        Column("total_ht", Numeric(14, 2)),
        Column("total_tva", Numeric(14, 2)),
        Column("total_ttc", Numeric(14, 2)),
        Column("total_retenues", Numeric(14, 2)),
        Column("total_debours", Numeric(14, 2)),
        Column("acompte_regle", Numeric(14, 2)),
        Column("payment_method", String(100)),
        Column("status", String(20)),
        Column("currency", String(3)),
        Column("invoice_type", String(20)),
        Column("country", String(10)),
        Column("archived", Boolean, default=False),
        Column("client_details_snapshot", JSON),
        Column("signature_company", String(255)),
        Column("signature_client", String(255)),
        Column("created_at", DateTime),
        Column("updated_at", DateTime),
    )
    Table(
        "invoice_lines",
        metadata,
        Column("id", String(36), primary_key=True),
        Column("invoice_id", String(36), nullable=False),
        Column("section", String(20)),
        Column("designation", String(255)),
        Column("unite", Numeric(14, 2)),
        Column("taux", Numeric(14, 2)),
        Column("montant", Numeric(14, 2)),
        Column("sort_order", Integer),
        Column("comments", String),
    )
    metadata.create_all(db.get_bind())


def _authenticate(client: TestClient, db: Session, role: str) -> str:
    user_id = str(uuid.uuid4())
    email = f"{user_id}@test.local"
    db.add_all(
        [
            User(
                id=user_id,
                email=email,
                password_hash=hash_password("Test1234!"),
                is_active=True,
            ),
            Profile(id=user_id, email=email, full_name="Invoice Test", role=role),
        ]
    )
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
    client.cookies.set("pajes_session", jti)
    csrf_token = client.cookies.get("pajes_csrf")
    assert csrf_token
    client.headers["X-CSRF-Token"] = csrf_token
    return user_id


def test_invoice_list_detail_status_and_archive(client: TestClient, test_db: Session):
    _invoice_tables(test_db)
    _authenticate(client, test_db, "super_admin")
    invoice_id = str(uuid.uuid4())
    test_db.execute(
        text(
            "INSERT INTO invoices (id, invoice_number, date_emission, total_general, "
            "status, currency, invoice_type, country, archived, "
            "client_details_snapshot, created_at) "
            "VALUES (:id, :invoice_number, :date_emission, :total_general, "
            ":status, :currency, :invoice_type, :country, :archived, "
            ":client_details_snapshot, :created_at)"
        ),
        {
            "id": invoice_id,
            "invoice_number": "FAC-001",
            "date_emission": date(2026, 1, 2),
            "total_general": 119.25,
            "status": "draft",
            "currency": "XAF",
            "invoice_type": "FACTURE",
            "country": "CM",
            "archived": False,
            "client_details_snapshot": '{"name": "Client A"}',
            "created_at": utcnow(),
        },
    )
    test_db.execute(
        text(
            "INSERT INTO invoice_lines "
            "(id, invoice_id, section, designation, unite, taux, montant, sort_order) "
            "VALUES (:id, :invoice_id, :section, :designation, :unite, :taux, "
            ":montant, :sort_order)"
        ),
        {
            "id": str(uuid.uuid4()),
            "invoice_id": invoice_id,
            "section": "HONORAIRES",
            "designation": "Audit",
            "unite": 1,
            "taux": 100,
            "montant": 100,
            "sort_order": 0,
        },
    )
    test_db.commit()

    listed = client.get("/api/v1/invoices?country=CM&limit=10&offset=0")
    assert listed.status_code == 200
    assert listed.json()["total"] == 1
    assert listed.json()["items"][0]["type_document"] == "FACTURE"

    detail = client.get(f"/api/v1/invoices/{invoice_id}")
    assert detail.status_code == 200
    assert detail.json()["lines"][0]["designation"] == "Audit"

    changed = client.patch(
        f"/api/v1/invoices/{invoice_id}/status", json={"status": "sent"}
    )
    assert changed.status_code == 204
    archived = client.patch(f"/api/v1/invoices/{invoice_id}/archive")
    assert archived.status_code == 204
    assert client.get("/api/v1/invoices?country=CM").json()["total"] == 0


def test_invoice_routes_enforce_permissions(client: TestClient, test_db: Session):
    _invoice_tables(test_db)
    _authenticate(client, test_db, "junior_audit")
    assert client.get("/api/v1/invoices").status_code == 403
    response = client.post(
        "/api/v1/invoices",
        json={
            "date_emission": "2026-03-10",
            "client_id": str(uuid.uuid4()),
            "currency": "XAF",
            "country": "CM",
            "type_document": "FACTURE",
            "initials": "JA",
            "reference_base": "JA10032026",
            "lines": [
                {
                    "section": "HONORAIRES",
                    "designation": "Audit",
                    "unite": 100,
                    "taux": 100,
                    "sort_order": 0,
                }
            ],
        },
    )
    assert response.status_code == 403


def test_invoice_create_and_edit_are_atomic_and_preserve_numbering(
    client: TestClient, test_db: Session
):
    _invoice_tables(test_db)
    _authenticate(client, test_db, "super_admin")
    client_id = str(uuid.uuid4())
    test_db.execute(
        text(
            "INSERT INTO clients (id, name, address_bp, nui, rccm, contract_ref, country) "
            "VALUES (:id, 'Client A', 'BP 1', 'NUI 1', 'RCCM 1', 'CTR 1', 'CM')"
        ),
        {"id": client_id},
    )
    test_db.commit()
    payload = {
        "date_emission": "2026-03-10",
        "date_contrat": "2026-02-01",
        "client_id": client_id,
        "currency": "XAF",
        "country": "CM",
        "type_document": "FACTURE",
        "acompte_regle": "10",
        "payment_method": "virement",
        "signature_company": "AA",
        "signature_client": "Client A",
        "initials": "AA",
        "reference_base": "AA10032026",
        "lines": [
            {
                "section": "HONORAIRES",
                "designation": "Audit",
                "unite": "100",
                "taux": "100",
                "sort_order": 0,
            },
            {
                "section": "RETENUS",
                "designation": "Retenue",
                "unite": None,
                "taux": "0.055",
                "sort_order": 1,
            },
            {
                "section": "DEBOURS",
                "designation": "Frais",
                "unite": "2",
                "taux": "12",
                "sort_order": 2,
            },
        ],
    }

    created = client.post("/api/v1/invoices", json=payload)
    assert created.status_code == 201, created.text
    created_invoice = created.json()["invoice"]
    assert created_invoice["invoice_number"] == "EXCIMAA/FAC03/AA/0000001"
    assert created_invoice["ref_pf"] == "AA10032026-001"
    assert created_invoice["client_details_snapshot"]["name"] == "Client A"
    assert created_invoice["total_ht"] == "100.00"
    assert created_invoice["total_tva"] == "19.25"
    assert created_invoice["total_general"] == "127.75"
    assert [line["montant"] for line in created.json()["lines"]] == [
        "100.00",
        "-5.50",
        "24.00",
    ]

    updated_payload = {
        **payload,
        "lines": [
            {
                "section": "HONORAIRES",
                "designation": "Audit révisé",
                "unite": "200",
                "taux": "100",
                "sort_order": 0,
            }
        ],
    }
    updated = client.put(
        f"/api/v1/invoices/{created_invoice['id']}", json=updated_payload
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["invoice"]["invoice_number"] == created_invoice["invoice_number"]
    assert updated.json()["invoice"]["ref_pf"] == created_invoice["ref_pf"]
    assert updated.json()["invoice"]["total_general"] == "228.50"
    assert [line["designation"] for line in updated.json()["lines"]] == [
        "Audit révisé"
    ]
