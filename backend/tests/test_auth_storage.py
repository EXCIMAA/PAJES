import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.services.auth_service import require_auth_storage


def test_missing_auth_storage_returns_service_unavailable_without_changing_view():
    engine = create_engine("sqlite:///:memory:")
    try:
        with engine.begin() as connection:
            connection.execute(
                text("CREATE TABLE auth_users (id TEXT PRIMARY KEY, email TEXT)")
            )
            connection.execute(
                text(
                    "CREATE TABLE profiles ("
                    "id TEXT PRIMARY KEY, email TEXT, full_name TEXT, role TEXT, "
                    "avatar_url TEXT, department TEXT, phone TEXT, "
                    "created_at DATETIME, updated_at DATETIME)"
                )
            )
            connection.execute(
                text(
                    "CREATE VIEW users AS "
                    "SELECT id, email, '' AS role FROM auth_users"
                )
            )

        with Session(engine) as db, pytest.raises(HTTPException) as raised:
            require_auth_storage(db)

        assert raised.value.status_code == 503
        assert "pas disponible" in raised.value.detail
        with engine.connect() as connection:
            assert connection.execute(
                text(
                    "SELECT type FROM sqlite_master WHERE name = 'users'"
                )
            ).scalar_one() == "view"
    finally:
        engine.dispose()


def test_current_auth_storage_schema_passes(test_db):
    require_auth_storage(test_db)
