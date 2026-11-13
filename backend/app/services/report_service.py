from __future__ import annotations

import logging
from datetime import UTC, date, datetime, time, timedelta
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import DateTime, MetaData, Table, inspect, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

logger = logging.getLogger("pajes.reports")

REPORT_MODULES: dict[str, dict[str, str]] = {
    "missions": {
        "table": "weekly_missions",
        "label": "Missions",
        "date_column": "date",
        "permission": "missions",
    },
    "review_notes": {
        "table": "review_notes",
        "label": "Notes de revue",
        "date_column": "created_at",
        "permission": "review_notes",
    },
    "findings": {
        "table": "findings",
        "label": "Constats",
        "date_column": "created_at",
        "permission": "findings",
    },
    "stock_items": {
        "table": "stock_items",
        "label": "Stock",
        "date_column": "created_at",
        "permission": "stock",
    },
    "fixed_assets": {
        "table": "fixed_assets",
        "label": "Immobilisations",
        "date_column": "created_at",
        "permission": "immobilisations",
    },
    "leave_requests": {
        "table": "leave_requests",
        "label": "Congés",
        "date_column": "created_at",
        "permission": "conges",
    },
    "clients": {
        "table": "clients",
        "label": "Clients",
        "date_column": "created_at",
        "permission": "clients",
    },
    "cac": {
        "table": "audit_mission_assignments",
        "label": "Suivi CAC",
        "date_column": "created_at",
        "permission": "suivi_cac",
    },
    "collaborateurs": {
        "table": "collaborateurs",
        "label": "Collaborateurs",
        "date_column": "created_at",
        "permission": "collaborateurs",
    },
    "factures": {
        "table": "invoices",
        "label": "Factures",
        "date_column": "created_at",
        "permission": "factures",
    },
    "notes_de_frais": {
        "table": "expenses",
        "label": "Notes de frais",
        "date_column": "created_at",
        "permission": "notes_frais",
    },
    "etablissements": {
        "table": "etablissements",
        "label": "Établissements",
        "date_column": "created_at",
        "permission": "clients",
    },
    "client_documents": {
        "table": "client_documents",
        "label": "Documents clients",
        "date_column": "created_at",
        "permission": "clients",
    },
    "client_taxes": {
        "table": "client_taxes",
        "label": "Taxes clients",
        "date_column": "created_at",
        "permission": "clients",
    },
    "caisse": {
        "table": "caisse",
        "label": "Caisse",
        "date_column": "date_piece",
        "permission": "caisse",
    },
    "fournisseurs": {
        "table": "fournisseurs",
        "label": "Fournisseurs",
        "date_column": "created_at",
        "permission": "fournisseurs",
    },
}

STANDARD_REPORTS: dict[str, dict[str, Any]] = {
    "audit": {
        **REPORT_MODULES["missions"],
        "columns": ("subject", "status", "progress", "date"),
        "date_column": "date",
    },
    "hr": {
        **REPORT_MODULES["leave_requests"],
        "columns": (
            "employee_name",
            "leave_type",
            "status",
            "start_date",
            "end_date",
        ),
    },
}


class ReportService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.bind = db.get_bind()

    def _table(self, table_name: str) -> Table:
        try:
            inspector = inspect(self.bind)
            schema = "public" if self.bind.dialect.name == "postgresql" else None
            if not inspector.has_table(table_name, schema=schema):
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Report source '{table_name}' is not available.",
                )
            return Table(
                table_name,
                MetaData(),
                schema="public" if self.bind.dialect.name == "postgresql" else None,
                autoload_with=self.bind,
            )
        except HTTPException:
            raise
        except SQLAlchemyError as exc:
            logger.error("Report table inspection failed (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Report data is unavailable in the configured database.",
            ) from exc

    def catalog(self) -> list[dict[str, str]]:
        try:
            inspector = inspect(self.bind)
            schema = "public" if self.bind.dialect.name == "postgresql" else None
            tables = set(inspector.get_table_names(schema=schema))
            available = []
            for module_id, config in REPORT_MODULES.items():
                if config["table"] not in tables:
                    continue
                columns = {
                    column["name"]
                    for column in inspector.get_columns(config["table"], schema=schema)
                }
                if config["date_column"] in columns:
                    available.append({"id": module_id, "label": config["label"]})
            return available
        except SQLAlchemyError as exc:
            logger.error("Report catalog inspection failed (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Report catalog is unavailable in the configured database.",
            ) from exc

    def rows(
        self,
        config: dict[str, Any],
        start_date: date | None,
        end_date: date | None,
        limit: int,
        columns: tuple[str, ...] | None = None,
    ) -> dict[str, Any]:
        table = self._table(config["table"])
        if columns:
            missing = set(columns) - set(table.c.keys())
            if missing:
                logger.error("Report source %s is missing required columns", config["table"])
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Report source '{config['table']}' is missing required fields.",
                )

        date_column_name = config["date_column"]
        if date_column_name not in table.c:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Report source '{config['table']}' has no configured date field.",
            )

        date_column = table.c[date_column_name]
        selected = [table.c[name] for name in columns] if columns else [table]
        statement = select(*selected)
        date_type = datetime if isinstance(date_column.type, DateTime) else date
        if start_date:
            lower_bound = (
                datetime.combine(
                    start_date,
                    time.min,
                    tzinfo=UTC if date_column.type.timezone else None,
                )
                if date_type is datetime
                else start_date
            )
            statement = statement.where(date_column >= lower_bound)
        if end_date:
            next_day = end_date + timedelta(days=1)
            upper_bound = (
                datetime.combine(
                    next_day,
                    time.min,
                    tzinfo=UTC if date_column.type.timezone else None,
                )
                if date_type is datetime
                else next_day
            )
            statement = statement.where(date_column < upper_bound)
        statement = statement.order_by(date_column.desc()).limit(limit + 1)

        try:
            result = self.db.execute(statement).mappings().all()
        except SQLAlchemyError as exc:
            logger.error("Report query failed for %s (%s)", config["table"], type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Report source '{config['table']}' could not be queried.",
            ) from exc

        truncated = len(result) > limit
        records = [dict(row) for row in result[:limit]]
        return {"items": records, "truncated": truncated}

    def standard(self, report_type: str, limit: int = 500) -> dict[str, Any]:
        config = STANDARD_REPORTS[report_type]
        return self.rows(config, None, None, limit, config["columns"])

    def custom(
        self,
        modules: list[str],
        start_date: date | None,
        end_date: date | None,
        ignore_dates: bool,
        limit: int,
    ) -> dict[str, Any]:
        data: dict[str, list[dict[str, Any]]] = {}
        truncated: list[str] = []
        for module_id in modules:
            config = REPORT_MODULES.get(module_id)
            if not config:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Unknown report module '{module_id}'.",
                )
            response = self.rows(
                config,
                None if ignore_dates else start_date,
                None if ignore_dates else end_date,
                limit,
            )
            data[module_id] = response["items"]
            if response["truncated"]:
                truncated.append(module_id)
        return {"data": data, "truncated": truncated}
