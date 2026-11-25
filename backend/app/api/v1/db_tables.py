"""Generic table CRUD endpoints using SQLAlchemy table reflection.

Provides GET/POST/PUT/DELETE access to any table in the public schema,
with permission enforcement based on READ_MODULE_MAP.
Intended to replace direct Supabase table access from the frontend.
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete, insert, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core import utcnow
from app.database import get_db
from app.models.auth import Profile
from app.permissions.enforcer import (
    PermissionService,
    get_current_profile,
)

router = APIRouter(prefix="/db/tables", tags=["db-tables"])

# Table -> module mapping for permission checks.
READ_MODULE_MAP: dict[str, str] = {
    "cabinet_resources": "ressources_internes",
    "caisse": "caisse",
    "dossier_collaborateur": "collaborateurs",
    "weekly_missions": "missions",
    "findings": "findings",
    "leave_requests": "conges",
    "collaborateurs_cabinet": "manuel",
    "competences_evaluations": "manuel",
    "documents_client": "manuel",
    "doc_interne": "manuel",
    "doc_technique": "manuel",
    "archivage": "manuel",
    "intervenants": "manuel",
    "missions": "missions",
    "time_entries": "manuel",
    "lab_questionnaire": "manuel",
    "repartition_parametres": "manuel",
    "repartition_lignes": "manuel",
    "echeances": "manuel",
    "lettres_mission": "manuel",
    "review_notes": "review_notes",
    "working_papers": "besoins_cabinet",
    "team_members": "collaborateurs",
    "fixed_assets": "immobilisations",
    "stock_items": "stock",
    "inventory_items": "stock",
    "stock_movements": "stock",
    "expense_reports": "notes_de_frais",
    "role_permissions": "users",
    "missions_cac": "missions",
    "missions_cac_intervenants": "missions",
    "audit_tasks": "missions",
    "audit_mission_assignments": "missions",
    "expense_lines": "notes_de_frais",
    "working_documents": "besoins_cabinet",
    "grille_honoraires": "missions",
    "depreciation_schedules": "immobilisations",
    "scores": "collaborateurs",
    "interventions": "manuel",
    "clients": "clients",
    "fournisseurs": "fournisseurs",
    "invoices": "factures",
    "invoice_lines": "factures",
    "notifications": "notifications",
    "profiles": "users",
    "engagements": "missions",
    "activity_log": "manuel",
    "audit_log": "manuel",
}

WRITE_ACTION_MODULE_MAP: dict[str, str] = dict(READ_MODULE_MAP)


def _check_permission(profile: Profile, db: Session, module: str, action: str) -> None:
    perms = PermissionService(db)
    if not perms.has(profile.role, module, action):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission insuffisante",
        )


def _table_for(name: str, bind) -> Any:
    from sqlalchemy import MetaData, Table

    schema = "public" if bind.dialect.name == "postgresql" else None
    try:
        table = Table(
            name,
            MetaData(),
            schema=schema,
            autoload_with=bind,
        )
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database table '{name}' is unavailable.",
        ) from exc
    return table


def _row_to_dict(row: Any) -> dict[str, Any]:
    record = dict(row._mapping)
    for key, value in list(record.items()):
        if hasattr(value, "hex"):
            record[key] = str(value)
        elif hasattr(value, "isoformat"):
            record[key] = value.isoformat()
    return record


@router.get("/{table_name}")
def list_table_rows(
    table_name: str,
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
    limit: Annotated[int, Query(ge=1, le=1000)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
    order_by: Annotated[str | None, Query()] = None,
    order_asc: Annotated[bool, Query()] = True,
):
    module = READ_MODULE_MAP.get(table_name, table_name)
    _check_permission(profile, db, module, "view")

    bind = db.get_bind()
    table = _table_for(table_name, bind)
    stmt = select(table)
    if order_by and order_by in table.c:
        col = table.c[order_by]
        stmt = stmt.order_by(col.asc() if order_asc else col.desc())
    stmt = stmt.offset(offset).limit(limit)
    rows = db.execute(stmt).all()
    return [_row_to_dict(r) for r in rows]


@router.get("/{table_name}/{row_id}")
def get_table_row(
    table_name: str,
    row_id: str,
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
):
    module = READ_MODULE_MAP.get(table_name, table_name)
    _check_permission(profile, db, module, "view")

    bind = db.get_bind()
    table = _table_for(table_name, bind)
    id_col = table.c.get("id")
    if id_col is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Table '{table_name}' has no 'id' column.",
        )
    stmt = select(table).where(id_col == row_id)
    row = db.execute(stmt).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Row not found")
    return _row_to_dict(row)


@router.post("/{table_name}/upsert", status_code=status.HTTP_201_CREATED)
def upsert_table_row(
    table_name: str,
    body: dict[str, Any],
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
):
    module = WRITE_ACTION_MODULE_MAP.get(table_name, table_name)
    _check_permission(profile, db, module, "create")

    bind = db.get_bind()
    table = _table_for(table_name, bind)

    id_col = table.c.get("id")
    values = {k: v for k, v in body.items() if k in table.c and k != "id"}

    if id_col is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Table '{table_name}' has no 'id' column.",
        )

    id_value = body.get("id") or str(__import__("uuid").uuid4())
    values["id"] = id_value

    try:
        result = db.execute(
            insert(table)
            .values(**values)
            .on_conflict_do_update(
                index_elements=[id_col],
                set_={k: v for k, v in values.items() if k != "id"},
            )
            .returning(table)
        ).first()
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Could not upsert into '{table_name}'.",
        ) from exc
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Upsert returned no data.",
        )
    return _row_to_dict(result)


@router.post("/{table_name}", status_code=status.HTTP_201_CREATED)
def create_table_row(
    table_name: str,
    body: dict[str, Any],
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
):
    module = WRITE_ACTION_MODULE_MAP.get(table_name, table_name)
    _check_permission(profile, db, module, "create")

    bind = db.get_bind()
    table = _table_for(table_name, bind)

    values = {k: v for k, v in body.items() if k in table.c}
    if "id" in table.c and "id" not in values:
        import uuid

        values["id"] = str(uuid.uuid4())

    try:
        result = db.execute(insert(table).values(**values).returning(table)).first()
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Could not insert into '{table_name}'.",
        ) from exc
    if not result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insert returned no data.",
        )
    return _row_to_dict(result)


@router.put("/{table_name}/{row_id}")
def update_table_row(
    table_name: str,
    row_id: str,
    body: dict[str, Any],
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
):
    module = WRITE_ACTION_MODULE_MAP.get(table_name, table_name)
    _check_permission(profile, db, module, "edit")

    bind = db.get_bind()
    table = _table_for(table_name, bind)
    id_col = table.c.get("id")
    if id_col is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Table '{table_name}' has no 'id' column.",
        )

    values = {k: v for k, v in body.items() if k in table.c and k != "id"}
    if "updated_at" in table.c:
        values["updated_at"] = utcnow()

    try:
        result = (
            db.execute(update(table).where(id_col == row_id).values(**values).returning(table))
            .first()
        )
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Could not update '{table_name}'.",
        ) from exc
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Row not found")
    return _row_to_dict(result)


@router.delete("/{table_name}/{row_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_table_row(
    table_name: str,
    row_id: str,
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
):
    module = WRITE_ACTION_MODULE_MAP.get(table_name, table_name)
    _check_permission(profile, db, module, "delete")

    bind = db.get_bind()
    table = _table_for(table_name, bind)
    id_col = table.c.get("id")
    if id_col is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Table '{table_name}' has no 'id' column.",
        )

    try:
        result = db.execute(delete(table).where(id_col == row_id))
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Could not delete from '{table_name}'.",
        ) from exc
    if result.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Row not found")
