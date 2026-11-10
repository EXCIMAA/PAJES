"""Server-side permission enforcement — FastAPI dependencies.

These dependencies are the backend equivalent of the frontend proxy in
src/lib/supabase.ts. Every sensitive endpoint must use one of them.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import decode_session_token
from app.database import get_db
from app.models.auth import AuthSession, Profile, RolePermission
from app.permissions.matrix import SUPER_ADMIN_ROLE, build_effective_matrix


class PermissionService:
    """Loads the effective permission matrix from the DB on every call.

    No caching — role/permission changes take effect immediately.
    """

    def __init__(self, db: Session) -> None:
        self._db = db
        self._matrix = self._load()

    def _load(self):
        rows = self._db.query(RolePermission).all()
        return build_effective_matrix(
            [{"role": r.role, "permissions": r.permissions} for r in rows]
        )

    @property
    def matrix(self):
        return self._matrix

    def has(self, role: str | None, module: str, action: str) -> bool:
        from app.permissions.matrix import has_permission

        return has_permission(self._matrix, role, module, action)


def get_current_user_id(request: Request) -> str | None:
    token = request.cookies.get(settings.auth_cookie_name)
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.removeprefix("Bearer ")
    if not token:
        return None
    payload = decode_session_token(token)
    if not payload:
        return None
    return payload.get("sub")


def _get_token_payload(request: Request) -> dict | None:
    token = request.cookies.get(settings.auth_cookie_name)
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.removeprefix("Bearer ")
    if not token:
        return None
    return decode_session_token(token)


def get_current_profile(
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> Profile:
    payload = _get_token_payload(request)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    user_id = payload.get("sub")
    jti = payload.get("jti")

    # Check session revocation if JTI is present
    if jti:
        session = db.query(AuthSession).filter(AuthSession.token_jti == jti).first()
        if not session or session.revoked:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session revoked",
            )

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Profile not found",
        )
    user = profile.user
    if user and not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )
    return profile


def require_permission(module: str, action: str):
    """Dependency factory: checks that the current user has the given permission."""

    def _checker(
        profile: Annotated[Profile, Depends(get_current_profile)],
        db: Annotated[Session, Depends(get_db)],
    ) -> Profile:
        perms = PermissionService(db)
        if not perms.has(profile.role, module, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission insuffisante",
            )
        return profile

    return _checker


def require_admin(
    profile: Annotated[Profile, Depends(get_current_profile)],
) -> Profile:
    """Only super_admin can pass."""
    if profile.role != SUPER_ADMIN_ROLE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return profile


def can_access_record(
    role: str | None,
    module: str,
    action: str,
    record_owner_id: str | None = None,
    current_user_id: str | None = None,
    assigned_user_ids: list[str] | None = None,
    perms: PermissionService | None = None,
) -> bool:
    """Ownership-aware access check — mirrors canAccessRecordSafe from TS."""
    if not perms or not perms.has(role, module, action):
        return False
    if role == SUPER_ADMIN_ROLE:
        return True
    if role in ("stagiaires", "stagiaire"):
        if record_owner_id and current_user_id and record_owner_id == current_user_id:
            return True
        if assigned_user_ids and current_user_id and current_user_id in assigned_user_ids:
            return True
        return False
    return True
