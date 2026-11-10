# PAJES - Frontend Dependencies (Phase 1)

Source: `package.json` (as provided). Versions are the declared ranges, not necessarily the installed ones (`package-lock.json` was not inspected in full).

## 1. Runtime dependencies

| Package | Range | Used for | Migration concern |
|---|---|---|---|
| react, react-dom | ^18.3.1 | UI | Keep. Next.js App Router requires React 18.3+ (compatible) |
| react-router-dom | ^7.18.0 | Client routing | Replace with Next.js file-based routing. Pages must be wrapped as client components |
| @supabase/supabase-js, @supabase/auth-js | ^2.110.1 | All database, auth, storage, RPC, realtime calls | Remove. Replace with fetch to Route Handlers (see PROPOSED_ARCHITECTURE.md) |
| @tanstack/react-query | ^5.101.2 | Installed, minimally used | Keep and make it the primary client cache for Route Handler calls |
| styled-components | ^6.4.2 | Heavy use in manuel, caisse, collaborateurs | Works in Next.js with a registry for SSR. Consider later migration to Tailwind, but not required |
| tailwindcss (dev) | ^3.4.1 | Utility styling + CSS variable theme | Keep |
| i18next, react-i18next, i18next-browser-languagedetector | ^26.3.6 / ^17.0.11 / ^8.2.1 | fr/en translation | Keep. Needs client-only initialization under App Router |
| recharts | ^3.10.0 | Dashboard charts | Keep, client components only |
| lucide-react | ^0.344.0 | Icons | Keep |
| date-fns | ^4.4.0 | Date formatting, leave accrual helpers | Keep, but move calculation logic server-side |
| exceljs, xlsx | ^4.4.0 / ^0.18.5 | Excel import/export | Two libraries doing overlapping work. Consolidate on one in Phase 2 |
| file-saver | ^2.0.5 | Download files | Keep. Types in `@types/file-saver` |
| jspdf, html2pdf.js, html2canvas | ^4.2.1 / ^0.14.0 / ^1.4.1 | PDF generation from DOM (invoices, caisse) | Replace with server-side PDF generation for invoices (consistent, auditable). Client PDF can remain for previews |
| @react-pdf/renderer | ^4.5.1 | Declared, usage not confirmed in the reviewed files | Verify before Phase 2. Possibly duplicate of jsPDF |
| mammoth | ^1.12.0 | DOCX to HTML for manuel tools | Keep, but run on server if files become sensitive |

Observation: three PDF libraries (jspdf, html2pdf.js, @react-pdf/renderer) and two spreadsheet libraries are declared. This increases bundle size and produces inconsistent output.

## 2. Development dependencies

| Package | Range | Notes |
|---|---|---|
| vite | ^5.4.2 | Replaced by Next.js bundler. Vite config must be removed in Phase 2 |
| @vitejs/plugin-react | ^4.3.1 | Not needed under Next.js |
| typescript | ^5.5.3 | Keep |
| typescript-eslint, eslint, eslint-plugin-react-hooks, eslint-plugin-react-refresh, @eslint/js, globals | various | Keep. Re-configure for Next.js (`eslint-config-next`) |
| @types/react, @types/react-dom, @types/styled-components, @types/file-saver | various | Keep |
| autoprefixer, postcss | ^10.4.18 / ^8.4.35 | Keep |

## 3. Missing from package.json but required by the current code (verify)

Not declared directly, but the code may depend on them transitively. Cannot be confirmed without reading every import. Phase 2 must run an import scan.

## 4. Build and typecheck state

- `npm run typecheck` (`tsc --noEmit -p tsconfig.app.json`) is known to fail. `typecheck-result.txt` records about 60 errors, including: `updated_at` missing on the `Finding` type, undefined `addNotification` in FindingsPage, unused identifiers across many files, `file-saver` typing resolution, html2pdf option typing, and FixedAssetsPage comparing `AssetStatus` against values not in the type.
- `npm run build` was not executed in this phase (Phase 1 does not run builds or install packages).
- `npm run lint` results were not provided. Not verified.

## 5. External services and assets

- Supabase project (database, auth, storage, realtime, edge functions). Environment variables used: `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the browser; `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_DB_URL` in the Edge Function environment. The service role key must never reach the browser.
- Google Fonts or other CDNs were not verified (check `index.html`).
- `index.html` references an OpenGraph image hosted on bolt.new (external). Not controlled by the project.
- Static logos are served from `public/logos` and `public/icons`.

## 6. Unverifiable items

- Installed versions in `package-lock.json` (not diffed).
- Whether `@react-pdf/renderer` and `xlsx` are actually imported (grep not run in this phase).
- Bundle size and runtime performance (no build executed).
