"""Permission management routes — view and update role permission overrides."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.auth import Profile, RolePermission
from app.permissions.enforcer import (
    PermissionService,
    get_current_profile,
    require_admin,
)
from app.permissions.matrix import (
    ALL_MODULES,
    ALL_ROLES,
    SUPER_ADMIN_ROLE,
    build_effective_matrix,
    get_default_permissions_for_role,
    has_permission,
)
from app.schemas.auth import (
    MessageResponse,
    RolePermissionsResponse,
    UpdateRolePermissionsRequest,
)

router = APIRouter(prefix="/permissions", tags=["permissions"])


@router.get("/me", response_model=dict)
def get_my_permissions(
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
):
    """Return only the effective permissions for the authenticated user's role."""
    matrix = PermissionService(db).matrix
    return {
        "role": profile.role,
        "permissions": matrix.get(profile.role, {}) if profile.role else {},
    }


@router.get("/matrix", response_model=dict)
def get_permission_matrix(
    admin: Annotated[Profile, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    """Return the effective permission matrix (defaults + DB overrides)."""
    perms = PermissionService(db)
    return {"matrix": perms.matrix, "roles": ALL_ROLES, "modules": ALL_MODULES}


@router.get("/roles", response_model=list[str])
def list_roles(
    profile: Annotated[Profile, Depends(require_admin)],
):
    return ALL_ROLES


@router.get("/modules", response_model=list[str])
def list_modules(
    profile: Annotated[Profile, Depends(require_admin)],
):
    return ALL_MODULES


@router.get("/role/{role}", response_model=RolePermissionsResponse)
def get_role_permissions(
    role: str,
    admin: Annotated[Profile, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    if role == SUPER_ADMIN_ROLE:
        return {"role": role, "permissions": get_default_permissions_for_role(role)}
    db_row = db.query(RolePermission).filter(RolePermission.role == role).first()
    if db_row:
        return {"role": role, "permissions": db_row.permissions}
    return {"role": role, "permissions": get_default_permissions_for_role(role)}


@router.put("/role/{role}", response_model=RolePermissionsResponse)
def update_role_permissions(
    role: str,
    body: UpdateRolePermissionsRequest,
    admin: Annotated[Profile, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    if role == SUPER_ADMIN_ROLE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot override super_admin permissions",
        )
    db_row = db.query(RolePermission).filter(RolePermission.role == role).first()
    if db_row:
        db_row.permissions = body.permissions
    else:
        db_row = RolePermission(role=role, permissions=body.permissions)
        db.add(db_row)
    db.commit()
    return {"role": role, "permissions": db_row.permissions}


@router.delete("/role/{role}", response_model=MessageResponse)
def reset_role_permissions(
    role: str,
    admin: Annotated[Profile, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    if role == SUPER_ADMIN_ROLE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot reset super_admin permissions",
        )
    db_row = db.query(RolePermission).filter(RolePermission.role == role).first()
    if db_row:
        db.delete(db_row)
        db.commit()
    return {"message": f"Permissions for {role} reset to defaults"}
