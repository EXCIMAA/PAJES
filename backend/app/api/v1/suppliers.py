from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.auth import Profile
from app.permissions.enforcer import require_permission
from app.schemas.suppliers import (
    SupplierCreate,
    SupplierPatch,
    SupplierResponse,
    SupplierUpdate,
)
from app.services.supplier_service import SupplierService

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.get("", response_model=list[SupplierResponse])
def list_suppliers(
    _profile: Annotated[Profile, Depends(require_permission("fournisseurs", "view"))],
    db: Annotated[Session, Depends(get_db)],
):
    return SupplierService(db).list()


@router.post(
    "",
    response_model=SupplierResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_supplier(
    body: SupplierCreate,
    profile: Annotated[Profile, Depends(require_permission("fournisseurs", "create"))],
    db: Annotated[Session, Depends(get_db)],
):
    return SupplierService(db).create(body.model_dump(), profile)


@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: str,
    body: SupplierUpdate,
    _profile: Annotated[Profile, Depends(require_permission("fournisseurs", "edit"))],
    db: Annotated[Session, Depends(get_db)],
):
    return SupplierService(db).update(supplier_id, body.model_dump())


@router.patch("/{supplier_id}", response_model=SupplierResponse)
def update_supplier_state(
    supplier_id: str,
    body: SupplierPatch,
    _profile: Annotated[Profile, Depends(require_permission("fournisseurs", "edit"))],
    db: Annotated[Session, Depends(get_db)],
):
    return SupplierService(db).patch(
        supplier_id,
        body.model_dump(exclude_unset=True),
    )


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(
    supplier_id: str,
    _profile: Annotated[Profile, Depends(require_permission("fournisseurs", "delete"))],
    db: Annotated[Session, Depends(get_db)],
):
    SupplierService(db).delete(supplier_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
