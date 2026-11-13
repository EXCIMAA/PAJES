from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SupplierFields(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    alert_date: date | None = None
    recurring_day: int | None = Field(default=None, ge=1, le=31)
    is_recurring: bool = False
    message: str | None = None
    total_depenses: Decimal = Field(default=Decimal("0"), ge=0)

    @model_validator(mode="after")
    def validate_alert_schedule(self):
        if self.is_recurring and self.recurring_day is None:
            raise ValueError("recurring_day is required for recurring alerts")
        if not self.is_recurring and self.alert_date is None:
            raise ValueError("alert_date is required for one-time alerts")
        return self


class SupplierCreate(SupplierFields):
    pass


class SupplierUpdate(SupplierFields):
    pass


class SupplierPatch(BaseModel):
    last_alert_date: date | None = None
    is_done: bool | None = None


class SupplierResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    alert_date: date | None = None
    recurring_day: int | None = None
    is_recurring: bool | None = None
    message: str | None = None
    total_depenses: Decimal | None = None
    is_done: bool | None = None
    last_alert_date: date | None = None
    created_by: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None
