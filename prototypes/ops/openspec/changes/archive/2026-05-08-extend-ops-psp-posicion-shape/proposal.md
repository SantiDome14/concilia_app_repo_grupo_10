> Jira REQ: — (no ticket; UX correction surfaced from operator testing 2026-05-08)
> Module: OPS

# Extend ops-psp — Posición tab adopts the strict Módulo B shape

## Why

When an operator ran the `/psp` page after the `add-ops-psp` migration
landed, they reported that the first tab (`Disponibilidad`) was visually
inconsistent with the canonical Módulo B shape from `_core-template-frontend/src/
pages/ModuloB.vue`. The Disponibilidad tab shipped a simple 3-column row
of `<SponsorBalanceCard>` instances; the canonical Módulo B treasury
shape is significantly richer:

- A 4-card **KPI grid** at the top (`Posición consolidada · Liquidez disponible · Comprometido · Cuentas activas`).
- A **filter row** below the KPIs (sociedad / moneda — for PSP: banco sponsor / moneda).
- A **tree expansible**: top-level rows are sociedades (for PSP: sponsors); each row expands to show its accounts in a table-grid with columns `Saldo · DR acum · CR acum · Posición neta`.

Per `MIGRATION-NOTES.md` Decision PSP-1, **PSP MUST adopt the Módulo B
shape**. The `add-ops-psp` change implemented an incomplete version: it
got the 3-tab decomposition right (Disponibilidad / Movimientos / Cuentas)
and the open-set Banco Sponsor abstraction right, but the tab body was
NOT a faithful Módulo B implementation — it was a simplified row of cards
that misses the KPI grid AND the tree expansible.

This change extends `ops-psp` with two `MODIFIED Requirement` entries that
correct the deviation:

1. **Tab 1 SHALL be renamed** `Disponibilidad → Posición`. The URL param
   becomes `?tab=posicion`; the legacy `?tab=disponibilidad` redirects.
2. **The Posición tab body SHALL adopt the strict Módulo B shape** — KPI
   grid + filter row + tree expansible per Banco Sponsor with nested
   accounts.
3. **The Movimientos tab SHALL gain a 4-card KPI grid** above the existing
   sponsor-cards filter row, mirroring Módulo B's Movimientos shape.

## What Changes

- **Modify `ops-psp` Requirement 4** (`The Disponibilidad tab MUST render one balance card per banco sponsor with click-to-filter cross-tab persistence`) to a new shape:
  - Tab name: `Disponibilidad` → `Posición`.
  - Body: KPI grid (4 cards: Posición consolidada / Liquidez disponible / Comprometido / Cuentas activas) + filter row (banco sponsor + moneda) + tree expansible per sponsor → nested account rows.
  - Sponsor cards click-to-filter cross-tab persistence is **preserved** (clicking the chevron-row of a sponsor toggles the tree expansion; clicking the sponsor-name area pre-applies the cross-tab filter when switching to Movimientos / Cuentas).
- **Modify `ops-psp` Requirement 5** (`The Movimientos tab MUST render a paginated ledger with debounced search, filters and per-sponsor filter cards`) to add a KPI grid:
  - 4 cards above the existing sponsor cards: `Movimientos hoy · Volumen neto hoy · Pendientes · Movimientos COMPLETED esta semana`.
  - The existing per-sponsor filter cards + filter row + ledger remain unchanged.
- **Add a new ops-psp scenario** to Requirement 1: the legacy `?tab=disponibilidad` query param redirects to `?tab=posicion` (preserves bookmarks operators may have set up since `add-ops-psp` shipped).
- **Define the typed surface for the new shape:**
  - `src/ops/psp/PosicionKpis.vue` — 4-card KPI grid.
  - `src/ops/psp/PosicionTree.vue` — sponsor → accounts tree expansible.
  - `src/ops/psp/MovimientosKpis.vue` — 4-card KPI grid for Movimientos tab.
  - The existing `<SponsorBalanceCard>` component is **retained but no longer used in Posición** — it was a card-row primitive; the tree shape supersedes it. Mark it deprecated in the file header (deletion is a follow-up after the Posición tab ships).
- **Capabilities composition unchanged.** No sibling capability is modified by this change.

## Capabilities

### Affected Capabilities

- `ops-psp` — 2 Modified Requirements (4 + 5) + 1 Added scenario on Requirement 1.

### New Capabilities

None.

### Removed from scope

- **Backend endpoint shape for KPIs.** Today `/balance-reconciliation` returns
  per-sponsor balances + mismatches; it does NOT pre-compute consolidated
  metrics like "Liquidez disponible" or "Comprometido". The frontend computes
  these from the sponsor balances + the (already-fetched) movements query
  for the current date. If product later wants pre-computed metrics from the
  backend (e.g. for performance or correctness over historical windows), a
  future `extend-ops-psp-posicion-kpi-backend` change moves the computation
  server-side.
- **Drag-to-reorder on the tree.** Sponsors render alphabetically per
  `MIGRATION-NOTES.md` PSP-1. Reordering UX is a separate concern.
- **Posición filters by date range / "as of" date.** v1 of Posición shows
  the current state; historical state requires a separate API. Out of scope.
