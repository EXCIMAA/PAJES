from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.auth import Profile
from app.permissions.enforcer import get_current_profile
from app.schemas.notifications import (
    NotificationCountResponse,
    NotificationCreate,
    NotificationResponse,
)
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
):
    return NotificationService(db).list_for_user(profile)


@router.get("/unread-count", response_model=NotificationCountResponse)
def get_unread_count(
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
):
    return {"count": NotificationService(db).unread_count(profile)}


@router.post("", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
def create_notification(
    body: NotificationCreate,
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
):
    return NotificationService(db).create_for_user(
        profile,
        title=body.title,
        message=body.message,
        notification_type=body.type,
    )


@router.patch("/read-all", response_model=NotificationCountResponse)
def mark_all_notifications_read(
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
):
    return {"count": NotificationService(db).mark_all_read(profile)}


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: str,
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
):
    return NotificationService(db).mark_read(profile, notification_id)


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: str,
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
):
    NotificationService(db).delete_for_user(profile, notification_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
