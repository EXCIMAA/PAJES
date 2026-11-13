# Authentication storage compatibility report

**Status:** read-only inspection and migration preparation only. The migration
has not been executed. `pajes_import_test` was queried through a read-only
PostgreSQL connection and was not changed.

## Existing PostgreSQL schema

The inspected server reports PostgreSQL 17.11.

| Object | Actual structure |
| --- | --- |
| `public.users` | View, not a table. Definition selects `auth.users.id`, `auth.users.email`, and a constant empty-text `role`. The proposal does not alter it. |
| `public.profiles` | Table. `id uuid NOT NULL` primary key with default `auth.uid()`; `email text NOT NULL`; `full_name text NOT NULL`; `role text NOT NULL DEFAULT 'auditor'`; `avatar_url`, `department`, and `phone` are nullable `text`; `active boolean NOT NULL DEFAULT true`; `created_at` and `updated_at` are nullable `timestamp with time zone DEFAULT now()`; `hire_date date`. |
| `auth.users` | Table. `id uuid NOT NULL` primary key; `email text NULL`. No password/hash columns and no unique email index. |
| `public.role_permissions` | Existing table, retained unchanged. `id uuid` primary key; `role text` unique; `permissions jsonb NOT NULL`; nullable `created_at`/`updated_at timestamp with time zone`. It has a unique role index and a separate non-unique role index. |

`public.profiles.id` has the existing foreign key
`profiles.id → auth.users(id) ON DELETE CASCADE`. Its primary-key index is the
only profile index; there is no email index or uniqueness constraint. The
`auth.users` table has only its primary-key index. No triggers were found on
`auth.users` or `public.profiles`.

The existing profile identity and role data are therefore the authority for
authentication. New credential and token foreign keys point to
`public.profiles(id)`; none points to or replaces `public.users`.

## Read-only data checks

- 14 profiles; all have nonblank email values and there are no duplicate
  `lower(trim(email))` groups.
- 18 `auth.users` identities; 14 have email values and 4 have `NULL` email.
  No duplicate normalized non-NULL emails were found.
- 4 `auth.users` identities do not have a profile; 0 profiles lack an
  `auth.users` identity.
- No old password hashes were found in `auth.users`.
- `user_credentials`, `auth_sessions`, `account_activation_tokens`, and
  `password_reset_tokens` are absent. `public.alembic_version` is also absent.

The normalized-email constraint proposed on the new `user_credentials` table
does not add a constraint to imported tables. No migration precondition depends
on changing existing email or role data.

## Prepared additive schema

`auth_storage_migration.proposal.sql` and Alembic revision `0002_auth` define
the same four tables, UUID keys, profile foreign keys, hash/token checks,
unique constraints, and indexes. Both guard that:

- `public.profiles` remains a table with a UUID primary key;
- its existing cascading identity foreign key still targets
  `auth.users(id)`;
- `public.users` remains a view; and
- none of the four new table names already exists.

The standalone rollback proposal only drops those four new tables, without
`CASCADE`, and requires both explicit approval and backup-verification session
settings. It is not approval to run a rollback.

## Authentication compatibility decisions

- Existing profile UUIDs, names, email values, roles, and permissions are not
  rewritten during activation. Imported profiles without a credential can
  request an activation link; a credential is inserted only after the link is
  verified and the user chooses a password.
- New signup creates an `auth.users` identity, a matching profile, and a
  hashed activation-token record in one transaction. It supplies UUIDs
  explicitly because `profiles.id` defaults to `auth.uid()`. New profiles
  receive the least-privilege `stagiaires` role; signup never assigns
  administrator access.
- The raw password is stored only as an Argon2id hash. Session, activation,
  and password-reset tokens are stored only as SHA-256 digests.
- The four legacy `auth.users` identities without profiles are not adopted by
  signup. Email-based signup also checks for an existing legacy identity
  before creating a new UUID.
- The imported database's email columns have no unique indexes. At this audit
  there are no normalized-email collisions; new credential rows enforce
  normalized-email uniqueness without changing imported indexes or records.

**Approval and execution remain outstanding.** Apply neither SQL nor Alembic
until the database owner reviews the proposal, confirms the service role has
the required privileges, approves the deployment window, and verifies a
restorable backup. The migration must first be tested against a separate
disposable PostgreSQL database.

## Disposable PostgreSQL verification

The prepared Alembic revision was applied to one disposable PostgreSQL
database, and this SQL proposal was applied to a second disposable PostgreSQL
database. Their resulting column, constraint, and index signatures matched.
A synthetic pre-existing profile and `public.users` view were preserved in
both databases. A separate disposable database then passed the authentication
workflow for signup/activation, login/session validation, permission denial,
logout/revocation, password reset, and CSRF. All disposable databases were
removed after testing. These fixtures were not copies of imported account data
and do not establish production email delivery.

No schema or data changes, migrations, or destructive operations were made to
`pajes_import_test`. The protected database still requires owner approval,
backup/deployment planning, and the reviewed migration before real
authentication can be verified.
