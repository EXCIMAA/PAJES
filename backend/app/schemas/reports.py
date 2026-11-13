from __future__ import annotations

from datetime import date
from typing import Any

from pydantic import BaseModel, Field, model_validator


class ReportModule(BaseModel):
    id: str
    label: str


class ReportRowsResponse(BaseModel):
    items: list[dict[str, Any]]
    truncated: bool


class CustomReportRequest(BaseModel):
    modules: list[str] = Field(min_length=1, max_length=30)
    start_date: date | None = None
    end_date: date | None = None
    ignore_dates: bool = False
    limit: int = Field(default=500, ge=1, le=1000)

    @model_validator(mode="after")
    def validate_date_range(self) -> CustomReportRequest:
        if (
            not self.ignore_dates
            and self.start_date
            and self.end_date
            and self.start_date > self.end_date
        ):
            raise ValueError("start_date must be on or before end_date")
        if len(set(self.modules)) != len(self.modules):
            raise ValueError("modules must not contain duplicates")
        return self


class CustomReportResponse(BaseModel):
    data: dict[str, list[dict[str, Any]]]
    truncated: list[str]
