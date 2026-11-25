"""Guarantee the restricted default role for every new registration.

Revision ID: 0003_default_user_role
Revises: 0002_auth

Adds the ``user`` role to ``public.role_permissions`` with every module and
action disabled, and aligns the ``public.profiles.role`` column default with
the application-level default (``DEFAULT_SIGNUP_ROLE``).

Safety properties:
  * Never creates, drops, or alters existing users, profiles, credentials,
    sessions, activation/reset tokens, or business tables.
  * Never touches a ``role_permissions`` row belonging to another role.
  * Idempotent: the ``user`` row is inserted only when absent (ON CONFLICT
    DO NOTHING) and the column default is a no-op when already correct, so
    re-running against an up-to-date database changes nothing.
"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_default_user_role"
down_revision: str | None = "0002_auth"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

DEFAULT_ROLE = "user"
PREVIOUS_DEFAULT_ROLE = "auditor"

ROLE_PERMISSIONS_GUARD = """
DO $$
BEGIN
    IF to_regclass('public.role_permissions') IS NULL THEN
        RAISE EXCEPTION
            'public.role_permissions is required to seed the default role';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'role_permissions'
           AND column_name = 'permissions'
    ) THEN
        RAISE EXCEPTION 'public.role_permissions.permissions is missing';
    END IF;
END
$$;
"""

# Imported lazily inside upgrade() so the module list stays a single source of
# truth shared with the runtime permission matrix.
def _restricted_permissions() -> dict:
    from app.permissions.matrix import ALL_ACTIONS, ALL_MODULES

    return {
        module: {action: False for action in ALL_ACTIONS}
        for module in ALL_MODULES
    }


def upgrade() -> None:
    import json

    op.execute(ROLE_PERMISSIONS_GUARD)

    op.alter_column(
        "profiles",
        "role",
        server_default=sa.text(f"'{DEFAULT_ROLE}'"),
        schema="public",
        existing_type=sa.Text(),
        existing_nullable=False,
    )

    permissions = json.dumps(_restricted_permissions())
    bind = op.get_bind()
    bind.execute(
        sa.text(
            """
            INSERT INTO public.role_permissions (role, permissions)
            VALUES (:role, CAST(:permissions AS jsonb))
            ON CONFLICT (role) DO NOTHING
            """
        ),
        {"role": DEFAULT_ROLE, "permissions": permissions},
    )


def downgrade() -> None:
    bind = op.get_bind()

    # Only remove the row we own, and only while it still grants nothing, so an
    # administrator who customised the role keeps their configuration.
    row = bind.execute(
        sa.text(
            "SELECT permissions FROM public.role_permissions WHERE role = :role"
        ),
        {"role": DEFAULT_ROLE},
    ).first()

    if row is not None:
        permissions = row[0] or {}
        grants_any = any(
            value is True
            for module_permissions in permissions.values()
            for value in (module_permissions or {}).values()
        )
        if grants_any:
            raise RuntimeError(
                "Refusing to remove the 'user' role_permissions row: it now "
                "grants permissions. Review it before downgrading."
            )
        bind.execute(
            sa.text("DELETE FROM public.role_permissions WHERE role = :role"),
            {"role": DEFAULT_ROLE},
        )

    op.alter_column(
        "profiles",
        "role",
        server_default=sa.text(f"'{PREVIOUS_DEFAULT_ROLE}'"),
        schema="public",
        existing_type=sa.Text(),
        existing_nullable=False,
    )