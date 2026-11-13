-- PROPOSAL ONLY. Never execute against pajes_import_test without explicit
-- database-owner approval. This file is an additive PostgreSQL 17 proposal.
--
-- Read-only catalog/data audit (2026-11-13):
--   * public.users remains the existing VIEW over auth.users. This proposal
--     does not alter its definition or any object in the auth schema.
--   * public.profiles.id is UUID and references auth.users(id).
--   * public.profiles contains 14 rows; all 14 emails are non-NULL and
--     nonblank, with no duplicate lower(trim(email)) values.
--   * auth.users contains 18 rows; 14 emails are non-NULL and 4 are NULL.
--     The non-NULL emails have no duplicate lower(trim(email)) values.
--   * Credentials start empty and are created only after verified onboarding.
--     The normalized-email unique constraint is applied to those new rows;
--     it does not update existing email data. The 4 auth.users rows with
--     NULL email cannot use email-based activation until separately resolved.
--
-- Application requirements:
--   * Generate session/activation/reset secrets with a cryptographically
--     secure random generator; return raw tokens only once and store only
--     their lowercase SHA-256 hex digests here.
--   * Hash passwords with Argon2id. The database checks the encoded hash
--     prefix; it does not implement password hashing.
--   * Normalize email with lower(trim(email)) before storing or comparing.
--   * Do not create credentials or passwords for existing profiles until a
--     user completes an approved activation flow.
--
-- Preconditions: public.profiles is the existing table with UUID primary key;
-- public.users is still a view; none of the four new table names exists.
-- No existing table, view, row, email, or underlying auth.users object is
-- changed by this proposal.

BEGIN;

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

CREATE TABLE public.user_credentials (
    id uuid NOT NULL,
    email_normalized varchar(255) NOT NULL,
    password_hash text NOT NULL,
    is_active boolean NOT NULL DEFAULT false,
    is_locked boolean NOT NULL DEFAULT false,
    failed_login_count integer NOT NULL DEFAULT 0,
    locked_at timestamp with time zone,
    password_changed_at timestamp with time zone NOT NULL DEFAULT now(),
    activated_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_credentials_pkey PRIMARY KEY (id),
    CONSTRAINT fk_user_credentials_profile
        FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE RESTRICT,
    CONSTRAINT uq_user_credentials_email_normalized UNIQUE (email_normalized),
    CONSTRAINT ck_user_credentials_email_normalized
        CHECK (
            email_normalized <> ''
            AND email_normalized = lower(btrim(email_normalized))
        ),
    CONSTRAINT ck_user_credentials_password_hash_argon2id
        CHECK (password_hash LIKE '$argon2id$%'),
    CONSTRAINT ck_user_credentials_failed_login_count
        CHECK (failed_login_count >= 0)
);

CREATE TABLE public.auth_sessions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    token_hash varchar(64) NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    last_activity_at timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    ip_address varchar(45),
    user_agent text,
    CONSTRAINT auth_sessions_pkey PRIMARY KEY (id),
    CONSTRAINT fk_auth_sessions_profile
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE RESTRICT,
    CONSTRAINT uq_auth_sessions_token_hash UNIQUE (token_hash),
    CONSTRAINT ck_auth_sessions_token_hash_format
        CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_auth_sessions_expiry_after_create
        CHECK (expires_at > created_at),
    CONSTRAINT ck_auth_sessions_activity_after_create
        CHECK (last_activity_at >= created_at)
);

CREATE INDEX ix_auth_sessions_user_expires_at
    ON public.auth_sessions (user_id, expires_at);
CREATE INDEX ix_auth_sessions_user_revoked_at
    ON public.auth_sessions (user_id, revoked_at);

CREATE TABLE public.account_activation_tokens (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    token_hash varchar(64) NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    invalidated_at timestamp with time zone,
    CONSTRAINT account_activation_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT fk_account_activation_tokens_profile
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE RESTRICT,
    CONSTRAINT uq_account_activation_tokens_hash UNIQUE (token_hash),
    CONSTRAINT ck_account_activation_tokens_hash_format
        CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_account_activation_tokens_expiry_after_create
        CHECK (expires_at > created_at),
    CONSTRAINT ck_account_activation_tokens_single_terminal_state
        CHECK (used_at IS NULL OR invalidated_at IS NULL)
);

CREATE INDEX ix_account_activation_tokens_user_expires_at
    ON public.account_activation_tokens (user_id, expires_at);

CREATE TABLE public.password_reset_tokens (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    token_hash varchar(64) NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    invalidated_at timestamp with time zone,
    CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT fk_password_reset_tokens_profile
        FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE RESTRICT,
    CONSTRAINT uq_password_reset_tokens_hash UNIQUE (token_hash),
    CONSTRAINT ck_password_reset_tokens_hash_format
        CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_password_reset_tokens_expiry_after_create
        CHECK (expires_at > created_at),
    CONSTRAINT ck_password_reset_tokens_single_terminal_state
        CHECK (used_at IS NULL OR invalidated_at IS NULL)
);

CREATE INDEX ix_password_reset_tokens_user_expires_at
    ON public.password_reset_tokens (user_id, expires_at);

COMMIT;

-- Rollback is intentionally not included as executable SQL. Any future
-- rollback requires explicit owner approval and an approved, verified backup.
-- Dropping these four new tables after onboarding destroys newly created
-- credential hashes, sessions, activation records, and password-reset records.
-- Never drop or replace public.users, auth.users, or public.profiles.
