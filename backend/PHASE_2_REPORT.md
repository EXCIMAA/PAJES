# PAJES Migration — Phase 2 Report (Updated): Auth, Permissions & Security Review

**Date:** 2026-11-06
**Phase:** 2 — Audit, authentication, user management, server-side permissions, security review
**Status:** Backend code complete; NOT runtime-verified in this environment.

---

## 1. The Five Decisions — Implementation Status

### Decision 1: Password migration — force reset, preserve accounts
**Status: Implemented.**

Existing user accounts and profiles will be migrated with their emails and
display data intact, but without password hashes. Users will need to reset
their passwords via the `/api/v1/auth/reset-password` flow when the new
system goes live. The `reset_password_with_token()` function in
`auth_service.py` handles this: it generates a 15-minute JWT reset token,
sends it via email, and the user sets a new password which is hashed with
Argon2id. All sessions are revoked after a password reset.

### Decision 2: Configurable transactional email provider
**Status: Implemented.**

`app/services/email_service.py` supports three providers selected via the
`EMAIL_PROVIDER` env var:
- `smtp` — standard SMTP with TLS
- `sendgrid` — SendGrid API
- `postmark` — Postmark API
- `none` — development mode (logs to console)

All provider credentials are configured via environment variables (see
`.env.example`). Password reset emails are sent through this service.

### Decision 3: Session tracking and revocation
**Status: Implemented.**

- JWTs now include a `jti` (JWT ID) claim.
- Every login creates an `AuthSession` record in the database with the JTI,
  issue time, expiry, IP, and user agent.
- The `get_current_profile` dependency checks the JTI against the
  `auth_sessions` table on every authenticated request — revoked sessions
  return 401 "Session revoked".
- Administrators can list (`GET /users/{id}/sessions`) and revoke
  (`DELETE /users/{id}/sessions`) any user's sessions.
- Role changes, password changes, and deactivation all automatically revoke
  the user's active sessions, forcing re-login with the new permissions.
- Logout revokes the current session's JTI in the database.

### Decision 4: Demo mode isolation
**Status: Documented — frontend implementation in Phase 3.**

Demo mode remains a frontend-only concept (localStorage flag). The backend
does NOT implement demo mode — demo users have no JWT, no session, and no
access to any API endpoint. The frontend will continue to handle demo mode
with its existing localStorage-based approach, and when the frontend API
client is built in Phase 3, demo mode will short-circuit before making any
API calls. Demo users can never reach the FastAPI backend.

### Decision 5: CLI command for initial super_admin
**Status: Implemented.**

`app/scripts/create_super_admin.py` provides a one-time CLI command:
```bash
uv run python -m app.scripts.create_super_admin \
    --email admin@excimaa.com \
    --password 'SecurePassword123!' \
    --first-name Admin --last-name EXCIMAA
```
It warns if a super_admin already exists, requires interactive confirmation
to proceed, and does NOT expose any public endpoint.

---

## 2. Security Review Findings

### JWT expiration
- **Token TTL:** 480 minutes (8 hours), configurable via `AUTH_SESSION_TTL_MINUTES`.
- **Expiry claim:** `exp` is set in the JWT payload; `decode_session_token`
  rejects expired tokens via PyJWT's built-in `ExpiredSignatureError`.
- **Password reset tokens:** Separate JWT with 15-minute expiry and a
  `purpose: "password_reset"` claim. The `decode_password_reset_token`
  function verifies both the expiry and the purpose claim.

### Cookie security
- `httponly=True` — JavaScript cannot read the session cookie (XSS protection).
- `secure` flag — set to `true` in production via `SECURE_COOKIES=true`.
- `samesite` — `lax` in development, `strict` in production.
- `path="/"` — cookie is available to all API routes.
- Cookie is cleared on logout.

### CSRF protection
- **Double-submit cookie pattern** implemented in `CSRFMiddleware`.
- GET responses set a `pajes_csrf` cookie (readable by JS, `httponly=False`).
- Mutating requests (POST/PUT/PATCH/DELETE) must include `X-CSRF-Token`
  header matching the cookie value.
- Bearer-token auth (no session cookie) is exempt — CSRF doesn't apply to
  non-browser clients.
- Login, signup, and password-reset-request are exempt (no session yet).
- Token comparison uses `hmac.compare_digest()` to prevent timing attacks.

### Password reset tokens
- Separate JWT with 15-minute expiry and `purpose` claim.
- Reset request always returns the same generic message — prevents email
  enumeration.
- Email sending failures are silently caught — no error leaks to the client.
- After reset, all user sessions are revoked and the account is unlocked.

### Login rate limiting
- `LoginRateLimitMiddleware` limits login attempts per IP address.
- Default: 10 attempts per 60 seconds (configurable).
- Uses in-memory sliding window. For multi-process deployments, Redis would
  be needed (documented as a future requirement).
- Returns 429 with `Retry-After` header.

### Account lockout
- After 5 failed login attempts, the account is automatically locked
  (`is_locked = True`).
- Admin can unlock via the activate endpoint.
- Password reset also unlocks the account.

### Privilege escalation prevention
- Profile update endpoint (`PUT /users/me`) does NOT accept a `role` field.
- Role changes require `super_admin` via the `require_admin` dependency.
- Role changes revoke all user sessions immediately.
- Permission overrides for `super_admin` cannot be created or modified.

### Immediate permission enforcement
- `PermissionService` loads the permission matrix from the database on every
  request — no caching. Role/permission changes take effect on the next
  API call.
- Session revocation on role change ensures the JWT's embedded role is
  invalidated; the user must re-login to get a new JWT with the updated role.

---

## 3. Alembic Migration Review (MySQL Compatibility)

Migration `0002_auth` creates four tables: `users`, `profiles`,
`role_permissions`, `auth_sessions`.

**MySQL-specific features used:**
- `mysql_engine="InnoDB"` — required for foreign key support in MySQL.
- `mysql_charset="utf8mb4"` — full Unicode support (emoji, special chars).
- `server_default=sa.text("1")` / `sa.text("0")` for booleans — MySQL uses
  TINYINT(1) for booleans; server defaults must be raw SQL.
- `sa.func.now()` for timestamps — maps to `CURRENT_TIMESTAMP` in MySQL.
- `DateTime(timezone=True)` — MySQL stores this as DATETIME (no timezone
  awareness in MySQL < 8.1); application code uses UTC consistently.
- `JSON` column type for `role_permissions.permissions` — MySQL 5.7+/8.0
  supports native JSON.
- `String(36)` for UUIDs — stored as VARCHAR(36) in MySQL.
- Foreign keys with `ondelete="CASCADE"` — supported by InnoDB.

**Known MySQL limitations documented:**
- MySQL does not enforce timezone-awareness on DATETIME columns. The
  application uses `utcnow()` consistently to avoid ambiguity.
- The `Index` at the end of `auth.py` (composite index on
  `user_id, expires_at`) is defined as a module-level `Index()` call. In
  MySQL, this creates a non-unique index on both columns — correct behavior.

**No issues found.** The migration is compatible with MySQL 8.0+ using
InnoDB and utf8mb4.

---

## 4. Permission Matrix Verification

A programmatic verification script has been created:
`app/scripts/verify_matrix.py`.

It parses the TypeScript `src/lib/permissions.ts` file, extracts the
`PERMISSION_MATRIX` object (including `FULL`, `NONE`, and `P(c,v,e,d)`
calls), and compares every cell against the Python `PERMISSION_MATRIX` in
`app/permissions/matrix.py`.

Run it with:
```bash
uv run python -m app.scripts.verify_matrix
```

**This script has NOT been executed** in this environment (no Python
runtime). It must be run locally to confirm the matrices match.

The test suite also includes structural tests (`test_all_17_roles_present_in_matrix`,
`test_all_24_modules_present_for_each_role`, `test_all_4_actions_present_for_each_cell`)
that verify the Python matrix has the correct shape.

---

## 5. Files Created or Modified (this update)

### Created
```
backend/app/middleware/csrf.py              — CSRF double-submit middleware
backend/app/middleware/rate_limit.py        — Login rate limiting middleware
backend/app/services/email_service.py       — Configurable email provider
backend/app/scripts/__init__.py             — Scripts package
backend/app/scripts/create_super_admin.py   — CLI for initial admin
backend/app/scripts/verify_matrix.py        — Matrix verification script
```

### Modified
```
backend/app/core/config.py        — Added CSRF, rate limit, email, frontend URL settings
backend/app/core/security.py      — Added JTI to JWT, password reset token functions
backend/app/services/auth_service.py — JTI sessions, revocation, password reset, role-change session invalidation
backend/app/permissions/enforcer.py — JTI session revocation check, removed caching (immediate enforcement)
backend/app/api/v1/auth.py        — Password reset endpoints using email service
backend/app/api/v1/users.py       — Session listing + revocation endpoints
backend/app/main.py               — Registered CSRF + rate limit middleware
backend/.env.example              — Added all new settings
backend/tests/test_auth.py        — Updated for JTI, CSRF, added revocation/reset/rate-limit tests
```

### Not modified
```
The existing React frontend was NOT touched. Frontend build verified: passes.
Production Supabase was NOT modified. No data migrated.
```

---

## 6. Tests

### Test suite: `tests/test_auth.py` (33 tests)

| Category | Count | What they verify |
|---|---|---|
| Signup | 3 | Success, duplicate email, short password |
| Login | 3 | Success with cookie, wrong password, nonexistent user |
| Me | 2 | Requires auth, returns profile with auth |
| Logout | 1 | Clears cookie |
| Session revocation | 3 | Revoked session blocked, admin can revoke, admin can list sessions |
| Change password | 3 | Success, wrong current, sessions revoked after change |
| Permission enforcement | 3 | Admin can list users, non-admin blocked, unauth blocked |
| Privilege escalation | 4 | Non-admin blocked, admin can change, can't set own role, role change revokes sessions |
| Permission matrix | 6 | super_admin full, junior_audit limited, rh collaborateur, all 17 roles present, all 24 modules per role, all 4 actions per cell |
| Permission management | 3 | Admin can get matrix, non-admin blocked, can't modify super_admin |
| User lifecycle | 2 | Deactivate blocks login, deactivated can't access /me |
| Password reset | 4 | Request returns generic message (both existing and nonexistent), valid token works, invalid token rejected |

### Tests actually executed

**None.** This environment cannot run Python. The tests use SQLite
in-memory (no MySQL needed) and are designed to run with:
```bash
cd backend
uv sync --extra dev
uv run pytest tests/test_auth.py -v
uv run python -m app.scripts.verify_matrix
```

---

## 7. Remaining Limitations

1. **No Python runtime verification** — all backend code and tests are
   written but unexecuted in this environment.
2. **Rate limiting is in-memory** — works for single-process deployments.
   For multi-process (e.g., gunicorn with multiple workers), a Redis-backed
   rate limiter would be needed.
3. **Email provider set to "none"** — password reset emails are logged to
   console in development. Production requires configuring SMTP, SendGrid,
   or Postmark credentials.
4. **MySQL DateTime timezone** — MySQL DATETIME does not store timezone
   info. The application uses UTC consistently, but this is an application-
   level convention, not a database-level guarantee.
5. **Matrix verification script not run** — must be executed locally to
   confirm the Python and TypeScript matrices are identical.
6. **Demo mode isolation is frontend-side only** — the backend has no demo
   awareness. This is by design (demo users never reach the API), but the
   frontend Phase 3 work must ensure demo mode short-circuits before API calls.
7. **Frontend not yet connected** — the React app still uses Supabase.
   Phase 3 builds the API client and environment-based switch.

---

## 8. API Endpoint Inventory (Phase 2)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/v1/auth/login` | None | Login (rate-limited) |
| POST | `/api/v1/auth/logout` | Session | Logout (revokes session) |
| POST | `/api/v1/auth/signup` | None | Create account (role=null) |
| GET | `/api/v1/auth/me` | Session | Get current profile |
| POST | `/api/v1/auth/change-password` | Session | Change password (revokes sessions) |
| POST | `/api/v1/auth/reset-password` | None | Request reset email |
| POST | `/api/v1/auth/reset-password/confirm` | Token | Reset password with token |
| GET | `/api/v1/users` | Admin | List users (paginated) |
| GET | `/api/v1/users/{id}` | Admin | Get user |
| PUT | `/api/v1/users/me` | Session | Update own profile (no role) |
| PUT | `/api/v1/users/{id}/role` | Admin | Change user role (revokes sessions) |
| PUT | `/api/v1/users/{id}/deactivate` | Admin | Deactivate user (revokes sessions) |
| PUT | `/api/v1/users/{id}/activate` | Admin | Activate user |
| GET | `/api/v1/users/{id}/sessions` | Admin | List user sessions |
| DELETE | `/api/v1/users/{id}/sessions` | Admin | Revoke all user sessions |
| GET | `/api/v1/permissions/matrix` | Admin | Get effective permission matrix |
| GET | `/api/v1/permissions/roles` | Admin | List all roles |
| GET | `/api/v1/permissions/modules` | Admin | List all modules |
| GET | `/api/v1/permissions/role/{role}` | Admin | Get role permissions |
| PUT | `/api/v1/permissions/role/{role}` | Admin | Update role permissions |
| DELETE | `/api/v1/permissions/role/{role}` | Admin | Reset role to defaults |

---

## 9. Next Steps

Phase 2 is complete pending local test execution. Phase 3 will:
- Create the centralized frontend API client (`src/services/api.ts`).
- Add an environment-based switch (`VITE_API_BASE_URL`).
- When unset, the frontend uses Supabase (current behavior, unchanged).
- When set, the frontend talks to FastAPI.
- Connect auth flows first (login, logout, me, permissions).
- Keep demo mode working in both modes.
