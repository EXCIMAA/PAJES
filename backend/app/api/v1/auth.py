"""Auth routes: login, logout, signup, password reset, change password."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.models.auth import Profile
from app.permissions.enforcer import get_current_profile
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    MessageResponse,
    PasswordResetConfirm,
    PasswordResetRequest,
    ProfileResponse,
    SignupRequest,
)
from app.services import auth_service
from app.services.email_service import send_password_reset_email

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=ProfileResponse)
def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
):
    profile = auth_service.login(db, request, response, body)
    return profile


@router.post("/logout", response_model=MessageResponse)
def logout(
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
):
    auth_service.logout(db, request, response)
    return {"message": "Logged out"}


@router.post("/signup", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
def signup(
    body: SignupRequest,
    db: Annotated[Session, Depends(get_db)],
):
    profile = auth_service.signup(db, body)
    return profile


@router.get("/me", response_model=ProfileResponse)
def get_me(profile: Annotated[Profile, Depends(get_current_profile)]):
    return profile


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    body: ChangePasswordRequest,
    profile: Annotated[Profile, Depends(get_current_profile)],
    db: Annotated[Session, Depends(get_db)],
):
    auth_service.change_password(db, profile.id, body.current_password, body.new_password)
    return {"message": "Password changed. Please log in again."}


@router.post("/reset-password", response_model=MessageResponse)
def request_password_reset(
    body: PasswordResetRequest,
    db: Annotated[Session, Depends(get_db)],
):
    token = auth_service.request_password_reset(db, body.email)
    if token:
        reset_url = f"{settings.frontend_url}/reset-password?token={token}"
        try:
            send_password_reset_email(body.email, reset_url)
        except Exception:
            pass  # Don't expose email failures to prevent enumeration
    # Always return the same message — prevents email enumeration
    return {"message": "If the email exists, a reset link has been sent."}


@router.post("/reset-password/confirm", response_model=MessageResponse)
def confirm_password_reset(
    body: PasswordResetConfirm,
    db: Annotated[Session, Depends(get_db)],
):
    auth_service.reset_password_with_token(db, body.token, body.new_password)
    return {"message": "Password reset successful. Please log in."}
