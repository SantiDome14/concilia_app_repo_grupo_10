## MODIFIED Requirements

### Requirement: The /psp page MUST be a Type-A page with 3 internal tabs (Posición / Movimientos / Cuentas) and URL-reflected active tab

The page SHALL be implemented at `src/pages/Psp.vue` and registered at `/psp` with `meta.requiresAuth = true`, `meta.layout = 'shell'`, `meta.breadcrumb = 'PSP'`, and `meta.block = 'Operaciones'`. The composition SHALL follow the Type-A pattern from `core-module-types` with sub-module tabs (Módulo B shape per `MIGRATION-NOTES.md` Decision PSP-1): page header (title + tab-aware right-actions per the `tab-aware right-actions` Requirement), reconciliation banner area, tab indicator, active tab body. The active tab SHALL be reflected in the URL via `?tab=posicion|movimientos|cuentas` so back-navigation restores the tab. **The initial tab MUST default to `posicion` whenever no `?tab=` query parameter is set, regardless of any persisted state.** The page MAY still write `localStorage:ops:psp:lastTab` on tab switches for analytics or future re-introduction of saved state, but SHALL NOT read it as a default-tab source on mount.

#### Scenario: Authenticated navigation to /psp opens the Posición tab

- **GIVEN** an authenticated `OPS_ADMIN` user with no prior PSP visit history
- **WHEN** the user navigates to `/psp`
- **THEN** the page renders with the AppShell, the tab indicator shows `Posición · Movimientos · Cuentas`, the active tab is `Posición`, the URL becomes `/psp?tab=posicion`

#### Scenario: Returning visit ignores any persisted tab and defaults to Posición

- **GIVEN** an authenticated user whose `localStorage:ops:psp:lastTab` is `'movimientos'` (set by a previous visit)
- **WHEN** the user navigates to `/psp` (no query param)
- **THEN** the active tab on mount is `Posición` (NOT `Movimientos`); the URL becomes `/psp?tab=posicion`; the persisted `lastTab` is overwritten or ignored

#### Scenario: Switching tabs updates the URL query

- **GIVEN** the page mounted on `Posición`
- **WHEN** the user clicks the `Cuentas` tab
- **THEN** the URL becomes `/psp?tab=cuentas`, the body re-renders the Cuentas tab content

#### Scenario: A direct ?tab=movimientos URL still wins over the default

- **GIVEN** an authenticated user navigates directly to `/psp?tab=movimientos`
- **WHEN** the page mounts
- **THEN** the active tab is `Movimientos` (the explicit query param overrides the default); the URL stays `/psp?tab=movimientos`

### Requirement: The /psp page header right-actions slot SHALL be tab-aware: ViewToggle + main CTA per active tab

The `/psp` page header right-actions area SHALL be tab-aware. The slot is reserved for the canonical `<ViewToggle>` (3 vistas: `list` / `cards` / `kanban`) + main CTA per active tab; nothing else. The exact composition per tab:

- **Posición** — main CTA `Crear Movimiento` (variant `primary`). NO `<ViewToggle>` (Posición is an informational drilldown, not a list view). The CTA shares the same handler as the Movimientos-tab CTA and is gated by `psp:create-movement || OPS_ADMIN`. In v1 the handler shows a toast (`Crear movimiento — pendiente de wireado al backend`); the real mutation surface is owned by the follow-up `extend-ops-psp-create-movement` change.
- **Movimientos** — `<ViewToggle :views="['list','cards','kanban']">` + main CTA `Crear Movimiento` (variant `primary`). The CTA renders AFTER the `<ViewToggle>`. Same gate + handler as the Posición-tab CTA.
- **Cuentas** — `<ViewToggle :views="['list','cards','kanban']">` + main CTA `Crear Cuenta` (variant `primary`). The CTA renders AFTER the `<ViewToggle>` and is gated by capability `psp:whitelist || OPS_ADMIN`. Clicking opens `<WhitelistAccountModal>` (reused from `ops-clients` per the cross-capability composition contract). In the PSP domain, "crear cuenta" IS the whitelist flow: the operator selects a client and enables a Coinag CVU/CBU as an outbound destination — technically the creation of a sub-account for a client under one of the partners. The CTA is the page-header rename and relocation of the previous body-level `Habilitar cuenta` CTA — same modal surface, same gate, same `created` event invalidating `['ops', 'psp', 'accounts', ...]`.

The `<ViewToggle>` mounts in v1 on Movimientos and Cuentas, but the `cards` and `kanban` view modes fall through to the `list` render (the alt-view bodies are owned by the `extend-ops-psp-alternative-views` follow-up). The toggle is structurally present so the operator sees the canonical layout; switching modes does not break the page.

#### Scenario: Posición tab shows Crear Movimiento and no ViewToggle

- **GIVEN** an authenticated `OPS_ADMIN` user navigates to `/psp?tab=posicion`
- **WHEN** the page renders
- **THEN** the page header right-actions slot shows ONLY a primary button `Crear Movimiento` (no `<ViewToggle>`, no `Crear Cuenta`); clicking the button surfaces a toast `Crear movimiento — pendiente de wireado al backend`

#### Scenario: Movimientos tab shows ViewToggle + Crear Movimiento (toggle first, CTA second)

- **GIVEN** an authenticated `OPS_ADMIN` user navigates to `/psp?tab=movimientos`
- **WHEN** the page renders
- **THEN** the page header right-actions slot renders the `<ViewToggle>` (3 icons: list / cards / kanban) followed by a primary button `Crear Movimiento`; clicking the button surfaces a toast `Crear movimiento — pendiente de wireado al backend`

#### Scenario: Cuentas tab shows ViewToggle + Crear Cuenta wired to the whitelist modal

- **GIVEN** an authenticated `OPS_ADMIN` user navigates to `/psp?tab=cuentas`
- **WHEN** the page renders
- **THEN** the page header right-actions slot shows the `<ViewToggle>` followed by a primary button `Crear Cuenta`; clicking the button opens `<WhitelistAccountModal>` (the same modal that was previously triggered by the body-level `Habilitar cuenta` CTA — same picker-prefixed flow, same gate `psp:whitelist || OPS_ADMIN`, same invalidation on `created`); the legacy body-level `Habilitar cuenta` CTA is NOT rendered (it has been replaced by this page-header relocation)

#### Scenario: Switching tabs swaps the right-actions content live

- **GIVEN** the page is mounted on `Movimientos` (ViewToggle + Crear Movimiento)
- **WHEN** the operator clicks the `Posición` tab
- **THEN** the right-actions slot drops the `<ViewToggle>` but KEEPS `Crear Movimiento` (now the only control); clicking back to `Cuentas` renders ViewToggle + `Crear Cuenta`

#### Scenario: VIEWER role still sees the ViewToggle but not the main CTA

- **GIVEN** an authenticated user with `psp:read` only is on `/psp?tab=movimientos`
- **WHEN** the page renders
- **THEN** the `<ViewToggle>` is visible (read-only, no capability gate); the `Crear Movimiento` CTA is hidden (gated by `psp:create-movement || OPS_ADMIN`)

### Requirement: The Posición tab MUST render the strict Módulo B shape (KPI grid + filter row + sponsor → accounts tree expansible)

The Posición tab body SHALL render three sections in this exact order:

1. **KPI grid (4 cards)** at the top in a `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` layout. Each card has a small-caps label, a large mono value, and a sub-label below. The 4 KPIs are: `Posición consolidada` (sum of partner balances), `Liquidez disponible` (consolidated minus committed, success-toned), `Comprometido` (sum of pending movements amount, warning-toned), `Cuentas activas` (count of accounts with status `ACTIVE`).
2. **Filter row** with a left-aligned `Posición por partner` heading + spacer + two `<Select>` controls: `Partner · Todos` and `Moneda · Todas`. Auto-applied immediately on change.
3. **Tree expansible** — one row per active partner (per the open-set partner catalog — internal type names retain the `Sponsor` / `BancoSponsor` identifiers, but every USER-FACING string SHALL render as `Partner` / `Banco Partner`). The catalog SHALL list every entry with `active: true`; in v1 that means `COINAG`, `BIND`, and `BANCO_DE_COMERCIO` (BIND + Banco de Comercio render structurally even before their integration ships — balances and health are nullable and the UI degrades gracefully). Each row has a chevron, the partner name + sub-label (last-checked-at), a per-partner status chip slot (the `<CoinagHealthIndicator>` for COINAG; a neutral `Sin integración` chip for BIND / Banco de Comercio in v1), and a totals strip on the right (`Saldo · Cuentas` count). Click anywhere on the row toggles the expansion. When expanded, an inner header row renders columns `Cuenta · Saldo · DR acum · CR acum · Posición neta`, followed by one row per account belonging to that partner (filtered by the moneda filter). Accounts render with an icon (wallet for ARS, building2 for foreign currencies), name + alias/CVU sub-label, saldo with currency suffix, DR/CR cumulatives derived from pending movements, and `posición neta` = `saldo + crAcum - drAcum`.

Per Decision 7d the KPI cards data MUST auto-refresh every 60 s via vue-query's `refetchInterval`. The cross-tab partner filter (Movimientos and Cuentas) is a separate concern owned by those tabs; clicking a partner row in the Posición tree toggles ONLY the local expansion, NOT the cross-tab filter.

#### Scenario: KPI grid renders 4 cards with the canonical labels and tones

- **GIVEN** the Posición tab is mounted with partner balances and movements loaded
- **WHEN** the page renders
- **THEN** the KPI grid shows exactly 4 cards in this order: `Posición consolidada` (neutral, mono value), `Liquidez disponible` (success-toned), `Comprometido` (warning-toned), `Cuentas activas` (neutral, integer value); the cards stack to single column below `sm`, 2 columns at `sm`, 4 columns at `lg`

#### Scenario: Tree expansion shows the account columns

- **GIVEN** the Posición tab with COINAG that has 2 accounts
- **WHEN** the operator clicks the COINAG row
- **THEN** the row chevron rotates 90°; below the row, an inner header `Cuenta · Saldo · DR acum · CR acum · Posición neta` renders, then 2 rows showing the accounts with their account-number det, saldo, DR/CR cumulatives, and posición neta

#### Scenario: Filter by Moneda hides accounts of other currencies

- **GIVEN** Coinag has 1 ARS account and 1 USD account, both in the expanded tree
- **WHEN** the operator selects `Moneda · USD` in the filter row
- **THEN** the COINAG row stays expanded; only the USD account row remains visible; the ARS row is hidden until the filter is cleared

#### Scenario: BIND and Banco de Comercio render as collapsible rows even without backend integration

- **GIVEN** the catalog activates COINAG, BIND, and BANCO_DE_COMERCIO; only COINAG has balances/accounts/health from the backend
- **WHEN** the Posición tab renders
- **THEN** the tree shows three collapsible rows in catalog display order; the BIND and Banco de Comercio rows show `$0.00` saldo and `0` cuentas + a neutral `Sin integración` chip in the per-partner status slot; expanding either row shows the inner header followed by the empty-state `Sin cuentas para los filtros aplicados`

#### Scenario: Filter `Partner · BIND` shows the BIND row alone

- **GIVEN** the operator selects `Partner · BIND` in the filter row (the dropdown placeholder reads `Partner · Todos` by default)
- **WHEN** the page renders
- **THEN** the tree shows ONLY the BIND row (collapsed by default, with the `Sin integración` chip and `0` cuentas); the COINAG and Banco de Comercio rows are hidden until the filter is cleared

#### Scenario: User-facing labels render `Partner` not `Sponsor` / `Banco Sponsor`

- **GIVEN** the Posición tab is mounted
- **WHEN** the page renders
- **THEN** the heading reads `Posición por partner`; the dropdown placeholder reads `Partner · Todos`; no user-visible string contains the words `Sponsor` or `Banco Sponsor`; internal type names (`SponsorCode`, `BancoSponsor`) and the API field name (`sponsor`) are unaffected by this rename

### Requirement: The Movimientos tab MUST render a paginated ledger with debounced search, filters and per-sponsor filter cards

The Movimientos tab body SHALL render three sections in this exact order:

1. **KPI grid (4 cards)** at the top in a `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` layout (same chrome as the Posición tab). The 4 KPIs are: `Movimientos hoy` (count today, neutral), `Volumen neto hoy` (signed sum today, mono with sign + colour by sign), `Pendientes` (count with `status = PENDING`, warning), `COMPLETED esta semana` (count with `status = COMPLETED` over the last 7 days, success).
2. **Filter row** — `Búsqueda` text input debounced 300 ms; `Partner`, `Tipo`, `Estado`, `Origen` selects applied immediately. The per-partner pill cards row (the previous separate section above the filter row) is REMOVED — partner is just another Select alongside the others. The `Tipo` and `Estado` options SHALL come from a closed catalog defined in `src/ops/movimientos/catalog.ts` (NOT derived from the current page of results — the catalog is the source of truth so the operator sees every option even when the current page contains no rows of a given type). The closed catalogs are:
   - `Partner`: every entry of the active partner catalog (in v1: `COINAG`, `BIND`, `Banco de Comercio`).
   - `Tipo`: `COLLECTOR_IN`, `COLLECTOR_OUT`, `DEPOSIT`, `FEE`, `FX_DEPOSIT`, `FX_WITHDRAWAL`, `INT_DEPOSIT`, `IN_WITHDRAWAL`, `WITHDRAWAL` (display labels use spaces, e.g. `COLLECTOR IN`).
   - `Estado`: `COMPLETED`, `PENDING`, `FAILED`.
   - Each Select prepends an `ALL` sentinel that maps to "no filter" (rendered as `Partner · Todos`, `Todos los tipos`, `Todos los estados`, `Todos los orígenes`).
   - `Origen`: open-set placeholder (`MANUAL`, `SWIFT`, `AUTO`) until the backend confirms the canonical list.
3. **Ledger table** — paginated movements table with the canonical columns (the `Sponsor` column heading SHALL render as `Partner`); row click is NO-OP in v1 (the Movement Details modal is owned by the future `extend-ops-psp-movement-details-modal` follow-up).

Filter state SHALL be reflected in the URL (`?tab=movimientos&sponsor=...&type=...&status=...&origin=...&search=...&page=...`). The `?sponsor=` URL param semantics stay unchanged so legacy bookmarks still work — only the UI control through which the operator sets it has changed (Select instead of pill cards).

#### Scenario: Filter row is the only filter UI (no pill cards)

- **GIVEN** the Movimientos tab mounts with 50 movements loaded
- **WHEN** the page renders
- **THEN** the KPI grid is the FIRST element of the tab body; below it the filter row renders four Selects (`Partner`, `Tipo`, `Estado`, `Origen`) + the search input — there is NO row of partner pill cards; the table renders below the filter row

#### Scenario: KPI cards reflect the filtered view (not just the global state)

- **GIVEN** the operator filters to `?sponsor=COINAG&type=DEPOSIT`
- **WHEN** the page re-fetches the movements
- **THEN** the KPI `Movimientos hoy` shows the count of COINAG deposits today (NOT the global count); the cards re-render whenever the filter changes

#### Scenario: Partner Select toggles the filter and re-fetches the ledger

- **GIVEN** the operator is on Movimientos with no partner filter
- **WHEN** the operator selects `Partner · COINAG` in the Select
- **THEN** the URL gains `&sponsor=COINAG` (the URL param keyword is preserved for backwards compatibility); the ledger re-fetches with the partner filter; the KPI cards update to reflect the now-filtered view

#### Scenario: Partner Select lists every active partner (COINAG + BIND + Banco de Comercio)

- **GIVEN** the catalog activates COINAG, BIND, and BANCO_DE_COMERCIO
- **WHEN** the operator opens the `Partner` Select
- **THEN** the Select lists, in catalog display order: `Partner · Todos`, `COINAG`, `BIND`, `Banco de Comercio`; selecting `BIND` filters the ledger and renders the empty-state because no BIND movements exist yet

#### Scenario: Type and Status dropdowns expose the closed catalog regardless of page contents

- **GIVEN** the current page of movements contains only `DEPOSIT` rows in `COMPLETED` status
- **WHEN** the operator opens the `Tipo` dropdown and the `Estado` dropdown
- **THEN** the `Tipo` dropdown lists every entry of the closed catalog (`COLLECTOR IN`, `COLLECTOR OUT`, `DEPOSIT`, `FEE`, `FX DEPOSIT`, `FX WITHDRAWAL`, `INT DEPOSIT`, `IN WITHDRAWAL`, `WITHDRAWAL`) preceded by `Todos los tipos`; the `Estado` dropdown lists `Todos los estados`, `COMPLETED`, `PENDING`, `FAILED`; selecting `FAILED` filters the ledger and renders the empty-state `Sin resultados para los filtros aplicados`

#### Scenario: Manual filter combination persists in the URL

- **GIVEN** the operator sets `Partner = COINAG`, `Tipo = DEPOSIT`, `Estado = COMPLETED`, and types `acme` into the search
- **WHEN** the search debounces (300 ms)
- **THEN** the URL becomes `/psp?tab=movimientos&sponsor=COINAG&type=DEPOSIT&status=COMPLETED&search=acme`; the table fetches with all four filters; back-navigation away and back restores the URL exactly

#### Scenario: Ledger column header reads `Partner` not `Sponsor`

- **GIVEN** the Movimientos tab is mounted
- **WHEN** the operator inspects the table header
- **THEN** the partner column renders as `Partner` (no user-visible `Sponsor` label remains in the table header or anywhere in the tab body)

### Requirement: Coinag health MUST be polled every 60 s and surfaced inside the Posición tab per-sponsor row

The page SHALL fire `GET /coinag/health` on mount and every 60 s thereafter via `vue-query`'s `refetchInterval`. The `<CoinagHealthIndicator>` SHALL render INSIDE the Posición tab tree, scoped to the COINAG partner's collapsible header (NOT in the page header — that slot is reserved for `<ViewToggle>` + main CTA per active tab). The indicator shows one of three states: `healthy` (green dot + label `Operativo`), `degraded` (warning dot + label `Degradado`), `down` (danger dot + label `Caído`). **The label SHALL NOT include the partner name as a prefix** — the chip already lives inside the COINAG row's collapsible header, so the partner name is redundant. The label tooltip exposes the `last-checked-at` timestamp + the optional `message` field. The indicator is read-only (no click action in v1). For partners without a health endpoint (BIND, Banco de Comercio in v1), the per-partner row renders a neutral `Sin integración` chip in the same slot.

#### Scenario: Healthy status renders the green indicator with the generic label

- **GIVEN** `GET /coinag/health` returns `{ status: 'healthy' }` and the operator is on the Posición tab
- **WHEN** the page renders
- **THEN** the COINAG partner row's collapsible header shows the indicator with a success-coloured dot + label `Operativo` (NOT `Coinag operativo`); the page header right-actions slot does NOT show the chip

#### Scenario: Degraded or down statuses render the warning/danger indicator with the generic label

- **GIVEN** `GET /coinag/health` returns `{ status: 'degraded', message: 'High latency on /movements' }`
- **WHEN** the indicator renders
- **THEN** the COINAG row's chip is warning-coloured + label reads `Degradado` (NOT `Coinag degradado`); hovering shows the tooltip `High latency on /movements · checked Hace 2 min`

#### Scenario: 60-s polling updates the indicator without page reload

- **GIVEN** the indicator is mounted as `Operativo` inside the COINAG row
- **WHEN** 60 s pass and the next poll returns `down`
- **THEN** the chip re-renders as `down` (danger-coloured dot + label `Caído`); no skeleton flash; the underlying health query continues polling

#### Scenario: Partners without a health endpoint render a neutral placeholder

- **GIVEN** the catalog activates `BIND` and `BANCO_DE_COMERCIO` but no health endpoint exists for them
- **WHEN** the Posición tree renders
- **THEN** the BIND row and the Banco de Comercio row each render a neutral `Sin integración` chip in the per-partner slot; only the COINAG row mounts the `<CoinagHealthIndicator>`
