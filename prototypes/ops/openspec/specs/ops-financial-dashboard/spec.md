# ops-financial-dashboard Specification

## Purpose
TBD - created by archiving change add-ops-financial-dashboard. Update Purpose after archive.
## Requirements
### Requirement: The /financial-dashboard page MUST be a Type-A page with 2 internal tabs (Activity / Quotes) and URL-reflected active tab

The page SHALL be implemented at `src/pages/FinancialDashboard.vue` and registered at `/financial-dashboard` with `meta.requiresAuth = true`, `meta.layout = 'shell'`, `meta.breadcrumb = 'Financial Dashboard'`, and `meta.block = 'Operaciones'`. The composition SHALL follow the Type-A pattern from `core-module-types` with sub-module tabs: page header (title), tab indicator, active tab body. The active tab SHALL be reflected in the URL via `?tab=activity|quotes` so back-navigation restores the tab. When no `?tab=` query param is set, the page reads `localStorage:ops:financial-dashboard:lastTab` (per Decision 6b) and uses it; if no saved value exists, defaults to `activity`. The dashboard SHALL be registered at `/financial-dashboard` (NOT `/`); the generic Dashboard from `core-modulo-genericos` keeps `/` per Decision 3.

#### Scenario: Authenticated navigation to /financial-dashboard opens the default tab

- **GIVEN** an authenticated `OPS_ADMIN` user with no prior dashboard visit history
- **WHEN** the user navigates to `/financial-dashboard`
- **THEN** the page renders with the AppShell, the tab indicator shows `Activity · Quotes`, the active tab is `Activity`, the URL becomes `/financial-dashboard?tab=activity`, and `localStorage:ops:financial-dashboard:lastTab` becomes `'activity'`

#### Scenario: Returning visit restores the last-active tab from localStorage

- **GIVEN** an authenticated user whose `localStorage:ops:financial-dashboard:lastTab` is `'quotes'`
- **WHEN** the user navigates to `/financial-dashboard` (no query param)
- **THEN** the active tab on mount is `Quotes`, the URL becomes `/financial-dashboard?tab=quotes`

#### Scenario: Switching tabs updates the URL query and persists the new active tab

- **GIVEN** the page mounted on `Activity`
- **WHEN** the user clicks the `Quotes` tab
- **THEN** the URL becomes `/financial-dashboard?tab=quotes`, the body re-renders the Quotes tab content, and `localStorage:ops:financial-dashboard:lastTab` becomes `'quotes'`

### Requirement: The legacy /dashboard path SHALL redirect to /financial-dashboard?tab=activity

The router SHALL register a redirect `/dashboard` → `/financial-dashboard?tab=activity`. The redirect preserves any incoming query string. The redirect SHALL NOT depend on auth state (the destination handles auth via its own `meta.requiresAuth = true` flag). The legacy `/` (root) is owned by the generic Dashboard from `core-modulo-genericos`; this change does NOT redirect `/` (per design.md Decision 3).

#### Scenario: Bare /dashboard redirects to /financial-dashboard?tab=activity

- **GIVEN** an authenticated user navigates to `/dashboard`
- **WHEN** the router processes the redirect
- **THEN** the user lands on `/financial-dashboard?tab=activity` with the Activity tab rendered

#### Scenario: Legacy URL with filter query params preserves them on redirect

- **GIVEN** an authenticated user navigates to `/dashboard?type=DEPOSIT&status=PENDING`
- **WHEN** the router processes the redirect
- **THEN** the user lands on `/financial-dashboard?tab=activity&type=DEPOSIT&status=PENDING` with the Activity tab rendered and the filters applied

#### Scenario: Bare / does NOT redirect to the financial dashboard

- **GIVEN** an authenticated user navigates to `/`
- **WHEN** the router processes the navigation
- **THEN** the user lands on the generic Dashboard page (per `core-modulo-genericos`); the financial dashboard is reachable via the sidebar entry or the `/financial-dashboard` URL

### Requirement: The Activity tab MUST render a paginated movements ledger with sponsor filter cards + filter row + search

The Activity tab SHALL render: a row of per-sponsor filter cards above the filter row (one card per active banco sponsor showing the count of movements for that sponsor in the current view, click-to-filter, reusing the visual + behaviour from `ops-psp`'s sponsor cards per Decision 5); a filter row (`Búsqueda` text input debounced 300 ms; `Tipo`, `Estado`, `Origen` selects applied immediately); the paginated ledger table with columns `Fecha · Tipo · Origen · Destino · Moneda · Monto · Estado · Sponsor · Cliente`; pagination footer with the canonical page-size options. Filter state SHALL be reflected in the URL (`?tab=activity&sponsor=...&type=...&status=...&origin=...&search=...&page=...`). The sponsor filter on this dashboard does NOT cross-sync with `ops-psp`'s sponsor filter (per design.md Decision 5).

#### Scenario: Sponsor filter cards render with the active sponsors and counts

- **GIVEN** the Activity tab mounts with 50 movements loaded across 1 sponsor (Coinag)
- **WHEN** the page renders
- **THEN** one card renders with the sponsor label `COINAG` and the movement count `50`; clicking the card applies the sponsor filter (URL gains `&sponsor=COINAG`), the COINAG card shows the active style, and the ledger re-fetches

#### Scenario: Sponsor filter is per-dashboard, NOT cross-synced with ops-psp

- **GIVEN** the operator applied `?sponsor=COINAG` on `ops-psp` (its `localStorage:ops:psp:lastTab`-style filter)
- **WHEN** the operator navigates to `/financial-dashboard`
- **THEN** the Activity tab opens WITHOUT the sponsor filter applied (the dashboards have independent filter state); the URL reads `/financial-dashboard?tab=activity` (no `sponsor` param)

#### Scenario: Manual filter combination persists in the URL

- **GIVEN** the operator sets `Tipo = DEPOSIT`, `Estado = COMPLETED`, and types `acme` into the search
- **WHEN** the search debounces (300 ms)
- **THEN** the URL becomes `/financial-dashboard?tab=activity&type=DEPOSIT&status=COMPLETED&search=acme`; the table fetches with all three filters; back-navigation away and back restores the URL exactly

### Requirement: Row click on a movement MUST open the shared MovementDetailsModal with a Descargar comprobante action

Clicking a row in the Activity table SHALL open `<MovementDetailsModal>` (centred dialog) showing the movement record. The modal body renders the canonical fields: `id`, `Fecha`, `Tipo`, `Estado`, `Monto + Moneda`, `Origen` (account or counterparty), `Destino` (account or counterparty), `Sponsor`, `Cliente`, `Counterparty`, `Created at`, `Updated at`, plus any `metadata` keys the backend exposes. The modal SHALL render an action button `Descargar comprobante` that calls `GET /receipt/:id`; on `{ success: true, url }` the modal calls `window.open(url, '_blank')`; on failure surfaces a destructive toast and the modal stays open. Per Decision 6c, the URL SHALL gain `?movement=:id` while the modal is open; closing strips the param. Auto-mount on page load when `?movement=:id` is present.

#### Scenario: Row click opens the modal and gains the URL param

- **GIVEN** the Activity tab with 10 movements loaded
- **WHEN** the operator clicks the row for `mov-7`
- **THEN** the `<MovementDetailsModal>` mounts showing the `mov-7` record; the URL gains `?movement=mov-7` (preserving any existing tab/sponsor/filter params); the table behind the modal stays mounted

#### Scenario: Descargar comprobante opens the receipt URL in a new tab

- **GIVEN** the modal is open for `mov-7`
- **WHEN** the operator clicks `Descargar comprobante` and `GET /receipt/mov-7` returns `{ success: true, url: 'https://files/r.pdf' }`
- **THEN** `window.open` is called with `('https://files/r.pdf', '_blank')`; no toast appears on success; the modal stays open

#### Scenario: Deep-link with ?movement=:id auto-mounts the modal

- **GIVEN** an authenticated user navigates to `/financial-dashboard?tab=activity&movement=mov-7`
- **WHEN** the page renders
- **THEN** the Activity tab renders the movements list AND the `<MovementDetailsModal>` mounts automatically with `mov-7` content; the user did not have to click the row

#### Scenario: Closing the modal strips the ?movement param

- **GIVEN** the modal is open with `?movement=mov-7` in the URL
- **WHEN** the operator clicks the close button (or Escape, or the backdrop)
- **THEN** the modal closes; the URL becomes `/financial-dashboard?tab=activity` (the `movement` param is stripped); the table remains in its current state

### Requirement: The Quotes tab MUST render a paginated quotes ledger with a sub-toggle Active / Historic and filter row

The Quotes tab SHALL render: a sub-toggle `Active Quotes / Historic Quotes` (default `Active`) reflected in the URL via `?view=active|historic` (per Decision 4); a filter row (`Cliente` autocomplete, `Operación` select for BUY/SELL, `Par` select for currency pairs); the paginated ledger with columns `Cliente · Par · Operación · Term · Monto · Rate · Calculado · Estado · Fecha`. Active view filters to `status=ACCEPTED` (matches the legacy default `?status=ACCEPTED`); Historic view returns all other statuses. Per Decision 4, the sub-toggle's state is part of the URL; bookmarking `?tab=quotes&view=historic` opens the Historic view. Row click is **NO-OP in v1** (cursor-default; quote action modals deferred per Requirement 6).

#### Scenario: Default view on first visit is Active Quotes

- **GIVEN** the operator switches to the Quotes tab for the first time
- **WHEN** the page renders
- **THEN** the sub-toggle shows `Active Quotes` selected, the URL becomes `?tab=quotes&view=active`, and the table fetches with `status=ACCEPTED`

#### Scenario: Switching to Historic Quotes updates the URL and re-fetches

- **GIVEN** the Quotes tab on `?view=active`
- **WHEN** the operator clicks `Historic Quotes`
- **THEN** the URL becomes `?tab=quotes&view=historic`; the table re-fetches without the `status=ACCEPTED` filter (returning historical quotes); the sub-toggle reflects the new state

#### Scenario: Bookmark with ?view=historic opens directly on Historic

- **GIVEN** an authenticated user navigates to `/financial-dashboard?tab=quotes&view=historic`
- **WHEN** the page renders
- **THEN** the Quotes tab is active, the sub-toggle shows `Historic Quotes` selected, and the table renders the historical quotes list

### Requirement: Quote action buttons (Pay / Swap / Unsupported) MUST be hidden in v1; the status renders as a read-only badge with a tooltip

The legacy renders the Quotes table's `Status` cell as a clickable button that, depending on the quote shape, opens one of three modals (`PayQuote`, `DirectSwap`, `UnsupportedQuote`). In v1 these modals are deferred (see proposal "Removed from scope"); the table SHALL render the `Status` cell as a read-only `<Badge>` with the canonical variant (success for `ACCEPTED`, warning for `PENDING`, danger for `REJECTED`/`EXPIRED`). Per Decision 6d, hovering the badge shows a tooltip `Acciones de quote disponibles próximamente` explaining the deferral.

#### Scenario: Status renders as a read-only Badge

- **GIVEN** the Quotes table with one row showing a quote with `status = ACCEPTED`
- **WHEN** the page renders
- **THEN** the `Status` cell renders a success-toned `Badge` labelled `ACCEPTED`; no button is rendered; clicking the cell does NOT open any modal

#### Scenario: Hover reveals the deferral tooltip

- **GIVEN** the row with the read-only Badge
- **WHEN** the operator hovers over the badge
- **THEN** a tooltip surfaces `Acciones de quote disponibles próximamente`

#### Scenario: Different statuses render different tones

- **GIVEN** the Quotes table renders 3 rows: ACCEPTED, PENDING, EXPIRED
- **WHEN** the page renders
- **THEN** ACCEPTED is success-toned, PENDING is warning-toned, EXPIRED is danger-toned

### Requirement: Import SWIFT and New Movement header CTAs MUST be hidden in v1

The legacy renders two header CTAs on the dashboard's title row: `Import SWIFT` (opens `<ImportSwiftModal>`) and `New Movement` (opens `<CreateMovementModal>`). In v1 both modals are deferred (see proposal "Removed from scope"); the CTAs SHALL be **hidden — not disabled, no "Próximamente" pill**. They re-appear when the corresponding follow-up changes (`extend-ops-financial-dashboard-create-movement`, `extend-ops-psp-swift-import` or its dashboard sibling) land.

#### Scenario: ADMIN role does NOT see the Create / Import CTAs in v1

- **GIVEN** an authenticated `OPS_ADMIN` user is on `/financial-dashboard`
- **WHEN** the page renders
- **THEN** the page header shows the title `Financial Dashboard`; NO `Import SWIFT` or `New Movement` button is rendered

#### Scenario: VIEWER role also does NOT see them (consistent)

- **GIVEN** an authenticated `OPS_VIEWER` user is on `/financial-dashboard`
- **WHEN** the page renders
- **THEN** the same header layout (title only); no `disabled` button; consistent with ADMIN view

#### Scenario: Future follow-up wires the CTAs back

- **GIVEN** the implementation of v1 (this spec)
- **WHEN** `extend-ops-financial-dashboard-create-movement` is archived later
- **THEN** the spec for THAT change MAY add a Modified Requirement here re-rendering the `New Movement` CTA gated by `dashboard:create-movement` capability; v1 does NOT pre-stub the CTA

### Requirement: The MovementDetailsModal MUST live in `src/ops/financial-dashboard/` as the canonical home; ops-psp's deferred row-click integration imports from here

`<MovementDetailsModal>` SHALL be implemented in `src/ops/financial-dashboard/MovementDetailsModal.vue`. When `extend-ops-psp-movement-details-modal` (deferred at the time of this spec, per `add-ops-psp` design.md Open question 3) lands, that change SHALL import the modal from this path; `ops-psp` SHALL NOT duplicate the modal under `src/ops/psp/`. The modal accepts a `movement: Movement` prop and emits `update:open` when dismissed. It does NOT depend on any `ops-financial-dashboard`-only data: a consumer in `ops-psp` (or any future capability) can mount it with any `Movement` record.

#### Scenario: The modal lives in src/ops/financial-dashboard/

- **GIVEN** the implementation of this change
- **WHEN** the file `src/ops/financial-dashboard/MovementDetailsModal.vue` exists
- **THEN** the file is the canonical home for the modal; cross-capability consumers import from `@/ops/financial-dashboard/MovementDetailsModal.vue`

#### Scenario: ops-psp follow-up reuses the modal without duplication

- **GIVEN** `extend-ops-psp-movement-details-modal` is later archived
- **WHEN** the implementation of that follow-up is reviewed
- **THEN** `src/ops/psp/MovementsTable.vue` (or its successor) imports `<MovementDetailsModal>` from `@/ops/financial-dashboard/MovementDetailsModal.vue`; no copy of the modal exists under `src/ops/psp/`

#### Scenario: Modal is presentational and movement-shape-agnostic

- **GIVEN** the modal mounts with a `movement` prop populated from any source
- **WHEN** the modal renders
- **THEN** the modal renders without any direct data-fetching of its own; the parent component is responsible for hydrating the `movement` prop; the modal's only side effects are the `Descargar comprobante` action (per Requirement 4) and emitting `update:open` on close

### Requirement: Loading, validation, and error surfaces MUST follow the canonical core-error-handling patterns

The page SHALL render: a `Skeleton` placeholder for each tab's body while the tab's primary query is in flight; an `EmptyState` titled `Sin movimientos` / `Sin quotes` for queries that return zero items with no active filters; an `EmptyState` titled `Sin resultados para los filtros aplicados` with a `Limpiar filtros` button when filters are active and the query returns zero items; an alert banner for 5xx persistence errors with a `Reintentar` button that re-issues the query; a destructive toast for transient errors (e.g. receipt download failure). All transient errors SHALL surface via toast at the bottom-right per `core-error-handling`.

#### Scenario: Tab body shows Skeleton while data is loading

- **GIVEN** the operator switches to Quotes for the first time after page load
- **WHEN** `GET /quotes` is in flight
- **THEN** the table area shows 5 skeleton rows; once the response arrives, the skeleton replaces with the real rows or the EmptyState if empty

#### Scenario: 5xx during tab fetch surfaces a retry banner without breaking the tabs

- **GIVEN** the operator is on Activity and `GET /movements` returns 503
- **WHEN** the page renders
- **THEN** the Activity tab body shows an alert banner `No se pudieron cargar los movimientos` with a `Reintentar` button; the Quotes tab remains functional (the user can switch tabs without resetting the error)

#### Scenario: Receipt download failure surfaces a destructive toast

- **GIVEN** the MovementDetailsModal is open and the operator clicks `Descargar comprobante`
- **WHEN** `GET /receipt/:id` returns `{ success: false, error: 'rate_limited' }` OR HTTP 500
- **THEN** a destructive toast `No se pudo descargar el comprobante` appears bottom-right; the modal stays open; no new tab opens

### Requirement: The dashboard CTA + tab access MUST be gated by capability

The sidebar entry `Financial Dashboard` (or canonical short label) SHALL be visible only to users with `dashboard:read` capability or `OPS_ADMIN`. The page itself respects the same gate — direct navigation to `/financial-dashboard` for users without the capability shows the canonical 403 surface from `core-navigation`. Sub-features WITHIN the page have their own gates declared at follow-up time (e.g. `dashboard:create-movement` for the future Create Movement CTA). For v1 inline gating uses `OPS_ADMIN` as fallback for every capability check until `ops-roles` consolidates.

#### Scenario: ADMIN role sees the sidebar entry and the page

- **GIVEN** an authenticated user whose roles include `OPS_ADMIN`
- **WHEN** the sidebar renders and the user navigates to `/financial-dashboard`
- **THEN** the `Financial Dashboard` entry is visible under the `Operaciones` block; the page renders fully

#### Scenario: VIEWER role with read capability sees the page in read-only mode

- **GIVEN** an authenticated user whose roles include `dashboard:read`
- **WHEN** the user navigates to `/financial-dashboard`
- **THEN** the page renders; both tabs work; no CTAs are visible (consistent with v1's read-only scope)

#### Scenario: User with no dashboard capability is redirected to 403

- **GIVEN** an authenticated user whose roles include only `LEX_ADMIN`
- **WHEN** the user navigates directly to `/financial-dashboard`
- **THEN** the page renders the canonical 403 surface (`Acceso denegado`) per `core-navigation`; the sidebar does NOT show the entry

### Requirement: Quality-of-life refinements over the legacy MUST be contracted as v1 scope

Per Decision 6 the migration SHALL land 4 quality-of-life refinements: URL sync of tab + sub-toggle + filters (6a); `localStorage` of last-active tab + last sub-toggle (6b); `?movement=:id` deep-link auto-mounting the MovementDetailsModal (6c); read-only Quote status badge with tooltip explaining the deferred actions (6d). Each refinement SHALL be contracted via a Scenario in this Requirement OR within the host Requirement that owns the surface; refinements not yet on the v1 list MUST NOT ship without a Modified Requirement on this spec.

#### Scenario: localStorage persists the last-active sub-toggle within Quotes

- **GIVEN** the operator switched to `Historic Quotes` last visit; `localStorage:ops:financial-dashboard:lastQuotesView` is `'historic'`
- **WHEN** the operator returns to `/financial-dashboard?tab=quotes` (without `?view=`)
- **THEN** the sub-toggle restores to `Historic Quotes`; the URL is rewritten to `?tab=quotes&view=historic`

#### Scenario: Movement deep-link survives a page reload

- **GIVEN** the operator is on `/financial-dashboard?tab=activity&movement=mov-7` with the modal open
- **WHEN** the operator reloads the page
- **THEN** the Activity tab re-mounts; the `?movement=mov-7` param triggers the modal to auto-mount once the movements query resolves and `mov-7` is in the result OR the modal directly fetches the single movement via `GET /movements/mov-7`; same operator experience as before the reload

#### Scenario: Quote status tooltip surfaces the deferral copy

- **GIVEN** the Quotes table renders a row with a clickable-looking status (legacy intuition)
- **WHEN** the operator hovers over the status badge
- **THEN** a tooltip `Acciones de quote disponibles próximamente` surfaces; the operator transitioning from legacy gets visible context

#### Scenario: URL sync round-trips through back-button navigation

- **GIVEN** the operator sets `?tab=activity&sponsor=COINAG&type=DEPOSIT&page=2`, switches to Quotes (URL becomes `?tab=quotes&view=active`), then clicks the browser Back button
- **WHEN** the navigation resolves
- **THEN** the URL is restored to `?tab=activity&sponsor=COINAG&type=DEPOSIT&page=2`; the Activity tab is active with the same filters and pagination

