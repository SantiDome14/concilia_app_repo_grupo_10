## REMOVED Requirements

### Requirement: The /psp page MUST be a Type-A page with 3 internal tabs (Disponibilidad / Movimientos / Cuentas) and URL-reflected active tab

**Reason for removal:** Tab 1 is renamed `Disponibilidad → Posición` per `MIGRATION-NOTES.md` Decision PSP-1 (faithful Módulo B shape). Replaced by the ADDED requirement of the same shape with the new tab name list.

### Requirement: The Disponibilidad tab MUST render one balance card per banco sponsor with click-to-filter cross-tab persistence

**Reason for removal:** The simple cards-row shape is superseded by the strict Módulo B shape (KPI grid + filter row + sponsor → accounts tree expansible). Replaced by the ADDED requirement `The Posición tab MUST render the strict Módulo B shape ...`.

## ADDED Requirements

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

## MODIFIED Requirements

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
