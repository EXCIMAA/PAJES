# PAJES - Current Architecture (Phase 1 audit)

Status: read-only audit. No application code, dependencies or database were changed.

## 1. Stack at a glance

| Layer | Technology | Notes |
|---|---|---|
| UI | React 18.3, TypeScript 5.5, Vite 5 | Single-page app, all routes client-side |
| Routing | react-router-dom 7 | About 40 lazy-loaded routes under one app shell |
| Data | Supabase JS 2.x (PostgREST, RPC, Storage, Realtime, Auth) | Browser talks directly to Supabase |
| Server code | One Supabase Edge Function (`generate-depreciation`, Deno) | Only server-side code in the repo |
| Styling | Tailwind 3 with CSS variable theme (light/dark), styled-components 6 | styled-components used heavily in manuel, caisse, collaborateurs |
| i18n | i18next + react-i18next (fr default, en) | Locale files in `src/locales` |
| Charts / files | recharts, exceljs, xlsx, jspdf, html2pdf.js, html2canvas, mammoth | See FRONTEND_DEPENDENCIES.md |

## 2. Frontend structure

- Entry: `src/main.tsx` mounts `App.tsx`.
- Providers (contexts): `AuthContext`, `PermissionContext`, `DatabaseContext`, `DemoContext`, `CountryContext`, `ThemeContext`.
- Routing: `App.tsx` nests every page under `ProtectedRoute` -> `RoleGuard` -> `AppLayout`. Unknown paths redirect to `/`.
- Layout: `AppLayout`, `Sidebar`, `TopBar`, plus shared UI in `src/components/ui` (DataTable, Badge, StatCard, GlobalSearch, ThemeToggle, etc.).
- Access control components: `ProtectedRoute`, `RoleGuard`, `PermissionGate`, `ProtectedAction`, `WriteBlocker` (click, file input, form submit and object URL interception).
- Data access: direct Supabase calls inside pages, plus shared helpers `src/lib/db-queries.ts`, `db-mappers.ts`, hooks `useSupabaseData.ts` and `useDepreciation.ts`.
- Demo mode: a localStorage flag (`pajes_demo_mode`) makes data hooks return bundled demo data and forces view-only access.
- Business logic lives in pages and helpers: `src/lib/invoiceUtils.ts`, `src/lib/cac/calculs.ts`, `src/lib/permissions.ts`, `src/lib/constants.ts`.

## 3. Module map (as seen in the snapshot)

| Area | Main files | Backend touched |
|---|---|---|
| Dashboard | `pages/DashboardPage.tsx`, `components/dashboard/*` | clients, engagements, fixed_assets, weekly_missions and others |
| Clients / Engagements | `pages/clients/ClientsPage.tsx`, `pages/engagements/EngagementsPage.tsx` | `clients`, `engagements` |
| CAC missions | `pages/missions/cac/*`, `pages/cac/*` | `clients` (filter country = CMR), RPC `calculer_mission_cac` |
| Invoices | `pages/facture/*`, `components/InvoiceTemplate.tsx`, `InvoicePDF.tsx` | `invoices`, `invoice_lines`, `clients` |
| Fixed assets | `pages/fixed-assets/FixedAssetsPage.tsx` | `fixed_assets`, Edge Function `generate-depreciation` |
| Caisse | `pages/caisse/CaissePage.tsx` | Read/write via client (table not in migrations) |
| Stock | `pages/stock/StockPage.tsx` | `inventory_items` (live) / `stock_items` (code) |
| Leave | `pages/leave/LeavePage.tsx` | `leave_requests`, `leave_balances` (not in migrations) |
| Expense claims | `pages/noteDeFrais/*` | Not verified (table names not confirmed) |
| Findings / Review notes | `pages/FindingsPage.tsx`, `pages/review-notes/*` | `findings`, `review_notes` |
| Working papers / Documents | `pages/working-papers/*`, `pages/documentsTravail/*`, `pages/resources/*` | `working_papers`, Storage buckets |
| Team / Collaborators | `pages/team/*`, `pages/collaborateurs/*` | `profiles`, `team_members`, plus styled manuel tables |
| Manuel (≈28 tools) | `pages/manuel/*` | About 25 tables, see DATABASE_AUDIT.md |
| Notifications | `pages/notifications/*`, `lib/notifications.ts`, `hooks/useUnreadCount.ts` | `notifications` + realtime |
| Reports | `pages/reports/ReportsPage.tsx` | Queries `information_schema` through PostgREST (not verified to work) |
| Auth | `pages/auth/*`, `contexts/AuthContext.tsx` | Supabase Auth, `profiles` |

## 4. Runtime request flow today

1. Browser loads the SPA and reads the Supabase URL and anon key from build-time environment variables.
2. `src/lib/supabase.ts` wraps the Supabase client in a Proxy. It blocks writes for demo users and users without module rights, using `TABLE_WRITE_MODULE` and `RPC_WRITE_PERMISSION` from `src/lib/permissions.ts`.
3. Pages call `supabase.from(...)`, `supabase.rpc(...)`, storage, or realtime directly.
4. Authorization for data rows is enforced by database RLS policies. In most tables these are open to `anon` and `authenticated` (see DATABASE_AUDIT.md), so effective enforcement is client-side only.

## 5. Unverifiable items in this section

- The contents of several large page files were only sampled in the snapshot (for example `PlanningClient.tsx`, `ClientsPage.tsx`, `FixedAssetsPage.tsx`). Their exact query list is not confirmed.
- Whether `information_schema` is reachable through PostgREST was not tested.
- Production environment values and the deployed Edge Function state were not checked.
- Lint results were not provided.
- Typecheck is known to fail (`typecheck-result.txt`, about 60 errors). The build was not run in this phase.
