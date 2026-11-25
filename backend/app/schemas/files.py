"""Pydantic schemas for file storage."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class FileMetadataResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    original_name: str
    storage_path: str
    bucket: str
    mime_type: str | None = None
    size_bytes: int | None = None
    uploaded_by: str | None = None
    is_public: bool
    created_at: datetime | None = None


class FileUploadResponse(BaseModel):
    id: str
    original_name: str
    storage_path: str
    bucket: str
    mime_type: str | None = None
    size_bytes: int | None = None
    download_url: str


class FileListResponse(BaseModel):
    files: list[FileMetadataResponse]
    total: int


class FileDeleteResponse(BaseModel):
    message: str
