"""Authentication service: login, signup, logout, password reset, sessions.

Replaces Supabase Auth. Passwords are hashed with Argon2id. Sessions are
JWT tokens (with JTI for revocation) stored in HTTP-only cookies.
"""

from __future__ import annotations

import secrets
import uuid
from datetime import timedelta

from fastapi import HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core import utcnow
from app.core.config import settings
from app.core.security import (
    create_session_token,
    decode_password_reset_token,
    decode_session_token,
    generate_password_reset_token,
    hash_password,
    verify_password,
)
from app.models.auth import AuthSession, Profile, User
from app.schemas.auth import LoginRequest, SignupRequest

MAX_FAILED_LOGINS = 5


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        httponly=True,
        secure=settings.secure_cookies,
        samesite="lax" if not settings.secure_cookies else "strict",
        max_age=settings.auth_session_ttl_minutes * 60,
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(key=settings.auth_cookie_name, path="/")


def _get_client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def login(
    db: Session,
    request: Request,
    response: Response,
    body: LoginRequest,
) -> Profile:
    email = body.email.lower()
    user = db.query(User).filter(User.email == email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect.",
        )

    if not verify_password(body.password, user.password_hash):
        user.failed_login_count += 1
        if user.failed_login_count >= MAX_FAILED_LOGINS:
            user.is_locked = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect.",
        )

    if not user.is_active or user.is_locked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated or locked",
        )

    user.failed_login_count = 0
    user.last_login_at = utcnow()

    profile = user.profile
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Profile not found",
        )

    jti = secrets.token_hex(16)
    token = create_session_token(user.id, profile.role, jti)
    _set_session_cookie(response, token)

    session_record = AuthSession(
        user_id=user.id,
        token_jti=jti,
        expires_at=utcnow() + timedelta(minutes=settings.auth_session_ttl_minutes),
        ip_address=_get_client_ip(request),
        user_agent=request.headers.get("User-Agent", ""),
    )
    db.add(session_record)
    db.commit()

    return profile


def logout(db: Session, request: Request, response: Response) -> None:
    token = request.cookies.get(settings.auth_cookie_name)
    if token:
        _clear_session_cookie(response)
        payload = decode_session_token(token)
        if payload and payload.get("jti"):
            session = db.query(AuthSession).filter(
                AuthSession.token_jti == payload["jti"]
            ).first()
            if session:
                session.revoked = True
                db.commit()


def signup(db: Session, body: SignupRequest) -> Profile:
    email = body.email.lower()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        email=email,
        password_hash=hash_password(body.password),
    )
    profile = Profile(
        id=user_id,
        email=email,
        full_name=f"{body.first_name} {body.last_name}".strip(),
        role=None,
    )
    db.add(user)
    db.add(profile)
    db.commit()
    return profile


def change_password(
    db: Session,
    user_id: str,
    current_password: str,
    new_password: str,
) -> None:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not verify_password(current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    user.password_hash = hash_password(new_password)
    db.commit()
    # Revoke all active sessions for this user — forces re-login
    sessions = db.query(AuthSession).filter(
        AuthSession.user_id == user_id,
        AuthSession.revoked == False,  # noqa: E712
    ).all()
    for s in sessions:
        s.revoked = True
    db.commit()


def reset_password_with_token(
    db: Session,
    token: str,
    new_password: str,
) -> None:
    payload = decode_password_reset_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token.",
        )
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token.")
    user.password_hash = hash_password(new_password)
    user.failed_login_count = 0
    user.is_locked = False
    db.commit()
    # Revoke all sessions
    sessions = db.query(AuthSession).filter(
        AuthSession.user_id == user_id,
        AuthSession.revoked == False,  # noqa: E712
    ).all()
    for s in sessions:
        s.revoked = True
    db.commit()


def request_password_reset(db: Session, email: str) -> str | None:
    """Generate a reset token if the user exists. Returns the token or None.
    The caller (route) handles email sending. The token is NOT returned to
    the HTTP client — the response is always a generic message.
    """
    user = db.query(User).filter(User.email == email.lower()).first()
    if not user:
        return None
    return generate_password_reset_token(user.id)


def update_profile(
    db: Session,
    user_id: str,
    full_name: str | None = None,
    department: str | None = None,
    phone: str | None = None,
    avatar_url: str | None = None,
) -> Profile:
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    if full_name is not None:
        profile.full_name = full_name
    if department is not None:
        profile.department = department
    if phone is not None:
        profile.phone = phone
    if avatar_url is not None:
        profile.avatar_url = avatar_url
    db.commit()
    return profile


def update_user_role(
    db: Session,
    target_user_id: str,
    new_role: str,
) -> Profile:
    """Admin-only: change a user's role. The route dependency enforces
    super_admin before calling this. After a role change, all existing
    sessions for the user are revoked so the new role takes effect
    immediately on next login."""
    profile = db.query(Profile).filter(Profile.id == target_user_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    profile.role = new_role
    db.commit()
    # Revoke all sessions so the new role is enforced immediately
    sessions = db.query(AuthSession).filter(
        AuthSession.user_id == target_user_id,
        AuthSession.revoked == False,  # noqa: E712
    ).all()
    for s in sessions:
        s.revoked = True
    db.commit()
    return profile


def revoke_user_sessions(db: Session, user_id: str) -> int:
    """Revoke all active sessions for a user. Returns count revoked."""
    sessions = db.query(AuthSession).filter(
        AuthSession.user_id == user_id,
        AuthSession.revoked == False,  # noqa: E712
    ).all()
    count = len(sessions)
    for s in sessions:
        s.revoked = True
    db.commit()
    return count


def list_user_sessions(db: Session, user_id: str) -> list[AuthSession]:
    return db.query(AuthSession).filter(
        AuthSession.user_id == user_id,
    ).order_by(AuthSession.issued_at.desc()).all()
