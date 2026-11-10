# PAJES Auth & Permissions Audit — Phase 2

## Existing System Overview

### Authentication (Supabase Auth)

- **Provider:** Supabase email/password auth (`supabase.auth.signInWithPassword`,
  `signUp`, `signOut`, `resetPasswordForEmail`).
- **Session:** Supabase JWT persisted in the browser via `@supabase/supabase-js`
  with `persistSession: true`, `autoRefreshToken: true`.
- **Profile loading:** After login, `AuthContext` loads the user's row from
  the `profiles` table (`supabase.from("profiles").select("*").eq("id", userId)`)
  and stores `role`, `full_name`, `department`, `phone`.
- **Auth listener:** `onAuthStateChange` refreshes user/profile on token change.
- **Demo mode:** A `localStorage` flag (`pajes_demo_mode`) bypasses Supabase
  entirely — demo user has `role: null` → view-only, all writes blocked.

### Profiles table (Supabase PostgreSQL)

```
profiles:
  id          uuid PK (matches auth.users.id)
  email       text NOT NULL
  full_name   text NOT NULL
  role        text NOT NULL DEFAULT 'auditor'
  avatar_url  text
  department  text
  phone       text
  created_at  timestamptz
  updated_at  timestamptz
```

- `id` is a foreign key to `auth.users.id` (Supabase auth).
- Migration 006 tightened RLS: users can only UPDATE their own profile
  (`auth.uid() = id`), preventing cross-user role escalation. But a user
  can still change **their own** `role` column — there is no server-side
  guard against self-escalation within their own row.

### role_permissions table

- The frontend `PermissionContext` loads `role_permissions` from Supabase
  (`supabase.from("role_permissions").select("role, permissions")`).
- Each row: `{ role: string, permissions: JSON }` where `permissions` is a
  `PermissionMatrix` fragment (modules × actions booleans).
- `buildDisplayedPermissionsMap()` merges DB overrides over the hardcoded
  `PERMISSION_MATRIX` defaults; `super_admin` is always skipped (full access).
- **No migration creates this table** — it was likely added manually or
  via a migration not in the repo. The backend must create it.

### Permission matrix (`src/lib/permissions.ts`)

**17 job titles (postes):**
super_admin, assistant_administratif, rh, responsable_controle_interne,
responsable_admin_fin, associe_gerant, directeur_bureau, manageur,
chef_mission, superviseur, senior_audit, senior_expertise, junior_audit,
junior_expertise, stagiaires, formateur_senior, formateur_junior.

**24 modules (16 main + 8 collaborator sub-modules):**
clients, missions, review_notes, findings, besoins_cabinet, stock,
immobilisations, caisse, suivi_cac, conges, manuel, notes_frais,
fournisseurs, ressources_internes, collaborateurs, factures,
collaborateur_profiles, collaborateur_hr, collaborateur_financial,
collaborateur_missions, collaborateur_leave, collaborateur_performance,
collaborateur_documents, collaborateur_audit.

**4 actions:** create, view, edit, delete.

**super_admin:** Implicitly full access to all modules/actions.

**Runtime override:** `setRuntimePermissionMatrix()` allows the DB-loaded
`role_permissions` to override defaults at runtime. If no DB row exists
for a role, the hardcoded defaults apply.

### Write enforcement (`src/lib/supabase.ts`)

- A **Proxy** wraps the Supabase client and intercepts `.from(table).insert/
  update/delete/upsert` and `.rpc(fnName)`.
- Blocked when: demo mode active, OR user has no role (`localStorage`).
- Maps table names → modules via `TABLE_WRITE_MODULE`, RPC names → modules
  via `RPC_WRITE_PERMISSION`, then checks `hasPermission(role, module, action)`.
- **This is entirely client-side.** RLS on most business tables is
  `USING(true)` / `WITH CHECK(true)` (open), so the only real gate is
  this frontend proxy. Migration 006 locked down `profiles` and
  `notifications` but NOT the business tables.

### Security weaknesses identified

1. **Self-escalation:** A user can UPDATE their own `profiles.role` to
   `super_admin` — no server-side check prevents this.
2. **Business tables open:** Most business tables (clients, invoices,
   stock, etc.) have `USING(true)` RLS — any authenticated user can
   read/write all rows via the Supabase REST API, bypassing the frontend
   proxy.
3. **role_permissions table:** Any authenticated user can read and
   potentially write to it (no specific RLS was found).
4. **Client-side-only enforcement:** The proxy in `supabase.ts` is the
   primary enforcement mechanism for module-level permissions.

---

## Mapping to FastAPI Backend

### Models

| Supabase | FastAPI / MySQL |
|---|---|
| `auth.users` (Supabase managed) | `users` table — email, password_hash (Argon2id), is_active, is_locked |
| `profiles` | `profiles` table — FK to users.id, full_name, role, department, phone, avatar_url |
| `role_permissions` | `role_permissions` table — role, permissions (JSON) |

### Auth design

- **Password hashing:** Argon2id via passlib. Supabase hashes cannot be
  migrated → controlled password-reset / first-login flow.
- **Sessions:** JWT signed with `AUTH_SECRET_KEY`, stored in HTTP-only
  cookie (`pajes_session`). SameSite=Lax (Strict in production), Secure
  flag in production.
- **Session expiry:** `AUTH_SESSION_TTL_MINUTES` (default 480 = 8h).
- **CSRF:** Cookie SameSite=Lax + token-based double-submit for mutations.
- **Login flow:** `POST /api/v1/auth/login` → verify password → issue JWT
  → set cookie → return user profile.
- **Logout:** `POST /api/v1/auth/logout` → clear cookie.
- **Signup:** `POST /api/v1/auth/signup` → create user + profile (role=null).
- **Password reset:** `POST /api/v1/auth/reset-password` → email-based.

### Permission enforcement (server-side)

- **Permission matrix:** Translated 1:1 from `permissions.ts` into a
  Python module (`app/permissions/matrix.py`). Same 17 roles, 24 modules,
  4 actions, identical boolean cells.
- **Runtime override:** `role_permissions` table loaded at startup (and
  on reload), merged over defaults. `super_admin` always full.
- **Dependency:** `require_permission(module, action)` FastAPI dependency
  checks the JWT, loads user role, checks matrix. Returns 403 if denied.
- **Self-escalation prevention:** `role` and `is_active` columns on
  profiles/users are NOT user-editable. Only `super_admin` or `rh` (for
  collaborateur modules) can change roles via dedicated admin endpoints.
- **Ownership checks:** `can_access_record()` helper for stagiaires and
  record-level access (matching `canAccessRecordSafe` in TS).

### Role-to-permission mapping (preserved exactly)

All 17 roles × 24 modules × 4 actions = 1,632 boolean cells, copied
verbatim from `PERMISSION_MATRIX` in `permissions.ts`. No changes.

### Demo mode

- Demo mode is a frontend-only concept (localStorage). The backend does
  not implement demo mode. The frontend will continue to handle it.
