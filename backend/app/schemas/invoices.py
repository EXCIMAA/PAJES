from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints


class InvoiceListResponse(BaseModel):
    items: list[dict[str, Any]]
    total: int
    limit: int
    offset: int


class InvoiceDetailResponse(BaseModel):
    invoice: dict[str, Any]
    lines: list[dict[str, Any]]


class InvoiceArchiveResponse(BaseModel):
    id: str
    archived: bool

    model_config = ConfigDict(extra="forbid")


class InvoiceStatusUpdate(BaseModel):
    status: Literal["draft", "sent", "paid", "cancelled", "pending"]


class InvoiceLineWrite(BaseModel):
    model_config = ConfigDict(extra="ignore")

    section: Literal["HONORAIRES", "RETENUS", "DEBOURS"]
    designation: str = Field(default="", max_length=1000)
    unite: Decimal | None = Field(default=None, max_digits=14, decimal_places=4)
    taux: Decimal | None = Field(default=None, max_digits=14, decimal_places=4)
    sort_order: int = Field(ge=0)
    comments: str | None = Field(default=None, max_length=5000)


_Initials = Annotated[
    str, StringConstraints(min_length=1, max_length=8, pattern="^[A-Z0-9]+$")
]
_ReferenceBase = Annotated[
    str, StringConstraints(min_length=1, max_length=32, pattern="^[A-Z0-9-]+$")
]


class InvoiceWriteRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    date_emission: date
    date_contrat: date | None = None
    client_id: str = Field(min_length=1, max_length=64)
    currency: str = Field(min_length=3, max_length=3)
    country: str = Field(min_length=2, max_length=10)
    type_document: Literal["FACTURE", "PRO-FORMA", "AVOIR"]
    acompte_regle: Decimal = Field(default=Decimal("0"), max_digits=14, decimal_places=2)
    payment_method: str = Field(default="virement", max_length=100)
    signature_company: str | None = Field(default=None, max_length=255)
    signature_client: str | None = Field(default=None, max_length=255)
    initials: _Initials
    reference_base: _ReferenceBase
    lines: list[InvoiceLineWrite] = Field(min_length=1, max_length=500)


class InvoiceListQuery(BaseModel):
    country: str | None = Field(default=None, min_length=2, max_length=10)
