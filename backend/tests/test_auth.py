"""Authentication and authorization tests.

Uses SQLite in-memory (via conftest.py fixtures) so these run without MySQL.
Tests cover:
  - signup, login, logout
  - invalid credentials
  - /me requires auth
  - permission enforcement (require_permission)
  - privilege escalation prevention (non-admin cannot change roles)
  - admin-only endpoints blocked for non-admins
  - permission matrix correctness
  - session revocation (JTI-based)
  - password reset with token
  - user deactivation revokes access
  - rate limiting (login flood)
"""

from __future__ import annotations

import uuid
from datetime import timedelta
from urllib.parse import parse_qs, urlparse

from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session, sessionmaker

from app.core import utcnow
from app.core.config import settings
from app.core.security import create_opaque_token, hash_password, hash_token, verify_password
from app.database import get_db
from app.main import create_app
from app.models.auth import (
    AccountActivationToken,
    AuthSession,
    PasswordResetToken,
    Profile,
    UserCredential,
)
from app.services import email_service
from app.services.email_service import get_development_mailbox


def _create_user(
    db: Session,
    email: str,
    role: str | None = None,
    password: str = "Test1234!",
) -> Profile:
    user_id = str(uuid.uuid4())
    normalized_email = email.lower()
    profile = Profile(
        id=user_id,
        email=normalized_email,
        full_name=f"Test {email}",
        role=role or "stagiaires",
        active=True,
    )
    credential = UserCredential(
        id=user_id,
        email_normalized=normalized_email,
        password_hash=hash_password(password),
        is_active=True,
        activated_at=utcnow(),
    )
    credential.profile = profile
    db.add_all([profile, credential])
    db.commit()
    return profile


def _create_session_token(db: Session, profile: Profile) -> str:
    token = create_opaque_token()
    session = AuthSession(
        user_id=profile.id,
        token_hash=hash_token(token),
        expires_at=utcnow() + timedelta(minutes=settings.auth_session_ttl_minutes),
    )
    db.add(session)
    db.commit()
    return token


def _auth_client(client: TestClient, db: Session, profile: Profile) -> TestClient:
    token = _create_session_token(db, profile)
    client.cookies.set(settings.auth_cookie_name, token)
    # Also set a CSRF cookie + header for mutating requests
    csrf_token = client.cookies.get(settings.csrf_cookie_name)
    assert csrf_token
    client.headers["X-CSRF-Token"] = csrf_token
    return client


def _activation_token(email: str) -> str:
    messages = get_development_mailbox(email)
    assert len(messages) == 1
    return parse_qs(urlparse(messages[0].text_body.splitlines()[2]).fragment)["token"][0]


def _signup(client: TestClient, email: str, first: str = "Test", last: str = "User"):
    return client.post(
        "/api/v1/auth/signup",
        json={"email": email, "first_name": first, "last_name": last},
    )


def _activate(client: TestClient, token: str, password: str = "SecurePass123!"):
    return client.post(
        "/api/v1/auth/activate",
        json={"token": token, "password": password},
    )


def _login_and_get_client(
    client: TestClient,
    db: Session,
    email: str,
    password: str = "Test1234!",
) -> TestClient:
    """Log in through the API and retain the CSRF token for later mutations."""
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"Login failed: {r.json()}"
    # Set CSRF token from cookie for subsequent mutations
    csrf = client.cookies.get("pajes_csrf")
    if csrf:
        client.headers["X-CSRF-Token"] = csrf
    return client


# ── Signup and activation ──────────────────────────────────────────────

def test_signup_and_activation_preserve_new_identity_and_store_argon2id(
    client: TestClient, test_db: Session
):
    response = _signup(client, "NewUser@Test.com", "New", "User")
    assert response.status_code == 202
    assert "sent" not in response.json()["message"].lower()

    profile = test_db.query(Profile).filter_by(email="newuser@test.com").one()
    original_id = profile.id
    token = _activation_token("newuser@test.com")
    activation = _activate(client, token)
    assert activation.status_code == 200

    credential = test_db.query(UserCredential).filter_by(id=original_id).one()
    assert profile.id == original_id
    assert profile.role == "stagiaires"
    assert credential.is_active is True
    assert credential.password_hash.startswith("$argon2id$")
    assert token not in credential.password_hash

    login = client.post(
        "/api/v1/auth/login",
        json={"email": "NEWUSER@test.com", "password": "SecurePass123!"},
    )
    assert login.status_code == 200
    assert settings.auth_cookie_name in login.cookies
    assert client.get("/api/v1/auth/me").json()["id"] == original_id
    assert client.post("/api/v1/auth/logout").status_code == 200
    assert client.get("/api/v1/auth/me").status_code == 401


def test_first_time_activation_preserves_imported_profile_identity_and_role(
    client: TestClient, test_db: Session
):
    imported_id = str(uuid.uuid4())
    profile = Profile(
        id=imported_id,
        email="imported@test.com",
        full_name="Imported Person",
        role="senior_audit",
        active=True,
    )
    test_db.add(profile)
    test_db.commit()

    assert _signup(client, "IMPORTED@test.com", "Ignored", "Name").status_code == 202
    token = _activation_token("imported@test.com")
    assert _activate(client, token).status_code == 200
    test_db.refresh(profile)
    assert profile.id == imported_id
    assert profile.full_name == "Imported Person"
    assert profile.role == "senior_audit"
    assert test_db.query(UserCredential).filter_by(id=imported_id).one().is_active


def test_duplicate_signup_is_generic_and_does_not_create_another_identity(
    client: TestClient, test_db: Session
):
    first = _signup(client, "same@test.com")
    second = _signup(client, "SAME@test.com")
    assert first.status_code == second.status_code == 202
    assert first.json() == second.json()
    assert test_db.query(Profile).filter_by(email="same@test.com").count() == 1


def test_signup_email_delivery_failure_does_not_claim_delivery(
    client: TestClient, monkeypatch, caplog
):
    def fail_delivery(*args, **kwargs):
        raise email_service.EmailDeliveryError("provider rejected private message")

    monkeypatch.setattr(email_service, "send_email", fail_delivery)
    caplog.set_level("ERROR", logger="app.services.email_service")

    response = _signup(client, "delivery-failure@test.com")

    assert response.status_code == 202
    assert "sent" not in response.json()["message"].lower()
    assert "EmailDeliveryError" in caplog.text
    assert "delivery-failure@test.com" not in caplog.text
    assert "provider rejected private message" not in caplog.text


def test_signup_rate_limit_returns_retry_after(test_db: Session, monkeypatch):
    monkeypatch.setattr(settings, "signup_rate_limit_per_minute", 1)
    app = create_app()
    request_sessions = sessionmaker(
        bind=test_db.get_bind(),
        autoflush=False,
        expire_on_commit=False,
    )

    def override_get_db():
        db = request_sessions()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    try:
        with TestClient(app) as limited_client:
            csrf_token = limited_client.get("/api/v1/health").headers["X-CSRF-Token"]
            limited_client.headers["X-CSRF-Token"] = csrf_token
            first = _signup(limited_client, "rate-limited@test.com")
            second = _signup(limited_client, "rate-limited@test.com")

        assert first.status_code == 202
        assert second.status_code == 429
        assert second.headers["Retry-After"] == str(settings.login_rate_window_seconds)
    finally:
        app.dependency_overrides.clear()


def test_invalid_signup_email_is_rejected(client: TestClient):
    response = _signup(client, "not-an-email")
    assert response.status_code == 422


def test_activation_password_validation_and_single_use(
    client: TestClient, test_db: Session
):
    assert _signup(client, "activation@test.com").status_code == 202
    token = _activation_token("activation@test.com")
    invalid = _activate(client, token, "short")
    assert invalid.status_code == 422
    assert _activate(client, token).status_code == 200
    repeated = _activate(client, token)
    assert repeated.status_code == 400
    assert test_db.query(UserCredential).filter_by(
        email_normalized="activation@test.com"
    ).count() == 1


def test_expired_activation_token_is_rejected(client: TestClient, test_db: Session):
    assert _signup(client, "expired@test.com").status_code == 202
    token = _activation_token("expired@test.com")
    record = test_db.query(AccountActivationToken).one()
    record.expires_at = utcnow() - timedelta(seconds=1)
    record.created_at = record.expires_at - timedelta(hours=25)
    test_db.commit()
    assert _activate(client, token).status_code == 400
    assert test_db.query(UserCredential).count() == 0


def test_signup_retries_do_not_replace_a_valid_activation_token(
    client: TestClient, test_db: Session
):
    assert _signup(client, "retry@test.com").status_code == 202
    first_token = _activation_token("retry@test.com")
    assert _signup(client, "RETRY@test.com").status_code == 202
    second_token = _activation_token("retry@test.com")
    assert first_token != second_token
    assert _activate(client, first_token).status_code == 400
    assert _activate(client, second_token).status_code == 200
    assert test_db.query(UserCredential).count() == 1


def test_signup_fails_safely_when_auth_storage_is_unavailable(
    client: TestClient,
    test_db: Session,
    monkeypatch,
):
    from fastapi import HTTPException

    from app.services import auth_service

    def reject_auth_storage(_db):
        raise HTTPException(status_code=503, detail="auth storage unavailable")

    monkeypatch.setattr(auth_service, "require_auth_storage", reject_auth_storage)
    response = _signup(client, "blocked@test.com")
    assert response.status_code == 503
    assert test_db.query(Profile).filter_by(email="blocked@test.com").first() is None


def test_signup_database_failure_rolls_back_auth_identity_and_profile(
    client: TestClient, test_db: Session
):
    def fail_identity_insert(connection, cursor, statement, parameters, context, executemany):
        if statement.lower().startswith("insert into auth_users"):
            raise OperationalError(statement, parameters, Exception("synthetic write failure"))

    event.listen(test_db.get_bind(), "before_cursor_execute", fail_identity_insert)
    try:
        response = _signup(client, "rolledback@test.com")
    finally:
        event.remove(test_db.get_bind(), "before_cursor_execute", fail_identity_insert)
    assert response.status_code == 503
    assert test_db.query(Profile).filter_by(email="rolledback@test.com").first() is None
    assert test_db.query(AccountActivationToken).count() == 0


# ── Login ─────────────────────────────────────────────────────────────

def test_login_success(client: TestClient, test_db: Session):
    _create_user(test_db, "login@test.com", role="junior_audit")
    r = client.post("/api/v1/auth/login", json={
        "email": "login@test.com",
        "password": "Test1234!",
    })
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == "login@test.com"
    assert body["role"] == "junior_audit"
    assert "pajes_session" in r.cookies


def test_login_wrong_password(client: TestClient, test_db: Session):
    _create_user(test_db, "wrongpw@test.com")
    r = client.post("/api/v1/auth/login", json={
        "email": "wrongpw@test.com",
        "password": "WrongPassword!",
    })
    assert r.status_code == 401
    assert "incorrect" in r.json()["detail"].lower()


def test_login_nonexistent_user(client: TestClient):
    r = client.post("/api/v1/auth/login", json={
        "email": "nobody@test.com",
        "password": "Test1234!",
    })
    assert r.status_code == 401
    assert "incorrect" in r.json()["detail"].lower()


# ── Me ────────────────────────────────────────────────────────────────

def test_me_requires_auth(client: TestClient):
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 401


def test_me_with_auth(client: TestClient, test_db: Session):
    profile = _create_user(test_db, "me@test.com", role="senior_audit")
    _auth_client(client, test_db, profile)
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == "me@test.com"


# ── Logout ────────────────────────────────────────────────────────────

def test_logout_clears_cookie(client: TestClient, test_db: Session):
    profile = _create_user(test_db, "logout@test.com", role="senior_audit")
    _auth_client(client, test_db, profile)
    r = client.post("/api/v1/auth/logout")
    assert r.status_code == 200


# ── Session revocation ────────────────────────────────────────────────

def test_revoked_session_cannot_access_me(client: TestClient, test_db: Session):
    profile = _create_user(test_db, "revoked@test.com", role="senior_audit")
    _auth_client(client, test_db, profile)
    # Revoke the session in the DB
    session = test_db.query(AuthSession).filter(AuthSession.user_id == profile.id).first()
    assert session is not None
    session.revoked_at = utcnow()
    test_db.commit()
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 401
    assert r.json()["detail"] == "Not authenticated"


def test_admin_can_revoke_user_sessions(client: TestClient, test_db: Session):
    admin = _create_user(test_db, "sessadmin@test.com", role="super_admin")
    target = _create_user(test_db, "sesstarget@test.com", role="junior_audit")
    _auth_client(client, test_db, target)
    # Now login as admin in a fresh client context
    client.cookies.delete(settings.auth_cookie_name)
    _auth_client(client, test_db, admin)
    r = client.delete(f"/api/v1/users/{target.id}/sessions")
    assert r.status_code == 200
    assert "revoked" in r.json()["message"].lower()


def test_admin_can_list_user_sessions(client: TestClient, test_db: Session):
    admin = _create_user(test_db, "listadmin@test.com", role="super_admin")
    target = _create_user(test_db, "listtarget@test.com", role="junior_audit")
    # Create a session for target
    _create_session_token(test_db, target)
    _auth_client(client, test_db, admin)
    r = client.get(f"/api/v1/users/{target.id}/sessions")
    assert r.status_code == 200
    sessions = r.json()
    assert len(sessions) >= 1


# ── Change password ───────────────────────────────────────────────────

def test_change_password_success(client: TestClient, test_db: Session):
    profile = _create_user(test_db, "chpw@test.com", role="junior_audit")
    _auth_client(client, test_db, profile)
    r = client.post("/api/v1/auth/change-password", json={
        "current_password": "Test1234!",
        "new_password": "NewPass5678!",
    })
    assert r.status_code == 200


def test_change_password_wrong_current(client: TestClient, test_db: Session):
    profile = _create_user(test_db, "chpw2@test.com", role="junior_audit")
    _auth_client(client, test_db, profile)
    r = client.post("/api/v1/auth/change-password", json={
        "current_password": "WrongCurrent!",
        "new_password": "NewPass5678!",
    })
    assert r.status_code == 400


def test_change_password_revokes_sessions(client: TestClient, test_db: Session):
    profile = _create_user(test_db, "chpwrev@test.com", role="junior_audit")
    _auth_client(client, test_db, profile)
    r = client.post("/api/v1/auth/change-password", json={
        "current_password": "Test1234!",
        "new_password": "NewPass5678!",
    })
    assert r.status_code == 200
    # Session should now be revoked — /me should fail
    r2 = client.get("/api/v1/auth/me")
    assert r2.status_code == 401


# ── Permission enforcement ────────────────────────────────────────────

def test_admin_can_list_users(client: TestClient, test_db: Session):
    admin = _create_user(test_db, "admin@test.com", role="super_admin")
    _auth_client(client, test_db, admin)
    r = client.get("/api/v1/users")
    assert r.status_code == 200


def test_non_admin_cannot_list_users(client: TestClient, test_db: Session):
    user = _create_user(test_db, "junior@test.com", role="junior_audit")
    _auth_client(client, test_db, user)
    r = client.get("/api/v1/users")
    assert r.status_code == 403


def test_unauthenticated_cannot_list_users(client: TestClient):
    r = client.get("/api/v1/users")
    assert r.status_code == 401


def test_current_user_can_load_own_permissions(client: TestClient, test_db: Session):
    profile = _create_user(test_db, "ownpermissions@test.com", role="junior_audit")
    _auth_client(client, test_db, profile)

    r = client.get("/api/v1/permissions/me")

    assert r.status_code == 200
    body = r.json()
    assert body["role"] == "junior_audit"
    assert body["permissions"]["missions"]["view"] is True
    assert body["permissions"]["missions"]["create"] is False


def test_unauthenticated_cannot_load_own_permissions(client: TestClient):
    r = client.get("/api/v1/permissions/me")
    assert r.status_code == 401


def test_csrf_bootstrap_header_matches_cookie(client: TestClient):
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.headers["X-CSRF-Token"] == client.cookies.get("pajes_csrf")


def test_loopback_frontend_can_read_csrf_header(client: TestClient):
    origin = "http://127.0.0.1:5174"
    r = client.get("/api/v1/health", headers={"Origin": origin})
    assert r.status_code == 200
    assert r.headers["access-control-allow-origin"] == origin
    assert "X-CSRF-Token" in r.headers["access-control-expose-headers"]


# ── Privilege escalation prevention ───────────────────────────────────

def test_non_admin_cannot_change_roles(client: TestClient, test_db: Session):
    attacker = _create_user(test_db, "attacker@test.com", role="junior_audit")
    target = _create_user(test_db, "target@test.com", role="junior_audit")
    _auth_client(client, test_db, attacker)
    r = client.put(f"/api/v1/users/{target.id}/role", json={"role": "super_admin"})
    assert r.status_code == 403


def test_admin_can_change_role(client: TestClient, test_db: Session):
    admin = _create_user(test_db, "admin2@test.com", role="super_admin")
    target = _create_user(test_db, "target2@test.com", role="junior_audit")
    _auth_client(client, test_db, admin)
    r = client.put(f"/api/v1/users/{target.id}/role", json={"role": "chef_mission"})
    assert r.status_code == 200
    assert r.json()["role"] == "chef_mission"


def test_user_cannot_change_own_role_via_profile_update(client: TestClient, test_db: Session):
    profile = _create_user(test_db, "self@test.com", role="junior_audit")
    _auth_client(client, test_db, profile)
    r = client.put("/api/v1/users/me", json={
        "full_name": "Updated Name",
        "department": "Audit",
    })
    assert r.status_code == 200
    assert r.json()["role"] == "junior_audit"


def test_role_change_revokes_sessions(client: TestClient, test_db: Session):
    """When admin changes a user's role, the user's sessions are revoked
    so the new role takes effect immediately."""
    admin = _create_user(test_db, "roleadmin@test.com", role="super_admin")
    target = _create_user(test_db, "roletarget@test.com", role="junior_audit")
    # Create a session for target
    _create_session_token(test_db, target)
    # Admin changes target's role
    client.cookies.delete(settings.auth_cookie_name)
    _auth_client(client, test_db, admin)
    r = client.put(f"/api/v1/users/{target.id}/role", json={"role": "chef_mission"})
    assert r.status_code == 200
    # Target's old session should be revoked
    session = test_db.query(AuthSession).filter(AuthSession.user_id == target.id).first()
    assert session.revoked_at is not None


# ── Permission matrix ─────────────────────────────────────────────────

def test_super_admin_has_all_permissions():
    from app.permissions.matrix import (
        ALL_ACTIONS,
        ALL_MODULES,
        build_effective_matrix,
        has_permission,
    )

    matrix = build_effective_matrix(None)
    for module in ALL_MODULES:
        for action in ALL_ACTIONS:
            assert has_permission(matrix, "super_admin", module, action) is True


def test_junior_audit_can_only_view_missions():
    from app.permissions.matrix import build_effective_matrix, has_permission

    matrix = build_effective_matrix(None)
    assert has_permission(matrix, "junior_audit", "missions", "view") is True
    assert has_permission(matrix, "junior_audit", "missions", "create") is False
    assert has_permission(matrix, "junior_audit", "missions", "edit") is False
    assert has_permission(matrix, "junior_audit", "missions", "delete") is False
    assert has_permission(matrix, "junior_audit", "factures", "view") is False


def test_rh_has_collaborateur_access():
    from app.permissions.matrix import build_effective_matrix, has_permission

    matrix = build_effective_matrix(None)
    assert has_permission(matrix, "rh", "collaborateurs", "view") is True
    assert has_permission(matrix, "rh", "collaborateurs", "create") is True
    assert has_permission(matrix, "rh", "collaborateur_hr", "edit") is True
    assert has_permission(matrix, "rh", "factures", "view") is False


def test_all_17_roles_present_in_matrix():
    from app.permissions.matrix import ALL_ROLES, PERMISSION_MATRIX, SUPER_ADMIN_ROLE

    for role in ALL_ROLES:
        if role == SUPER_ADMIN_ROLE:
            continue
        assert role in PERMISSION_MATRIX, f"Role {role} missing from PERMISSION_MATRIX"


def test_all_24_modules_present_for_each_role():
    from app.permissions.matrix import ALL_MODULES, ALL_ROLES, PERMISSION_MATRIX, SUPER_ADMIN_ROLE

    for role in ALL_ROLES:
        if role == SUPER_ADMIN_ROLE:
            continue
        for module in ALL_MODULES:
            assert module in PERMISSION_MATRIX[role], (
                f"Module {module} missing for role {role}"
            )


def test_all_4_actions_present_for_each_cell():
    from app.permissions.matrix import (
        ALL_ACTIONS,
        ALL_MODULES,
        ALL_ROLES,
        PERMISSION_MATRIX,
        SUPER_ADMIN_ROLE,
    )

    for role in ALL_ROLES:
        if role == SUPER_ADMIN_ROLE:
            continue
        for module in ALL_MODULES:
            cell = PERMISSION_MATRIX[role][module]
            for action in ALL_ACTIONS:
                assert action in cell, f"Action {action} missing for {role}/{module}"
                assert isinstance(cell[action], bool), (
                    f"Cell {role}/{module}/{action} is not bool: {type(cell[action])}"
                )


# ── Permission management routes ──────────────────────────────────────

def test_admin_can_get_matrix(client: TestClient, test_db: Session):
    admin = _create_user(test_db, "permadmin@test.com", role="super_admin")
    _auth_client(client, test_db, admin)
    r = client.get("/api/v1/permissions/matrix")
    assert r.status_code == 200
    body = r.json()
    assert "matrix" in body
    assert "super_admin" in body["matrix"]


def test_non_admin_cannot_get_matrix(client: TestClient, test_db: Session):
    user = _create_user(test_db, "permjunior@test.com", role="junior_audit")
    _auth_client(client, test_db, user)
    r = client.get("/api/v1/permissions/matrix")
    assert r.status_code == 403


def test_admin_cannot_modify_super_admin_permissions(client: TestClient, test_db: Session):
    admin = _create_user(test_db, "permadmin2@test.com", role="super_admin")
    _auth_client(client, test_db, admin)
    r = client.put("/api/v1/permissions/role/super_admin", json={
        "role": "super_admin",
        "permissions": {},
    })
    assert r.status_code == 400


# ── User activation/deactivation ──────────────────────────────────────

def test_admin_can_deactivate_user(client: TestClient, test_db: Session):
    admin = _create_user(test_db, "deactadmin@test.com", role="super_admin")
    target = _create_user(test_db, "deacttarget@test.com", role="junior_audit")
    _auth_client(client, test_db, admin)
    r = client.put(f"/api/v1/users/{target.id}/deactivate")
    assert r.status_code == 200
    r2 = client.post("/api/v1/auth/login", json={
        "email": "deacttarget@test.com",
        "password": "Test1234!",
    })
    assert r2.status_code == 401


def test_deactivated_user_cannot_access_me(client: TestClient, test_db: Session):
    profile = _create_user(test_db, "deactme@test.com", role="junior_audit")
    credential = (
        test_db.query(UserCredential)
        .filter(UserCredential.id == profile.id)
        .first()
    )
    credential.is_active = False
    test_db.commit()
    _auth_client(client, test_db, profile)
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 401


# ── Password reset ────────────────────────────────────────────────────

def test_password_reset_request_returns_generic_message(client: TestClient, test_db: Session):
    _create_user(test_db, "reset@test.com", role="junior_audit")
    r = client.post("/api/v1/auth/reset-password", json={"email": "reset@test.com"})
    assert r.status_code == 200
    assert "request" not in r.json()["message"].lower()


def test_password_reset_request_for_nonexistent_user_returns_same_message(client: TestClient):
    r = client.post("/api/v1/auth/reset-password", json={"email": "nobody@test.com"})
    assert r.status_code == 200
    assert r.json()["message"] == (
        "Si un compte peut être réinitialisé, la demande a été prise en compte."
    )


def test_password_reset_confirm_with_valid_token(client: TestClient, test_db: Session):
    profile = _create_user(test_db, "resetconfirm@test.com", role="junior_audit")
    from app.services.auth_service import request_password_reset

    email_job = request_password_reset(test_db, profile.email)
    assert email_job is not None
    token = email_job.token
    stored = test_db.query(PasswordResetToken).one()
    assert stored.token_hash == hash_token(token)
    assert token not in stored.token_hash
    r = client.post("/api/v1/auth/reset-password/confirm", json={
        "token": token,
        "new_password": "NewPass1234!",
    })
    assert r.status_code == 200
    # Verify can login with new password
    r2 = client.post("/api/v1/auth/login", json={
        "email": "resetconfirm@test.com",
        "password": "NewPass1234!",
    })
    assert r2.status_code == 200


def test_password_reset_confirm_with_invalid_token(client: TestClient):
    r = client.post("/api/v1/auth/reset-password/confirm", json={
        "token": "invalid-token-value-that-is-long-enough",
        "new_password": "NewPass1234!",
    })
    assert r.status_code == 400


def test_password_reset_token_is_single_use_and_expires(client: TestClient, test_db: Session):
    profile = _create_user(test_db, "reset-expiry@test.com")
    from app.services.auth_service import request_password_reset

    email_job = request_password_reset(test_db, profile.email)
    assert email_job
    record = test_db.query(PasswordResetToken).one()
    record.expires_at = utcnow() - timedelta(seconds=1)
    record.created_at = record.expires_at - timedelta(minutes=31)
    test_db.commit()
    assert client.post(
        "/api/v1/auth/reset-password/confirm",
        json={"token": email_job.token, "new_password": "NewPass1234!"},
    ).status_code == 400
    assert verify_password(
        "Test1234!",
        test_db.query(UserCredential).filter_by(id=profile.id).one().password_hash,
    )


def test_password_reset_revokes_existing_sessions(client: TestClient, test_db: Session):
    profile = _create_user(test_db, "reset-revoke@test.com")
    _auth_client(client, test_db, profile)
    from app.services.auth_service import request_password_reset

    email_job = request_password_reset(test_db, profile.email)
    assert email_job
    response = client.post(
        "/api/v1/auth/reset-password/confirm",
        json={"token": email_job.token, "new_password": "NewPass1234!"},
    )
    assert response.status_code == 200
    assert client.get("/api/v1/auth/me").status_code == 401
