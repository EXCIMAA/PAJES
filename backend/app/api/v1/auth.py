"""Authentication routes: activation, session lifecycle, and password recovery."""

from __future__ import annotations

import ipaddress
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database import get_db
from app.models.auth import Profile
from app.permissions.enforcer import get_current_profile
from app.schemas.auth import (
    ActivateAccountRequest,
    ChangePasswordRequest,
    LoginRequest,
    MessageResponse,
    PasswordResetConfirm,
    PasswordResetRequest,
    ProfileResponse,
    SignupRequest,
)
from app.services import auth_service
from app.services.email_service import get_development_mailbox, send_auth_email

router = APIRouter(prefix="/auth", tags=["auth"])

_GENERIC_AUTH_MESSAGE = (
    "Si cette adresse peut être activée, des instructions seront communiquées."
)
_GENERIC_RESET_MESSAGE = (
    "Si un compte peut être réinitialisé, la demande a été prise en compte."
)


@router.post("/login", response_model=ProfileResponse)
def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
):
    return auth_service.login(db, request, response, body)


@router.post("/logout", response_model=MessageResponse)
def logout(
    request: Request,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
):
    auth_service.logout(db, request, response)
    return {"message": "Logged out"}


@router.post(
    "/signup",
    response_model=MessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def signup(
    body: SignupRequest,
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
):
    email_job = auth_service.signup(db, body)
    if email_job:
        activation_url = (
            f"{settings.frontend_url.rstrip('/')}/activate-account"
            f"#token={email_job.token}"
        )
        background_tasks.add_task(
            send_auth_email,
            email_job.email,
            "PAJES — Activation du compte",
            activation_url,
            "Utilisez ce lien pour choisir votre mot de passe PAJES.",
            f"Ce lien expire dans {settings.activation_token_ttl_hours} heures.",
        )
    return {"message": _GENERIC_AUTH_MESSAGE}


@router.post("/activate", response_model=MessageResponse)
def activate_account(
    body: ActivateAccountRequest,
    db: Annotated[Session, Depends(get_db)],
):
    auth_service.activate_account(db, body)
    return {"message": "Compte activé. Vous pouvez maintenant vous connecter."}


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
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
):
    email_job = auth_service.request_password_reset(db, str(body.email))
    if email_job:
        reset_url = (
            f"{settings.frontend_url.rstrip('/')}/reset-password"
            f"#token={email_job.token}"
        )
        background_tasks.add_task(
            send_auth_email,
            email_job.email,
            "PAJES — Réinitialisation du mot de passe",
            reset_url,
            "Utilisez ce lien pour définir un nouveau mot de passe PAJES.",
            (
                "Ce lien expire dans "
                f"{settings.password_reset_token_ttl_minutes} minutes."
            ),
        )
    return {"message": _GENERIC_RESET_MESSAGE}


@router.post("/reset-password/confirm", response_model=MessageResponse)
def confirm_password_reset(
    body: PasswordResetConfirm,
    db: Annotated[Session, Depends(get_db)],
):
    auth_service.reset_password_with_token(db, body.token, body.new_password)
    return {"message": "Password reset successful. Please log in."}


@router.get("/dev-mailbox")
def development_mailbox(request: Request, email: str):
    client_host = request.client.host if request.client else ""
    try:
        is_loopback = ipaddress.ip_address(client_host).is_loopback
    except ValueError:
        is_loopback = False
    if (
        settings.app_env != "development"
        or settings.email_provider != "none"
        or not is_loopback
    ):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    messages = get_development_mailbox(email)
    return [{"subject": message.subject, "text": message.text_body} for message in messages]
