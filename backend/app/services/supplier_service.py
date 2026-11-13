from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import MetaData, Table, Uuid, delete, insert, select, update
from sqlalchemy.orm import Session

from app.core import utcnow
from app.models.auth import Profile

logger = logging.getLogger("pajes.suppliers")

IMMUTABLE_COLUMNS = {"id", "created_by", "created_at", "updated_at"}


class SupplierService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.bind = db.get_bind()
        try:
            self.table = Table(
                "fournisseurs",
                MetaData(),
                schema="public" if self.bind.dialect.name == "postgresql" else None,
                autoload_with=self.bind,
            )
        except Exception as exc:
            logger.error("Supplier table reflection failed (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Supplier data is unavailable in the configured database.",
            ) from exc

    def _identity(self, column_name: str, value: str) -> Any:
        if isinstance(self.table.c[column_name].type, Uuid):
            try:
                return uuid.UUID(value)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Invalid supplier identifier.",
                ) from exc
        return value

    def _record(self, row: Any) -> dict[str, Any]:
        record = dict(row._mapping)
        record["id"] = str(record["id"])
        if record.get("created_by") is not None:
            record["created_by"] = str(record["created_by"])
        return record

    def list(self) -> list[dict[str, Any]]:
        statement = select(self.table)
        if "name" in self.table.c:
            statement = statement.order_by(self.table.c.name.asc())
        return [self._record(row) for row in self.db.execute(statement).all()]

    def create(self, values: dict[str, Any], profile: Profile) -> dict[str, Any]:
        now = utcnow()
        record = {key: value for key, value in values.items() if key in self.table.c}
        if "id" in self.table.c and (
            isinstance(self.table.c.id.type, Uuid)
            or getattr(self.table.c.id.type, "length", None) == 36
        ):
            record["id"] = (
                uuid.uuid4()
                if isinstance(self.table.c.id.type, Uuid)
                else str(uuid.uuid4())
            )
        if "created_by" in self.table.c:
            record["created_by"] = (
                self._identity("created_by", profile.id)
                if isinstance(self.table.c.created_by.type, Uuid)
                else profile.id
            )
        if "is_done" in self.table.c:
            record["is_done"] = False
        if "last_alert_date" in self.table.c:
            record["last_alert_date"] = None
        if "created_at" in self.table.c:
            record["created_at"] = now
        if "updated_at" in self.table.c:
            record["updated_at"] = now
        try:
            row = self.db.execute(insert(self.table).values(**record).returning(self.table)).one()
            self.db.commit()
        except Exception as exc:
            self.db.rollback()
            logger.error("Supplier creation failed (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Supplier could not be created.",
            ) from exc
        return self._record(row)

    def update(self, supplier_id: str, values: dict[str, Any]) -> dict[str, Any]:
        record = {
            key: value
            for key, value in values.items()
            if key in self.table.c and key not in IMMUTABLE_COLUMNS
        }
        if "last_alert_date" in self.table.c:
            record["last_alert_date"] = None
        if "updated_at" in self.table.c:
            record["updated_at"] = utcnow()
        try:
            row = self.db.execute(
                update(self.table)
                .where(self.table.c.id == self._identity("id", supplier_id))
                .values(**record)
                .returning(self.table)
            ).first()
            self.db.commit()
        except Exception as exc:
            self.db.rollback()
            logger.error("Supplier update failed (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Supplier could not be updated.",
            ) from exc
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supplier not found.",
            )
        return self._record(row)

    def patch(self, supplier_id: str, values: dict[str, Any]) -> dict[str, Any]:
        record = {key: value for key, value in values.items() if key in self.table.c}
        if "updated_at" in self.table.c:
            record["updated_at"] = utcnow()
        try:
            row = self.db.execute(
                update(self.table)
                .where(self.table.c.id == self._identity("id", supplier_id))
                .values(**record)
                .returning(self.table)
            ).first()
            self.db.commit()
        except Exception as exc:
            self.db.rollback()
            logger.error("Supplier alert update failed (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Supplier alert could not be updated.",
            ) from exc
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supplier not found.",
            )
        return self._record(row)

    def delete(self, supplier_id: str) -> None:
        try:
            result = self.db.execute(
                delete(self.table).where(
                    self.table.c.id == self._identity("id", supplier_id)
                )
            )
            self.db.commit()
        except Exception as exc:
            self.db.rollback()
            logger.error("Supplier deletion failed (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Supplier could not be deleted.",
            ) from exc
        if not result.rowcount:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Supplier not found.",
            )
