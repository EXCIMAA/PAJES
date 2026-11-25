# Project memory

## Product intent & audience

- PAJES is a premium enterprise management platform / ERP for accounting and cabinet (firm) management.
- French-language UI (module names: Clients, Missions, Stock, Caisse, Factures, Congés, Notes de frais, Immobilisations, Collaborateurs, Fournisseurs, Ressources internes, Findings, Review Notes, Suivi CAC, Besoins Cabinet).
- Audience: internal firm users with role-based access; super_admin has full access to all modules and actions.

## Brand personality & voice

- Professional, premium, production-grade enterprise tone.
- French labels throughout; business terminology preserved (accounting, audit, cabinet).

## Visual design & UX direction

- Navy-blue sidebar workspace; clean white/light content surfaces; blue and indigo accents.
- Rounded cards, subtle shadows, softer surfaces, consistent spacing and visual hierarchy.
- Smooth transitions, interactive hover states.
- Responsive across desktop, tablet, mobile; dark mode preserved where already implemented.
- Shared app shell routes all modules — redesigning it improves the whole product.
- Target UX patterns: global + per-module search, advanced filters/sorting, grid/list toggles, interactive dashboard cards/charts, pagination, dropdown/context menus, confirmation dialogs for destructive actions, loading skeletons, empty states, toasts, detail panels/preview modals, keyboard-friendly navigation.

## Decisions, constraints & rationale

- Stack: React + TypeScript (vite-react) frontend, FastAPI backend, PostgreSQL database.
- All DB operations go through FastAPI; no direct Supabase DB or storage calls; no mock data or hardcoded stats.
- Redesign is incremental, not a rebuild: preserve existing functionality, accounting formulas, business rules, API integrations, RBAC, and DB schema (no table renames).
- Approach: establish a reusable design system first, then migrate each page consistently.
- Build and type-check both pass after the shell + dashboard redesign.
- Tech constraints from `.bolt/prompt` apply (Tailwind, lucide-react icons, `@/` path alias).

## Open questions & assumptions

- Remaining modules beyond Dashboard still need migration to the new design system; current turn covered shared shell + Dashboard first.
- Exact KPI set and chart libraries (if any) for dashboard visuals not confirmed — any charting must avoid adding packages unless necessary.
- Backend API surface and endpoint contracts assumed stable and existing; not modified during UI redesign.