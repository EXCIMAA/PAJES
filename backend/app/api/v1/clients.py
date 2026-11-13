"""Client, client-reference, and establishment endpoints."""

from __future__ import annotations

import re
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.auth import Profile
from app.permissions.enforcer import require_permission
from app.schemas.clients import (
    ClientLinksRequest,
    ClientWriteRequest,
    EstablishmentWriteRequest,
)
from app.services.client_service import ClientService

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("")
def list_clients(
    _profile: Annotated[Profile, Depends(require_permission("clients", "view"))],
    db: Annotated[Session, Depends(get_db)],
    search: str | None = Query(None, max_length=200),
    country: str | None = Query(None, max_length=10),
    nature: str | None = Query(None, max_length=100),
):
    return ClientService(db).list_clients(search=search, country=country, nature=nature)


@router.get("/references")
def get_client_references(
    _profile: Annotated[Profile, Depends(require_permission("clients", "view"))],
    db: Annotated[Session, Depends(get_db)],
):
    return ClientService(db).references()


@router.get("/next-code")
def get_next_client_code(
    _profile: Annotated[Profile, Depends(require_permission("clients", "create"))],
    db: Annotated[Session, Depends(get_db)],
    country: str = Query(min_length=3, max_length=3, pattern="^[A-Z]{3}$"),
):
    table_service = ClientService(db)
    table = table_service.table("clients")
    statement = table.select().where(table.c.client_code.like(f"{country}%"))
    if "client_code" in table.c:
        statement = statement.order_by(table.c.client_code.desc()).limit(1)
    row = db.execute(statement).first()
    next_number = 1
    if row:
        current_code = row._mapping["client_code"]
        match = re.search(r"(\d+)$", str(current_code))
        if match:
            next_number = int(match.group(1)) + 1
    return {"client_code": f"{country}{next_number:05d}"}


@router.get("/{client_id}")
def get_client(
    client_id: str,
    _profile: Annotated[Profile, Depends(require_permission("clients", "view"))],
    db: Annotated[Session, Depends(get_db)],
):
    return ClientService(db).get_client(client_id)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_client(
    body: ClientWriteRequest,
    profile: Annotated[Profile, Depends(require_permission("clients", "create"))],
    db: Annotated[Session, Depends(get_db)],
):
    return ClientService(db).save_client(body.model_dump(), profile)


@router.put("/{client_id}")
def update_client(
    client_id: str,
    body: ClientWriteRequest,
    profile: Annotated[Profile, Depends(require_permission("clients", "edit"))],
    db: Annotated[Session, Depends(get_db)],
):
    return ClientService(db).save_client(
        body.model_dump(), profile, client_id
    )


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: str,
    _profile: Annotated[Profile, Depends(require_permission("clients", "delete"))],
    db: Annotated[Session, Depends(get_db)],
):
    ClientService(db).delete_client(client_id)


@router.get("/{client_id}/links")
def get_client_links(
    client_id: str,
    _profile: Annotated[Profile, Depends(require_permission("clients", "view"))],
    db: Annotated[Session, Depends(get_db)],
):
    return ClientService(db).get_client_links(client_id)


@router.put("/{client_id}/links")
def save_client_links(
    client_id: str,
    body: ClientLinksRequest,
    _profile: Annotated[Profile, Depends(require_permission("clients", "edit"))],
    db: Annotated[Session, Depends(get_db)],
):
    return ClientService(db).save_client_links(
        client_id,
        [item.model_dump() for item in body.documents],
        [item.model_dump() for item in body.taxes],
    )


@router.get("/{client_id}/establishments")
def list_establishments(
    client_id: str,
    _profile: Annotated[Profile, Depends(require_permission("clients", "view"))],
    db: Annotated[Session, Depends(get_db)],
    active_only: bool = False,
):
    return ClientService(db).list_establishments(client_id, active_only=active_only)


@router.post("/{client_id}/establishments", status_code=status.HTTP_201_CREATED)
def create_establishment(
    client_id: str,
    body: EstablishmentWriteRequest,
    profile: Annotated[Profile, Depends(require_permission("clients", "create"))],
    db: Annotated[Session, Depends(get_db)],
):
    return ClientService(db).save_establishment(
        client_id, body.model_dump()
    )


@router.put("/{client_id}/establishments/{establishment_id}")
def update_establishment(
    client_id: str,
    establishment_id: str,
    body: EstablishmentWriteRequest,
    profile: Annotated[Profile, Depends(require_permission("clients", "edit"))],
    db: Annotated[Session, Depends(get_db)],
):
    return ClientService(db).save_establishment(
        client_id,
        body.model_dump(),
        establishment_id,
    )


@router.delete(
    "/{client_id}/establishments/{establishment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_establishment(
    client_id: str,
    establishment_id: str,
    _profile: Annotated[Profile, Depends(require_permission("clients", "delete"))],
    db: Annotated[Session, Depends(get_db)],
):
    ClientService(db).delete_establishment(client_id, establishment_id)
