"""Authentication services using additive credential, session, and token tables."""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from datetime import UTC, timedelta
from time import perf_counter

from fastapi import HTTPException, Request, Response, status
from sqlalchemy import func, inspect, text, update
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.core import utcnow
from app.core.config import settings
from app.core.security import create_opaque_token, hash_password, hash_token, verify_password
from app.models.auth import (
    AccountActivationToken,
    AuthSession,
    PasswordResetToken,
    Profile,
    UserCredential,
)
from app.schemas.auth import ActivateAccountRequest, LoginRequest, SignupRequest

logger = logging.getLogger(__name__)

MAX_FAILED_LOGINS = 5
SESSION_ACTIVITY_UPDATE_INTERVAL = timedelta(minutes=5)
INVALID_ACTIVATION_LINK = "Ce lien d'activation est invalide ou expiré."
INVALID_RESET_LINK = "Ce lien de réinitialisation est invalide ou expiré."
GENERIC_LOGIN_ERROR = "Email ou mot de passe incorrect."
AUTH_STORAGE_UNAVAILABLE = (
    "Le stockage d'authentification n'est pas disponible. "
    "Contactez l'administrateur."
)
AUTH_STORAGE_COLUMNS = {
    "profiles": {"id", "email", "full_name", "role", "active"},
    "user_credentials": {
        "id",
        "email_normalized",
        "password_hash",
        "is_active",
        "is_locked",
        "failed_login_count",
        "password_changed_at",
    },
    "auth_sessions": {
        "id",
        "user_id",
        "token_hash",
        "created_at",
        "last_activity_at",
        "expires_at",
        "revoked_at",
    },
    "account_activation_tokens": {
        "id",
        "user_id",
        "token_hash",
        "created_at",
        "expires_at",
        "used_at",
        "invalidated_at",
    },
    "password_reset_tokens": {
        "id",
        "user_id",
        "token_hash",
        "created_at",
        "expires_at",
        "used_at",
        "invalidated_at",
    },
}


@dataclass(frozen=True)
class AuthEmail:
    email: str
    token: str


def normalize_email(email: str) -> str:
    return email.strip().lower()


def require_auth_storage(db: Session) -> None:
    """Fail before auth queries if the additive schema has not been approved/applied."""
    try:
        inspector = inspect(db.get_bind())
        schema = "public" if inspector.dialect.name == "postgresql" else None
        tables = set(inspector.get_table_names(schema=schema))
        views = set(inspector.get_view_names(schema=schema))
        if "users" not in views:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=AUTH_STORAGE_UNAVAILABLE,
            )
        for relation, required_columns in AUTH_STORAGE_COLUMNS.items():
            if relation not in tables:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=AUTH_STORAGE_UNAVAILABLE,
                )
            actual_columns = {
                column["name"]
                for column in inspector.get_columns(relation, schema=schema)
            }
            if not required_columns.issubset(actual_columns):
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=AUTH_STORAGE_UNAVAILABLE,
                )
    except HTTPException:
        logger.warning("Authentication storage is not ready")
        raise
    except SQLAlchemyError as error:
        logger.warning("Authentication storage inspection failed (%s)", type(error).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=AUTH_STORAGE_UNAVAILABLE,
        ) from error


def require_email_delivery() -> None:
    if settings.email_provider == "none" and settings.app_env != "development":
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="L'envoi sécurisé des e-mails n'est pas configuré.",
        )
    if settings.email_provider == "smtp" and not settings.smtp_host:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="L'envoi sécurisé des e-mails n'est pas configuré.",
        )
    if settings.email_provider == "sendgrid" and not settings.sendgrid_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="L'envoi sécurisé des e-mails n'est pas configuré.",
        )
    if settings.email_provider == "postmark" and not settings.postmark_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="L'envoi sécurisé des e-mails n'est pas configuré.",
        )


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.auth_cookie_name,
        value=token,
        httponly=True,
        secure=settings.secure_auth_cookies,
        samesite="lax",
        max_age=settings.auth_session_ttl_minutes * 60,
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.auth_cookie_name,
        path="/",
        secure=settings.secure_auth_cookies,
        httponly=True,
        samesite="lax",
    )


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


def _lock_signup_email(db: Session, email: str) -> None:
    if db.get_bind().dialect.name == "postgresql":
        db.execute(
            text("SELECT pg_advisory_xact_lock(hashtextextended(:email, 0))"),
            {"email": email},
        )


def _new_activation_token(db: Session, profile: Profile, email: str) -> AuthEmail:
    now = utcnow()
    db.query(AccountActivationToken).filter(
        AccountActivationToken.user_id == profile.id,
        AccountActivationToken.used_at.is_(None),
        AccountActivationToken.invalidated_at.is_(None),
    ).update(
        {AccountActivationToken.invalidated_at: now},
        synchronize_session=False,
    )
    token = create_opaque_token()
    db.add(
        AccountActivationToken(
            user_id=profile.id,
            token_hash=hash_token(token),
            expires_at=now + timedelta(hours=settings.activation_token_ttl_hours),
        )
    )
    return AuthEmail(email=email, token=token)


def signup(db: Session, body: SignupRequest) -> AuthEmail | None:
    require_auth_storage(db)
    require_email_delivery()
    email = normalize_email(str(body.email))
    started_at = perf_counter()
    try:
        with db.begin():
            _lock_signup_email(db, email)
            profiles = (
                db.query(Profile)
                .filter(func.lower(func.trim(Profile.email)) == email)
                .limit(2)
                .with_for_update()
                .all()
            )
            if len(profiles) > 1:
                logger.warning("Signup blocked by ambiguous existing profile match")
                return None

            if profiles:
                profile = profiles[0]
                if not profile.active or profile.credential is not None:
                    return None
                email_to_use = profile.email
            else:
                identity_table = (
                    "auth.users"
                    if db.get_bind().dialect.name == "postgresql"
                    else "auth_users"
                )
                existing_identity = db.execute(
                    text(
                        f"SELECT 1 FROM {identity_table} "
                        "WHERE lower(trim(email)) = :email LIMIT 1"
                    ),
                    {"email": email},
                ).first()
                if existing_identity:
                    return None
                user_id = str(uuid.uuid4())
                if db.get_bind().dialect.name == "postgresql":
                    db.execute(
                        text("INSERT INTO auth.users (id, email) VALUES (:id, :email)"),
                        {"id": user_id, "email": email},
                    )
                else:
                    db.execute(
                        text("INSERT INTO auth_users (id, email) VALUES (:id, :email)"),
                        {"id": user_id, "email": email},
                    )
                profile = Profile(
                    id=user_id,
                    email=email,
                    full_name=f"{body.first_name} {body.last_name}".strip(),
                    role="stagiaires",
                    active=True,
                )
                db.add(profile)
                db.flush()
                email_to_use = email

            email_job = _new_activation_token(db, profile, email_to_use)
        logger.info(
            "Signup transaction completed in %.1f ms",
            (perf_counter() - started_at) * 1000,
        )
        return email_job
    except HTTPException:
        raise
    except IntegrityError as error:
        db.rollback()
        logger.warning("Signup transaction rejected by a database constraint")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La création de compte est temporairement indisponible.",
        ) from error
    except SQLAlchemyError as error:
        db.rollback()
        logger.error("Signup database transaction failed (%s)", type(error).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La création de compte est temporairement indisponible.",
        ) from error


def activate_account(db: Session, body: ActivateAccountRequest) -> None:
    require_auth_storage(db)
    token_digest = hash_token(body.token)
    now = utcnow()
    try:
        with db.begin():
            activation = (
                db.query(AccountActivationToken)
                .filter(
                    AccountActivationToken.token_hash == token_digest,
                    AccountActivationToken.used_at.is_(None),
                    AccountActivationToken.invalidated_at.is_(None),
                    AccountActivationToken.expires_at > now,
                )
                .with_for_update()
                .first()
            )
            if not activation:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=INVALID_ACTIVATION_LINK,
                )
            profile = (
                db.query(Profile)
                .filter(Profile.id == activation.user_id)
                .with_for_update()
                .first()
            )
            if (
                not profile
                or not profile.active
                or profile.credential is not None
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=INVALID_ACTIVATION_LINK,
                )
            email = normalize_email(profile.email)
            if not email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=INVALID_ACTIVATION_LINK,
                )
            credential = UserCredential(
                id=profile.id,
                email_normalized=email,
                password_hash=hash_password(body.password),
                is_active=True,
                is_locked=False,
                failed_login_count=0,
                password_changed_at=now,
                activated_at=now,
            )
            db.add(credential)
            activation.used_at = now
            db.query(AccountActivationToken).filter(
                AccountActivationToken.user_id == profile.id,
                AccountActivationToken.id != activation.id,
                AccountActivationToken.used_at.is_(None),
                AccountActivationToken.invalidated_at.is_(None),
            ).update(
                {AccountActivationToken.invalidated_at: now},
                synchronize_session=False,
            )
    except HTTPException:
        raise
    except IntegrityError as error:
        db.rollback()
        logger.warning("Account activation rejected by a database constraint")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=INVALID_ACTIVATION_LINK,
        ) from error
    except SQLAlchemyError as error:
        db.rollback()
        logger.error("Account activation transaction failed (%s)", type(error).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="L'activation est temporairement indisponible.",
        ) from error


def login(
    db: Session,
    request: Request,
    response: Response,
    body: LoginRequest,
) -> Profile:
    require_auth_storage(db)
    email = normalize_email(str(body.email))
    credential = (
        db.query(UserCredential)
        .filter(UserCredential.email_normalized == email)
        .with_for_update()
        .first()
    )
    if (
        not credential
        or not verify_password(body.password, credential.password_hash)
    ):
        if credential:
            credential.failed_login_count += 1
            if credential.failed_login_count >= MAX_FAILED_LOGINS:
                credential.is_locked = True
                credential.locked_at = utcnow()
            db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=GENERIC_LOGIN_ERROR,
        )
    profile = db.query(Profile).filter(Profile.id == credential.id).first()
    if (
        not profile
        or not profile.active
        or not credential.is_active
        or credential.is_locked
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=GENERIC_LOGIN_ERROR,
        )

    now = utcnow()
    raw_token = create_opaque_token()
    db.add(
        AuthSession(
            user_id=profile.id,
            token_hash=hash_token(raw_token),
            created_at=now,
            last_activity_at=now,
            expires_at=now + timedelta(minutes=settings.auth_session_ttl_minutes),
            ip_address=_client_ip(request),
            user_agent=request.headers.get("User-Agent", "")[:1000],
        )
    )
    credential.failed_login_count = 0
    credential.locked_at = None
    try:
        db.commit()
    except SQLAlchemyError as error:
        db.rollback()
        logger.error("Login session transaction failed (%s)", type(error).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La connexion est temporairement indisponible.",
        ) from error
    _set_session_cookie(response, raw_token)
    return profile


def logout(db: Session, request: Request, response: Response) -> None:
    token = request.cookies.get(settings.auth_cookie_name)
    _clear_session_cookie(response)
    if not token:
        return
    try:
        session = (
            db.query(AuthSession)
            .filter(
                AuthSession.token_hash == hash_token(token),
                AuthSession.revoked_at.is_(None),
            )
            .first()
        )
        if session:
            session.revoked_at = utcnow()
            db.commit()
    except SQLAlchemyError as error:
        db.rollback()
        logger.error("Logout session revocation failed (%s)", type(error).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La révocation de session est temporairement indisponible.",
        ) from error


def change_password(
    db: Session,
    user_id: str,
    current_password: str,
    new_password: str,
) -> None:
    credential = db.query(UserCredential).filter(UserCredential.id == user_id).first()
    if not credential or not verify_password(current_password, credential.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le mot de passe actuel est incorrect.",
        )
    now = utcnow()
    credential.password_hash = hash_password(new_password)
    credential.password_changed_at = now
    db.query(AuthSession).filter(
        AuthSession.user_id == user_id,
        AuthSession.revoked_at.is_(None),
    ).update({AuthSession.revoked_at: now}, synchronize_session=False)
    try:
        db.commit()
    except SQLAlchemyError as error:
        db.rollback()
        logger.error("Password change transaction failed (%s)", type(error).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La modification du mot de passe est temporairement indisponible.",
        ) from error


def request_password_reset(db: Session, email: str) -> AuthEmail | None:
    require_auth_storage(db)
    require_email_delivery()
    normalized_email = normalize_email(email)
    credential = (
        db.query(UserCredential)
        .join(Profile, Profile.id == UserCredential.id)
        .filter(
            UserCredential.email_normalized == normalized_email,
            UserCredential.is_active.is_(True),
            UserCredential.is_locked.is_(False),
            Profile.active.is_(True),
        )
        .first()
    )
    if not credential:
        return None

    try:
        now = utcnow()
        token = create_opaque_token()
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == credential.id,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.invalidated_at.is_(None),
        ).update(
            {PasswordResetToken.invalidated_at: now},
            synchronize_session=False,
        )
        db.add(
            PasswordResetToken(
                user_id=credential.id,
                token_hash=hash_token(token),
                expires_at=now
                + timedelta(minutes=settings.password_reset_token_ttl_minutes),
            )
        )
        db.commit()
        profile = db.query(Profile).filter(Profile.id == credential.id).one()
        return AuthEmail(email=profile.email, token=token)
    except SQLAlchemyError as error:
        db.rollback()
        logger.error("Password reset request failed (%s)", type(error).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La demande est temporairement indisponible.",
        ) from error


def reset_password_with_token(
    db: Session,
    token: str,
    new_password: str,
) -> None:
    require_auth_storage(db)
    token_digest = hash_token(token)
    now = utcnow()
    try:
        with db.begin():
            reset = (
                db.query(PasswordResetToken)
                .filter(
                    PasswordResetToken.token_hash == token_digest,
                    PasswordResetToken.used_at.is_(None),
                    PasswordResetToken.invalidated_at.is_(None),
                    PasswordResetToken.expires_at > now,
                )
                .with_for_update()
                .first()
            )
            if not reset:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=INVALID_RESET_LINK,
                )
            credential = (
                db.query(UserCredential)
                .filter(UserCredential.id == reset.user_id)
                .with_for_update()
                .first()
            )
            if not credential:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=INVALID_RESET_LINK,
                )
            credential.password_hash = hash_password(new_password)
            credential.password_changed_at = now
            credential.failed_login_count = 0
            credential.is_locked = False
            credential.locked_at = None
            reset.used_at = now
            db.query(PasswordResetToken).filter(
                PasswordResetToken.user_id == reset.user_id,
                PasswordResetToken.id != reset.id,
                PasswordResetToken.used_at.is_(None),
                PasswordResetToken.invalidated_at.is_(None),
            ).update(
                {PasswordResetToken.invalidated_at: now},
                synchronize_session=False,
            )
            db.query(AuthSession).filter(
                AuthSession.user_id == reset.user_id,
                AuthSession.revoked_at.is_(None),
            ).update({AuthSession.revoked_at: now}, synchronize_session=False)
    except HTTPException:
        raise
    except SQLAlchemyError as error:
        db.rollback()
        logger.error("Password reset transaction failed (%s)", type(error).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La réinitialisation est temporairement indisponible.",
        ) from error


def update_profile(
    db: Session,
    user_id: str,
    full_name: str | None = None,
    department: str | None = None,
    phone: str | None = None,
    avatar_url: str | None = None,
) -> Profile:
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    if full_name is not None:
        profile.full_name = full_name
    if department is not None:
        profile.department = department
    if phone is not None:
        profile.phone = phone
    if avatar_url is not None:
        profile.avatar_url = avatar_url
    profile.updated_at = utcnow()
    db.commit()
    return profile


def update_user_role(db: Session, target_user_id: str, new_role: str) -> Profile:
    profile = db.query(Profile).filter(Profile.id == target_user_id).first()
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    profile.role = new_role
    profile.updated_at = utcnow()
    now = utcnow()
    db.query(AuthSession).filter(
        AuthSession.user_id == target_user_id,
        AuthSession.revoked_at.is_(None),
    ).update({AuthSession.revoked_at: now}, synchronize_session=False)
    db.commit()
    return profile


def revoke_user_sessions(db: Session, user_id: str) -> int:
    now = utcnow()
    result = db.execute(
        update(AuthSession)
        .where(
            AuthSession.user_id == user_id,
            AuthSession.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )
    db.commit()
    return result.rowcount or 0


def list_user_sessions(db: Session, user_id: str) -> list[AuthSession]:
    return (
        db.query(AuthSession)
        .filter(AuthSession.user_id == user_id)
        .order_by(AuthSession.created_at.desc())
        .all()
    )


def validate_session(
    db: Session,
    raw_token: str | None,
) -> tuple[Profile, AuthSession] | None:
    if not raw_token:
        return None
    try:
        now = utcnow()
        auth_session = (
            db.query(AuthSession)
            .filter(
                AuthSession.token_hash == hash_token(raw_token),
                AuthSession.revoked_at.is_(None),
                AuthSession.expires_at > now,
            )
            .first()
        )
        if not auth_session:
            return None
        credential = db.query(UserCredential).filter(
            UserCredential.id == auth_session.user_id,
            UserCredential.is_active.is_(True),
            UserCredential.is_locked.is_(False),
        ).first()
        profile = db.query(Profile).filter(
            Profile.id == auth_session.user_id,
            Profile.active.is_(True),
        ).first()
        if not credential or not profile:
            return None

        last_activity = auth_session.last_activity_at
        if last_activity.tzinfo is None:
            last_activity = last_activity.replace(tzinfo=UTC)
        if last_activity < now - SESSION_ACTIVITY_UPDATE_INTERVAL:
            auth_session.last_activity_at = now
            db.commit()
        return profile, auth_session
    except SQLAlchemyError as error:
        db.rollback()
        logger.error("Authentication session lookup failed (%s)", type(error).__name__)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=AUTH_STORAGE_UNAVAILABLE,
        ) from error
