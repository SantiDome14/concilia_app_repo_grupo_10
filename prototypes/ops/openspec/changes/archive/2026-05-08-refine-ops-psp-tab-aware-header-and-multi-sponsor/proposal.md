> Jira REQ: — (no ticket; UX correction surfaced from operator testing 2026-05-08)
> Module: OPS

# Refine ops-psp — tab-aware page header + multi-sponsor Posición + closed Movimientos catalog

## Why

Operator testing of the `/psp` surface (after `extend-ops-psp-posicion-shape`
landed) surfaced four corrections that share the same root concern: the
page-header right-actions slot must follow the canonical pattern (`module
views + main CTA per active tab`), and the Posición / Movimientos tabs
must surface the open-set Banco Sponsor abstraction faithfully.

1. **Posición SHALL list every active banco sponsor.** Today the page
   activates only `COINAG`; the catalog declares `BIND` and
   `BANCO_DE_COMERCIO` as roadmap (`active: false`). Per the operator
   review, BIND and Banco de Comercio MUST be listed in the Posición
   tree (each summarising the movements + accounts attributed to that
   sponsor) even before their integration ships. The catalog flips them
   to `active: true`; balances/health are nullable for non-integrated
   sponsors and the UI degrades gracefully.

2. **Movimientos type + status filters MUST be a closed catalog.**
   Today the page derives the option lists from `Array.from(new
   Set(movements.value.map(...)))` — the dropdown shows only types/
   statuses that happen to be in the current page of results. Per the
   operator review, the catalogs are closed:
   - Type: `COLLECTOR_IN`, `COLLECTOR_OUT`, `DEPOSIT`, `FEE`,
     `FX_DEPOSIT`, `FX_WITHDRAWAL`, `INT_DEPOSIT`, `IN_WITHDRAWAL`,
     `WITHDRAWAL`.
   - Status: `COMPLETED`, `PENDING`, `FAILED`.
   Both lists prepend an `ALL` sentinel that maps to "no filter".

3. **The Coinag health chip MUST move out of the page header into the
   Posición tree per-sponsor row.** The page-header right-actions area
   is reserved for the canonical `<ViewToggle>` (3 vistas) + main CTA
   per active tab — putting a sponsor-status chip there violates that
   contract. The chip belongs inside each sponsor's collapsible header
   so it is co-located with the sponsor it describes (and so the
   header-right slot becomes available for views + CTA).

4. **The page header right-actions slot SHALL be tab-aware.**
   - **Posición:** no CTA, no `<ViewToggle>` (informational drilldown).
   - **Movimientos:** `<ViewToggle :views="['list','cards','kanban']">`
     + main CTA `Crear Movimiento` (placeholder until wired).
   - **Cuentas:** `<ViewToggle :views="['list','cards','kanban']">`
     + main CTA `Crear Cuenta` (placeholder until wired).
   The legacy "Habilitar cuenta" CTA (whitelist surface) is removed
   from the page header — the whitelist mutation surface is preserved
   for re-cabling from elsewhere (e.g. the SWIFT transactions drawer).

## What Changes

- **Modify `ops-psp` Requirement: `Coinag health MUST be polled every
  60 s and surfaced as a header indicator`** to relocate the chip from
  the page header into the per-sponsor row of the Posición tree.
- **Modify `ops-psp` Requirement: `The Posición tab MUST render the
  strict Módulo B shape (KPI grid + filter row + sponsor → accounts
  tree expansible)`** to add the per-sponsor health chip slot in the
  collapsible header AND list every active sponsor (BIND + Banco de
  Comercio included).
- **Modify `ops-psp` Requirement: `The Movimientos tab MUST render a
  paginated ledger with debounced search, filters and per-sponsor
  filter cards`** to source `type` and `status` filter options from a
  closed catalog (not derived from the current page of results).
- **Add `ops-psp` Requirement: `The /psp page header right-actions
  slot SHALL be tab-aware: ViewToggle + main CTA per active tab`** —
  Posición = none; Movimientos = `<ViewToggle>` + `Crear Movimiento`;
  Cuentas = `<ViewToggle>` + `Crear Cuenta`.
- **Modify `ops-psp` Requirement: `Capability gating + sidebar entry
  visibility`** to retire the `psp:whitelist` gate from the page-level
  CTA (the whitelist surface is preserved as a reusable component for
  drawer-context invocation; the page-level main CTA `Crear Cuenta`
  is gated on `psp:create-account || OPS_ADMIN` and falls through to
  `OPS_ADMIN` until the capability is provisioned).
- **Activate the open-set sponsor catalog.** `sponsor-catalog.ts`:
  flip `BIND` and `BANCO_DE_COMERCIO` to `active: true`. The
  `SPONSOR_CATALOG` order remains the display order. (`activeSponsors()`
  now returns 3 entries.)
- **Define the closed Movimientos catalog.** Create
  `src/ops/movimientos/catalog.ts` with `MOVEMENT_TYPE_OPTIONS` and
  `MOVEMENT_STATUS_OPTIONS` (each entry has `value`, `label`). Both
  the `/movimientos` standalone page AND the `/psp?tab=movimientos`
  tab MUST consume the catalog (no derived options).
- **Implementation surface:**
  - `src/pages/Psp.vue` — remove the `<CoinagHealthIndicator>` from
    the header; render a tab-aware right-actions block; add
    `onCrearMovimiento()` + `onCrearCuenta()` placeholder handlers
    (toast); pass `health` prop into `<PosicionTree>`.
  - `src/ops/psp/PosicionTree.vue` — accept `health: CoinagHealth |
    null` prop; render `<CoinagHealthIndicator>` only inside the
    COINAG sponsor row's header (BIND / Banco de Comercio render a
    neutral `Sin integración` chip until their endpoint exists).
  - `src/ops/psp/sponsor-catalog.ts` — flip BIND/BANCO_DE_COMERCIO
    `active: true`.
  - `src/ops/movimientos/catalog.ts` — new file, closed type/status
    catalog.
  - `src/pages/Movimientos.vue` + `src/ops/psp/MovementsFilters.vue`
    + `src/ops/movimientos/MovimientosFilters.vue` — consume the
    closed catalog (replace derived option lists).

## Capabilities

### Affected Capabilities

- `ops-psp` — 4 Modified Requirements + 1 Added Requirement.

### New Capabilities

None.

### Removed from scope

- **A real `Crear Movimiento` / `Crear Cuenta` mutation surface.**
  The CTAs ship as placeholder toasts pending separate
  `extend-ops-psp-create-movement` and `extend-ops-psp-create-account`
  follow-up changes. The page-header structure (CTA + handler + a11y)
  is in scope; the modal/form composition is not.
- **Real BIND / Banco de Comercio integration data.** The catalog
  flip activates the sponsors structurally; balances and health
  remain `null` for non-integrated sponsors and the UI degrades to
  `Sin chequeos` / `Sin integración`.
- **Per-sponsor health endpoints for BIND / Banco de Comercio.** The
  health chip slot is generic (per-sponsor); only COINAG renders a
  concrete `<CoinagHealthIndicator>` in v1.
- **`<ViewToggle>` cards / kanban renders for Movimientos and Cuentas
  tab bodies.** The toggle is rendered structurally (so the operator
  sees the canonical layout); the cards / kanban implementations
  remain pending — the list render is shown for all three view modes
  in v1. A follow-up `extend-ops-psp-alternative-views` covers the
  alt-view implementations.
