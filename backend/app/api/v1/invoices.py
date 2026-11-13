from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.auth import Profile
from app.permissions.enforcer import require_permission
from app.schemas.invoices import (
    InvoiceDetailResponse,
    InvoiceListResponse,
    InvoiceStatusUpdate,
    InvoiceWriteRequest,
)
from app.services.invoice_service import InvoiceService

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("", response_model=InvoiceListResponse)
def list_invoices(
    _profile: Annotated[Profile, Depends(require_permission("factures", "view"))],
    db: Annotated[Session, Depends(get_db)],
    country: Annotated[str | None, Query(min_length=2, max_length=10)] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return InvoiceService(db).list(country, limit, offset)


@router.get("/number-preview")
def preview_invoice_number(
    _profile: Annotated[Profile, Depends(require_permission("factures", "create"))],
    db: Annotated[Session, Depends(get_db)],
    date_emission: date,
    initials: Annotated[str, Query(min_length=1, max_length=8, pattern="^[A-Z0-9]+$")],
    reference_base: Annotated[
        str, Query(min_length=1, max_length=32, pattern="^[A-Z0-9-]+$")
    ],
):
    return InvoiceService(db).preview_number(date_emission, initials, reference_base)


@router.post("", response_model=InvoiceDetailResponse, status_code=status.HTTP_201_CREATED)
def create_invoice(
    body: InvoiceWriteRequest,
    profile: Annotated[Profile, Depends(require_permission("factures", "create"))],
    db: Annotated[Session, Depends(get_db)],
):
    return InvoiceService(db).save(body.model_dump(), profile.id)


@router.get("/{invoice_id}", response_model=InvoiceDetailResponse)
def get_invoice(
    invoice_id: str,
    _profile: Annotated[Profile, Depends(require_permission("factures", "view"))],
    db: Annotated[Session, Depends(get_db)],
):
    return InvoiceService(db).detail(invoice_id)


@router.put("/{invoice_id}", response_model=InvoiceDetailResponse)
def update_invoice(
    invoice_id: str,
    body: InvoiceWriteRequest,
    profile: Annotated[Profile, Depends(require_permission("factures", "edit"))],
    db: Annotated[Session, Depends(get_db)],
):
    return InvoiceService(db).save(body.model_dump(), profile.id, invoice_id)


@router.patch("/{invoice_id}/archive", status_code=status.HTTP_204_NO_CONTENT)
def archive_invoice(
    invoice_id: str,
    _profile: Annotated[Profile, Depends(require_permission("factures", "delete"))],
    db: Annotated[Session, Depends(get_db)],
):
    InvoiceService(db).archive(invoice_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/{invoice_id}/status", status_code=status.HTTP_204_NO_CONTENT)
def update_invoice_status(
    invoice_id: str,
    body: InvoiceStatusUpdate,
    _profile: Annotated[Profile, Depends(require_permission("factures", "edit"))],
    db: Annotated[Session, Depends(get_db)],
):
    InvoiceService(db).update_status(invoice_id, body.status)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
