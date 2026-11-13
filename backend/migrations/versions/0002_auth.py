"""Additive authentication storage linked to existing public.profiles.

Revision ID: 0002_auth
Revises: 0001_initial

This replaces the un-applied draft of revision 0002_auth. It never creates,
renames, or alters public.users, auth.users, public.profiles, or their data.
Do not use this revision on a database where the previous 0002_auth revision
was already applied; inspect its schema and migration ledger first.

PostgreSQL 17 is required. Existing public.profiles(id) must be UUID.
"""
from __future__ import annotations

import os
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002_auth"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PROFILE_SCHEMA_GUARD = """
DO $$
DECLARE
    profiles_kind "char";
    profiles_id_type text;
    profiles_id_attnum smallint;
    auth_users_kind "char";
    auth_users_id_type text;
    auth_users_id_attnum smallint;
    users_kind "char";
BEGIN
    SELECT relation.relkind
      INTO profiles_kind
      FROM pg_class AS relation
      JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
     WHERE namespace.nspname = 'public'
       AND relation.relname = 'profiles';

    IF profiles_kind IS DISTINCT FROM 'r' THEN
        RAISE EXCEPTION 'Expected public.profiles to be a table; found relkind %',
            profiles_kind;
    END IF;

    SELECT format_type(attribute.atttypid, attribute.atttypmod),
           attribute.attnum
      INTO profiles_id_type, profiles_id_attnum
      FROM pg_attribute AS attribute
     WHERE attribute.attrelid = 'public.profiles'::regclass
       AND attribute.attname = 'id'
       AND NOT attribute.attisdropped;

    IF profiles_id_type IS DISTINCT FROM 'uuid' THEN
        RAISE EXCEPTION 'Expected public.profiles.id UUID, found %',
            profiles_id_type;
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint AS constraint_row
         WHERE constraint_row.conrelid = 'public.profiles'::regclass
           AND constraint_row.contype = 'p'
           AND constraint_row.conkey = ARRAY[profiles_id_attnum]::smallint[]
    ) THEN
        RAISE EXCEPTION 'Expected public.profiles.id to be the primary key';
    END IF;

    SELECT relation.relkind
      INTO auth_users_kind
      FROM pg_class AS relation
      JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
     WHERE namespace.nspname = 'auth'
       AND relation.relname = 'users';

    IF auth_users_kind IS DISTINCT FROM 'r' THEN
        RAISE EXCEPTION 'Expected auth.users to be a table; found relkind %',
            auth_users_kind;
    END IF;

    SELECT format_type(attribute.atttypid, attribute.atttypmod),
           attribute.attnum
      INTO auth_users_id_type, auth_users_id_attnum
      FROM pg_attribute AS attribute
     WHERE attribute.attrelid = 'auth.users'::regclass
       AND attribute.attname = 'id'
       AND NOT attribute.attisdropped;

    IF auth_users_id_type IS DISTINCT FROM 'uuid' THEN
        RAISE EXCEPTION 'Expected auth.users.id UUID, found %',
            auth_users_id_type;
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM pg_constraint AS constraint_row
         WHERE constraint_row.conrelid = 'public.profiles'::regclass
           AND constraint_row.confrelid = 'auth.users'::regclass
           AND constraint_row.contype = 'f'
           AND constraint_row.conkey = ARRAY[profiles_id_attnum]::smallint[]
           AND constraint_row.confkey = ARRAY[auth_users_id_attnum]::smallint[]
           AND constraint_row.confdeltype = 'c'
    ) THEN
        RAISE EXCEPTION
            'Expected public.profiles.id to reference auth.users(id) ON DELETE CASCADE';
    END IF;

    SELECT relation.relkind
      INTO users_kind
      FROM pg_class AS relation
      JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
     WHERE namespace.nspname = 'public'
       AND relation.relname = 'users';

    IF users_kind IS DISTINCT FROM 'v' THEN
        RAISE EXCEPTION 'Expected public.users to remain a view; found relkind %',
            users_kind;
    END IF;

    IF to_regclass('public.user_credentials') IS NOT NULL
       OR to_regclass('public.auth_sessions') IS NOT NULL
       OR to_regclass('public.account_activation_tokens') IS NOT NULL
       OR to_regclass('public.password_reset_tokens') IS NOT NULL THEN
        RAISE EXCEPTION
            'One or more proposed authentication tables already exist; inspect before proceeding';
    END IF;
END
$$;
"""


def upgrade() -> None:
    op.execute(PROFILE_SCHEMA_GUARD)

    op.create_table(
        "user_credentials",
        sa.Column("id", sa.Uuid(as_uuid=False), nullable=False),
        sa.Column("email_normalized", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("is_locked", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("failed_login_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "password_changed_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name="user_credentials_pkey"),
        sa.ForeignKeyConstraint(
            ["id"],
            ["public.profiles.id"],
            name="fk_user_credentials_profile",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint(
            "email_normalized",
            name="uq_user_credentials_email_normalized",
        ),
        sa.CheckConstraint(
            "email_normalized <> '' "
            "AND email_normalized = lower(btrim(email_normalized))",
            name="email_normalized",
        ),
        sa.CheckConstraint(
            "password_hash LIKE '$argon2id$%'",
            name="password_hash_argon2id",
        ),
        sa.CheckConstraint(
            "failed_login_count >= 0",
            name="failed_login_count",
        ),
        schema="public",
    )

    op.create_table(
        "auth_sessions",
        sa.Column(
            "id",
            sa.Uuid(as_uuid=False),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", sa.Uuid(as_uuid=False), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "last_activity_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id", name="auth_sessions_pkey"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["public.profiles.id"],
            name="fk_auth_sessions_profile",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint("token_hash", name="uq_auth_sessions_token_hash"),
        sa.CheckConstraint(
            "token_hash ~ '^[0-9a-f]{64}$'",
            name="token_hash_format",
        ),
        sa.CheckConstraint(
            "expires_at > created_at",
            name="expiry_after_create",
        ),
        sa.CheckConstraint(
            "last_activity_at >= created_at",
            name="activity_after_create",
        ),
        schema="public",
    )
    op.create_index(
        "ix_auth_sessions_user_expires_at",
        "auth_sessions",
        ["user_id", "expires_at"],
        schema="public",
    )
    op.create_index(
        "ix_auth_sessions_user_revoked_at",
        "auth_sessions",
        ["user_id", "revoked_at"],
        schema="public",
    )

    op.create_table(
        "account_activation_tokens",
        sa.Column(
            "id",
            sa.Uuid(as_uuid=False),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", sa.Uuid(as_uuid=False), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("invalidated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id", name="account_activation_tokens_pkey"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["public.profiles.id"],
            name="fk_account_activation_tokens_profile",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint("token_hash", name="uq_account_activation_tokens_hash"),
        sa.CheckConstraint(
            "token_hash ~ '^[0-9a-f]{64}$'",
            name="hash_format",
        ),
        sa.CheckConstraint(
            "expires_at > created_at",
            name="expiry_after_create",
        ),
        sa.CheckConstraint(
            "used_at IS NULL OR invalidated_at IS NULL",
            name="single_terminal_state",
        ),
        schema="public",
    )
    op.create_index(
        "ix_account_activation_tokens_user_expires_at",
        "account_activation_tokens",
        ["user_id", "expires_at"],
        schema="public",
    )

    op.create_table(
        "password_reset_tokens",
        sa.Column(
            "id",
            sa.Uuid(as_uuid=False),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", sa.Uuid(as_uuid=False), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("invalidated_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id", name="password_reset_tokens_pkey"),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["public.profiles.id"],
            name="fk_password_reset_tokens_profile",
            ondelete="RESTRICT",
        ),
        sa.UniqueConstraint("token_hash", name="uq_password_reset_tokens_hash"),
        sa.CheckConstraint(
            "token_hash ~ '^[0-9a-f]{64}$'",
            name="hash_format",
        ),
        sa.CheckConstraint(
            "expires_at > created_at",
            name="expiry_after_create",
        ),
        sa.CheckConstraint(
            "used_at IS NULL OR invalidated_at IS NULL",
            name="single_terminal_state",
        ),
        schema="public",
    )
    op.create_index(
        "ix_password_reset_tokens_user_expires_at",
        "password_reset_tokens",
        ["user_id", "expires_at"],
        schema="public",
    )


def downgrade() -> None:
    if os.environ.get("PAJES_AUTH_ROLLBACK_BACKUP_VERIFIED_AND_APPROVED") != "YES":
        raise RuntimeError(
            "Auth downgrade blocked. Obtain explicit owner approval and create "
            "and verify an approved backup first. Set "
            "PAJES_AUTH_ROLLBACK_BACKUP_VERIFIED_AND_APPROVED=YES only after "
            "that review. Downgrade destroys all data in the four new auth tables."
        )

    op.drop_index(
        "ix_password_reset_tokens_user_expires_at",
        table_name="password_reset_tokens",
        schema="public",
    )
    op.drop_table("password_reset_tokens", schema="public")

    op.drop_index(
        "ix_account_activation_tokens_user_expires_at",
        table_name="account_activation_tokens",
        schema="public",
    )
    op.drop_table("account_activation_tokens", schema="public")

    op.drop_index(
        "ix_auth_sessions_user_revoked_at",
        table_name="auth_sessions",
        schema="public",
    )
    op.drop_index(
        "ix_auth_sessions_user_expires_at",
        table_name="auth_sessions",
        schema="public",
    )
    op.drop_table("auth_sessions", schema="public")
    op.drop_table("user_credentials", schema="public")
