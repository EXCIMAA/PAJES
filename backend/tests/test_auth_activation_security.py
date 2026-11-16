"""Tests for account activation security hardening.

Verifies:
1. Account without credential:
   - Activation without password is rejected with 422 (PASSWORD_REQUIRED).
   - Activation with valid password creates active credential with argon2id hash.
2. Account with existing inactive credential:
   - Activation without password is rejected with 422 (PASSWORD_REQUIRED).
   - Activation with incorrect password is rejected with 400 (PASSWORD_MISMATCH).
   - Activation with correct password succeeds.
   - Original password hash is preserved exactly.
   - Failed attempts do not consume the activation token.
3. Account with existing active credential:
   - Activation remains rejected with 400 (INVALID_ACTIVATION_LINK).
"""

from __future__ import annotations

import uuid
from datetime import timedelta
import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core import utcnow
from app.core.security import create_opaque_token, hash_password, hash_token, verify_password
from app.models.auth import (
    AccountActivationToken,
    Profile,
    UserCredential,
)
from app.schemas.auth import ActivateAccountRequest
from app.services import auth_service
from app.services.auth_service import (
    INVALID_ACTIVATION_LINK,
    PASSWORD_MISMATCH,
    PASSWORD_REQUIRED,
)


def _setup_profile_with_token(
    db: Session,
    email: str = "security-test@example.com",
    has_credential: bool = False,
    credential_active: bool = False,
    password: str = "OriginalPass123!",
) -> tuple[Profile, str, AccountActivationToken]:
    user_id = str(uuid.uuid4())
    profile = Profile(
        id=user_id,
        email=email,
        full_name="Security Test User",
        role="stagiaires",
        active=True,
    )
    db.add(profile)

    orig_hash = None
    if has_credential:
        orig_hash = hash_password(password)
        credential = UserCredential(
            id=user_id,
            email_normalized=email.lower(),
            password_hash=orig_hash,
            is_active=credential_active,
            is_locked=False,
            failed_login_count=0,
            password_changed_at=utcnow(),
            activated_at=utcnow() if credential_active else None,
        )
        db.add(credential)

    raw_token = create_opaque_token()
    token_obj = AccountActivationToken(
        id=str(uuid.uuid4()),
        user_id=user_id,
        token_hash=hash_token(raw_token),
        expires_at=utcnow() + timedelta(hours=24),
    )
    db.add(token_obj)
    db.commit()

    return profile, raw_token, token_obj


# ==============================================================================
# CASE A: Account without existing credential
# ==============================================================================

def test_no_credential_activation_without_password_is_rejected(test_db: Session):
    """1. Activation without password must raise 422 PASSWORD_REQUIRED."""
    profile, raw_token, token_obj = _setup_profile_with_token(
        test_db, "no-cred-no-pw@example.com", has_credential=False
    )

    req = ActivateAccountRequest(token=raw_token, password=None)
    with pytest.raises(HTTPException) as exc_info:
        auth_service.activate_account(test_db, req)

    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == PASSWORD_REQUIRED

    # Token must not be consumed
    reloaded_token = test_db.query(AccountActivationToken).filter_by(id=token_obj.id).one()
    assert reloaded_token.used_at is None
    assert reloaded_token.invalidated_at is None

    # Credential must not have been created
    reloaded_profile = test_db.query(Profile).filter_by(id=profile.id).one()
    assert reloaded_profile.credential is None


def test_no_credential_activation_with_valid_password_creates_active_credential(test_db: Session):
    """2. Activation with a valid password creates an active credential."""
    profile, raw_token, token_obj = _setup_profile_with_token(
        test_db, "no-cred-valid-pw@example.com", has_credential=False
    )

    new_password = "SecureNewPass123!"
    req = ActivateAccountRequest(token=raw_token, password=new_password)
    auth_service.activate_account(test_db, req)

    # Credential created and active
    credential = test_db.query(UserCredential).filter_by(id=profile.id).one()
    assert credential.is_active is True
    assert credential.activated_at is not None
    assert credential.password_hash.startswith("$argon2id$")
    assert verify_password(new_password, credential.password_hash)

    # Token consumed
    reloaded_token = test_db.query(AccountActivationToken).filter_by(id=token_obj.id).one()
    assert reloaded_token.used_at is not None


# ==============================================================================
# CASE B: Account with existing inactive credential
# ==============================================================================

def test_inactive_credential_activation_without_password_is_rejected(test_db: Session):
    """3. Activation without password must raise 422 PASSWORD_REQUIRED."""
    profile, raw_token, token_obj = _setup_profile_with_token(
        test_db,
        "inactive-cred-no-pw@example.com",
        has_credential=True,
        credential_active=False,
        password="MySecretPassword123!",
    )

    req = ActivateAccountRequest(token=raw_token, password=None)
    with pytest.raises(HTTPException) as exc_info:
        auth_service.activate_account(test_db, req)

    assert exc_info.value.status_code == 422
    assert exc_info.value.detail == PASSWORD_REQUIRED

    # Token must NOT be consumed
    reloaded_token = test_db.query(AccountActivationToken).filter_by(id=token_obj.id).one()
    assert reloaded_token.used_at is None
    assert reloaded_token.invalidated_at is None

    # Credential remains inactive
    credential = test_db.query(UserCredential).filter_by(id=profile.id).one()
    assert credential.is_active is False


def test_inactive_credential_activation_with_incorrect_password_is_rejected(test_db: Session):
    """4. Activation with incorrect password must raise 400 PASSWORD_MISMATCH."""
    profile, raw_token, token_obj = _setup_profile_with_token(
        test_db,
        "inactive-cred-wrong-pw@example.com",
        has_credential=True,
        credential_active=False,
        password="CorrectPassword123!",
    )

    req = ActivateAccountRequest(token=raw_token, password="WrongPassword999!")
    with pytest.raises(HTTPException) as exc_info:
        auth_service.activate_account(test_db, req)

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == PASSWORD_MISMATCH

    # Token must NOT be consumed
    reloaded_token = test_db.query(AccountActivationToken).filter_by(id=token_obj.id).one()
    assert reloaded_token.used_at is None
    assert reloaded_token.invalidated_at is None

    # Credential remains inactive
    credential = test_db.query(UserCredential).filter_by(id=profile.id).one()
    assert credential.is_active is False


def test_inactive_credential_activation_with_correct_password_succeeds(test_db: Session):
    """5 & 6. Activation with correct password succeeds and preserves original hash."""
    correct_password = "EstablishedPassword123!"
    profile, raw_token, token_obj = _setup_profile_with_token(
        test_db,
        "inactive-cred-right-pw@example.com",
        has_credential=True,
        credential_active=False,
        password=correct_password,
    )

    orig_hash = test_db.query(UserCredential).filter_by(id=profile.id).one().password_hash
    test_db.commit()

    req = ActivateAccountRequest(token=raw_token, password=correct_password)
    auth_service.activate_account(test_db, req)

    # Credential activated
    credential = test_db.query(UserCredential).filter_by(id=profile.id).one()
    assert credential.is_active is True
    assert credential.activated_at is not None

    # Password hash must be exactly unchanged
    assert credential.password_hash == orig_hash
    assert verify_password(correct_password, credential.password_hash)

    # Token consumed
    reloaded_token = test_db.query(AccountActivationToken).filter_by(id=token_obj.id).one()
    assert reloaded_token.used_at is not None


def test_failed_attempts_do_not_consume_activation_token(test_db: Session):
    """7. Multiple failed attempts (missing or wrong password) do not consume the token, then correct attempt succeeds."""
    correct_password = "FinalPassword123!"
    profile, raw_token, token_obj = _setup_profile_with_token(
        test_db,
        "retry-token@example.com",
        has_credential=True,
        credential_active=False,
        password=correct_password,
    )

    # Attempt 1: missing password
    with pytest.raises(HTTPException) as exc1:
        auth_service.activate_account(test_db, ActivateAccountRequest(token=raw_token, password=None))
    assert exc1.value.status_code == 422

    # Attempt 2: wrong password
    with pytest.raises(HTTPException) as exc2:
        auth_service.activate_account(test_db, ActivateAccountRequest(token=raw_token, password="BadPassword123!"))
    assert exc2.value.status_code == 400

    # Token must still be active and usable
    token_record = test_db.query(AccountActivationToken).filter_by(id=token_obj.id).one()
    assert token_record.used_at is None
    assert token_record.invalidated_at is None
    test_db.commit()

    # Attempt 3: correct password succeeds with the SAME token
    auth_service.activate_account(test_db, ActivateAccountRequest(token=raw_token, password=correct_password))

    credential = test_db.query(UserCredential).filter_by(id=profile.id).one()
    assert credential.is_active is True
    token_record_after = test_db.query(AccountActivationToken).filter_by(id=token_obj.id).one()
    assert token_record_after.used_at is not None


# ==============================================================================
# CASE C: Account with existing active credential
# ==============================================================================

def test_already_active_credential_activation_is_rejected(test_db: Session):
    """8. Activation for an already active credential remains rejected with 400."""
    profile, raw_token, token_obj = _setup_profile_with_token(
        test_db,
        "already-active@example.com",
        has_credential=True,
        credential_active=True,
        password="ExistingActivePass123!",
    )

    req = ActivateAccountRequest(token=raw_token, password="ExistingActivePass123!")
    with pytest.raises(HTTPException) as exc_info:
        auth_service.activate_account(test_db, req)

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == INVALID_ACTIVATION_LINK
