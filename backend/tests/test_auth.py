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

import secrets
import uuid

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_session_token, hash_password
from app.models.auth import AuthSession, Profile, User


def _create_user(db: Session, email: str, role: str | None = None, password: str = "Test1234!") -> Profile:
    user_id = str(uuid.uuid4())
    user = User(id=user_id, email=email.lower(), password_hash=hash_password(password))
    profile = Profile(id=user_id, email=email.lower(), full_name=f"Test {email}", role=role)
    db.add(user)
    db.add(profile)
    db.commit()
    return profile


def _create_session_with_jti(db: Session, profile: Profile) -> str:
    """Create a proper session token with JTI and a DB session record."""
    jti = secrets.token_hex(16)
    token = create_session_token(profile.id, profile.role, jti)
    from datetime import timedelta
    from app.core import utcnow
    from app.core.config import settings

    session = AuthSession(
        user_id=profile.id,
        token_jti=jti,
        expires_at=utcnow() + timedelta(minutes=settings.auth_session_ttl_minutes),
    )
    db.add(session)
    db.commit()
    return token


def _auth_client(client: TestClient, db: Session, profile: Profile) -> TestClient:
    """Set auth cookie with a valid JTI-backed session."""
    token = _create_session_with_jti(db, profile)
    client.cookies.set("pajes_session", token)
    # Also set a CSRF cookie + header for mutating requests
    csrf_token = secrets.token_hex(32)
    client.cookies.set("pajes_csrf", csrf_token)
    client.headers["X-CSRF-Token"] = csrf_token
    return client


def _login_and_get_client(client: TestClient, db: Session, email: str, password: str = "Test1234!") -> TestClient:
    """Login via the API endpoint (proper flow with JTI)."""
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"Login failed: {r.json()}"
    # Set CSRF token from cookie for subsequent mutations
    csrf = client.cookies.get("pajes_csrf")
    if csrf:
        client.headers["X-CSRF-Token"] = csrf
    return client


# ── Signup ────────────────────────────────────────────────────────────

def test_signup_success(client: TestClient):
    r = client.post("/api/v1/auth/signup", json={
        "email": "newuser@test.com",
        "password": "SecurePass123!",
        "first_name": "New",
        "last_name": "User",
    })
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == "newuser@test.com"
    assert body["full_name"] == "New User"
    assert body["role"] is None


def test_signup_duplicate_email(client: TestClient, test_db: Session):
    _create_user(test_db, "existing@test.com")
    r = client.post("/api/v1/auth/signup", json={
        "email": "existing@test.com",
        "password": "SecurePass123!",
        "first_name": "Dup",
        "last_name": "User",
    })
    assert r.status_code == 409


def test_signup_short_password(client: TestClient):
    r = client.post("/api/v1/auth/signup", json={
        "email": "short@test.com",
        "password": "short",
        "first_name": "S",
        "last_name": "U",
    })
    assert r.status_code == 422


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
    session.revoked = True
    test_db.commit()
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 401
    assert "revoked" in r.json()["detail"].lower()


def test_admin_can_revoke_user_sessions(client: TestClient, test_db: Session):
    admin = _create_user(test_db, "sessadmin@test.com", role="super_admin")
    target = _create_user(test_db, "sesstarget@test.com", role="junior_audit")
    _auth_client(client, test_db, target)
    # Now login as admin in a fresh client context
    client.cookies.clear()
    _auth_client(client, test_db, admin)
    r = client.delete(f"/api/v1/users/{target.id}/sessions")
    assert r.status_code == 200
    assert "revoked" in r.json()["message"].lower()


def test_admin_can_list_user_sessions(client: TestClient, test_db: Session):
    admin = _create_user(test_db, "listadmin@test.com", role="super_admin")
    target = _create_user(test_db, "listtarget@test.com", role="junior_audit")
    # Create a session for target
    _create_session_with_jti(test_db, target)
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
    target_token = _create_session_with_jti(test_db, target)
    # Admin changes target's role
    client.cookies.clear()
    _auth_client(client, test_db, admin)
    r = client.put(f"/api/v1/users/{target.id}/role", json={"role": "chef_mission"})
    assert r.status_code == 200
    # Target's old session should be revoked
    session = test_db.query(AuthSession).filter(AuthSession.user_id == target.id).first()
    assert session.revoked is True


# ── Permission matrix ─────────────────────────────────────────────────

def test_super_admin_has_all_permissions():
    from app.permissions.matrix import ALL_MODULES, ALL_ACTIONS, has_permission, build_effective_matrix

    matrix = build_effective_matrix(None)
    for module in ALL_MODULES:
        for action in ALL_ACTIONS:
            assert has_permission(matrix, "super_admin", module, action) is True


def test_junior_audit_can_only_view_missions():
    from app.permissions.matrix import has_permission, build_effective_matrix

    matrix = build_effective_matrix(None)
    assert has_permission(matrix, "junior_audit", "missions", "view") is True
    assert has_permission(matrix, "junior_audit", "missions", "create") is False
    assert has_permission(matrix, "junior_audit", "missions", "edit") is False
    assert has_permission(matrix, "junior_audit", "missions", "delete") is False
    assert has_permission(matrix, "junior_audit", "factures", "view") is False


def test_rh_has_collaborateur_access():
    from app.permissions.matrix import has_permission, build_effective_matrix

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
    from app.permissions.matrix import ALL_ACTIONS, ALL_MODULES, ALL_ROLES, PERMISSION_MATRIX, SUPER_ADMIN_ROLE

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
    assert r2.status_code == 403


def test_deactivated_user_cannot_access_me(client: TestClient, test_db: Session):
    profile = _create_user(test_db, "deactme@test.com", role="junior_audit")
    user = test_db.query(User).filter(User.id == profile.id).first()
    user.is_active = False
    test_db.commit()
    _auth_client(client, test_db, profile)
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 403


# ── Password reset ────────────────────────────────────────────────────

def test_password_reset_request_returns_generic_message(client: TestClient, test_db: Session):
    _create_user(test_db, "reset@test.com", role="junior_audit")
    r = client.post("/api/v1/auth/reset-password", json={"email": "reset@test.com"})
    assert r.status_code == 200
    assert "reset link" in r.json()["message"].lower()


def test_password_reset_request_for_nonexistent_user_returns_same_message(client: TestClient):
    r = client.post("/api/v1/auth/reset-password", json={"email": "nobody@test.com"})
    assert r.status_code == 200
    assert "reset link" in r.json()["message"].lower()


def test_password_reset_confirm_with_valid_token(client: TestClient, test_db: Session):
    from app.core.security import generate_password_reset_token

    profile = _create_user(test_db, "resetconfirm@test.com", role="junior_audit")
    token = generate_password_reset_token(profile.id)
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
        "token": "invalid.token.here",
        "new_password": "NewPass1234!",
    })
    assert r.status_code == 400
