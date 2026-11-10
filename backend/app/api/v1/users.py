"""User management routes — admin-only operations for managing users and roles."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.auth import AuthSession, Profile, User
from app.permissions.enforcer import PermissionService, get_current_profile, require_admin
from app.permissions.matrix import ALL_ROLES, build_effective_matrix, get_default_permissions_for_role
from app.schemas.auth import (
    MessageResponse,
    ProfileResponse,
    RolePermissionsResponse,
    UpdateProfileRequest,
    UpdateRolePermissionsRequest,
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
        db.query(Profile, User)
        .join(User, Profile.id == User.id)
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
            is_active=u.is_active,
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
    user = profile.user
    return UserResponse(
        id=profile.id,
        email=profile.email,
        full_name=profile.full_name,
        role=profile.role,
        department=profile.department,
        phone=profile.phone,
        is_active=user.is_active if user else True,
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
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_active = False
    db.commit()
    auth_service.revoke_user_sessions(db, user_id)
    return {"message": "User deactivated and sessions revoked"}


@router.put("/{user_id}/activate", response_model=MessageResponse)
def activate_user(
    user_id: str,
    admin: Annotated[Profile, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.is_active = True
    user.is_locked = False
    user.failed_login_count = 0
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
            "issued_at": s.issued_at.isoformat() if s.issued_at else None,
            "expires_at": s.expires_at.isoformat() if s.expires_at else None,
            "revoked": s.revoked,
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
