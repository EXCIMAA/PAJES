"""Read-only analytics over verified PAJES tables when present in PostgreSQL."""

from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy import MetaData, Table, and_, case, func, inspect, select
from sqlalchemy.orm import Session

TABLE_CANDIDATES = {
    "clients": ("clients",),
    "engagements": ("engagements",),
    "invoices": ("invoices",),
    "expenses": ("expense_reports", "expenses"),
    "cash": ("caisse",),
    "stock": ("stock_items", "inventory_items"),
    "fixed_assets": ("fixed_assets",),
    "employees": ("collaborateurs", "team_members"),
    "timesheets": ("time_entries", "timesheets"),
}


class BusinessIntelligenceService:
    """Uses SQLAlchemy reflection so absent, unmigrated modules stay explicit."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.bind = db.get_bind()
        inspector = inspect(self.bind)
        try:
            self.table_names = set(inspector.get_table_names(schema="public"))
            self.schema = "public"
        except Exception:
            self.table_names = set(inspector.get_table_names())
            self.schema = None
        self._tables: dict[str, Table | None] = {}

    def _table(self, entity: str) -> Table | None:
        if entity not in self._tables:
            table_name = next(
                (name for name in TABLE_CANDIDATES[entity] if name in self.table_names),
                None,
            )
            self._tables[entity] = (
                Table(
                    table_name,
                    MetaData(),
                    schema=self.schema,
                    autoload_with=self.bind,
                )
                if table_name
                else None
            )
        return self._tables[entity]

    def _period_filter(
        self,
        table: Table,
        start_date: date | None,
        end_date: date | None,
        date_columns: tuple[str, ...],
    ):
        column = next((table.c[name] for name in date_columns if name in table.c), None)
        if column is None:
            return None
        clauses = []
        if start_date:
            clauses.append(column >= start_date)
        if end_date:
            clauses.append(column < date.fromordinal(end_date.toordinal() + 1))
        return and_(*clauses) if clauses else None

    def _count(self, entity: str, *, active_only: bool = False) -> dict[str, Any]:
        table = self._table(entity)
        if table is None:
            return {"available": False, "value": None, "source": None}
        statement = select(func.count()).select_from(table)
        if active_only and "status" in table.c:
            statement = statement.where(
                func.lower(table.c.status).in_(["active", "in_progress", "open"])
            )
        return {
            "available": True,
            "value": int(self.db.scalar(statement) or 0),
            "source": table.name,
        }

    def _sum(
        self,
        entity: str,
        amount_columns: tuple[str, ...],
        *,
        start_date: date | None = None,
        end_date: date | None = None,
        date_columns: tuple[str, ...] = ("created_at",),
        status_filter: tuple[str, ...] | None = None,
        exclude_cancelled: bool = False,
    ) -> tuple[dict[str, Any], Table | None, Any | None]:
        table = self._table(entity)
        if table is None:
            return {"available": False, "value": None, "source": None}, None, None
        amount = next((table.c[name] for name in amount_columns if name in table.c), None)
        if amount is None:
            return (
                {
                    "available": False,
                    "value": None,
                    "source": table.name,
                    "reason": "No recognized amount column",
                },
                table,
                None,
            )
        statement = select(func.coalesce(func.sum(amount), 0)).select_from(table)
        period = self._period_filter(table, start_date, end_date, date_columns)
        if period is not None:
            statement = statement.where(period)
        if "archived" in table.c:
            statement = statement.where(table.c.archived.is_(False))
        if status_filter and "status" in table.c:
            statement = statement.where(func.lower(table.c.status).in_(list(status_filter)))
        elif exclude_cancelled and "status" in table.c:
            statement = statement.where(func.lower(table.c.status) != "cancelled")
        currency = table.c.currency if "currency" in table.c else None
        if currency is not None:
            grouped = select(currency, func.coalesce(func.sum(amount), 0)).select_from(table)
            if period is not None:
                grouped = grouped.where(period)
            if "archived" in table.c:
                grouped = grouped.where(table.c.archived.is_(False))
            if status_filter and "status" in table.c:
                grouped = grouped.where(func.lower(table.c.status).in_(list(status_filter)))
            elif exclude_cancelled and "status" in table.c:
                grouped = grouped.where(func.lower(table.c.status) != "cancelled")
            rows = self.db.execute(grouped.group_by(currency)).all()
            totals = {str(row[0] or "Unknown"): float(row[1] or 0) for row in rows}
            if not totals:
                return {"available": True, "value": 0, "source": table.name}, table, amount
            if len(totals) == 1:
                code, value = next(iter(totals.items()))
                return (
                    {"available": True, "value": value, "currency": code, "source": table.name},
                    table,
                    amount,
                )
            return (
                {
                    "available": bool(totals),
                    "value": None,
                    "by_currency": totals,
                    "source": table.name,
                    "reason": "Amounts in different currencies are not combined or converted.",
                },
                table,
                amount,
            )
        return (
            {
                "available": True,
                "value": float(self.db.scalar(statement) or 0),
                "source": table.name,
            },
            table,
            amount,
        )

    def _series(
        self,
        table: Table | None,
        amount: Any | None,
        *,
        start_date: date | None,
        end_date: date | None,
        date_columns: tuple[str, ...],
        status_filter: tuple[str, ...] | None = None,
        exclude_cancelled: bool = False,
    ) -> list[dict[str, Any]]:
        if table is None or amount is None:
            return []
        date_column = next((table.c[name] for name in date_columns if name in table.c), None)
        if date_column is None:
            return []
        if "currency" in table.c:
            currencies = select(table.c.currency).select_from(table).distinct()
            period = self._period_filter(table, start_date, end_date, date_columns)
            if period is not None:
                currencies = currencies.where(period)
            if "archived" in table.c:
                currencies = currencies.where(table.c.archived.is_(False))
            if status_filter and "status" in table.c:
                currencies = currencies.where(func.lower(table.c.status).in_(list(status_filter)))
            elif exclude_cancelled and "status" in table.c:
                currencies = currencies.where(func.lower(table.c.status) != "cancelled")
            currency_count = len(self.db.execute(currencies).all())
            if currency_count > 1:
                return []
        dialect = self.bind.dialect.name
        if dialect == "postgresql":
            bucket = func.date_trunc("month", date_column)
        elif dialect == "sqlite":
            bucket = func.strftime("%Y-%m-01", date_column)
        else:
            return []
        statement = select(bucket.label("period"), func.sum(amount).label("amount")).select_from(
            table
        )
        period = self._period_filter(table, start_date, end_date, date_columns)
        if period is not None:
            statement = statement.where(period)
        if "archived" in table.c:
            statement = statement.where(table.c.archived.is_(False))
        if status_filter and "status" in table.c:
            statement = statement.where(func.lower(table.c.status).in_(list(status_filter)))
        elif exclude_cancelled and "status" in table.c:
            statement = statement.where(func.lower(table.c.status) != "cancelled")
        rows = self.db.execute(statement.group_by(bucket).order_by(bucket)).all()
        return [
            {
                "period": row.period.isoformat()[:10] if row.period else None,
                "value": float(row.amount or 0),
            }
            for row in rows
        ]

    def source_status(self) -> dict[str, dict[str, Any]]:
        result = {}
        for entity in TABLE_CANDIDATES:
            table = self._table(entity)
            result[entity] = {
                "available": table is not None,
                "table": table.name if table is not None else None,
            }
        return result

    def overview(
        self,
        start_date: date | None,
        end_date: date | None,
        allowed_modules: set[str] | None = None,
    ) -> dict[str, Any]:
        date_columns = ("date_emission", "created_at")
        revenue, invoice_table, invoice_amount = self._sum(
            "invoices",
            ("total_ttc", "total_general", "total_ht"),
            start_date=start_date,
            end_date=end_date,
            date_columns=date_columns,
            status_filter=("paid",),
        )
        expenses, _, _ = self._sum(
            "expenses",
            ("total_ttc", "net_a_payer", "total_ht", "amount", "montant"),
            start_date=start_date,
            end_date=end_date,
            date_columns=("created_at", "date"),
            status_filter=("submitted", "approved", "valide", "paid", "rembourse"),
        )
        clients = self._count("clients", active_only=True)
        engagements = self._count("engagements", active_only=True)
        fixed_assets, _, _ = self._sum(
            "fixed_assets",
            ("net_book_value", "purchase_value"),
            status_filter=("active",),
            date_columns=(),
        )
        outstanding, _, _ = self._sum(
            "invoices",
            ("total_ttc", "total_general", "total_ht"),
            start_date=start_date,
            end_date=end_date,
            date_columns=date_columns,
            status_filter=("sent", "pending"),
        )
        if outstanding["available"] and outstanding["value"] is not None:
            invoice = self._table("invoices")
            invoice_amount = next(
                (
                    invoice.c[name]
                    for name in ("total_ttc", "total_general", "total_ht")
                    if invoice is not None and name in invoice.c
                ),
                None,
            )
            if invoice is not None and invoice_amount is not None and "acompte_regle" in invoice.c:
                due_amount = case(
                    (
                        invoice_amount > invoice.c.acompte_regle,
                        invoice_amount - invoice.c.acompte_regle,
                    ),
                    else_=0,
                )
                stmt = select(func.coalesce(func.sum(due_amount), 0)).where(
                    func.lower(invoice.c.status).in_(["sent", "pending"])
                )
                period = self._period_filter(invoice, start_date, end_date, date_columns)
                if period is not None:
                    stmt = stmt.where(period)
                if "archived" in invoice.c:
                    stmt = stmt.where(invoice.c.archived.is_(False))
                if "currency" in invoice.c:
                    grouped = select(
                        invoice.c.currency, func.coalesce(func.sum(due_amount), 0)
                    ).where(func.lower(invoice.c.status).in_(["sent", "pending"]))
                    if period is not None:
                        grouped = grouped.where(period)
                    if "archived" in invoice.c:
                        grouped = grouped.where(invoice.c.archived.is_(False))
                    by_currency = {
                        str(row[0] or "Unknown"): float(row[1] or 0)
                        for row in self.db.execute(grouped.group_by(invoice.c.currency)).all()
                    }
                    if len(by_currency) == 1:
                        code, value = next(iter(by_currency.items()))
                        outstanding.update(value=value, currency=code)
                    elif not by_currency:
                        outstanding.update(value=0)
                    else:
                        outstanding.update(
                            value=None,
                            by_currency=by_currency,
                            reason="Amounts in different currencies are not combined or converted.",
                        )
                else:
                    outstanding["value"] = float(self.db.scalar(stmt) or 0)
        cash_table = self._table("cash")
        cash_balance: dict[str, Any] = {"available": False, "value": None, "source": None}
        if cash_table is not None and {"type", "somme"}.issubset(cash_table.c.keys()):
            cash_balance = {
                "available": True,
                "value": float(
                    self.db.scalar(
                        select(
                            func.coalesce(
                                func.sum(
                                    case(
                                        (
                                            func.upper(cash_table.c.type) == "APPROVISIONNEMENT",
                                            cash_table.c.somme,
                                        ),
                                        else_=-cash_table.c.somme,
                                    )
                                ),
                                0,
                            )
                        )
                    )
                    or 0
                ),
                "source": cash_table.name,
            }

        gross_profit = (
            {
                "available": True,
                "value": revenue["value"] - expenses["value"],
                "source": "invoices, expenses",
                "currency": revenue.get("currency"),
            }
            if revenue["available"]
            and expenses["available"]
            and revenue["value"] is not None
            and expenses["value"] is not None
            and revenue.get("currency")
            and revenue.get("currency") == expenses.get("currency")
            else {
                "available": False,
                "value": None,
                "source": None,
                "reason": (
                    "Profit cannot be compared safely unless both source amounts "
                    "use the same verified currency."
                ),
            }
        )
        metrics = {
            "revenue": revenue,
            "expenses": expenses,
            "gross_profit": gross_profit,
            "net_profit": {
                "available": False,
                "value": None,
                "reason": "Net profit requires a verified accounting expense model.",
            },
            "outstanding_invoices": outstanding,
            "cash_balance": cash_balance,
            "active_clients": clients,
            "active_engagements": engagements,
            "fixed_asset_value": fixed_assets,
            "collection_rate": self._collection_rate(start_date, end_date),
            "employee_utilization": {
                "available": False,
                "value": None,
                "reason": "No verified timesheet data source.",
            },
            "billable_hours": {
                "available": False,
                "value": None,
                "reason": "No verified timesheet data source.",
            },
            "non_billable_hours": {
                "available": False,
                "value": None,
                "reason": "No verified timesheet data source.",
            },
        }
        revenue_series = self._series(
            invoice_table,
            invoice_amount,
            start_date=start_date,
            end_date=end_date,
            date_columns=date_columns,
            status_filter=("paid",),
        )
        expense_series = self._expense_series(start_date, end_date)
        comparable = bool(
            revenue.get("currency")
            and revenue.get("currency") == expenses.get("currency")
            and revenue["available"]
            and expenses["available"]
        )
        charts = {
            "revenue": revenue_series,
            "expenses": expense_series,
            "comparison_available": comparable,
            "comparison_reason": None
            if comparable
            else (
                "Revenue and expense trends are not combined because a shared "
                "currency is not verified."
            ),
        }
        if allowed_modules is not None:
            if "factures" not in allowed_modules:
                for key in ("revenue", "outstanding_invoices", "collection_rate"):
                    metrics[key] = {
                        "available": False,
                        "value": None,
                        "reason": "Insufficient permission.",
                    }
                charts["revenue"] = []
            if "notes_frais" not in allowed_modules:
                metrics["expenses"] = {
                    "available": False,
                    "value": None,
                    "reason": "Insufficient permission.",
                }
                charts["expenses"] = []
            if "factures" not in allowed_modules or "notes_frais" not in allowed_modules:
                charts["comparison_available"] = False
                charts["comparison_reason"] = (
                    "Invoice and expense permissions are both required for this comparison."
                )
            if "factures" not in allowed_modules or "notes_frais" not in allowed_modules:
                metrics["gross_profit"] = {
                    "available": False,
                    "value": None,
                    "reason": "Both invoice and expense permissions are required.",
                }
            if "caisse" not in allowed_modules:
                metrics["cash_balance"] = {
                    "available": False,
                    "value": None,
                    "reason": "Insufficient permission.",
                }
            if "clients" not in allowed_modules:
                metrics["active_clients"] = {
                    "available": False,
                    "value": None,
                    "reason": "Insufficient permission.",
                }
            if "missions" not in allowed_modules:
                metrics["active_engagements"] = {
                    "available": False,
                    "value": None,
                    "reason": "Insufficient permission.",
                }
            if "immobilisations" not in allowed_modules:
                metrics["fixed_asset_value"] = {
                    "available": False,
                    "value": None,
                    "reason": "Insufficient permission.",
                }
            if not ({"collaborateurs", "collaborateur_performance"} & allowed_modules):
                for key in ("employee_utilization", "billable_hours", "non_billable_hours"):
                    metrics[key] = {
                        "available": False,
                        "value": None,
                        "reason": "Insufficient permission.",
                    }
        return {
            "metrics": metrics,
            "charts": charts,
            "sources": self.source_status(),
            "refresh": {"mode": "live_on_request"},
        }

    def _collection_rate(self, start_date: date | None, end_date: date | None) -> dict[str, Any]:
        table = self._table("invoices")
        if table is None or "status" not in table.c:
            return {"available": False, "value": None, "source": None}
        amount = next(
            (
                table.c[name]
                for name in ("total_ttc", "total_general", "total_ht")
                if name in table.c
            ),
            None,
        )
        if amount is None or "currency" not in table.c:
            return {
                "available": False,
                "value": None,
                "source": table.name,
                "reason": "Collection rate requires invoice amount and currency fields.",
            }
        period = self._period_filter(table, start_date, end_date, ("date_emission", "created_at"))
        statement = select(
            table.c.currency.label("currency"),
            func.coalesce(func.sum(amount), 0).label("total"),
            func.coalesce(
                func.sum(case((func.lower(table.c.status) == "paid", amount), else_=0)),
                0,
            ).label("paid"),
        ).where(func.lower(table.c.status) != "cancelled")
        if period is not None:
            statement = statement.where(period)
        if "archived" in table.c:
            statement = statement.where(table.c.archived.is_(False))
        rows = self.db.execute(statement.group_by(table.c.currency)).all()
        rates = {
            str(row.currency or "Unknown"): (
                float(row.paid or 0) / float(row.total) * 100 if row.total else None
            )
            for row in rows
        }
        if len(rates) > 1:
            return {
                "available": True,
                "value": None,
                "by_currency": rates,
                "source": table.name,
                "reason": "Collection rates are shown per currency; currencies are not combined.",
            }
        currency, value = next(iter(rates.items()), (None, None))
        if not rates:
            return {
                "available": True,
                "value": None,
                "unit": "%",
                "source": table.name,
                "reason": "No invoices are available for this period.",
            }
        return {
            "available": True,
            "value": value,
            "unit": "%",
            "source": table.name,
        }

    def _expense_series(
        self, start_date: date | None, end_date: date | None
    ) -> list[dict[str, Any]]:
        table = self._table("expenses")
        if table is None:
            return []
        amount = next(
            (
                table.c[name]
                for name in ("total_ttc", "net_a_payer", "total_ht", "amount", "montant")
                if name in table.c
            ),
            None,
        )
        return self._series(
            table,
            amount,
            start_date=start_date,
            end_date=end_date,
            date_columns=("created_at", "date"),
            status_filter=("submitted", "approved", "valide", "paid", "rembourse"),
        )

    def financial(
        self,
        start_date: date | None,
        end_date: date | None,
        allowed_modules: set[str] | None = None,
    ) -> dict[str, Any]:
        data = self.overview(start_date, end_date, allowed_modules)
        return {
            "metrics": {
                key: data["metrics"][key]
                for key in (
                    "revenue",
                    "expenses",
                    "gross_profit",
                    "net_profit",
                    "outstanding_invoices",
                    "collection_rate",
                )
            },
            "charts": data["charts"],
            "sources": data["sources"],
        }

    def clients(self, start_date: date | None, end_date: date | None) -> dict[str, Any]:
        client_table = self._table("clients")
        invoice_table = self._table("invoices")
        if (
            client_table is None
            or invoice_table is None
            or "id" not in client_table.c
            or "client_id" not in invoice_table.c
        ):
            return {"available": False, "items": [], "source": None}
        amount = next(
            (
                invoice_table.c[name]
                for name in ("total_ttc", "total_general", "total_ht")
                if name in invoice_table.c
            ),
            None,
        )
        if amount is None:
            return {"available": False, "items": [], "source": None}
        label = client_table.c.name if "name" in client_table.c else client_table.c.id
        currency = invoice_table.c.currency if "currency" in invoice_table.c else None
        columns = [label.label("client"), func.sum(amount).label("revenue")]
        if currency is not None:
            columns.append(currency.label("currency"))
        statement = (
            select(*columns)
            .select_from(
                client_table.join(invoice_table, client_table.c.id == invoice_table.c.client_id)
            )
            .where(func.lower(invoice_table.c.status) == "paid")
        )
        period = self._period_filter(
            invoice_table, start_date, end_date, ("date_emission", "created_at")
        )
        if period is not None:
            statement = statement.where(period)
        if "archived" in invoice_table.c:
            statement = statement.where(invoice_table.c.archived.is_(False))
        groups = [label] + ([currency] if currency is not None else [])
        rows = self.db.execute(
            statement.group_by(*groups).order_by(func.sum(amount).desc()).limit(10)
        ).all()
        return {
            "available": True,
            "items": [
                {
                    "client": str(row.client),
                    "label": f"{row.client} ({row.currency})"
                    if getattr(row, "currency", None)
                    else str(row.client),
                    "revenue": float(row.revenue or 0),
                    "currency": getattr(row, "currency", None),
                }
                for row in rows
            ],
            "source": f"{client_table.name}, {invoice_table.name}",
        }

    def engagements(self) -> dict[str, Any]:
        table = self._table("engagements")
        if table is None or "status" not in table.c:
            return {"available": False, "items": [], "source": None}
        statement = select(table.c.status, func.count().label("count"))
        rows = self.db.execute(statement.group_by(table.c.status).order_by(table.c.status)).all()
        return {
            "available": True,
            "items": [{"status": row.status, "count": int(row.count)} for row in rows],
            "source": table.name,
        }

    def employees(self) -> dict[str, Any]:
        return {
            "available": False,
            "items": [],
            "reason": (
                "Verified employee timesheets and billable/non-billable hours are not "
                "available in the backend schema."
            ),
        }

    def cash_flow(self, start_date: date | None, end_date: date | None) -> dict[str, Any]:
        table = self._table("cash")
        if table is None or not {"type", "somme"}.issubset(table.c.keys()):
            return {"available": False, "items": [], "source": None}
        date_column = next(
            (table.c[name] for name in ("date_piece", "created_at") if name in table.c), None
        )
        if date_column is None:
            return {"available": False, "items": [], "source": table.name}
        dialect = self.bind.dialect.name
        bucket = (
            func.date_trunc("month", date_column)
            if dialect == "postgresql"
            else (func.strftime("%Y-%m-01", date_column) if dialect == "sqlite" else None)
        )
        if bucket is None:
            return {"available": False, "items": [], "source": table.name}
        inflow = func.sum(
            case((func.upper(table.c.type) == "APPROVISIONNEMENT", table.c.somme), else_=0)
        )
        outflow = func.sum(case((func.upper(table.c.type) == "DEPENSE", table.c.somme), else_=0))
        statement = select(bucket.label("period"), inflow.label("inflow"), outflow.label("outflow"))
        period = self._period_filter(table, start_date, end_date, ("date_piece", "created_at"))
        if period is not None:
            statement = statement.where(period)
        rows = self.db.execute(statement.group_by(bucket).order_by(bucket)).all()
        return {
            "available": True,
            "items": [
                {
                    "period": row.period.isoformat()[:10] if row.period else None,
                    "inflow": float(row.inflow or 0),
                    "outflow": float(row.outflow or 0),
                    "net": float((row.inflow or 0) - (row.outflow or 0)),
                }
                for row in rows
            ],
            "source": table.name,
        }

    def stock(self) -> dict[str, Any]:
        table = self._table("stock")
        if table is None:
            return {
                "available": False,
                "valuation": None,
                "low_stock_count": None,
                "items": [],
                "source": None,
            }
        value_column = next(
            (
                table.c[name]
                for name in ("remaining_value", "value", "total_amount")
                if name in table.c
            ),
            None,
        )
        valuation = (
            float(self.db.scalar(select(func.coalesce(func.sum(value_column), 0))) or 0)
            if value_column is not None
            else None
        )
        low_stock = None
        if "status" in table.c:
            low_stock = int(
                self.db.scalar(
                    select(func.count())
                    .select_from(table)
                    .where(func.lower(table.c.status).in_(["low_stock", "out_of_stock"]))
                )
                or 0
            )
        label = next(
            (table.c[name] for name in ("item_name", "name", "sku") if name in table.c), None
        )
        items = []
        if value_column is not None and label is not None:
            rows = self.db.execute(
                select(label.label("name"), value_column.label("value"))
                .order_by(value_column.desc())
                .limit(10)
            ).all()
            items = [{"name": str(row.name), "value": float(row.value or 0)} for row in rows]
        return {
            "available": value_column is not None or low_stock is not None,
            "valuation": valuation,
            "low_stock_count": low_stock,
            "items": items,
            "source": table.name,
        }

    def expenses(self, start_date: date | None, end_date: date | None) -> dict[str, Any]:
        total, table, _ = self._sum(
            "expenses",
            ("total_ttc", "net_a_payer", "total_ht", "amount", "montant"),
            start_date=start_date,
            end_date=end_date,
            date_columns=("created_at", "date"),
            status_filter=("submitted", "approved", "valide", "paid", "rembourse"),
        )
        if table is None:
            return {"total": total, "categories": [], "available": False}
        category = next(
            (table.c[name] for name in ("category", "categorie", "type") if name in table.c), None
        )
        amount = next(
            (
                table.c[name]
                for name in ("total_ttc", "net_a_payer", "total_ht", "amount", "montant")
                if name in table.c
            ),
            None,
        )
        rows = []
        if category is not None and amount is not None:
            currency = table.c.currency if "currency" in table.c else None
            statement = select(category.label("category"), func.sum(amount).label("value"))
            if currency is not None:
                statement = statement.add_columns(currency.label("currency"))
            period = self._period_filter(table, start_date, end_date, ("created_at", "date"))
            if period is not None:
                statement = statement.where(period)
            groups = [category] + ([currency] if currency is not None else [])
            rows = [
                {
                    "category": (
                        f"{row.category or 'Uncategorized'} ({row.currency})"
                        if getattr(row, "currency", None)
                        else str(row.category or "Uncategorized")
                    ),
                    "value": float(row.value or 0),
                    "currency": getattr(row, "currency", None),
                }
                for row in self.db.execute(
                    statement.group_by(*groups).order_by(func.sum(amount).desc()).limit(12)
                ).all()
            ]
        return {"total": total, "categories": rows, "available": total["available"]}
