# ops-psp Specification

## Purpose
TBD - created by archiving change add-ops-psp. Update Purpose after archive.
## Requirements
### Requirement: The legacy /psp/home and /psp/accounts paths SHALL redirect to /psp?tab=movimientos and /psp?tab=cuentas respectively

The router SHALL register two redirects: `/psp/home` → `/psp?tab=movimientos`, `/psp/accounts` → `/psp?tab=cuentas`. Query strings on the legacy URL are preserved across the redirect. The redirects SHALL NOT depend on auth state (the destination handles auth via its own `meta.requiresAuth = true` flag).

#### Scenario: Bare /psp/home redirects to /psp?tab=movimientos

- **GIVEN** an authenticated user navigates to `/psp/home`
- **WHEN** the router processes the redirect
- **THEN** the user lands on `/psp?tab=movimientos` with the Movimientos tab rendered

#### Scenario: Bare /psp/accounts redirects to /psp?tab=cuentas

- **GIVEN** an authenticated user navigates to `/psp/accounts`
- **WHEN** the router processes the redirect
- **THEN** the user lands on `/psp?tab=cuentas` with the Cuentas tab rendered

#### Scenario: Legacy URL with filter query params preserves them on redirect

- **GIVEN** an authenticated user navigates to `/psp/home?type=DEPOSIT&status=PENDING`
- **WHEN** the router processes the redirect
- **THEN** the user lands on `/psp?tab=movimientos&type=DEPOSIT&status=PENDING` with the Movimientos tab rendered and the filters applied

### Requirement: The Reconciliation Banner MUST render above the tabs as a stackable alert area dismissible to a per-session pill

The reconciliation banner area SHALL render above the tab indicator. Per Decision 6 the area SHALL render `<AlertBanner>` (from `core-error-handling`) for each entry in the array of sponsor mismatches returned by `GET /balance-reconciliation`. Each banner shows: sponsor name + "Surplus" / "Deficit" tag (per the difference sign) + db_balance + api_balance + difference + last-checked-at timestamp. The banner is dismissible to a small pill labelled `Reconciliación: <N> sponsor con mismatch` (per Decision 7c); clicking the pill expands the banners back. Dismissal state is per-session (`sessionStorage:ops:psp:reconciliationDismissed`).

#### Scenario: One sponsor mismatch renders one banner above the tabs

- **GIVEN** the API returns `{ mismatches: [{ sponsor: 'COINAG', db_balance: '100.00', api_balance: '95.00', difference: '-5.00', checked_at: '2026-05-08T12:00:00Z' }] }`
- **WHEN** the page renders
- **THEN** one `AlertBanner` (variant `danger` because difference is negative) appears above the tabs showing `COINAG · Deficit · -5.00 · checked Hace 0 min`; the tab indicator renders below it

#### Scenario: Two sponsor mismatches stack two banners

- **GIVEN** the API returns mismatches for both `COINAG` (deficit) and `BIND` (surplus)
- **WHEN** the page renders
- **THEN** two banners stack alphabetically by sponsor: `BIND · Surplus` (variant `warning`) then `COINAG · Deficit` (variant `danger`); the tab indicator renders below both

#### Scenario: Dismissing collapses banners to a per-session pill

- **GIVEN** the page renders 1 banner
- **WHEN** the user clicks the dismiss button on the banner
- **THEN** the banner area is replaced by a small pill `Reconciliación: 1 sponsor con mismatch`; clicking the pill expands the banner back; the dismiss state is preserved in `sessionStorage` so refreshing the page within the same session keeps the pill collapsed; closing the tab and re-opening clears the dismiss state

### Requirement: The Movimientos tab MUST render a paginated ledger with debounced search, filters and per-sponsor filter cards

The Movimientos tab body SHALL render four sections in this exact order:

1. **KPI grid (4 cards)** at the top in a `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` layout (same chrome as the Posición tab). The 4 KPIs are: `Movimientos hoy` (count today, neutral), `Volumen neto hoy` (signed sum today, mono with sign + colour by sign), `Pendientes` (count with `status = PENDING`, warning), `COMPLETED esta semana` (count with `status = COMPLETED` over the last 7 days, success).
2. **Per-sponsor filter cards** — one card per active sponsor showing the count of movements for that sponsor in the current view; click toggles the sponsor filter (cross-tab compatible).
3. **Filter row** — `Búsqueda` text input debounced 300 ms; `Tipo`, `Estado`, `Origen` selects applied immediately.
4. **Ledger table** — paginated movements table with the canonical columns; row click is NO-OP in v1 (the Movement Details modal is owned by the future `extend-ops-psp-movement-details-modal` follow-up).

Filter state SHALL be reflected in the URL (`?tab=movimientos&sponsor=...&type=...&status=...&origin=...&search=...&page=...`).

#### Scenario: KPI grid renders above the sponsor cards

- **GIVEN** the Movimientos tab mounts with 50 movements loaded
- **WHEN** the page renders
- **THEN** the KPI grid is the FIRST element of the tab body; the sponsor filter cards render BELOW it; then the filter row; then the ledger

#### Scenario: KPI cards reflect the filtered view (not just the global state)

- **GIVEN** the operator filters to `?sponsor=COINAG&type=DEPOSIT`
- **WHEN** the page re-fetches the movements
- **THEN** the KPI `Movimientos hoy` shows the count of COINAG deposits today (NOT the global count); the cards re-render whenever the filter changes

#### Scenario: KPI cards keep their layout below the `lg` breakpoint

- **GIVEN** the viewport is below `lg` (< 1024 px)
- **WHEN** the page renders
- **THEN** the KPI grid stacks to 2 columns at `sm` and 1 column below `sm`; the sponsor filter cards remain in a `flex-wrap` row that wraps as needed; the ledger remains horizontally scrollable

#### Scenario: Filter row + sponsor cards render together

- **GIVEN** the Movimientos tab mounts with an empty filter set and 50 movements loaded
- **WHEN** the page renders
- **THEN** the per-sponsor cards render between the KPI grid and the filter row (with movement count per sponsor); the filter row renders inputs + selects; the table renders 25 rows (default page size) + the pagination footer

#### Scenario: Sponsor card click toggles the filter and re-fetches the ledger

- **GIVEN** the operator is on Movimientos with no sponsor filter
- **WHEN** the operator clicks the COINAG sponsor card
- **THEN** the URL gains `&sponsor=COINAG`, the COINAG card shows the active style, the ledger re-fetches with the sponsor filter, and the count badges on the OTHER sponsor cards update to reflect the now-filtered view

#### Scenario: Manual filter combination persists in the URL

- **GIVEN** the operator sets `Tipo = DEPOSIT`, `Estado = COMPLETED`, and types `acme` into the search
- **WHEN** the search debounces (300 ms)
- **THEN** the URL becomes `/psp?tab=movimientos&type=DEPOSIT&status=COMPLETED&search=acme`; the table fetches with all three filters; back-navigation away and back restores the URL exactly

### Requirement: The Cuentas tab MUST render a paginated accounts list with row-click opening a Drawer-based SWIFT transactions drill-down

The Cuentas tab SHALL render a paginated accounts list with columns `Cuenta · Currency · Balance · Owner · Estado`. Row click SHALL open a `<Drawer>` (per Decision 4) on the right side of the viewport, NOT a modal. The drawer body shows: account header (account number + currency + balance + Coinag CVU/CBU + alias) + SWIFT transactions table (paginated, debounced search). The drawer is dismissible via close button, Escape key, or backdrop click. The URL gains `?account=:id` query param while the drawer is open (so the deep-link is shareable); closing the drawer strips the param.

#### Scenario: Row click opens the drawer with the chosen account

- **GIVEN** the Cuentas tab with 10 accounts loaded
- **WHEN** the operator clicks the row for `acc-7`
- **THEN** a drawer opens on the right showing the `acc-7` header + its SWIFT transactions; the URL gains `?account=acc-7`; the accounts table stays mounted on the left

#### Scenario: Drawer is dismissible via close button, Escape, or backdrop

- **GIVEN** the drawer is open for `acc-7`
- **WHEN** the operator clicks the close button (or presses Escape, or clicks the backdrop)
- **THEN** the drawer closes, the URL strips `?account` (becomes bare `/psp?tab=cuentas&...`), and the accounts table re-takes focus

#### Scenario: Deep-link with ?account=:id auto-opens the drawer on mount

- **GIVEN** an authenticated user navigates to `/psp?tab=cuentas&account=acc-7`
- **WHEN** the page renders
- **THEN** the Cuentas tab renders the accounts list AND the drawer opens automatically with `acc-7` content; the user did not have to click

### Requirement: The Habilitar cuenta CTA in Cuentas tab MUST reuse <WhitelistAccountModal> from ops-clients without duplicating its logic

A `Habilitar cuenta` CTA SHALL render in the Cuentas tab header (gated by capability `psp:whitelist` || `OPS_ADMIN`). Clicking it opens `<WhitelistAccountModal>` imported from `ops-clients` (per Decision 5 — direct reuse, NOT a copy). The modal accepts a `clientId` prop; when triggered from `ops-psp` without a client context, the modal SHALL prompt the operator to select a client first via `<ClientFilters mode="picker">` (the same picker used in `ops-statements`). On successful whitelist, the modal emits a `created` event the page wires to invalidate `['ops', 'psp', 'accounts', ...]` so the new account renders. The internal `['ops', 'clients', clientId]` invalidation also fires (no-op if no `ops-clients` page is currently mounted).

#### Scenario: ADMIN role sees the CTA and opens the picker-prefixed modal

- **GIVEN** an authenticated `OPS_ADMIN` user is on `/psp?tab=cuentas`
- **WHEN** the user clicks `Habilitar cuenta`
- **THEN** the modal opens with a client picker step (the modal's existing 2-step state machine extends to a 3-step when no `clientId` is pre-bound: client picker → CVU validation → confirm)

#### Scenario: VIEWER role does NOT see the CTA

- **GIVEN** an authenticated user with `OPS_VIEWER` only
- **WHEN** the page renders
- **THEN** the CTA is not rendered; the Cuentas table is read-only

#### Scenario: Successful whitelist invalidates the PSP accounts query

- **GIVEN** the modal completes the whitelist successfully
- **WHEN** the modal emits `created`
- **THEN** the page calls `queryClient.invalidateQueries({ queryKey: ['ops', 'psp', 'accounts'] })`; the accounts table re-fetches and the new account renders within the next render cycle

### Requirement: Coinag health MUST be polled every 60 s and surfaced as a header indicator

Per Decision 8 the page SHALL fire `GET /coinag/health` on mount and every 60 s thereafter via `vue-query`'s `refetchInterval`. A small `<CoinagHealthIndicator>` SHALL render in the page header showing one of three states: `healthy` (green dot + label `Coinag operativo`), `degraded` (warning dot + label `Coinag degradado`), `down` (danger dot + label `Coinag caído`). The label tooltip exposes the `last-checked-at` timestamp + the optional `message` field. The indicator is read-only (no click action in v1).

#### Scenario: Healthy status renders the green indicator

- **GIVEN** `GET /coinag/health` returns `{ status: 'healthy' }`
- **WHEN** the indicator renders
- **THEN** the dot is success-coloured + label reads `Coinag operativo`

#### Scenario: Degraded or down statuses render the warning/danger indicator

- **GIVEN** `GET /coinag/health` returns `{ status: 'degraded', message: 'High latency on /movements' }`
- **WHEN** the indicator renders
- **THEN** the dot is warning-coloured + label reads `Coinag degradado`; hovering shows the tooltip `High latency on /movements · checked Hace 2 min`

#### Scenario: 60-s polling updates the indicator without page reload

- **GIVEN** the indicator is mounted as `healthy`
- **WHEN** 60 s pass and the next poll returns `down`
- **THEN** the indicator re-renders as `down` (danger-coloured dot + `Coinag caído`); no skeleton flash; the underlying health query continues polling

### Requirement: Loading, validation, and error surfaces MUST follow the canonical core-error-handling patterns

The page SHALL render: a `Skeleton` placeholder for each tab's body while the tab's primary query is in flight; an `EmptyState` titled `Sin movimientos` / `Sin cuentas` for queries that return zero items with no active filters; an `EmptyState` titled `Sin resultados para los filtros aplicados` with a `Limpiar filtros` button when filters are active and the query returns zero items; an alert banner for 5xx persistence errors with a `Reintentar` button that re-issues the query. All transient errors (e.g. network drop on health-check) SHALL surface via toast at the bottom-right per `core-error-handling`. The reconciliation banner area is a separate concern from these per-tab loading/error surfaces.

#### Scenario: Tab body shows Skeleton while data is loading

- **GIVEN** the operator switches to Movimientos for the first time after page load
- **WHEN** `GET /movements` is in flight
- **THEN** the table area shows 5 skeleton rows; once the response arrives, the skeleton replaces with the real rows or the EmptyState if empty

#### Scenario: 5xx during tab fetch surfaces a retry banner without breaking the tabs

- **GIVEN** the operator is on Cuentas and `GET /accounts` returns 503
- **WHEN** the page renders
- **THEN** the Cuentas tab body shows an alert banner `No se pudieron cargar las cuentas` with a `Reintentar` button; the OTHER tabs (Disponibilidad, Movimientos) remain functional; the operator can switch tabs without resetting the error

#### Scenario: Network failure on the health endpoint surfaces silently

- **GIVEN** the Coinag health poll fails with a network error
- **WHEN** the indicator renders
- **THEN** the indicator shows the previous status with a small "stale" decoration; no toast appears (failures on a 60 s poll would be too noisy if surfaced on every miss); only consecutive failures (3+) trigger a non-destructive toast

### Requirement: The PSP module CTA + tab access MUST be gated by capability

The sidebar entry `PSP` SHALL be visible only to users with `psp:read` capability or `OPS_ADMIN`. The page itself respects the same gate — direct navigation to `/psp` for users without the capability shows the canonical 403 surface. CTAs WITHIN the page have their own gates: `Habilitar cuenta` requires `psp:whitelist` (per Requirement 7); future CTAs (Create Movement, Create Coinag Account, Edit Label, SWIFT Import) will declare their own capability strings (`psp:create-movement`, etc.) when those follow-ups land. For v1 inline gating uses `OPS_ADMIN` as fallback for every capability check until `ops-roles` consolidates.

#### Scenario: ADMIN role sees the sidebar entry and the page

- **GIVEN** an authenticated user whose roles include `OPS_ADMIN`
- **WHEN** the sidebar renders and the user navigates to `/psp`
- **THEN** the `PSP` entry is visible under the `Operaciones` block; the page renders fully

#### Scenario: VIEWER role does NOT see the sidebar entry but can still deep-link with read capability

- **GIVEN** an authenticated user whose roles include `psp:read` only
- **WHEN** the sidebar renders
- **THEN** the `PSP` entry is visible (read capability suffices for the entry); navigating to `/psp` renders all 3 tabs in read-only mode; the `Habilitar cuenta` CTA in Cuentas is hidden

#### Scenario: User with no PSP capability is redirected to 403

- **GIVEN** an authenticated user whose roles include only `LEX_ADMIN`
- **WHEN** the user navigates directly to `/psp`
- **THEN** the page renders the canonical 403 surface (`Acceso denegado`) per `core-navigation`; the sidebar does NOT show the `PSP` entry to begin with

### Requirement: The /psp page MUST be a Type-A page with 3 internal tabs (Posición / Movimientos / Cuentas) and URL-reflected active tab

The page SHALL be implemented at `src/pages/Psp.vue` and registered at `/psp` with `meta.requiresAuth = true`, `meta.layout = 'shell'`, `meta.breadcrumb = 'PSP'`, and `meta.block = 'Operaciones'`. The composition SHALL follow the Type-A pattern from `core-module-types` with sub-module tabs (Módulo B shape per `MIGRATION-NOTES.md` Decision PSP-1): page header (title + Coinag health indicator + capability-gated CTAs), reconciliation banner area, tab indicator, active tab body. The active tab SHALL be reflected in the URL via `?tab=posicion|movimientos|cuentas` so back-navigation restores the tab. When no `?tab=` query param is set, the page reads `localStorage:ops:psp:lastTab` and uses it; if no saved value exists, defaults to `posicion`.

#### Scenario: Authenticated navigation to /psp opens the default tab

- **GIVEN** an authenticated `OPS_ADMIN` user with no prior PSP visit history
- **WHEN** the user navigates to `/psp`
- **THEN** the page renders with the AppShell, the tab indicator shows `Posición · Movimientos · Cuentas`, the active tab is `Posición`, the URL becomes `/psp?tab=posicion`, and the `localStorage` key `ops:psp:lastTab` is set to `'posicion'`

#### Scenario: Returning visit restores the last-active tab from localStorage

- **GIVEN** an authenticated user whose `localStorage:ops:psp:lastTab` is `'movimientos'`
- **WHEN** the user navigates to `/psp` (no query param)
- **THEN** the active tab on mount is `Movimientos`, the URL becomes `/psp?tab=movimientos`

#### Scenario: Switching tabs updates the URL query and persists the new active tab

- **GIVEN** the page mounted on `Posición`
- **WHEN** the user clicks the `Cuentas` tab
- **THEN** the URL becomes `/psp?tab=cuentas`, the body re-renders the Cuentas tab content, and `localStorage:ops:psp:lastTab` becomes `'cuentas'`

### Requirement: The Posición tab MUST render the strict Módulo B shape (KPI grid + filter row + sponsor → accounts tree expansible)

The Posición tab body SHALL render three sections in this exact order:

1. **KPI grid (4 cards)** at the top in a `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` layout. Each card has a small-caps label, a large mono value, and a sub-label below. The 4 KPIs are: `Posición consolidada` (sum of sponsor balances), `Liquidez disponible` (consolidated minus committed, success-toned), `Comprometido` (sum of pending movements amount, warning-toned), `Cuentas activas` (count of accounts with status `ACTIVE`).
2. **Filter row** with a left-aligned `Posición por banco sponsor` heading + spacer + two `<Select>` controls: `Banco Sponsor · Todos` and `Moneda · Todas`. Auto-applied immediately on change.
3. **Tree expansible** — one row per active banco sponsor (per the open-set `Banco Sponsor` catalog). Each row has a chevron, the sponsor name + sub-label (last-checked-at), and a totals strip on the right (`Saldo · Cuentas` count). Click anywhere on the row toggles the expansion. When expanded, an inner header row renders columns `Cuenta · Saldo · DR acum · CR acum · Posición neta`, followed by one row per account belonging to that sponsor (filtered by the moneda filter). Accounts render with an icon (wallet for ARS, building2 for foreign currencies), name + alias/CVU sub-label, saldo with currency suffix, DR/CR cumulatives derived from pending movements, and `posición neta` = `saldo + crAcum - drAcum`.

Per Decision 7d the KPI cards data MUST auto-refresh every 60 s via vue-query's `refetchInterval`. The cross-tab sponsor filter (Movimientos and Cuentas) is a separate concern owned by those tabs; clicking a sponsor row in the Posición tree toggles ONLY the local expansion, NOT the cross-tab filter.

#### Scenario: KPI grid renders 4 cards with the canonical labels and tones

- **GIVEN** the Posición tab is mounted with sponsor balances and movements loaded
- **WHEN** the page renders
- **THEN** the KPI grid shows exactly 4 cards in this order: `Posición consolidada` (neutral, mono value), `Liquidez disponible` (success-toned), `Comprometido` (warning-toned), `Cuentas activas` (neutral, integer value); the cards stack to single column below `sm`, 2 columns at `sm`, 4 columns at `lg`

#### Scenario: Tree expansion shows the account columns

- **GIVEN** the Posición tab with one active sponsor (Coinag) that has 2 accounts
- **WHEN** the operator clicks the COINAG row
- **THEN** the row chevron rotates 90°; below the row, an inner header `Cuenta · Saldo · DR acum · CR acum · Posición neta` renders, then 2 rows showing the accounts with their account-number det, saldo, DR/CR cumulatives, and posición neta

#### Scenario: Filter by Moneda hides accounts of other currencies

- **GIVEN** Coinag has 1 ARS account and 1 USD account, both in the expanded tree
- **WHEN** the operator selects `Moneda · USD` in the filter row
- **THEN** the COINAG row stays expanded; only the USD account row remains visible; the ARS row is hidden until the filter is cleared

#### Scenario: Empty state when filters yield no sponsor

- **GIVEN** the operator selects `Banco Sponsor · BIND` (a roadmap sponsor that is not yet active)
- **WHEN** the page renders
- **THEN** the tree area shows a centred `EmptyState` titled `Sin resultados` with description `Probá ajustar los filtros aplicados`

### Requirement: The legacy `?tab=disponibilidad` query param MUST redirect to `?tab=posicion`

The page SHALL detect the legacy `?tab=disponibilidad` query parameter on mount and rewrite the URL via `router.replace` to the canonical `?tab=posicion`. The active tab MUST render as Posición. Bookmarks created against the previous version of `ops-psp` (set during the period between `add-ops-psp` shipping and this extension landing) MUST normalise to the canonical query param on the first visit.

#### Scenario: Bookmark with the legacy tab name navigates to Posición

- **GIVEN** an operator has a bookmark `/psp?tab=disponibilidad`
- **WHEN** the operator opens the bookmark
- **THEN** the page renders the Posición tab; the URL bar shows `/psp?tab=posicion`; `localStorage:ops:psp:lastTab` is set to `'posicion'`

#### Scenario: A direct in-page click on the renamed tab works as before

- **GIVEN** the operator is on `/psp?tab=cuentas`
- **WHEN** the operator clicks the `Posición` tab
- **THEN** the URL becomes `/psp?tab=posicion`; the body re-renders the Posición tab content per the Posición Requirement above

#### Scenario: Empty tab param defaults to Posición (no longer Disponibilidad)

- **GIVEN** an operator opens `/psp` (no `?tab=` query param) with no `localStorage:ops:psp:lastTab` set
- **WHEN** the page renders
- **THEN** the active tab is `Posición` (the default per the new Requirement above)

