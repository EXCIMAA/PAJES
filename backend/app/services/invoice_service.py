from __future__ import annotations

import logging
import re
import uuid
from datetime import date
from decimal import Decimal
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import MetaData, Table, Uuid, delete, func, inspect, select, text, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core import utcnow

logger = logging.getLogger("pajes.invoices")
TVA_RATE = Decimal("0.1925")


class InvoiceService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.bind = db.get_bind()
        self.schema = "public" if self.bind.dialect.name == "postgresql" else None
        self._tables: dict[str, Table] = {}

    def _table(self, name: str) -> Table:
        if name in self._tables:
            return self._tables[name]
        try:
            if not inspect(self.bind).has_table(name, schema=self.schema):
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Invoice source '{name}' is not available.",
                )
            table = Table(
                name,
                MetaData(),
                schema=self.schema,
                autoload_with=self.bind,
            )
        except HTTPException:
            raise
        except SQLAlchemyError as exc:
            logger.error("Invoice schema inspection failed for %s (%s)", name, type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Invoice data is unavailable in the configured database.",
            ) from exc
        self._tables[name] = table
        return table

    @staticmethod
    def _record(row: Any) -> dict[str, Any]:
        record = dict(row._mapping)
        if record.get("id") is not None:
            record["id"] = str(record["id"])
        if "invoice_type" in record:
            record["type_document"] = record.pop("invoice_type")
        for key in ("client_id", "created_by"):
            if record.get(key) is not None:
                record[key] = str(record[key])
        return record

    @staticmethod
    def _identity(table: Table, value: str) -> Any:
        if isinstance(table.c.id.type, Uuid):
            try:
                return uuid.UUID(value)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                    detail="Invalid invoice identifier.",
                ) from exc
        return value

    def list(
        self,
        country: str | None,
        limit: int,
        offset: int,
    ) -> dict[str, Any]:
        table = self._table("invoices")
        statement = select(table)
        count_statement = select(func.count()).select_from(table)
        filters = []
        if "archived" in table.c:
            filters.append(table.c.archived.is_(False))
        if country:
            if "country" not in table.c:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Invoice country filtering is not supported by the configured schema.",
                )
            filters.append(table.c.country == country)
        for criterion in filters:
            statement = statement.where(criterion)
            count_statement = count_statement.where(criterion)
        order_column = table.c.created_at if "created_at" in table.c else table.c.id
        statement = statement.order_by(order_column.desc()).limit(limit).offset(offset)
        try:
            items = [self._record(row) for row in self.db.execute(statement).all()]
            total = int(self.db.scalar(count_statement) or 0)
        except SQLAlchemyError as exc:
            logger.error("Invoice list query failed (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Invoices could not be loaded.",
            ) from exc
        return {"items": items, "total": total, "limit": limit, "offset": offset}

    def detail(self, invoice_id: str) -> dict[str, Any]:
        invoices = self._table("invoices")
        lines = self._table("invoice_lines")
        try:
            identity = self._identity(invoices, invoice_id)
            invoice_row = self.db.execute(
                select(invoices).where(invoices.c.id == identity)
            ).first()
            if invoice_row is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Invoice not found.",
                )
            invoice = self._record(invoice_row)
            line_column = lines.c.invoice_id
            line_identity = identity
            if isinstance(line_column.type, Uuid) and not isinstance(identity, uuid.UUID):
                line_identity = uuid.UUID(invoice_id)
            line_rows = self.db.execute(
                select(lines)
                .where(line_column == line_identity)
                .order_by(lines.c.sort_order.asc() if "sort_order" in lines.c else lines.c.id.asc())
            ).all()
        except HTTPException:
            raise
        except (SQLAlchemyError, ValueError) as exc:
            logger.error("Invoice detail query failed (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Invoice details could not be loaded.",
            ) from exc
        return {
            "invoice": invoice,
            "lines": [self._record(row) for row in line_rows],
        }

    @staticmethod
    def _decimal(value: Any) -> Decimal:
        return Decimal(str(value or 0))

    def _client_snapshot(self, client_id: str) -> tuple[Any, dict[str, Any]]:
        clients = self._table("clients")
        identity = self._identity(clients, client_id)
        row = self.db.execute(
            select(clients).where(clients.c.id == identity)
        ).first()
        if row is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="The selected invoice client does not exist.",
            )
        client = self._record(row)
        snapshot = {
            "name": client.get("name") or "",
            "address_bp": client.get("address_bp") or client.get("address") or "",
            "nui": client.get("nui") or client.get("tax_number") or "",
            "rccm": client.get("rccm") or "",
            "contract_ref": client.get("contract_ref") or "",
            "country": client.get("country") or "",
        }
        return identity, snapshot

    def _allocate_sequence(self, column: Any, prefix: str) -> int:
        if self.bind.dialect.name == "postgresql":
            self.db.execute(
                text("SELECT pg_advisory_xact_lock(hashtext(:sequence_prefix))"),
                {"sequence_prefix": prefix},
            )
        rows = self.db.execute(
            select(column).where(column.like(f"{prefix}%"))
        ).scalars()
        matcher = re.compile(rf"^{re.escape(prefix)}([0-9]+)$")
        highest = 0
        for value in rows:
            match = matcher.fullmatch(str(value or ""))
            if match:
                highest = max(highest, int(match.group(1)))
        return highest + 1

    @staticmethod
    def _line_amount(section: str, unite: Any, taux: Any, total_ht: Decimal) -> Decimal:
        quantity = Decimal(str(unite or 0))
        rate = Decimal(str(taux or 0))
        if section == "HONORAIRES":
            return quantity * rate / Decimal("100")
        if section == "DEBOURS":
            return quantity * rate
        return -(total_ht * rate)

    def _persist_lines_and_totals(
        self,
        invoice_table: Table,
        lines_table: Table,
        invoice_id: Any,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        if not {"invoice_id", "section", "designation", "montant"}.issubset(lines_table.c.keys()):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Invoice lines are not supported by the configured schema.",
            )
        if "id" not in lines_table.c:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Invoice lines cannot be created with the configured schema.",
            )
        lines = payload["lines"]
        honoraires = sum(
            (
                self._line_amount("HONORAIRES", line["unite"], line["taux"], Decimal("0"))
                for line in lines
                if line["section"] == "HONORAIRES"
            ),
            Decimal("0"),
        )
        retenues = sum(
            (
                self._line_amount("RETENUS", line["unite"], line["taux"], honoraires)
                for line in lines
                if line["section"] == "RETENUS"
            ),
            Decimal("0"),
        )
        debours = sum(
            (
                self._line_amount("DEBOURS", line["unite"], line["taux"], Decimal("0"))
                for line in lines
                if line["section"] == "DEBOURS"
            ),
            Decimal("0"),
        )
        tva = honoraires * TVA_RATE
        total_ttc = honoraires + tva
        total_general = total_ttc + retenues + debours - self._decimal(payload["acompte_regle"])
        if payload["type_document"] == "AVOIR":
            total_general = -total_general

        updated_invoice: dict[str, Any] = {
            "total_ht": honoraires,
            "total_tva": tva,
            "total_ttc": total_ttc,
            "total_retenues": retenues,
            "total_debours": debours,
            "total_general": total_general,
        }
        existing_invoice = self.db.execute(
            select(invoice_table).where(invoice_table.c.id == invoice_id)
        ).first()
        current = dict(existing_invoice._mapping) if existing_invoice else {}
        for key, value in updated_invoice.items():
            if key not in invoice_table.c:
                if key in ("total_ht", "total_tva", "total_ttc", "total_retenues", "total_debours"):
                    continue
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Invoice totals are not supported by the configured schema.",
                )
            updated_invoice[key] = value
        for name in ("acompte_regle",):
            if name in invoice_table.c:
                updated_invoice[name] = self._decimal(payload[name])

        self.db.execute(
            delete(lines_table).where(lines_table.c.invoice_id == invoice_id)
        )
        for line in lines:
            amount = self._line_amount(
                line["section"],
                line["unite"],
                line["taux"],
                honoraires,
            )
            line_values: dict[str, Any] = {
                "id": (
                    uuid.uuid4()
                    if isinstance(lines_table.c.id.type, Uuid)
                    else str(uuid.uuid4())
                ),
                "invoice_id": invoice_id,
                "section": line["section"],
                "designation": line["designation"],
                "montant": amount,
            }
            for name in ("unite", "taux", "sort_order", "comments"):
                if name in line and name in lines_table.c:
                    line_values[name] = line[name]
            if "created_at" in lines_table.c:
                line_values["created_at"] = utcnow()
            self.db.execute(lines_table.insert().values(**line_values))
        if current:
            updated_invoice["updated_at"] = utcnow() if "updated_at" in invoice_table.c else None
        return updated_invoice

    def preview_number(
        self, emission_date: date, initials: str, reference_base: str
    ) -> dict[str, str]:
        invoices = self._table("invoices")
        for column_name in ("invoice_number", "ref_pf"):
            if column_name not in invoices.c:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Invoice numbering is not supported by the configured schema.",
                )
        invoice_prefix = (
            f"EXCIMAA/FAC{emission_date.month:02d}/{initials.upper()}/"
        )
        ref_prefix = f"{reference_base}-"
        invoice_sequence = self._allocate_sequence(
            invoices.c.invoice_number, invoice_prefix
        )
        ref_sequence = self._allocate_sequence(invoices.c.ref_pf, ref_prefix)
        return {
            "invoice_number": f"{invoice_prefix}{invoice_sequence:07d}",
            "ref_pf": f"{ref_prefix}{ref_sequence:03d}",
        }

    def save(
        self,
        payload: dict[str, Any],
        profile_id: str,
        invoice_id: str | None = None,
    ) -> dict[str, Any]:
        invoices = self._table("invoices")
        lines = self._table("invoice_lines")
        client_id, snapshot = self._client_snapshot(payload["client_id"])
        is_create = invoice_id is None
        try:
            values: dict[str, Any] = {
                "date_emission": payload["date_emission"],
                "client_id": client_id,
                "client_details_snapshot": snapshot,
                "currency": payload["currency"],
                "country": payload["country"],
                "ref_pf": payload["reference_base"],
                "date_contrat": payload.get("date_contrat"),
                "invoice_type": payload["type_document"],
                "acompte_regle": self._decimal(payload["acompte_regle"]),
                "payment_method": payload["payment_method"],
                "signature_company": payload.get("signature_company"),
                "signature_client": payload.get("signature_client"),
            }
            if is_create:
                numbering = self.preview_number(
                    payload["date_emission"],
                    payload["initials"],
                    payload["reference_base"],
                )
                values["invoice_number"] = numbering["invoice_number"]
                values["ref_pf"] = numbering["ref_pf"]
                values["status"] = "draft"
                if "created_by" in invoices.c:
                    values["created_by"] = self._identity(invoices, profile_id)
                if "id" in invoices.c:
                    values["id"] = (
                        uuid.uuid4()
                        if isinstance(invoices.c.id.type, Uuid)
                        else str(uuid.uuid4())
                    )
                if "created_at" in invoices.c:
                    values["created_at"] = utcnow()
            else:
                identity = self._identity(invoices, invoice_id)
                existing = self.db.execute(
                    select(invoices)
                    .where(invoices.c.id == identity)
                    .with_for_update()
                ).first()
                if existing is None:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Invoice not found.",
                    )
                record = dict(existing._mapping)
                if record.get("archived"):
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail="Archived invoices cannot be edited.",
                    )
                values.pop("ref_pf", None)
                if "type_document" in invoices.c:
                    values["type_document"] = values.pop("invoice_type")
                values = {key: value for key, value in values.items() if key in invoices.c}
                self.db.execute(
                    update(invoices).where(invoices.c.id == identity).values(**values)
                )

            if is_create:
                values = {
                    key: value for key, value in values.items() if key in invoices.c
                }
                required = {
                    "id",
                    "invoice_number",
                    "date_emission",
                    "invoice_type" if "invoice_type" in invoices.c else "type_document",
                    "client_id",
                    "currency",
                    "country",
                }
                if not required.issubset(values):
                    logger.error(
                        "Invoice creation schema missing required columns: %s",
                        sorted(required.difference(values)),
                    )
                    raise HTTPException(
                        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                        detail="Invoice creation is not supported by the configured schema.",
                    )
                self.db.execute(invoices.insert().values(**values))
                identity = values["id"]

            line_payload = dict(payload)
            totals = self._persist_lines_and_totals(
                invoices, lines, identity, line_payload
            )
            self.db.execute(
                update(invoices)
                .where(invoices.c.id == identity)
                .values(**{key: value for key, value in totals.items() if key in invoices.c})
            )
            self.db.commit()
        except HTTPException:
            self.db.rollback()
            raise
        except (SQLAlchemyError, ValueError) as exc:
            self.db.rollback()
            logger.error("Invoice save failed (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Invoice could not be saved with the configured schema.",
            ) from exc
        return self.detail(str(identity))

    def archive(self, invoice_id: str) -> None:
        table = self._table("invoices")
        if "archived" not in table.c:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Invoice archiving is not supported by the configured schema.",
            )
        try:
            values = {"archived": True}
            if "updated_at" in table.c:
                values["updated_at"] = utcnow()
            result = self.db.execute(
                update(table)
                .where(table.c.id == self._identity(table, invoice_id))
                .values(**values)
            )
            if not result.rowcount:
                self.db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Invoice not found.",
                )
            self.db.commit()
        except HTTPException:
            raise
        except (SQLAlchemyError, ValueError) as exc:
            self.db.rollback()
            logger.error("Invoice archive failed (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Invoice could not be archived.",
            ) from exc

    def update_status(self, invoice_id: str, new_status: str) -> None:
        table = self._table("invoices")
        if "status" not in table.c:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Invoice status is not supported by the configured schema.",
            )
        values: dict[str, Any] = {"status": new_status}
        if "updated_at" in table.c:
            values["updated_at"] = utcnow()
        try:
            result = self.db.execute(
                update(table)
                .where(table.c.id == self._identity(table, invoice_id))
                .values(**values)
            )
            if not result.rowcount:
                self.db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Invoice not found.",
                )
            self.db.commit()
        except HTTPException:
            raise
        except (SQLAlchemyError, ValueError) as exc:
            self.db.rollback()
            logger.error("Invoice status update failed (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Invoice status could not be updated.",
            ) from exc
