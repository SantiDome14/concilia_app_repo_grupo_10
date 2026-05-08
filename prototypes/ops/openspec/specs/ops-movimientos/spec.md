# ops-movimientos Specification

## Purpose
TBD - created by archiving change refactor-ops-dashboard-into-movimientos-cotizaciones. Update Purpose after archive.
## Requirements
### Requirement: The /movimientos page MUST be a Type-A master list registered at `/movimientos`

The page SHALL be implemented at `src/pages/Movimientos.vue` and registered at `/movimientos` with `meta.requiresAuth = true`, `meta.layout = 'shell'`, `meta.breadcrumb = 'Movimientos'`, and `meta.block = 'Operaciones'`. The composition SHALL follow the Type-A pattern from `core-module-types`: page header (title), filter row, paginated table, footer with pagination ellipsis. The legacy `/dashboard` URL SHALL redirect to `/movimientos` (preserves the most-used legacy entry point — operators going to "the dashboard" expect to land on activity). The legacy `/financial-dashboard` URL also redirects to `/movimientos` (covers any bookmarks set during the period between `add-ops-financial-dashboard` shipping and this refactor).

#### Scenario: Authenticated navigation to /movimientos renders the Type-A page

- **GIVEN** an authenticated `OPS_ADMIN` user
- **WHEN** the user navigates to `/movimientos`
- **THEN** the page renders with the AppShell, the page header shows the title `Movimientos`, the sponsor filter cards row + filter row + paginated movements table render below

#### Scenario: Legacy /dashboard URL redirects to /movimientos preserving filter query params

- **GIVEN** an authenticated user navigates to `/dashboard?type=DEPOSIT&status=PENDING`
- **WHEN** the router processes the redirect
- **THEN** the user lands on `/movimientos?type=DEPOSIT&status=PENDING` with the filters applied

#### Scenario: Legacy /financial-dashboard URL also redirects to /movimientos

- **GIVEN** an authenticated user navigates to `/financial-dashboard?tab=activity&sponsor=COINAG`
- **WHEN** the router processes the redirect
- **THEN** the user lands on `/movimientos?sponsor=COINAG` (the `tab=activity` query param is dropped — there is no longer a tab concept; the sponsor filter is preserved)

### Requirement: The Movimientos page MUST render a paginated movements ledger with sponsor filter cards + filter row + search

The page SHALL render: a row of per-sponsor filter cards above the filter row (one card per active banco sponsor showing the count of movements for that sponsor in the current view, click-to-filter, reusing the visual + behaviour from `ops-psp`'s sponsor cards); a filter row (`Búsqueda` text input debounced 300 ms; `Tipo`, `Estado`, `Origen` selects applied immediately); the paginated ledger table with columns `Fecha · Tipo · Origen · Destino · Moneda · Monto · Estado · Sponsor · Cliente`; pagination footer with the canonical page-size options. Filter state SHALL be reflected in the URL (`?sponsor=...&type=...&status=...&origin=...&search=...&page=...`).

#### Scenario: Sponsor filter cards render with the active sponsors and counts

- **GIVEN** the page mounts with 50 movements loaded across 1 sponsor (Coinag)
- **WHEN** the page renders
- **THEN** one card renders with the sponsor label `COINAG` and the movement count `50`; clicking the card applies the sponsor filter (URL gains `&sponsor=COINAG`), the COINAG card shows the active style, and the ledger re-fetches

#### Scenario: Manual filter combination persists in the URL

- **GIVEN** the operator sets `Tipo = DEPOSIT`, `Estado = COMPLETED`, and types `acme` into the search
- **WHEN** the search debounces (300 ms)
- **THEN** the URL becomes `/movimientos?type=DEPOSIT&status=COMPLETED&search=acme`; the table fetches with all three filters; back-navigation away and back restores the URL exactly

#### Scenario: Movements page does NOT cross-sync its sponsor filter with ops-psp

- **GIVEN** the operator applied `?sponsor=COINAG` on `/psp` (PSP's own per-tab sponsor filter)
- **WHEN** the operator navigates to `/movimientos`
- **THEN** the Movimientos page opens WITHOUT the sponsor filter applied (the surfaces have independent filter state)

### Requirement: Row click on a movement MUST open `<MovementDetailsModal>` with a Descargar comprobante action

Clicking a row in the movements table SHALL open `<MovementDetailsModal>` (centred dialog) showing the movement record. The modal body renders the canonical fields (id · Fecha · Tipo · Estado · Monto + Moneda · Origen · Destino · Sponsor · Cliente · Counterparty · Created at · Updated at) plus any `metadata` keys the backend exposes. The modal SHALL render an action button `Descargar comprobante` that calls `GET /receipt/:id`; on `{ success: true, url }` the modal calls `window.open(url, '_blank')`; on failure surfaces a destructive toast and the modal stays open. The URL SHALL gain `?movement=:id` while the modal is open; closing strips the param. Auto-mount on page load when `?movement=:id` is present (deep-link).

#### Scenario: Row click opens the modal and gains the URL param

- **GIVEN** the page renders with 10 movements loaded
- **WHEN** the operator clicks the row for `mov-7`
- **THEN** `<MovementDetailsModal>` mounts showing the `mov-7` record; the URL gains `?movement=mov-7`; the table behind the modal stays mounted

#### Scenario: Descargar comprobante opens the receipt URL in a new tab

- **GIVEN** the modal is open for `mov-7`
- **WHEN** the operator clicks `Descargar comprobante` and `GET /receipt/mov-7` returns `{ success: true, url: 'https://files/r.pdf' }`
- **THEN** `window.open` is called with `('https://files/r.pdf', '_blank')`; no toast appears on success; the modal stays open

#### Scenario: Deep-link with ?movement=:id auto-mounts the modal

- **GIVEN** an authenticated user navigates to `/movimientos?movement=mov-7`
- **WHEN** the page renders
- **THEN** the page renders the movements list AND `<MovementDetailsModal>` mounts automatically with `mov-7` content; the user did not have to click the row

### Requirement: The MovementDetailsModal MUST live in `src/ops/movimientos/` as the canonical home; ops-psp's deferred row-click integration imports from here

`<MovementDetailsModal>` SHALL be implemented in `src/ops/movimientos/MovementDetailsModal.vue`. When `extend-ops-psp-movement-details-modal` (deferred at the time of this spec) lands, that change SHALL import the modal from this path; `ops-psp` SHALL NOT duplicate the modal under `src/ops/psp/`. The modal accepts a `movement: Movement` prop and emits `update:open` when dismissed. It does NOT depend on any `ops-movimientos`-only data: a consumer in `ops-psp` (or any future capability) can mount it with any `Movement` record.

#### Scenario: The modal lives in `src/ops/movimientos/`

- **GIVEN** the implementation of this change
- **WHEN** the file `src/ops/movimientos/MovementDetailsModal.vue` exists
- **THEN** the file is the canonical home for the modal; cross-capability consumers import from `@/ops/movimientos/MovementDetailsModal.vue`

#### Scenario: ops-psp follow-up reuses the modal without duplication

- **GIVEN** `extend-ops-psp-movement-details-modal` is later archived
- **WHEN** the implementation of that follow-up is reviewed
- **THEN** `src/ops/psp/MovementsTable.vue` (or its successor) imports `<MovementDetailsModal>` from `@/ops/movimientos/MovementDetailsModal.vue`; no copy of the modal exists under `src/ops/psp/`

#### Scenario: Modal is presentational and movement-shape-agnostic

- **GIVEN** the modal mounts with a `movement` prop populated from any source
- **WHEN** the modal renders
- **THEN** the modal renders without any direct data-fetching of its own; the parent component is responsible for hydrating the `movement` prop; the modal's only side effects are the `Descargar comprobante` action and emitting `update:open` on close

### Requirement: Import SWIFT and New Movement header CTAs MUST be hidden in v1 of `ops-movimientos`

The header of `/movimientos` SHALL NOT render the legacy CTAs `Import SWIFT` or `New Movement` in v1 of this capability. Both are deferred to follow-ups (`extend-ops-movimientos-create-movement`, `extend-ops-psp-swift-import` — the SWIFT import is shared cross-capability and lives in `ops-psp`'s follow-up). The CTAs MUST be hidden, NOT disabled (no `Próximamente` pill).

#### Scenario: ADMIN role does NOT see the deferred CTAs in v1

- **GIVEN** an authenticated `OPS_ADMIN` user is on `/movimientos`
- **WHEN** the page renders
- **THEN** the page header shows the title `Movimientos`; NO `Import SWIFT` or `New Movement` button is rendered

#### Scenario: VIEWER role also does NOT see them (consistent)

- **GIVEN** an authenticated `OPS_VIEWER` user is on `/movimientos`
- **WHEN** the page renders
- **THEN** the same header layout (title only); no `disabled` button; consistent with ADMIN view

#### Scenario: Future follow-up wires the CTAs back

- **GIVEN** the implementation of v1 (this spec)
- **WHEN** `extend-ops-movimientos-create-movement` is archived later
- **THEN** the spec for THAT change MAY add a Modified Requirement here re-rendering the `New Movement` CTA gated by `movimientos:create` capability

### Requirement: Loading, validation, and error surfaces on `/movimientos` MUST follow the canonical core-error-handling patterns

The page SHALL render: a `Skeleton` placeholder for the table while the initial query is in flight; an `EmptyState` titled `Sin movimientos` for queries that return zero items with no active filters; an `EmptyState` titled `Sin resultados para los filtros aplicados` with a `Limpiar filtros` button when filters are active; an alert banner for 5xx persistence errors with a `Reintentar` button; a destructive toast for receipt download failure. Toast position is bottom-right per `core-error-handling`.

#### Scenario: Tab body shows Skeleton while data is loading

- **GIVEN** a fresh navigation to `/movimientos`
- **WHEN** the query is in flight
- **THEN** the table area renders 5 skeleton rows; once the response arrives, the skeleton replaces with the real rows or the EmptyState if empty

#### Scenario: 5xx during fetch surfaces a retry banner

- **GIVEN** the operator is on `/movimientos` and `GET /movements` returns 503
- **WHEN** the page renders
- **THEN** the body shows an alert banner `No se pudieron cargar los movimientos` with a `Reintentar` button

#### Scenario: Receipt download failure surfaces a destructive toast

- **GIVEN** the MovementDetailsModal is open and the operator clicks `Descargar comprobante`
- **WHEN** `GET /receipt/:id` returns `{ success: false, error: 'rate_limited' }` OR HTTP 500
- **THEN** a destructive toast `No se pudo descargar el comprobante` appears bottom-right; the modal stays open; no new tab opens

### Requirement: The `/movimientos` page CTA + access MUST be gated by capability

The sidebar entry `Movimientos` SHALL be visible only to users with `movimientos:read` capability or `OPS_ADMIN`. The page itself respects the same gate — direct navigation to `/movimientos` for users without the capability shows the canonical 403 surface. For v1 inline gating uses `OPS_ADMIN` as fallback for every capability check until `ops-roles` consolidates.

#### Scenario: ADMIN role sees the sidebar entry and the page

- **GIVEN** an authenticated user whose roles include `OPS_ADMIN`
- **WHEN** the sidebar renders and the user navigates to `/movimientos`
- **THEN** the `Movimientos` entry is visible under the `Operaciones` block; the page renders fully

#### Scenario: VIEWER role with read capability sees the page in read-only mode

- **GIVEN** an authenticated user whose roles include `movimientos:read`
- **WHEN** the user navigates to `/movimientos`
- **THEN** the page renders; the table works; no creation CTAs are visible (consistent with v1's read-only scope)

#### Scenario: User with no movimientos capability is redirected to 403

- **GIVEN** an authenticated user whose roles include only `LEX_ADMIN`
- **WHEN** the user navigates directly to `/movimientos`
- **THEN** the page renders the canonical 403 surface (`Acceso denegado`) per `core-navigation`; the sidebar does NOT show the entry

### Requirement: Quality-of-life refinements over the legacy MUST be contracted as v1 scope on `/movimientos`

Per the canonical migration playbook, this capability SHALL land 2 quality-of-life refinements: URL sync of filters + sponsor + page (so bookmarks share specific views); `?movement=:id` deep-link auto-mounting `<MovementDetailsModal>` on page load (so links to a specific movement work as deep-links). Refinements not on this list MUST NOT ship without a Modified Requirement on this spec.

#### Scenario: URL sync round-trips through back-button navigation

- **GIVEN** the operator sets `?sponsor=COINAG&type=DEPOSIT&page=2`, opens a movement via row click (URL becomes `?...&movement=mov-7`), then closes the modal
- **WHEN** the navigation resolves
- **THEN** the URL is restored to `?sponsor=COINAG&type=DEPOSIT&page=2`; the `movement` param is stripped; the table is at the same filtered page

#### Scenario: Movement deep-link survives a page reload

- **GIVEN** the operator is on `/movimientos?movement=mov-7` with the modal open
- **WHEN** the operator reloads the page
- **THEN** the page re-mounts; the `?movement=mov-7` param triggers the modal to auto-mount once the movements query resolves

#### Scenario: Refinements not on the v1 list require a Modified Requirement

- **GIVEN** a future change wants to add auto-refresh-every-N-seconds to `/movimientos`
- **WHEN** the change is scoped
- **THEN** it MUST land as a Modified Requirement on this spec (NOT as a hidden implementation detail); the refinement canon is explicitly declared

