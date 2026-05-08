# ops-cotizaciones Specification

## Purpose
TBD - created by archiving change refactor-ops-dashboard-into-movimientos-cotizaciones. Update Purpose after archive.
## Requirements
### Requirement: The /cotizaciones page MUST be a Type-A master list registered at `/cotizaciones`

The page SHALL be implemented at `src/pages/Cotizaciones.vue` and registered at `/cotizaciones` with `meta.requiresAuth = true`, `meta.layout = 'shell'`, `meta.breadcrumb = 'Cotizaciones'`, and `meta.block = 'Operaciones'`. The composition SHALL follow the Type-A pattern from `core-module-types`: page header (title), sub-toggle Active/Historic + filter row, paginated table.

#### Scenario: Authenticated navigation to /cotizaciones renders the page

- **GIVEN** an authenticated `OPS_ADMIN` user
- **WHEN** the user navigates to `/cotizaciones`
- **THEN** the page renders with the AppShell, the page header shows the title `Cotizaciones`, the sub-toggle (Active/Historic) + filter row + paginated quotes table render below

#### Scenario: Sidebar entry surfaces the page under the Operaciones block

- **GIVEN** the OPS sidebar is rendered
- **WHEN** the user inspects the navigation
- **THEN** the `Operaciones` block contains a `Cotizaciones` entry linking to `/cotizaciones`

#### Scenario: VIEWER role with read capability sees the page in read-only mode

- **GIVEN** an authenticated user whose roles include `cotizaciones:read`
- **WHEN** the user navigates to `/cotizaciones`
- **THEN** the page renders; the table works; quote action buttons stay hidden (consistent with v1's read-only scope per the requirement below)

### Requirement: The /cotizaciones page MUST render a paginated quotes ledger with a sub-toggle Active / Historic and filter row

The page SHALL render: a sub-toggle `Active Quotes / Historic Quotes` (default `Active`) reflected in the URL via `?view=active|historic`; a filter row (`Cliente` autocomplete, `Operación` select for BUY/SELL, `Par` select for currency pairs); the paginated ledger with columns `Cliente · Par · Operación · Term · Monto · Rate · Calculado · Estado · Fecha`. Active view filters to `status=ACCEPTED` (matches the legacy default `?status=ACCEPTED`); Historic view returns all other statuses. The sub-toggle's state is part of the URL; bookmarking `?view=historic` opens the Historic view directly. Row click is **NO-OP in v1** (cursor-default; quote action modals deferred to `extend-ops-cotizaciones-quote-actions`).

#### Scenario: Default view on first visit is Active Quotes

- **GIVEN** the operator opens `/cotizaciones` for the first time
- **WHEN** the page renders
- **THEN** the sub-toggle shows `Active Quotes` selected, the URL becomes `/cotizaciones?view=active`, and the table fetches with `status=ACCEPTED`

#### Scenario: Switching to Historic Quotes updates the URL and re-fetches

- **GIVEN** `/cotizaciones?view=active`
- **WHEN** the operator clicks `Historic Quotes`
- **THEN** the URL becomes `/cotizaciones?view=historic`; the table re-fetches without the `status=ACCEPTED` filter (returning historical quotes); the sub-toggle reflects the new state

#### Scenario: Bookmark with ?view=historic opens directly on Historic

- **GIVEN** an authenticated user navigates to `/cotizaciones?view=historic`
- **WHEN** the page renders
- **THEN** the sub-toggle shows `Historic Quotes` selected, and the table renders the historical quotes list

### Requirement: Quote action buttons (Pay / Swap / Unsupported) MUST be hidden in v1; the status renders as a read-only badge with a tooltip

The legacy renders the Quotes table's `Status` cell as a clickable button that, depending on the quote shape, opens one of three modals (`PayQuote`, `DirectSwap`, `UnsupportedQuote`). In v1 of `ops-cotizaciones` these modals are deferred to `extend-ops-cotizaciones-quote-actions`; the table SHALL render the `Status` cell as a read-only `<Badge>` with the canonical variant (success for `ACCEPTED`, warning for `PENDING`, danger for `REJECTED`/`EXPIRED`). Hovering the badge shows a tooltip `Acciones de quote disponibles próximamente` explaining the deferral.

#### Scenario: Status renders as a read-only Badge

- **GIVEN** the quotes table with one row showing a quote with `status = ACCEPTED`
- **WHEN** the page renders
- **THEN** the `Status` cell renders a success-toned `Badge` labelled `ACCEPTED`; no button is rendered; clicking the cell does NOT open any modal

#### Scenario: Hover reveals the deferral tooltip

- **GIVEN** the row with the read-only Badge
- **WHEN** the operator hovers over the badge
- **THEN** a tooltip surfaces `Acciones de quote disponibles próximamente`

#### Scenario: Different statuses render different tones

- **GIVEN** the quotes table renders 3 rows: ACCEPTED, PENDING, EXPIRED
- **WHEN** the page renders
- **THEN** ACCEPTED is success-toned, PENDING is warning-toned, EXPIRED is danger-toned

### Requirement: Loading, validation, and error surfaces on `/cotizaciones` MUST follow the canonical core-error-handling patterns

The page SHALL render: a `Skeleton` placeholder for the table while the initial query is in flight; an `EmptyState` titled `Sin quotes` for queries that return zero items; an alert banner for 5xx persistence errors with a `Reintentar` button. Transient errors SHALL surface via toast at the bottom-right per `core-error-handling`.

#### Scenario: Body shows Skeleton while data is loading

- **GIVEN** a fresh navigation to `/cotizaciones`
- **WHEN** `GET /quotes` is in flight
- **THEN** the table area shows 5 skeleton rows; once the response arrives, the skeleton replaces with the real rows or the EmptyState if empty

#### Scenario: 5xx during fetch surfaces a retry banner

- **GIVEN** the operator is on `/cotizaciones` and `GET /quotes` returns 503
- **WHEN** the page renders
- **THEN** the body shows an alert banner `No se pudieron cargar las cotizaciones` with a `Reintentar` button

#### Scenario: Empty Active view does NOT cross-contaminate the Historic view

- **GIVEN** the operator is on `/cotizaciones?view=active` and the API returns an empty list
- **WHEN** the EmptyState renders
- **THEN** the `Sin quotes` message describes only the Active view's emptiness; switching to `?view=historic` triggers a separate query that may or may not return rows

### Requirement: The `/cotizaciones` page CTA + access MUST be gated by capability

The sidebar entry `Cotizaciones` SHALL be visible only to users with `cotizaciones:read` capability or `OPS_ADMIN`. The page itself respects the same gate — direct navigation for users without the capability shows the canonical 403 surface. For v1 inline gating uses `OPS_ADMIN` as fallback until `ops-roles` consolidates.

#### Scenario: ADMIN role sees the sidebar entry and the page

- **GIVEN** an authenticated user whose roles include `OPS_ADMIN`
- **WHEN** the sidebar renders and the user navigates to `/cotizaciones`
- **THEN** the `Cotizaciones` entry is visible under the `Operaciones` block; the page renders fully

#### Scenario: User with no cotizaciones capability is redirected to 403

- **GIVEN** an authenticated user whose roles include only `LEX_ADMIN`
- **WHEN** the user navigates directly to `/cotizaciones`
- **THEN** the page renders the canonical 403 surface; the sidebar does NOT show the entry

#### Scenario: Trader with cotizaciones capability but NOT movimientos:read

- **GIVEN** an authenticated user with `cotizaciones:read` (but not `movimientos:read` nor `OPS_ADMIN`)
- **WHEN** the user navigates the OPS sidebar
- **THEN** the `Cotizaciones` entry is visible; the `Movimientos` entry is NOT visible (each capability is gated independently)

