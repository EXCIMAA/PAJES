"""File storage service — local disk backend with PostgreSQL metadata."""

from __future__ import annotations

import logging
import os
import shutil
import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status, UploadFile
from sqlalchemy import delete, insert, select, update
from sqlalchemy.orm import Session

from app.core import utcnow
from app.core.config import settings
from app.models.auth import Profile
from app.models.files import FileMetadata
from app.schemas.files import (
    FileDeleteResponse,
    FileListResponse,
    FileMetadataResponse,
    FileUploadResponse,
)

logger = logging.getLogger("pajes.files")

ALLOWED_EXTENSIONS = {
    "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
    "txt", "csv", "rtf", "odt", "ods", "odp",
    "jpg", "jpeg", "png", "gif", "webp",
    "zip", "7z",
}

ALLOWED_MIME_PREFIXES = (
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument",
    "application/vnd.ms-excel",
    "application/vnd.oasis.opendocument",
    "text/",
    "image/",
    "application/zip",
    "application/x-7z-compressed",
)

MAX_FILE_SIZE = settings.storage_max_upload_bytes


def _storage_root() -> str:
    return settings.storage_local_dir


def _ensure_storage_dir(bucket: str) -> str:
    root = _storage_root()
    bucket_dir = os.path.join(root, bucket)
    os.makedirs(bucket_dir, exist_ok=True)
    return bucket_dir


def _validate_file(file: UploadFile) -> str | None:
    if file.size and file.size > MAX_FILE_SIZE:
        return f"File too large. Maximum size is {MAX_FILE_SIZE / (1024 * 1024)} MB."
    filename = file.filename or ""
    ext = filename.split(".").pop().lower() if "." in filename else ""
    if ext and ext not in ALLOWED_EXTENSIONS:
        return f"File type not allowed. Accepted: {', '.join(sorted(ALLOWED_EXTENSIONS))}."
    if file.content_type:
        if not any(file.content_type.startswith(p) for p in ALLOWED_MIME_PREFIXES):
            return f"File type not allowed: {file.content_type}."
    return None


class FileService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def _record_to_response(self, row: FileMetadata) -> FileMetadataResponse:
        return FileMetadataResponse(
            id=str(row.id),
            original_name=row.original_name,
            storage_path=row.storage_path,
            bucket=row.bucket,
            mime_type=row.mime_type,
            size_bytes=row.size_bytes,
            uploaded_by=str(row.uploaded_by) if row.uploaded_by else None,
            is_public=row.is_public,
            created_at=row.created_at,
        )

    def upload(
        self,
        file: UploadFile,
        bucket: str = "documents",
        folder: str = "general",
        uploaded_by: str | None = None,
    ) -> FileUploadResponse:
        validation_error = _validate_file(file)
        if validation_error:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=validation_error)

        bucket_dir = _ensure_storage_dir(bucket)
        ext = (file.filename or "file").split(".").pop().lower() if "." in (file.filename or "") else "bin"
        storage_filename = f"{uuid.uuid4()}.{ext}"
        storage_path = f"{folder}/{storage_filename}" if folder else storage_filename
        full_path = os.path.join(bucket_dir, storage_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)

        try:
            with open(full_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except OSError as exc:
            logger.error("File write failed (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not write file to storage.",
            ) from exc

        size_bytes = file.size or 0
        mime_type = file.content_type or None

        try:
            row = FileMetadata(
                original_name=file.filename or "file",
                storage_path=storage_path,
                bucket=bucket,
                mime_type=mime_type,
                size_bytes=size_bytes,
                uploaded_by=uploaded_by,
                is_public=False,
            )
            self.db.add(row)
            self.db.commit()
            self.db.refresh(row)
        except Exception as exc:
            self.db.rollback()
            try:
                os.remove(full_path)
            except OSError:
                pass
            logger.error("File metadata insert failed (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not record file metadata.",
            ) from exc

        return FileUploadResponse(
            id=str(row.id),
            original_name=row.original_name,
            storage_path=row.storage_path,
            bucket=row.bucket,
            mime_type=row.mime_type,
            size_bytes=row.size_bytes,
            download_url=f"/api/v1/files/{row.id}/download",
        )

    def list_files(
        self,
        bucket: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> FileListResponse:
        stmt = select(FileMetadata)
        if bucket:
            stmt = stmt.where(FileMetadata.bucket == bucket)
        stmt = stmt.order_by(FileMetadata.created_at.desc()).offset(offset).limit(limit)
        rows = self.db.execute(stmt).scalars().all()
        count_stmt = select(FileMetadata)
        if bucket:
            count_stmt = count_stmt.where(FileMetadata.bucket == bucket)
        total = self.db.execute(count_stmt).scalar() or 0
        return FileListResponse(
            files=[self._record_to_response(r) for r in rows],
            total=total,
        )

    def get_file(self, file_id: str) -> FileMetadata | None:
        return self.db.query(FileMetadata).filter(FileMetadata.id == file_id).first()

    def get_file_path(self, file_id: str) -> tuple[FileMetadata, str] | None:
        row = self.get_file(file_id)
        if not row:
            return None
        full_path = os.path.join(_storage_root(), row.bucket, row.storage_path)
        if not os.path.exists(full_path):
            return None
        return row, full_path

    def delete_file(self, file_id: str, current_user_id: str | None = None) -> FileDeleteResponse:
        row = self.get_file(file_id)
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
        full_path = os.path.join(_storage_root(), row.bucket, row.storage_path)
        try:
            self.db.delete(row)
            self.db.commit()
        except Exception as exc:
            self.db.rollback()
            logger.error("File metadata delete failed (%s)", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not delete file record.",
            ) from exc
        try:
            if os.path.exists(full_path):
                os.remove(full_path)
        except OSError as exc:
            logger.warning("Physical file removal failed (%s)", type(exc).__name__)
        return FileDeleteResponse(message="File deleted")
