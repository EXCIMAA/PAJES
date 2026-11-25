"""File storage API routes — upload, download, list, delete files."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.auth import Profile
from app.permissions.enforcer import get_current_profile
from app.services.file_service import FileService
from app.schemas.files import (
    FileDeleteResponse,
    FileListResponse,
    FileUploadResponse,
)

router = APIRouter(prefix="/files", tags=["files"])


@router.post("/upload", response_model=FileUploadResponse, status_code=status.HTTP_201_CREATED)
def upload_file(
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
    file: UploadFile,
    bucket: str = Query("documents", max_length=100),
    folder: str = Query("general", max_length=100),
):
    return FileService(db).upload(
        file=file,
        bucket=bucket,
        folder=folder,
        uploaded_by=profile.id,
    )


@router.get("", response_model=FileListResponse)
def list_files(
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
    bucket: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return FileService(db).list_files(bucket=bucket, limit=limit, offset=offset)


@router.get("/{file_id}/download")
def download_file(
    file_id: str,
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
    request: Request,
):
    result = FileService(db).get_file_path(file_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    row, full_path = result
    return FileResponse(
        path=full_path,
        filename=row.original_name,
        media_type=row.mime_type or "application/octet-stream",
        headers={"X-File-Id": str(row.id)},
    )


@router.delete("/{file_id}", response_model=FileDeleteResponse)
def delete_file(
    file_id: str,
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
):
    return FileService(db).delete_file(file_id, current_user_id=profile.id)
