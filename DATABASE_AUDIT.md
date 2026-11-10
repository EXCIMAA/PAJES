# PAJES - Database Audit (Phase 1)

Sources: the 8 migration files in `supabase/migrations`, the live database (read-only queries), and code references in `src/`.

## 1. Live state (verified)

17 objects in schema `public`, all with row-level security enabled except `users`:

| Table / view | RLS | Policies | FKs | Notes |
|---|---|---|---|---|
| activity_log | yes | 4 | 0 | open to anon |
| audit_log | yes | 2 | 0 | select + insert only, open to anon |
| clients | yes | 4 | 0 | open to anon |
| engagements | yes | 4 | 0 | open to anon |
| findings | yes | 4 | 0 | open to anon |
| fixed_assets | yes | 4 | 0 | open to anon |
| inventory_items | yes | 4 | 0 | open to anon |
| invoice_lines | yes | 4 | 1 | open to anon |
| invoices | yes | 4 | 2 | open to anon |
| leave_requests | yes | 4 | 0 | open to anon |
| notifications | yes | 4 | 0 | tightened in migration 006 |
| profiles | yes | 4 | 0 | tightened in migration 006 |
| reports | yes | 4 | 0 | open to anon |
| review_notes | yes | 4 | 0 | open to anon |
| team_members | yes | 4 | 0 | open to anon |
| weekly_missions | yes | 4 | 0 | open to anon |
| working_papers | yes | 4 | 0 | open to anon |
| users (view) | n/a | 0 | n/a | `security_invoker`, no grants to anon or authenticated |

Live security advisor (`get_advisors`, security): 0 findings reported at the time of the check. This does not mean the access model is correct; see section 3.

## 2. Migrations

| File | Purpose | Observation |
|---|---|---|
| 001_orion_core_tables | inventory_items, findings, reports, team_members, activity_log | Describes a hotel-operations app ("PAJES Hotel Operations") |
| 002_orion_audit_tables | profiles, clients, engagements, weekly_missions, review_notes, working_papers, fixed_assets, leave_requests, notifications, audit_log | Describes an audit firm. Conflicts with 001 header |
| 003_invoices | invoices, invoice_lines | Adds FK to clients and auth.users |
| 004_create_public_users_view | view `public.users` from auth.users | Exposes auth.users to anon |
| 005_safe_notify_clients | trigger function `notify_clients` | SECURITY DEFINER, no fixed search_path |
| 006_security_rls_tighten | profiles and notifications policies, revoke anon on view | Improvement; see section 3 |
| 007_security_fix_view_and_function | view rebuilt with security_invoker; revoke execute | Improvement |
| 008_security_revoke_public_execute | revoke execute from PUBLIC | Improvement |

Issues:
- Files 006 to 008 have a doubled `.sql.sql` extension. The live migration list shows the same names, so the tooling accepts them, but they should be renamed in Phase 2 (only after approval).
- The `notify_clients()` function is defined but no trigger that attaches it to `clients` appears in any migration. Whether a trigger exists live is not verified.
- Many tables used by the code are not in any migration and not in the live database: `stock_items`, `leave_balances`, `missions`, `time_entries`, `role_permissions`, `user_roles`, `outils_manuel`, `echeances_client`, `bouclage_dossier_status`, `periodic_task_statuses`, `repartition_*`, `lettres_mission*`, `intervenants`, `doc_interne`, `doc_technique`, `archivage`, `competences_evaluations`, `collaborateurs_cabinet`, `acceptation_mission`, `lab_questionnaire`, `questionnaire_ecoute_reponses`, `documents_client`, `objectifs_cabinet`, `actions_cabinet`, `controles_essentiels_status`, `echeances_sociales`, `expenses`, `client_documents`, `client_taxes`. Calls to these will fail at runtime unless they exist elsewhere. Not verified.

## 3. Access control in the database

Problems (verified from migrations and live policy counts):

1. Open CRUD policies. Most tables use `TO anon, authenticated USING (true) WITH CHECK (true)`. Anyone holding the public anon key (which is shipped in the browser bundle) can read, edit and delete clients, invoices, leave requests, fixed assets, review notes, audit logs and working papers.
2. Privilege escalation on profiles. Policy `authenticated_update_own_profile` checks only the row owner, not the columns. A user can update their own `role` column to any value, including admin, if the app ever reads roles from `profiles`.
3. Notifications insert is `WITH CHECK (true)` for any authenticated user, so any signed-in user can create notifications for other users.
4. `profiles` default role is `auditor`, so new accounts inherit a privileged-looking role unless the app overrides it.
5. Authorization in the app (`src/lib/permissions.ts`, `WriteBlocker`, `supabase.ts` Proxy) is client-side only and can be bypassed with the anon key.

## 4. Relationships and constraints

- `invoices.client_id` -> `clients.id` (ON DELETE SET NULL). `invoices.created_by` -> `auth.users.id`.
- `invoice_lines.invoice_id` -> `invoices.id` (ON DELETE CASCADE).
- `invoices.total_*` columns are stored; totals are also recomputed in several React components (see BUSINESS_LOGIC_AUDIT.md).
- Other tables (engagements, weekly_missions, review_notes, working_papers, leave_requests) hold `client_id`, `engagement_id`, `responsible_id`, `assigned_to_id`, `employee_id` as plain uuids with no foreign keys. Referential integrity is not enforced.
- `invoices.status` allows `draft, sent, paid, cancelled, pending`. Code reads statuses in French in some screens. Not verified against all code paths.

## 5. Data type and naming issues

- Mixed languages and domains in one schema (hotel terms in 001, audit terms in 002).
- `fixed_assets.depreciation_method` defaults to `'Linéaire'` (French), while the Edge Function compares `=== 'Linéaire'` and the TypeScript type uses `linear`. Values must be unified.
- `fixed_assets.status` allows `active, disposed, maintenance`; the UI uses other labels (for example `Active`, `Draft`). Not verified in full.
- Amounts: `invoices` uses `numeric(14,2)`; `fixed_assets` uses unbounded `numeric`. Acceptable, but MySQL needs explicit `DECIMAL(p,s)` choices.
- `inventory_items.sku` is unique; `engagements.code` is not.
- Timestamps are `timestamptz` (Postgres); MySQL uses `DATETIME(3)` or `TIMESTAMP`, with timezone handled in the app.
- `users` view has a `role` column that is always empty string. Any legacy function comparing it to `'admin'` never matches.

## 6. Indexes

Created in migrations for status, category, severity, created_at and client_id on several tables. Missing indexes likely needed for `invoices(client_id)`, `leave_requests(employee_id, start_date)`, `notifications(user_id, read)`, `working_papers(engagement_id)`. Not verified against real query plans.

## 7. Unverifiable items

- Live trigger list, live function list and full live column definitions beyond the migrations (only table-level metadata was checked here).
- Storage bucket policies for `documents`, `working-documents`, `working-papers`, `cabinet-resources`, `leave_documents`.
- Realtime publication settings for `notifications`.
- Contents of `calculer_mission_cac` and any other database functions.
- Whether the seed or demo data lives in the live database (the live `clients` table reported 0 rows).
- Edge Function `generate-depreciation` deployment state and secrets.
