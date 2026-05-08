> Jira REQ: — (no ticket; capability scoping for the Lex migration from `core-lex-frontend` legacy)
> Module: LEX

# Add lex-clientes — unified /clientes operative dashboard with status segmenter

## Why

The legacy `core-lex-frontend` ships **two separate pages** for what is conceptually **one record at different states**: `/altas` lists Clientes whose `status='PENDING_REVIEW'` (triage queue for Legal & Compliance) and `/clientes` lists those whose `status in {APPROVED, DEACTIVATED}` (operative dashboard). Both reimplement the same primitives — same column set, same debounced filter watchers, same assignment popover, same row click navigation — and any fix has to be applied twice. The split made sense in the legacy as a pragmatic v1; in the migration it is the perfect opportunity to recognise that **`Cliente` is a single entity with a status lifecycle, not two domain objects in two pages**.

This spec unifies both surfaces into a single `/clientes` page with an L1 `<Segmenter>` for `Pendientes` (was `/altas`) / `Activos` (the day-to-day Compliance dashboard) / `Inactivos` (the deprecated dataset). The legacy `/altas` URL becomes a redirect to `/clientes?segment=pendientes`. Every column, filter, action, and feedback contract that previously existed in `/altas` (Crear Empresa CTA + modal, similarity warnings, per-row Asignar popover, destructive Eliminar) lives here as a behaviour gated by the active segment and the user's role per `lex-roles`. The Cuentas / CVUs sub-tab on `/clientes` keeps its own capability — `lex-cuentas-cvu`.

The unification removes the duplicated `lex-altas` capability entirely; readers looking for "Altas" find it as a Requirement here, not as a separate page.

## What Changes

- Create the `lex-clientes` capability. New spec at `openspec/specs/lex-clientes/spec.md` (materialised via archive) with the Requirements unified from the legacy `/clientes` and `/altas` surfaces. Concretely covers: (a) primary L1 `<Segmenter>` Pendientes / Activos / Inactivos that drives the server-side `status` filter; (b) canonical column set (Estado column omitted because the segment already disambiguates); (c) text filters debounced 300 ms + select filters applying immediately, state surviving Back navigation; (d) server-side pagination via `@tanstack/vue-query` with canonical page sizes and `localStorage` persistence; (e) self-assigned amber highlight; (f) row click navigates to `/clientes/:id` (no `sessionStorage` origin marker — back-button always returns to `/clientes`); (g) Crear Empresa CTA with vee-validate + zod, debounced similarity-warnings preview, "Crear de todos modos" label switch on warnings; (h) per-row Asignar via `SelectUserPopover` with optimistic update + rollback on failure; (i) destructive Eliminar dialog gated by role; (j) Skeleton + EmptyState + 5xx retry toast; (k) legacy `/altas` redirects to `/clientes?segment=pendientes`.
- Define the typed surface. `src/pages/Clientes.vue`, `src/lex/clientes/api.ts` (`GET /client` with `status` derived from segment), `src/lex/clientes/ClientesTable.vue`, `src/lex/clientes/SelectUserPopover.vue`, `src/lex/clientes/CreateBusinessModal.vue`, `src/lex/clientes/types.ts` (`Cliente`, `ClienteRow`, `ClientesListParams`, `ClienteSegment`).
- Integrate with sibling capabilities — referenced, not edited:
  - `core-layout` — L1 `<Segmenter>` placement in the page header per the canonical pattern.
  - `core-data-tables` — table primitive, monospace ID column, no-Acciones-when-empty, ellipsis pagination, debounced filters.
  - `core-modals` — Create modal pair for `CreateBusinessModal`, destructive confirmation for Eliminar.
  - `core-actions-menu` — actions column stops click propagation; row click navigates only outside Acciones cell.
  - `core-forms` — vee-validate + zod for the Crear Empresa form (company_name, tax_number, activity, company_type), shadcn-vue Select for filters.
  - `core-error-handling` — Skeleton, EmptyState, 5xx retry toast, 403 handling.
  - `core-api-layer` — shared axios with `setAccessTokenGetter`; the legacy custom-header pattern is forbidden.
  - `core-navigation` — `/altas` redirect to `/clientes?segment=pendientes`.
  - `lex-roles` — Acciones column + per-row affordances + Crear Empresa CTA gated by the role matrix; segment-specific gating (Crear Empresa hidden for `VIEWER_LEX`; Eliminar `ADMIN_LEX` only).
  - `lex-templates` — Plantilla cells + filter sourced from the canonical registry.
  - `lex-cuentas-cvu` — second sub-tab inside `/clientes`, owns its own surface.
  - `lex-cliente-detalle` — destination of row click; the smart-back-button pattern is removed in favour of always returning to `/clientes` with the originating segment.

## Capabilities

### Affected Capabilities

None modified by this change.

### New Capabilities

- `lex-clientes` (Lex page; unified operative dashboard) — 8 requirements, 22 scenarios.

### Non-capability artifacts

- `src/pages/Clientes.vue` — page composition with the L1 segmenter and the sub-tab segmenter (Clientes / Cuentas).
- `src/lex/clientes/ClientesTable.vue`, `src/lex/clientes/types.ts`, `src/lex/clientes/api.ts`.
- `src/lex/clientes/SelectUserPopover.vue` — assignment popover.
- `src/lex/clientes/CreateBusinessModal.vue` — Crear Empresa flow with vee-validate + zod and similarity warnings.

### Removed from scope

- `lex-altas` capability — its behaviours are absorbed here as Requirements gated by the `Pendientes` segment. The legacy `/altas` URL is preserved as a redirect, not as a route.
