"""User management routes — admin-only operations for managing users and roles."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core import utcnow
from app.database import get_db
from app.models.auth import AuthSession, Profile, UserCredential
from app.permissions.enforcer import get_current_profile, require_admin
from app.schemas.auth import (
    MessageResponse,
    ProfileResponse,
    UpdateProfileRequest,
    UpdateUserRoleRequest,
    UserResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
def list_users(
    admin: Annotated[Profile, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
):
    offset = (page - 1) * page_size
    results = (
        db.query(Profile, UserCredential)
        .outerjoin(UserCredential, Profile.id == UserCredential.id)
        .order_by(Profile.full_name)
        .offset(offset)
        .limit(page_size)
        .all()
    )
    return [
        UserResponse(
            id=p.id,
            email=p.email,
            full_name=p.full_name,
            role=p.role,
            department=p.department,
            phone=p.phone,
            is_active=bool(
                p.active and u and u.is_active and not u.is_locked
            ),
            created_at=p.created_at,
        )
        for p, u in results
    ]


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: str,
    admin: Annotated[Profile, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    credential = (
        db.query(UserCredential)
        .filter(UserCredential.id == profile.id)
        .first()
    )
    return UserResponse(
        id=profile.id,
        email=profile.email,
        full_name=profile.full_name,
        role=profile.role,
        department=profile.department,
        phone=profile.phone,
        is_active=bool(
            profile.active
            and credential
            and credential.is_active
            and not credential.is_locked
        ),
        created_at=profile.created_at,
    )


@router.put("/me", response_model=ProfileResponse)
def update_my_profile(
    body: UpdateProfileRequest,
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
):
    return auth_service.update_profile(
        db,
        profile.id,
        full_name=body.full_name,
        department=body.department,
        phone=body.phone,
        avatar_url=body.avatar_url,
    )


@router.put("/{user_id}/role", response_model=ProfileResponse)
def update_user_role(
    user_id: str,
    body: UpdateUserRoleRequest,
    admin: Annotated[Profile, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    return auth_service.update_user_role(db, user_id, body.role)


@router.put("/{user_id}/deactivate", response_model=MessageResponse)
def deactivate_user(
    user_id: str,
    admin: Annotated[Profile, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    credential = (
        db.query(UserCredential)
        .filter(UserCredential.id == user_id)
        .first()
    )
    if not credential:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    now = utcnow()
    credential.is_active = False
    db.query(AuthSession).filter(
        AuthSession.user_id == user_id,
        AuthSession.revoked_at.is_(None),
    ).update({AuthSession.revoked_at: now}, synchronize_session=False)
    db.commit()
    return {"message": "User deactivated and sessions revoked"}


@router.put("/{user_id}/activate", response_model=MessageResponse)
def activate_user(
    user_id: str,
    admin: Annotated[Profile, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    credential = (
        db.query(UserCredential)
        .filter(UserCredential.id == user_id)
        .first()
    )
    if not credential:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not db.query(Profile.active).filter(Profile.id == user_id).scalar():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Profile status must be restored before activating credentials.",
        )
    credential.is_active = True
    credential.is_locked = False
    credential.locked_at = None
    credential.failed_login_count = 0
    db.commit()
    return {"message": "User activated"}


@router.get("/{user_id}/sessions", response_model=list[dict])
def list_user_sessions(
    user_id: str,
    admin: Annotated[Profile, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    sessions = auth_service.list_user_sessions(db, user_id)
    return [
        {
            "id": s.id,
            "issued_at": s.created_at.isoformat() if s.created_at else None,
            "expires_at": s.expires_at.isoformat() if s.expires_at else None,
            "revoked": s.revoked_at is not None,
            "ip_address": s.ip_address,
            "user_agent": s.user_agent,
        }
        for s in sessions
    ]


@router.delete("/{user_id}/sessions", response_model=MessageResponse)
def revoke_all_user_sessions(
    user_id: str,
    admin: Annotated[Profile, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    count = auth_service.revoke_user_sessions(db, user_id)
    return {"message": f"Revoked {count} session(s)"}
