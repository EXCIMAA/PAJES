"""Models package — SQLAlchemy ORM models for PAJES.

Importing this package registers all models on Base.metadata so Alembic
autogenerate sees them.
"""

from app.models.auth import (  # noqa: F401
    AccountActivationToken,
    AuthSession,
    PasswordResetToken,
    Profile,
    RolePermission,
    UserCredential,
)
