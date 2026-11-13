# PAJES Authentication Migration Status

**Status:** implementation and disposable-database verification complete;
protected-database migration not approved or executed.

## Current status

- The frontend signup endpoint is `/api/v1/auth/signup`; the API base URL,
  client fallback, and startup documentation target port 8001. The `/api/v1`
  prefix is not duplicated.
- Authentication code now uses separate `user_credentials`, `auth_sessions`,
  `account_activation_tokens`, and `password_reset_tokens` tables linked to
  `public.profiles.id`. It preserves existing profile UUIDs, names, roles, and
  permissions. Passwords use Argon2id; session and one-time tokens are stored
  as SHA-256 digests. Session cookies are HTTP-only, state-changing requests
  require CSRF validation, and auth endpoints are rate-limited.
- Signup, activation, login, `/auth/me`, logout, password reset, and session
  restoration have been tested against a disposable PostgreSQL database using
  synthetic fixture data. The test did not use imported user records or a
  production email provider. Development activation/reset email was delivered
  only to the local in-process test mailbox.
- The SQL proposal and Alembic migration produced matching PostgreSQL schema
  signatures on two disposable databases. A synthetic existing profile and
  `public.users` view were preserved by both.
- `pajes_import_test` remains protected and unchanged. Real signup, activation,
  login, and session restoration against that database are **not verified**.
  Do not retry a real signup or enable production authentication until the
  database owner approves the migration and deployment plan.

## Migration artifacts

- SQL proposal:
  `backend/sql/proposals/auth_storage_migration.proposal.sql`
- Alembic migration:
  `backend/migrations/versions/0002_auth.py`
- Guarded rollback proposal:
  `backend/sql/proposals/auth_storage_rollback.proposal.sql`
- Read-only compatibility report:
  `backend/sql/proposals/auth_storage_schema_compatibility.md`

The migration and SQL proposal are additive and leave `public.users`,
`auth.users`, `public.profiles`, and existing business/permission records
untouched. Neither artifact was executed against `pajes_import_test`. The
rollback proposal was not executed.

## Verification

- Disposable PostgreSQL schema parity: **passed**.
- Disposable PostgreSQL auth workflow: **passed** for signup/activation,
  profile UUID and role preservation, Argon2id credential storage, login,
  `/api/v1/auth/me`, permission denial, logout/revocation, password reset,
  session restoration, and CSRF. Focused tests also verify email-delivery
  failure handling and signup rate limiting.
- `PAJES_ENV_NO_DB=1 uv run pytest -q`: **79 passed, 1 skipped** (live
  readiness check).
- Targeted Ruff on auth code, tests, and migration: **passed**.
- `npm run typecheck`: **passed**.
- `npm run build`: **passed**. Existing warnings remain for stale Browserslist
  data, dependency `eval`, and oversized bundles.

## Original timeout diagnosis and remaining blockers

- At the time of the reported timeout, the backend was not listening on ports
  8000 or 8001 during the initial check; a temporary instance later passed
  liveness/readiness on 8001. No historical request logs were available, so
  whether the original request reached FastAPI or waited on a database lock
  cannot be established.
- A read-only account lookup found no matching account at that time. The
  protected schema lacked the proposed auth-storage tables and `public.users`
  was a view; no signup retry was made. Signup does not send email, so email
  delivery was not the timeout cause.
- Email provider configuration is still outstanding. Production delivery is
  not verified, and the development mailbox is not a production substitute.
- In-memory rate limiting is process-local; a multi-worker production
  deployment requires a shared rate-limit backend or an approved deployment
  constraint.
- Before migration, obtain database-owner approval, confirm service-role
  privileges, review the compatibility report and preconditions, verify a
  restorable backup, and schedule an approved deployment window. Then run the
  reviewed migration only under that approval and verify the full workflow
  against the migrated database. No migration has been run on the protected
  database.
