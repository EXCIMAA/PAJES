# PAJES FastAPI Migration Checklist

Status snapshot: 2026-11-11. PostgreSQL `pajes_import_test` is protected; no
schema changes, destructive SQL, resets, or imported-record writes are authorized.

## Verified migrated slices

- [x] Authentication/session code and isolated integration tests — HTTP-only
  session cookie and CSRF. The protected-database migration and production
  authentication workflow remain pending.
- [x] Permissions API and frontend permission context.
- [x] Clients and establishments — reflected PostgreSQL tables, API CRUD, tests.
- [x] Dashboard — permission-filtered BI endpoint and PostgreSQL metrics.
- [x] Notifications — user-scoped API and polling, authenticated CRUD tests.
- [x] Suppliers — schema-backed API CRUD and alert-state updates, permission tests.
- [x] Reports page standard/custom reads — allowlisted FastAPI endpoints, server-side
  view permissions, bounded results, date filtering, isolated API tests.
- [x] Readiness probe — returns HTTP 503 with generic detail rather than exposing
  database driver exception text.
- [x] BI expense filtering recognizes existing French expense statuses and
  excludes drafts; isolated regression coverage added.

## Remaining operational slices

- [ ] Invoices — list/detail, status/archive, create/update, and number preview
  now use permission-protected FastAPI endpoints. Isolated tests cover create
  and edit, but live-schema/numbering-rule validation is still required.
  Payments/allocation/history, exports, attachments, and restore are not
  implemented or verified; do not treat this module as complete.
- [ ] Collaborateurs, HR, user administration, roles, and permissions surfaces.
- [ ] Leave management and approvals.
- [ ] Missions, engagements, and CAC workflows.
- [ ] Working papers, review notes, findings, and audit tasks.
- [ ] Caisse, expenses, and related financial operations.
- [ ] Fixed assets and depreciation.
- [ ] Stock and inventory movements.
- [ ] Documents, uploads, downloads, and storage authorization.
- [x] Notifications (authenticated list/create, user-scoped updates/deletes/counts,
  30-second polling; frontend Realtime dependency removed).
- [ ] Other operational report exports and complete Business Intelligence analytics.
- [ ] Resources, manuals, planning, and remaining operational tools.
- [ ] System configuration and any additional modules found during inventory.

## Business Intelligence status

- [x] Overview/dashboard, financial, client, engagement, cash-flow, stock,
  expense, source-status, and Power BI report/embedding endpoints exist.
- [x] Financial analytics separate invoice currencies; gross/net profit remain
  unavailable where a shared currency or verified accounting expense definition
  cannot be established.
- [x] Expense filters recognize existing `soumis`, `valide`, and `rembourse`
  statuses while excluding `brouillon`.
- [ ] Employee hours/utilization remain explicitly unavailable pending verified
  time-entry classifications and utilization denominator.
- [x] The standalone Reports page uses the FastAPI report catalog, standard
  reports, and bounded custom reports; CSV/XLSX formatting remains in the UI.
- Reports endpoints added: `GET /api/v1/reports/catalog`,
  `GET /api/v1/reports/standard/{report_type}` (`audit` or `hr`), and
  `POST /api/v1/reports/custom`.
- [ ] Verify Power BI credentials/permissions and all analytics against live
  PostgreSQL when the configured database is reachable.

## Current inventory and constraints

- Historical broad Supabase-pattern scan after Reports integration found 329
  matches across 62 frontend source files; it predates the invoice slice and is
  not a current completion count.
- A current narrow SDK-call scan still finds direct Supabase usage in:
  - Pages: `src/pages/FindingsPage.tsx`, `src/pages/caisse/CaissePage.tsx`,
    `src/pages/collaborateurs/CollaborateurFiche.tsx`,
    `src/pages/documentsTravail/DocumentsPage.tsx`,
    `src/pages/engagements/EngagementsPage.tsx`,
    `src/pages/fixed-assets/FixedAssetsPage.tsx`,
    `src/pages/leave/LeavePage.tsx`,
    `src/pages/manuel/CompetencesCle.tsx`,
    `src/pages/manuel/DemandeDocumentsClient.tsx`,
    `src/pages/manuel/GestionDocumentation.tsx`,
    `src/pages/manuel/GestionTemps.tsx`,
    `src/pages/manuel/LutteAntiBlanchiment.tsx`,
    `src/pages/manuel/PlanningClient.tsx`,
    `src/pages/manuel/RepartitionTaches.tsx`,
    `src/pages/manuel/SuiviLettresMission.tsx`,
    `src/pages/missions/cac/MissionCACForm.tsx`,
    `src/pages/noteDeFrais/NoteDeFraisForm.tsx`,
    `src/pages/resources/ResourcesPage.tsx`,
    `src/pages/review-notes/ReviewNotesPage.tsx`,
    `src/pages/working-papers/WorkingPapersPage.tsx`,
    and `src/lib/invoiceUtils.ts` (invoice creation/numbering logic).
  - Shared/runtime helpers: `src/lib/storage.ts`,
    `src/lib/supabase.ts`, `src/api/depreciationApi.ts`,
    `src/components/security/WriteBlocker.tsx`, and
    `src/hooks/useSupabaseData.ts`.
  - `src/lib/storage.ts` is also consumed by `src/components/DocumentImage.tsx`
    and `src/components/DocumentLink.tsx`; leave/file uploads additionally
    occur in the page components listed above.
- Supabase packages remain in `package.json`/`package-lock.json`; the root
  `.env` still contains Supabase environment-variable references, and
  `supabase/functions/generate-depreciation/index.ts` remains a Supabase Edge
  Function. Do not remove these until their consumers are migrated.
- The frontend still contains `src/lib/supabase.ts`,
  `src/hooks/useSupabaseData.ts`, and Supabase dependencies. Keep them until
  every operational caller and demo-mode path is migrated and verified.
- Existing backend APIs at this snapshot: auth, business intelligence,
  clients, permissions, and users; additional module routes must be checked
  against the repository before each migration.
- Read-only inspection of `pajes_import_test` on 2026-11-11 confirmed
  `public.users` is a view over `auth.users` exposing `id`, `email`, and a
  constant empty `role`; `auth.users` has only `id` and `email`. `profiles.id`
  is UUID and references `auth.users(id)`. The earlier ORM mismatch described
  in this inspection was subsequently addressed in the authentication code:
  credentials, sessions, and one-time tokens now map to separate additive
  tables linked to `public.profiles`. Those changes have only been exercised
  against disposable databases; the protected database remains unmigrated.
- FastAPI login now validates that its current ORM auth tables/columns exist
  before attempting credential queries. If they do not, it returns HTTP 503
  with a sanitized onboarding/configuration message instead of an unhandled
  HTTP 500. This is diagnostic behavior only; it does not make login possible
  without the approved schema and service migration.
- Read-only email audit: 14 profiles, 0 NULL/blank emails, 0 duplicate
  `lower(btrim(email))` values; 18 `auth.users` rows, 4 NULL emails, and 0
  duplicates among normalized non-NULL emails. New credential email uniqueness
  applies only to new `user_credentials` records; the 4 NULL-email auth rows
  cannot use email-based activation until resolved. No emails were changed.
- The standalone proposal and Alembic `0002_auth` define the same four
  additive UUID-keyed tables. Both leave `public.users`, `auth.users`,
  `public.profiles`, and existing permissions unchanged. Read-only inspection
  found no `alembic_version` table or any of the four auth tables on the
  protected target. The corrected revision replaces a previous un-applied
  draft; check any other database's migration ledger before considering it.
  Earlier offline DDL checks passed; a later PostgreSQL 17 disposable-database
  comparison confirmed matching columns, constraints, and indexes after
  applying Alembic to one disposable database and the SQL proposal to another.
- The proposal and migration have been executed only on disposable PostgreSQL
  databases, never on `pajes_import_test`. The additive ORM/service/routes and
  frontend authentication flows are implemented. Database-owner approval,
  deployment/backup planning, and the approved production migration remain
  outstanding. No passwords were migrated or created for existing profiles
  in the protected database.
- Browser-origin login diagnostics confirmed the above backend 500 had no CORS
  header, making `fetch` reject and the API client display a network error. CORS
  now wraps the full ASGI application so unhandled 500 responses retain CORS
  headers; login will then expose an HTTP 500 response instead of claiming the
  server cannot be reached. This does not enable authentication or alter schema.
- Effective DB target is `127.0.0.1:5432/pajes_import_test`; SQLAlchemy connects
  with pool_pre_ping enabled, pool size 10, max overflow 20. Earlier connection
  attempts timed out, but the latest browser-origin `/health/ready` probe
  returned HTTP 200 and reported the database connected. This verifies readiness
  and the read-only auth-catalog/email checks above; broader record counts and
  authenticated CRUD were not performed. Docker/container/volume identity was
  not rechecked in this repair. No SQL writes or migrations were executed.
- Password reset email provider is unconfigured; do not claim delivery works.
- CAC fee RPC source and approved depreciation, leave-accrual, and invoice
  calculation rules require verification before replacing existing formulas.
- BI must only expose available, schema-backed metrics, preserve currencies,
  date filters, and module permissions, and avoid double-counting.
- Storage/Power BI must be reported as unavailable until their configuration
  and access paths are verified.
- Stock movement triggers/constraints were not confirmed because the database
  timed out. Do not port stock valuation or movement behavior from assumptions.
- The legacy Findings page expects `finding`, `risk_level`, and
  `responsible_person`; checked SQL migrations define a different older schema
  (`title`, `severity`, `category`, `location`, `assignee`) and the later audit
  migration does not include the claimed findings ALTER. Do not implement
  findings writes until the live columns and approved status semantics are
  verified.
- Existing storage calls use Supabase buckets and signed URLs. The FastAPI
  configuration offers local/S3 backends (local directory `./storage`, 20 MiB
  maximum), but no legacy bucket export or metadata-preserving file inventory
  was verified. Do not point existing metadata at empty local storage or delete
  legacy files; storage API rollout remains blocked on a verified private
  backend, authorization mapping, and file export/relationship plan.
- Backend regression suite after the health hardening: `PAJES_ENV_NO_DB=1
  pytest -q` — 66 passed, 1 skipped. The skip is the live PostgreSQL readiness
  probe; the latest separate browser probe did reach readiness successfully.
  Targeted invoice Ruff passes after formatting the new service code. Repository
  `ruff check app tests` reports 52 findings, mostly existing auth/model/import
  issues requiring separate triage. Build warnings include stale Browserslist
  data, dependency `eval`, and large bundles.
- Backend readiness endpoint tests now include a simulated database exception;
  startup and API liveness do not imply database readiness. Backend README and
  root startup instructions were corrected to PostgreSQL and explicitly avoid
  unapproved migrations/restores.
- No imported PostgreSQL records or schema were changed during this continuation.
- Invoice API files added: `backend/app/api/v1/invoices.py`,
  `backend/app/services/invoice_service.py`,
  `backend/app/schemas/invoices.py`, and `src/api/invoices.ts`. The invoice list
  and detail pages use FastAPI for list/detail, archive, and status changes.
  Isolated tests cover pagination/filtering, detail lines, status/archive, and
  view-permission enforcement. These tests do not establish live-schema
  compatibility; the PostgreSQL service remains unavailable.
- Invoice form create/edit and server-side number preview are now connected.
  Existing UI calculations were not redesigned; decimal-formatted API values
  are converted at the existing UI calculation/formatting boundary. The live
  database schema and historical numbering/accounting rules remain unverified.
- Frontend connection repair replaced the startup Supabase connectivity check
  with FastAPI `GET /health/ready`; the check is skipped in demo mode. The API
  client now normalizes paths, uses credentialed requests, deduplicates CSRF
  bootstrap, applies a 15-second timeout, and distinguishes network failures
  from HTTP errors. Root `.env` has `VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1`;
  restart Vite after changing it.
- Browser-origin checks returned HTTP 200 for `/health` and `/health/ready`;
  `/auth/me`, `/permissions/me`, dashboard, clients, notifications, suppliers,
  reports catalog, and invoices returned expected HTTP 401 without a session.
  CSRF cookie/header matched; a state-changing probe passed CORS/CSRF checks and
  was rejected as unauthenticated (no write performed). Authenticated user,
  permission, and record workflows were not tested. A real frontend reload in
  persisted demo mode showed the dashboard without alerts and without API or
  Supabase requests after the demo-mode guard was added.
- Latest verification: isolated `PAJES_ENV_NO_DB=1 pytest -q` — 66 passed,
  1 skipped; invoice-targeted Ruff passed; `npm run typecheck` and `npm run build`
  passed; `git diff --check` passed. Targeted frontend ESLint had 0 errors and
  one existing Fast Refresh warning in `DatabaseContext.tsx`; full ESLint
  reports 279 errors and 44 warnings across the project, mostly existing
  `no-explicit-any` and other findings.
  Production build warnings include stale Browserslist data, dependency `eval`,
  and large chunks. The generic API network error was not reproduced: the
  concrete failed startup probe observed earlier targeted Supabase; it has been
  replaced, but the original reported message cannot be attributed conclusively.

## Verification gates

For each migration slice, run targeted backend tests and the full backend suite,
frontend typecheck, frontend production build, and a read-only PostgreSQL smoke
test where applicable. Use isolated test databases for writes. Reconcile
imported-record counts only with read-only queries.

## Signup timeout diagnosis — 2026-11-13

- Frontend signup resolves to `POST /api/v1/auth/signup` (the `/api/v1` prefix
  comes from the API base URL and is not duplicated by the auth router).
- The root Vite `.env` pointed to port 8000 while the requested backend port is
  8001. The configured URL, API-client default, and startup documentation now
  consistently use `http://127.0.0.1:8001/api/v1`.
- The read-only account lookup found no matching row in `public.profiles` or
  `auth.users` for the submitted address. No signup retry was sent.
- PostgreSQL accepted read-only checks, but the existing auth-storage guard
  reports the protected schema is incompatible with the current signup ORM
  (`public.users` remains a view, not a credential table). Signup now performs
  that read-only guard before ORM queries and returns a sanitized 503 instead
  of attempting incompatible writes. Do not run auth migrations without owner
  approval.
- The backend was not listening on port 8000 or 8001 at the initial port
  check. A temporary instance was subsequently started on 8001 and its
  liveness/readiness passed, but no historical request logs were available.
  Whether the original POST reached FastAPI or waited on a DB lock cannot be
  established. Signup itself does not send email; email delivery was not the
  cause. A local synthetic Argon2id hash took about 323 ms.
- Signup DB writes now use one transaction with rollback and sanitized DB
  failure handling. The UI distinguishes timeout, network, duplicate,
  validation, and server/storage failures; it never retries automatically and
  asks users to verify account status after a timeout.
- Isolated SQLite tests cover normalization, duplicate/retry, validation,
  auth-storage rejection, DB failure, and transaction rollback. Activation and
  password-reset flows have since been implemented and tested with a disposable
  PostgreSQL database; this does not verify signup against imported data.
- Full backend suite: `uv run pytest -q` — 76 passed. An isolated SQLite
  workflow now covers signup, login, `/auth/me`, and logout. Frontend typecheck
  and production build passed; targeted ESLint had no errors and one existing
  Fast Refresh warning. The temporary API returned 200 for liveness/readiness,
  CORS from the expected 5174 origin, and the OpenAPI signup path was present.
- No writes, schema changes, migrations, or destructive operations were made
  to `pajes_import_test`.

## Authentication storage preparation — latest verification

- Implemented four additive storage models/tables: `user_credentials`,
  `auth_sessions`, `account_activation_tokens`, and `password_reset_tokens`.
  The auth service uses existing profile UUIDs, Argon2id password hashes,
  SHA-256 token digests, expiring single-use activation/reset tokens, session
  revocation, HTTP-only cookies, CSRF checks, and rate limits. Signup never
  grants administrator privileges. Development email is delivered to an
  in-process mailbox only; no production provider is configured.
- The matching proposal is
  `backend/sql/proposals/auth_storage_migration.proposal.sql`; the migration is
  `backend/migrations/versions/0002_auth.py`; the guarded rollback proposal is
  `backend/sql/proposals/auth_storage_rollback.proposal.sql`. Schema
  compatibility findings and approval requirements are in
  `backend/sql/proposals/auth_storage_schema_compatibility.md`.
- Disposable PostgreSQL validation passed: Alembic and standalone SQL created
  matching schema signatures; a synthetic existing profile and `public.users`
  view were preserved in both databases. A separate disposable PostgreSQL
  workflow passed signup for an existing profile, activation, Argon2id storage,
  login, `/auth/me`, role/permission denial, logout/revocation, password reset,
  session restoration, and CSRF enforcement. The workflow used synthetic
  fixture records and the development mailbox, not the imported database or a
  real email provider. All disposable databases were removed.
- Latest automated checks: `PAJES_ENV_NO_DB=1 uv run pytest -q` — **79 passed,
  1 skipped** (live readiness test); targeted auth/migration Ruff — **passed**;
  `npm run typecheck` — **passed**; `npm run build` — **passed**. Build output
  retains existing Browserslist, dependency `eval`, and large-chunk warnings.
- Focused regression tests also verify email-delivery failure does not claim
  delivery or log the recipient/error detail, and signup rate limiting returns
  HTTP 429 with `Retry-After`.
- No migration, schema change, or data write was made to `pajes_import_test`.
  Real signup, activation, login, reset, and session restoration against the
  approved imported database are **not verified**. Do not execute either
  migration artifact against it before owner approval and a verified backup.
