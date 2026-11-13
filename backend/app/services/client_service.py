"""Database operations for clients, their reference data, links, and establishments."""

from __future__ import annotations

import logging
import uuid
from datetime import date, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import MetaData, Table, Uuid, delete, insert, select, update
from sqlalchemy.orm import Session

from app.core import utcnow
from app.models.auth import Profile

logger = logging.getLogger("pajes.clients")

REFERENCE_TABLES = {
    "formes": ("ref_formes_juridiques", "label"),
    "statuts": ("ref_statuts_fiscaux", "label"),
    "regimes": ("ref_regimes_fiscaux", "label"),
    "natures": ("ref_natures", "label"),
    "taxes": ("ref_taxes", "libelle"),
    "categories": ("ref_categories_documents", "label"),
    "documents": ("ref_documents", "category_id, label"),
}
IMMUTABLE_CLIENT_COLUMNS = {"id", "created_by", "created_at", "updated_at"}
IMMUTABLE_ESTABLISHMENT_COLUMNS = {
    "id",
    "client_id",
    "created_at",
    "updated_at",
}


class ClientService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.bind = db.get_bind()
        self.metadata = MetaData()
        self._tables: dict[str, Table] = {}
        self.schema = "public" if self.bind.dialect.name == "postgresql" else None

    def table(self, name: str) -> Table:
        if name not in self._tables:
            try:
                self._tables[name] = Table(
                    name,
                    self.metadata,
                    schema=self.schema,
                    autoload_with=self.bind,
                )
            except Exception as exc:
                logger.error(
                    "Database table reflection failed for %s (%s)",
                    name,
                    type(exc).__name__,
                )
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Required database table '{name}' is unavailable.",
                ) from exc
        return self._tables[name]

    def _record(self, table: Table, row: Any) -> dict[str, Any]:
        return {
            column.name: value
            for column, value in zip(table.columns, row, strict=True)
        }

    def _identity(self, table: Table, column_name: str, value: str) -> Any:
        column_type = table.c[column_name].type
        if isinstance(column_type, Uuid):
            try:
                return uuid.UUID(value)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Invalid identifier.",
                ) from exc
        return value

    def _convert_values(self, table: Table, values: dict[str, Any]) -> dict[str, Any]:
        converted: dict[str, Any] = {}
        for key, value in values.items():
            if key not in table.c or value is None:
                continue
            column_type = table.c[key].type
            if isinstance(column_type, Uuid) and not isinstance(value, uuid.UUID):
                converted[key] = uuid.UUID(str(value))
            elif getattr(column_type, "python_type", None) is date and isinstance(value, str):
                converted[key] = date.fromisoformat(value) if value else None
            elif getattr(column_type, "python_type", None) is datetime and isinstance(value, str):
                converted[key] = datetime.fromisoformat(value) if value else None
            else:
                converted[key] = value
        return converted

    def list_clients(
        self,
        *,
        search: str | None = None,
        country: str | None = None,
        nature: str | None = None,
    ) -> list[dict[str, Any]]:
        table = self.table("clients")
        statement = select(table)
        if country and "country" in table.c:
            statement = statement.where(table.c.country == country)
        if nature and "nature" in table.c:
            statement = statement.where(table.c.nature == nature)
        if search:
            terms = [
                table.c[column].ilike(f"%{search}%")
                for column in ("name", "client_code", "manager_name")
                if column in table.c
            ]
            if terms:
                from sqlalchemy import or_

                statement = statement.where(or_(*terms))
        if "client_code" in table.c:
            statement = statement.order_by(table.c.client_code)
        return [self._record(table, row) for row in self.db.execute(statement).all()]

    def references(self) -> dict[str, list[dict[str, Any]]]:
        result: dict[str, list[dict[str, Any]]] = {}
        for key, (table_name, ordering) in REFERENCE_TABLES.items():
            table = self.table(table_name)
            columns = [column.strip() for column in ordering.split(",")]
            order_columns = [table.c[name] for name in columns if name in table.c]
            statement = select(table)
            if order_columns:
                statement = statement.order_by(*order_columns)
            result[key] = [
                self._record(table, row) for row in self.db.execute(statement).all()
            ]
        category_labels = {
            row["id"]: row["label"] for row in result["categories"]
        }
        for document in result["documents"]:
            category_label = category_labels.get(document.get("category_id"))
            document["ref_categories_documents"] = (
                {"id": document.get("category_id"), "label": category_label}
                if category_label is not None
                else None
            )
        return result

    def get_client(self, client_id: str) -> dict[str, Any]:
        table = self.table("clients")
        row = self.db.execute(
            select(table).where(
                table.c.id == self._identity(table, "id", client_id)
            )
        ).first()
        if row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
        return self._record(table, row)

    def get_client_links(self, client_id: str) -> dict[str, list[dict[str, Any]]]:
        self.get_client(client_id)
        result: dict[str, list[dict[str, Any]]] = {}
        for table_name, key in (
            ("client_documents", "documents"),
            ("client_taxes", "taxes"),
        ):
            table = self.table(table_name)
            statement = select(table).where(
                table.c.client_id == self._identity(table, "client_id", client_id)
            )
            result[key] = [
                self._record(table, row) for row in self.db.execute(statement).all()
            ]
        return result

    def save_client(
        self,
        values: dict[str, Any],
        profile: Profile,
        client_id: str | None = None,
    ) -> dict[str, Any]:
        table = self.table("clients")
        allowed = set(table.c.keys()) - IMMUTABLE_CLIENT_COLUMNS
        clean_values = self._convert_values(
            table, {key: value for key, value in values.items() if key in allowed}
        )
        if not clean_values.get("name", "").strip():
            raise HTTPException(status_code=422, detail="Client name is required.")

        if client_id:
            self.get_client(client_id)
            clean_values["updated_at"] = utcnow()
            statement = (
                update(table)
                .where(table.c.id == self._identity(table, "id", client_id))
                .values(**clean_values)
                .returning(*table.columns)
            )
        else:
            new_id = uuid.uuid4()
            clean_values["id"] = (
                new_id
                if isinstance(table.c.id.type, Uuid)
                else str(new_id)
            )
            if "created_by" in table.c:
                clean_values["created_by"] = self._identity(
                    table, "created_by", profile.id
                )
            statement = insert(table).values(**clean_values).returning(*table.columns)

        try:
            row = self.db.execute(statement).first()
            self.db.commit()
        except Exception as exc:
            self.db.rollback()
            logger.error("Failed to save client (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Client could not be saved; verify its references and unique fields.",
            ) from exc
        if row is None:
            raise HTTPException(status_code=404, detail="Client not found")
        return self._record(table, row)

    def delete_client(self, client_id: str) -> None:
        table = self.table("clients")
        self.get_client(client_id)
        try:
            result = self.db.execute(
                delete(table).where(
                    table.c.id == self._identity(table, "id", client_id)
                )
            )
            self.db.commit()
        except Exception as exc:
            self.db.rollback()
            logger.error("Failed to delete client (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Client is linked to other records and cannot be deleted.",
            ) from exc
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Client not found")

    def save_client_links(
        self,
        client_id: str,
        documents: list[dict[str, Any]],
        taxes: list[dict[str, Any]],
    ) -> dict[str, list[dict[str, Any]]]:
        self.get_client(client_id)
        document_table = self.table("client_documents")
        tax_table = self.table("client_taxes")
        document_client_id = self._identity(document_table, "client_id", client_id)
        tax_client_id = self._identity(tax_table, "client_id", client_id)
        doc_rows = [
            {
                "client_id": document_client_id,
                "document_id": item["document_id"],
                "status": item["status"],
                "date_fourni": date.today() if item["status"] == "fourni" else None,
                "commentaire": None,
            }
            for item in documents
        ]
        tax_rows = [
            {
                "client_id": tax_client_id,
                "taxe_id": item["taxe_id"],
                "assujetti": item["assujetti"],
                "date_derniere_declaration": None,
                "commentaire": None,
            }
            for item in taxes
        ]
        try:
            self.db.execute(
                delete(document_table).where(
                    document_table.c.client_id == document_client_id
                )
            )
            self.db.execute(
                delete(tax_table).where(tax_table.c.client_id == tax_client_id)
            )
            if doc_rows:
                self.db.execute(insert(document_table), doc_rows)
            if tax_rows:
                self.db.execute(insert(tax_table), tax_rows)
            self.db.commit()
        except Exception as exc:
            self.db.rollback()
            logger.error("Failed to save client links (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=409,
                detail="Client document or tax references could not be saved.",
            ) from exc
        return self.get_client_links(client_id)

    def list_establishments(
        self, client_id: str, *, active_only: bool = False
    ) -> list[dict[str, Any]]:
        self.get_client(client_id)
        table = self.table("etablissements")
        statement = select(table).where(
            table.c.client_id == self._identity(table, "client_id", client_id)
        )
        if active_only and "is_active" in table.c:
            statement = statement.where(table.c.is_active.is_(True))
        if "code" in table.c:
            statement = statement.order_by(table.c.code)
        return [self._record(table, row) for row in self.db.execute(statement).all()]

    def save_establishment(
        self,
        client_id: str,
        values: dict[str, Any],
        establishment_id: str | None = None,
    ) -> dict[str, Any]:
        self.get_client(client_id)
        table = self.table("etablissements")
        allowed = set(table.c.keys()) - IMMUTABLE_ESTABLISHMENT_COLUMNS
        clean_values = self._convert_values(
            table,
            {key: value for key, value in values.items() if key in allowed},
        )
        if not clean_values.get("name", "").strip():
            raise HTTPException(status_code=422, detail="Establishment name is required.")

        if establishment_id:
            condition = (
                (table.c.id == self._identity(table, "id", establishment_id))
                & (table.c.client_id == self._identity(table, "client_id", client_id))
            )
            statement = (
                update(table)
                .where(condition)
                .values(**clean_values)
                .returning(*table.columns)
            )
        else:
            new_id = uuid.uuid4()
            clean_values["id"] = (
                new_id if isinstance(table.c.id.type, Uuid) else str(new_id)
            )
            clean_values["client_id"] = self._identity(
                table, "client_id", client_id
            )
            statement = insert(table).values(**clean_values).returning(*table.columns)
        try:
            row = self.db.execute(statement).first()
            self.db.commit()
        except Exception as exc:
            self.db.rollback()
            logger.error("Failed to save establishment (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=409,
                detail="Establishment could not be saved.",
            ) from exc
        if row is None:
            raise HTTPException(status_code=404, detail="Establishment not found")
        return self._record(table, row)

    def delete_establishment(self, client_id: str, establishment_id: str) -> None:
        table = self.table("etablissements")
        try:
            result = self.db.execute(
                delete(table).where(
                    (table.c.id == self._identity(table, "id", establishment_id))
                    & (
                        table.c.client_id
                        == self._identity(table, "client_id", client_id)
                    )
                )
            )
            self.db.commit()
        except Exception as exc:
            self.db.rollback()
            logger.error("Failed to delete establishment (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=409, detail="Establishment could not be deleted."
            ) from exc
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Establishment not found")
