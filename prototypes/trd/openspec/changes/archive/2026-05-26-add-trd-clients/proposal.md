> Jira REQ: — (no ticket; first TRD migration capability, scoped from `MIGRATION-NOTES.md §13` priority 1)
> Module: TRD

# Add Clientes module to core-trd (Catálogos block)

## Why

TRD's first domain capability is **Clientes**: the master list of Ardua's clients that the Mesa operates against. Two pieces of context drive this scope:

1. **The legacy `/clients` page in `core-trd-frontend` ships only a paginated list** — name, ardua_docket, active flag. The "deep detail" (limits, balances) lives buried inside the Quote-creation form (`ClientLimitsDisplay.tsx`), never on a dedicated Clientes surface. The operator who wants to consult a client's capacity outside of a quote flow has no path today.
2. **`MIGRATION-NOTES.md §13` proposes v1 = list + detail with limits + balances** — surfacing data the backend already exposes (`GET /client/{id}/limits`, `GET /client/{id}/balances`) on a proper Type-B detail page. This is the kind of product-driven refinement the user flagged ("las aplicaciones actuales fueron desarrolladas sin tener en cuenta la visión de producto"): same endpoints, better information architecture.

Clientes is also the **best first capability** of the TRD migration because:

- It is conceptually self-contained (no cross-capability composition in v1).
- It is the canonical Type-A master + Type-B detail shape (closest worked example: `add-ops-clients`, archived 2026-05-08).
- It establishes the patterns every subsequent `add-trd-*` change will inherit: `src/api/modules/clients.ts`, MSW seed + handler, `vue-query` queries with stable keys, page composition with `useTable` + `<TablePagination>`, sidebar-block + route registration.
- It writes nothing irreversible: no mutations, no destructive actions, no step-up MFA. Pure read.

## What Changes

Creates a new `trd-clients` capability spec and ships the Clientes module on top of it.

- **Sidebar (`src/components/layout/Sidebar.vue`):** add a new block `Catálogos` (mirrors OPS) with the first entry `Clientes`. Future TRD maestros (currencies, providers metadata, etc.) join the same block.
- **Routes (`src/router/routes.ts` + `src/config/routes.ts`):** register `/clients` (master) and `/clients/:id` (detail). Both auth-gated, both with `meta.layout = 'shell'`, `meta.block = 'Catálogos'`.
- **Pages:** add `src/pages/Clients.vue` (Type-A master list) and `src/pages/ClientDetail.vue` (Type-B detail). Per OPS Decision D1 (master+detail as separate pages, not master+detail modal) — density and URL-canonical access matter.
- **List composition:** L1 page header (title `Clientes`, no CTA in v1), L3 single search input (autocomplete-style, debounced 300ms, URL-synced), `<DataTable>` with columns `Nombre · Legajo Ardua · Estado`, `<TablePagination>` footer with page-size selector (10/25/50/100 — canonical OPS set, not the legacy 10/20/50/100).
- **Detail composition:** L1 header (back nav, title = client name, status pill `Activo`/`Inactivo`), then three sections — `Información` card (id, name, ardua_docket, circuit_docket), `Límites` (per-currency / per-entity from `/client/:id/limits`), `Balances` (per-currency from `/client/:id/balances`). Read-only end-to-end.
- **Search:** single input matches `Nombre` OR `Legajo Ardua` server-side (`GET /clients?q=...`). Legacy quirk of two parallel queries + client-side dedup is NOT preserved. See `design.md` Decision T2.
- **API:** new module `src/api/modules/clients.ts` with `listClients`, `getClient(id)`, `getClientLimits(id)`, `getClientBalances(id)`. New endpoints registered in `src/api/endpoints.ts` under `ENDPOINTS.clients.*`. `GET /clients/:id` is **new vs the legacy backend** — see `design.md` Decision T3 for the contract impact.
- **MSW:** new seed `src/mocks/seed/clients.ts` (≥30 fixtures covering active/inactive, with limits/balances), new handler `src/mocks/handlers/clients.ts` wired into `src/mocks/handlers/index.ts`.
- **Composables:** `useClientsList(filters)` (vue-query for the paginated list), `useClient(id)` (vue-query for single client), `useClientLimits(id)`, `useClientBalances(id)`. Page-size persistence reuses the existing `usePersistedPageSize` composable from the template; no new composable needed.
- **Types:** new `src/types/client.ts` with `Client`, `ClientLimit`, `ClientBalance`, validated at the API boundary with zod schemas.
- **Tests:** ≥90 % on `src/api/modules/clients.ts` + the page-component happy path for Clients.vue and ClientDetail.vue. Add component tests for the empty state, the loading skeleton, and the URL-sync of search + page.

## Capabilities

### Affected Capabilities

None modified.

### New Capabilities

- `trd-clients` — the contract for the Clientes module (master list, detail page, search, pagination, error states, RBAC).

## Out of scope

The following are deferred to **named follow-up changes**, NOT to "later" or "v2":

- `extend-trd-clients-edit` — edit client fields, deactivate, reactivate.
- `extend-trd-clients-portal` — invite to portal / portal-status display (if applicable to TRD; verify with PM).
- `extend-trd-clients-quote-link` — cross-capability link from `ClientDetail` to the client's open quotes (depends on `add-trd-quotes`).
- `extend-trd-clients-actions-manifest` — when the first action lands (edit / deactivate / portal-invite), register a `trd.clients` actions manifest. v1 ships with NO manifest because there are no domain actions to declare.
- `extend-trd-clients-csv-export` — list export (mirrors the legacy `QuotesCsvSheet` / `LiquidityCsvSheet` pattern but for clients).

Also out of scope: cross-capability behavior with Quotes / Proveedores / Bots — Clientes is consumed but does not yet expose surfaces for them in v1.

## Verification

- `npm run lint && npm run type-check && npm run test:run && npm run spec:check && npm run build:qa` — all green.
- Manual smoke (per the `verify` skill): list loads with MSW seed, search filters live, page navigation works, row click goes to `/clients/:id`, detail page renders three sections with limits + balances, browser back returns to the same page + filters, page-size selection persists across reloads.
