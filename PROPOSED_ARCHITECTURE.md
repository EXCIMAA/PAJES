# PAJES - Proposed Architecture (Phase 1 proposal, not implemented)

Target: Next.js App Router, existing React + TypeScript frontend preserved, Next.js Route Handlers for APIs, MySQL, Prisma, secure authentication and role-based authorization.

Nothing in this document has been built. It requires approval before Phase 2.

## 1. Target structure

```
app/                       Next.js App Router
  (auth)/login, signup, reset
  (app)/...                 existing pages, mounted as client components
  api/**/route.ts           Route Handlers (all data access)
lib/
  server/db.ts              Prisma client (singleton)
  server/auth.ts            session + role checks
  server/permissions.ts     moved from src/lib/permissions.ts (shared matrix)
  server/services/*.ts      invoices, depreciation, leave, caisse, cac-fees
prisma/schema.prisma        MySQL schema
src/                        existing React code, progressively moved under app/
```

The existing React components are kept. Each current page becomes a client component rendered from an App Router page. `react-router-dom` is removed once routes are mapped.

## 2. How the frontend talks to the backend

- Every data call goes through a typed API client (a thin wrapper over `fetch`) that calls `/api/...` Route Handlers.
- TanStack Query (already installed) caches reads and handles mutations, retries and invalidation.
- Session: an HTTP-only, secure, SameSite cookie set by the login Route Handler. The browser never holds a service key or database credentials.
- Errors: Route Handlers return a single error shape `{ code, message }`, so the UI can show a visible error state.

## 3. Replacing Supabase dependencies

| Current Supabase feature | Replacement |
|---|---|
| Auth (signInWithPassword, signUp, reset, updateUser) | Route Handlers + Auth.js (NextAuth v5) or a custom session with argon2id password hashing, rate limiting and password reset tokens stored hashed in MySQL |
| PostgREST queries (`from().select/insert/update/delete`) | Prisma queries inside Route Handlers, with authorization checks in a service layer |
| RLS policies | Server-side guards: `requireUser()`, `requireRole()`, `requireModule(module, action)` called at the top of every Route Handler and service. Row ownership checked in the service |
| `or()` access filters | Prisma `where` clauses built by the same permission helper on the server |
| RPC `calculer_mission_cac` | Service function `cac-fees.ts`, unit-tested, called from a Route Handler |
| Database function `notify_clients` (trigger) | Service call inside the create-client transaction that inserts a notification row |
| Storage buckets (documents, working-papers, leave_documents, ...) | Local or object storage behind Route Handlers that stream files after an authorization check. Signed, short-lived URLs |
| Realtime notifications | Polling via TanStack Query (30 to 60 s) first. Server-Sent Events later if needed |
| Edge Function `generate-depreciation` | Service function `depreciation.ts` in the Next.js server. Same schedule logic, one implementation |
| `information_schema` introspection in ReportsPage | Removed. Replace with a fixed list of reports defined in code |
| `public.users` view | Removed. Users table is the authentication source |
| Demo mode via localStorage | Kept as a read-only seeded dataset served by a demo role. Must not bypass the server |
| `WriteBlocker` and Supabase Proxy | Removed. Enforcement moves to the server; the client only hides controls |

## 4. Authentication and authorization

- Roles: `super_admin`, `admin`, `manager`, `auditor`, `collaborator`, `viewer` (to be confirmed against the business). Stored in a `user_roles` table, not on the user row alone.
- Module permissions: a `role_permissions` table (module, action, role). The static matrix in code is the default seed; the database is the source of truth.
- Server enforcement on every Route Handler: authenticate, then `requireModule(module, action)`, then ownership check for row-level access.
- Password policy, lockout after repeated failures, CSRF protection on mutations, and audit log of sensitive actions.
- Sign-up creates an unapproved user. An admin approves and assigns a role. The user cannot change their own role.

## 5. PostgreSQL to MySQL adaptation

| PostgreSQL feature in PAJES | MySQL approach |
|---|---|
| `uuid` with `gen_random_uuid()` | `CHAR(36)` or `BINARY(16)` with app-generated UUID v4 |
| `timestamptz` | `DATETIME(3)` stored in UTC, converted in the app |
| `numeric(14,2)` | `DECIMAL(14,2)` |
| `jsonb` (client snapshot) | `JSON` column |
| CHECK constraints on status | `ENUM` or CHECK (MySQL 8.0.16+). Prisma `enum` |
| Partial indexes / `DESC` indexes | Standard indexes; MySQL 8 supports descending index |
| `ON DELETE SET NULL` / `CASCADE` | Same syntax in MySQL InnoDB |
| Views with `security_invoker` | Not needed; authorization in services |
| SECURITY DEFINER functions and triggers | Service-layer transactions |
| `ILIKE` search | `LIKE` with collation `utf8mb4_0900_ai_ci` (case-insensitive), or FULLTEXT |
| Array / text search operators | Not used in the snapshot |

Data migration plan: export Supabase data as CSV/JSON per table, transform (UUID format, decimal scale, French enum labels), load into MySQL in dependency order (clients, profiles/users, engagements, invoices, invoice_lines, ...). Keep the Supabase project read-only until verification passes.

Schema fixes to make during the move (decided in Phase 2 with approval): unify depreciation method values, add unique invoice numbers, add foreign keys for client_id, engagement_id, employee_id, add missing tables referenced by code, separate hotel-operations tables (migration 001) from the audit firm data if they are not used.

## 6. Features that cannot be migrated directly

| Feature | Why | Proposed replacement |
|---|---|---|
| RLS-based data isolation | Not available in MySQL | Server-side authorization layer and tests per route |
| Realtime notifications | No built-in change feed | Polling first; SSE later |
| Storage signed URLs | No built-in storage | Authorized streaming endpoint |
| Supabase Auth email flows | Not provided | Custom reset and verification with a transactional email provider (to be chosen) |
| `information_schema` report discovery | Insecure and not portable | Fixed report definitions in code |
| Client-side PDF of invoices | Inconsistent output, not auditable | Server PDF generation from stored totals |
| Anon-key direct DB access | Security risk | Removed entirely |

## 7. Security baseline for the new backend

- Service database credentials only on the server, in environment variables not exposed to the client.
- No secret in `NEXT_PUBLIC_*` variables.
- Input validation with a schema library (zod) on every Route Handler.
- Rate limiting on login and reset endpoints.
- Audit log for create, update and delete on financial and HR records.
- Soft delete for invoices and fixed assets with restore permission.
- HTTPS only, secure cookies, CSP headers.

## 8. Open decisions for the business owner

1. Keep, split or remove the hotel-operations tables from migration 001.
2. Final role list and which modules each role can access.
3. Confirm SYSCOHADA depreciation rules (prorata, first year, disposal).
4. Confirm invoice numbering and TVA rules, and whether a single HT definition applies.
5. Choose storage location for files and the email provider.
6. Hosting target for MySQL and Next.js.
