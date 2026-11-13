"""Request schemas for client and establishment operations."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ClientWriteRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    name: str = Field(min_length=1, max_length=255)


class ClientDocumentStatus(BaseModel):
    document_id: int
    status: Literal["a_fournir", "fourni", "non_applicable"]


class ClientTaxStatus(BaseModel):
    taxe_id: int
    assujetti: bool


class ClientLinksRequest(BaseModel):
    documents: list[ClientDocumentStatus] = Field(default_factory=list)
    taxes: list[ClientTaxStatus] = Field(default_factory=list)


class EstablishmentWriteRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    type: str = Field(min_length=1, max_length=100)
    code: str | None = None
    address: str | None = None
    city: str | None = None
    region: str | None = None
    country: str | None = None
    phone: str | None = None
    email: str | None = None
    responsable: str | None = None
    date_ouverture: str | None = None
    is_active: bool = True
