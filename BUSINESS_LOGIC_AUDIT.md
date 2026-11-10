# PAJES - Business Logic Audit (Phase 1)

Method: review of pages and helpers named in the snapshot. Where a full source was not reviewed line by line, this is stated.

## 1. Authentication and onboarding

- Sign-up creates a `profiles` row with no role, so the account is pending approval (`PendingApprovalPage`). Approval is implied but the approval flow itself was not verified.
- Sign-in via email and password. Password reset via email (`ResetPasswordPage`). Profile role is loaded from `profiles` and copied to localStorage for UI decisions. A tampered localStorage value does not grant data access because RLS is open anyway, but it also does not protect anything (see section 5).

Risk: role decisions are made in the browser. Database policies allow any anon user to modify any row.

## 2. Permissions model

- `src/lib/permissions.ts` (about 920 lines) defines 24 modules (16 base, 8 collaborator sub-modules), 4 actions (create, view, edit, delete), and 17 job titles (postes).
- A static PERMISSION_MATRIX is merged with runtime rows from `role_permissions`. Super admin bypasses checks. Demo mode is forced view-only.
- `buildAccessFilter` adds owner and assignee filters as PostgREST `or()` clauses. These filters are cosmetic, since anon can query the table without them.

## 3. Calculations

### 3.1 Invoices (highest risk)
- Totals (HT, TVA, TTC, retenues, debours, total general, acompte) are computed in several places: `invoiceUtils.ts`, `InvoiceTemplate.tsx`, `InvoicePDF.tsx`, `InvoiceDetailPage.tsx` and `InvoiceFormPage.tsx`. HT definitions differ between them. Not verified line by line.
- TVA rate is fixed at 0.1925 (`TVA_RATE` in `constants.ts`). Withholding rates come from `RETENUES_RATES`.
- Invoice number format: `EXCIMAA/FACmm/INIT/0000000`. Reference `ref_pf`: `INITddmmyyyy-NNN`. Numbering is generated in the browser; duplicate numbers under concurrent creation are possible (no unique constraint on `invoice_number`).
- Bank details (IBAN, RCCM, NUI) and company identity are hard-coded in `constants.ts`.
- Archive is a soft delete via `archived` boolean. Cancellation is a status value.

Required change: compute totals and numbers on the server, store them once, and enforce uniqueness in the database.

### 3.2 Fixed assets and SYSCOHADA depreciation
- Linear depreciation: annual depreciation = purchase value / useful life. Net book value is computed in the dashboard (`DashboardPage.tsx`) as annual depreciation times age, using status `'Active'`. The status value does not match the database (`active`), so these figures are likely wrong. Verify.
- The Edge Function `generate-depreciation` builds a yearly schedule, but compares `depreciation_method === 'Linéaire'`, while the TypeScript type uses `linear`. Results may be wrong for records saved under the other value.
- `useDepreciation.ts` and `depreciationApi.ts` call the Edge Function. Only the Edge Function version should exist.
- Depreciation rounding rules, prorata for the first year, and disposal treatment were not verified.

### 3.3 Leave (congés)
- Accrual: 2 leave days per month worked, with Sundays excluded (`LeavePage.tsx`, `monthsBetween`). Balance persisted to `leave_balances`, which is not in any migration.
- Approval chain: manager then HR (`manager_approval`, `hr_approval` booleans). Status values: draft, submitted, approved, rejected, cancelled.
- Risk: accrual is computed on the client and written back, so a user can change the balance.

### 3.4 Caisse (petty cash)
- Running balance computed in the browser. Entry types `DEPENSE` and `APPROVISIONNEMENT`.
- PDF export via html2canvas and jsPDF.
- Risk: no server-side ledger; balance can be changed by editing rows.

### 3.5 CAC missions and fees
- `calculer_mission_cac` RPC returns the fee calculation. Its SQL is not in the migrations (unverifiable).
- `CalculHonoraires.tsx` uses hard-coded hourly grade rates (45000, 35000, 20000, 15000 XAF/h) and percentages (10, 40, 30, 20). Figures shown on screen may differ from what the RPC stores.
- `lib/cac/calculs.ts` duplicates parts of the same calculation.

### 3.6 CAC follow-up
- `CACFollowUpPage` reads clients where `country = 'CMR'` and auto-inserts assignment rows per mission type. Writes happen from the browser without a transaction, so partial writes are possible.

## 4. Workflows

- Client creation triggers a notification to the first admin (or first auth user) via `notify_clients`. Trigger attachment unverified.
- Findings and review notes move through open, in progress, resolved, closed.
- Engagements move through draft, planning, in progress, review, completed, closed, with a progress integer.
- Weekly missions: open, closed, postponed.
- Working papers: draft and final, with a version integer. No locking exists.
- Expense claims (notes de frais): workflow in `pages/noteDeFrais/*`, not reviewed in detail. Unverified.

## 5. Validation

- Most validation is in React forms. No server-side validation exists. A direct API call can write any value that fits the column type. Examples: negative amounts, status values not in the UI, duplicate invoice numbers.
- Database check constraints exist for enum-like status columns in migrations 001 to 003, but not for all tables (for example `clients.status` is free text).

## 6. Dashboard calculations

- Dashboard KPIs (VNC, counts, top clients) are computed in the browser from several reads. Results are not guaranteed to match reports.
- Console debug logs remain in the dashboard code.

## 7. Reports

- `ReportsPage` queries `information_schema.tables` through PostgREST, which is normally not exposed. Fallback behavior exists. Whether it works is unverified.
- Some table names in the reports configuration (`expenses`, `client_documents`, `client_taxes`) do not exist in the database.

## 8. Items that cannot be verified from this audit

- SQL for `calculer_mission_cac` and any other database functions.
- Full source of `PlanningClient.tsx`, `ClientsPage.tsx` and `FixedAssetsPage.tsx` (sampled only).
- Actual invoice numbers in production (to test duplicates).
- Whether the leave accrual and depreciation outputs match the business rules. Requires confirmation from the firm (accountant) before any migration.
- The SYSCOHADA rules to apply (prorata, first-year treatment, disposal gains) must be confirmed by the business owner.
