# PAJES - Module Migration Roadmap (proposal for approval)

Each step is a separate deliverable. Phase 2 starts only after the owner approves this plan. No step begins before the previous one passes its tests.

## Step 0 - Foundations (prerequisite for everything)
- Scope: Next.js App Router shell, Prisma + MySQL schema for auth and roles, session handling, permission helper, API error shape, CI (typecheck, lint, build, tests).
- Dependencies: decisions 1 to 6 in PROPOSED_ARCHITECTURE.md.
- Risks: wrong session design; deviation from existing auth behavior.
- Testing: login, logout, password reset, role denial on every protected route (automated tests), build passes.

## Step 1 - Authentication and users
- Scope: profiles to users, approval flow, role assignment by admin only.
- Dependencies: Step 0.
- Risks: loss of existing accounts. Mitigation: export Supabase Auth users with hashed passwords only if the hashing format is compatible; otherwise force password reset.
- Testing: sign-up is pending; a user cannot change own role; admin can approve; reset works.

## Step 2 - Clients and engagements
- Scope: clients, engagements, weekly missions, dashboard counts.
- Dependencies: Step 1.
- Risks: duplicate or missing references to clients; country filter (CMR) logic.
- Testing: CRUD with permission matrix; data import row counts match Supabase export.

## Step 3 - Invoices (highest business risk)
- Scope: invoices, invoice lines, totals, numbering, PDF generation, archive.
- Dependencies: Step 2 (client references), a single agreed definition of HT, TVA and retenues.
- Risks: wrong totals, duplicate numbers, drift between preview and stored values.
- Testing: unit tests for totals with fixed fixtures; concurrency test for numbering; PDF snapshot test; comparison against current invoices for 20 sample records.

## Step 4 - Fixed assets and depreciation
- Scope: fixed assets, depreciation schedule (one implementation), dashboard VNC.
- Dependencies: Step 2; business confirmation of SYSCOHADA rules.
- Risks: incorrect depreciation method values; status labels mismatch.
- Testing: schedule tests against accountant-provided examples for linear method, first-year prorata and disposal.

## Step 5 - CAC missions and fee calculation
- Scope: mission form, list, detail, fee calculation (replacing RPC), follow-up tasks.
- Dependencies: Step 2; SQL of `calculer_mission_cac` must be obtained (not in repository).
- Risks: fee mismatch between UI and stored RPC logic; partial writes on auto-created tasks.
- Testing: golden tests comparing new fee calculation to the old RPC output; transaction test for task creation.

## Step 6 - Caisse and stock
- Scope: petty cash ledger with server balance, stock items (confirm table: inventory_items vs stock_items).
- Dependencies: Step 1.
- Risks: balance drift; stock table confusion.
- Testing: balance equals sum of entries; PDF export.

## Step 7 - Leave (congés)
- Scope: leave requests, approval chain, accrual, balances.
- Dependencies: Step 1.
- Risks: accrual rules (2 days per month, Sundays excluded) need confirmation; balance editable today.
- Testing: accrual tests for join dates mid-month, year boundary and reversal on rejection.

## Step 8 - Expense claims (notes de frais)
- Scope: forms, approval, reporting.
- Dependencies: Step 1, file storage.
- Risks: not reviewed in detail in Phase 1.
- Testing: to be defined after review.

## Step 9 - Findings, review notes, working papers and documents
- Scope: findings, review notes, working papers with versioning, file storage with authorized download.
- Dependencies: Step 2, Step 0 storage design.
- Risks: file access control; version conflicts.
- Testing: unauthorized user cannot download another engagement's file; version increment test.

## Step 10 - Manuel (about 28 tools)
- Scope: manuel pages and their tables (about 25 tables, most not in migrations).
- Dependencies: Steps 1 to 9 for shared entities.
- Risks: largest surface; several tables missing from the database; `.single()` error handling inconsistent.
- Testing: per-tool smoke test; decide tool-by-tool whether to keep, merge or remove.

## Step 11 - Reports, dashboards, notifications
- Scope: fixed report list, dashboard KPIs computed on server, notifications via polling.
- Dependencies: all previous modules.
- Risks: KPI mismatch with reports; removal of information_schema approach.
- Testing: KPI totals equal to module totals in test data.

## Step 12 - Data cutover and decommission
- Scope: final data export and import, parallel run, switch DNS, disable Supabase project access, remove Supabase code.
- Dependencies: all steps.
- Risks: data loss or drift during cutover.
- Testing: reconciliation of row counts and totals per table; rollback plan rehearsed.

## Cross-cutting items for every step
- Remove any direct browser database access for that module.
- Add server-side authorization tests (allowed and denied cases).
- Fix typecheck errors in files touched by the step.
- Keep Supabase read-only until cutover.

## Items that must be confirmed before Phase 2
- Whether migration 001 hotel tables are used at all.
- Source of `calculer_mission_cac` and other RPC functions.
- Live existence of the missing tables listed in DATABASE_AUDIT.md.
- Business rules for depreciation, leave accrual and invoice totals.
