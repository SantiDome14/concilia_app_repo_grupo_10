> Jira REQ: — (no ticket; UX correction surfaced from operator testing 2026-05-08)
> Module: OPS

# Refactor ops-financial-dashboard into ops-movimientos + ops-cotizaciones

## Why

Operator testing surfaced that the legacy `FinancialDashboard.vue` concentrated
two unrelated surfaces — Movements and Quotes — under a single "Dashboard"
roof because the legacy did not yet have a sub-module-tabs primitive. The
`add-ops-financial-dashboard` migration ported that shape 1:1 (Type-A page
with Activity + Quotes tabs) instead of recognising the legacy concentration
as an architectural error.

The correction is structural:

- **Movements** and **Quotes** are independent operational surfaces. They
  have different audiences (Movements: ops + finance generalists; Quotes:
  trading desk), different update cadences (Movements: streaming-ish;
  Quotes: short-lived), and different navigation paths from the operator's
  daily flow (Movements is "what happened"; Quotes is "what's available
  now"). Forcing them into one dashboard hides each from operators who
  only care about one.
- The "dashboard" concept is already owned by `core-modulo-genericos` at
  the bare `/` route — that page surfaces cross-module KPIs / widgets /
  alerts, which is the canonical "what's the state of the world?" surface.
  A second OPS-specific dashboard at `/financial-dashboard` was a
  duplication.

This change **removes `ops-financial-dashboard` entirely** and creates two
independent capabilities:

- **`ops-movimientos`** — a Type-A master list at `/movimientos` for the
  movements ledger. Inherits the existing chrome (sponsor cards filter,
  search, type/status/origin selects, paginated table, MovementDetailsModal
  with Receipt download) — same behaviour, different surface entry.
- **`ops-cotizaciones`** — a Type-A master list at `/cotizaciones` for the
  quotes ledger. Inherits the existing chrome (sub-toggle Active/Historic,
  operation/pair filters, paginated table, status badge with deferred-action
  tooltip).

The `MovementDetailsModal` keeps its **canonical home** (per
`add-ops-financial-dashboard` Decision 2) — it just moves from
`src/ops/financial-dashboard/MovementDetailsModal.vue` to
`src/ops/movimientos/MovementDetailsModal.vue`. The future
`extend-ops-psp-movement-details-modal` follow-up imports from the new path.

## What Changes

- **REMOVE the `ops-financial-dashboard` capability entirely.** All 11
  Requirements are removed; no equivalent dashboard surface replaces it.
  The legacy `/dashboard` URL redirects to `/movimientos` (preserves the
  most-used legacy entry point — operators going to "the dashboard" expect
  to land on activity).
- **CREATE the `ops-movimientos` capability** at `/movimientos`. The
  surface inherits the Activity tab's behaviour: paginated movements
  ledger + sponsor filter cards + filter row (search/type/status/origin) +
  row click opens MovementDetailsModal + Receipt download action +
  deep-link `?movement=:id`.
- **CREATE the `ops-cotizaciones` capability** at `/cotizaciones`. The
  surface inherits the Quotes tab's behaviour: sub-toggle Active/Historic
  (`?view=active|historic`) + operation/pair filters + paginated quotes
  ledger + status as read-only badge with `Acciones de quote disponibles
  próximamente` tooltip.
- **Move the canonical home of `<MovementDetailsModal>`** from
  `src/ops/financial-dashboard/` to `src/ops/movimientos/`. Cross-capability
  consumers (today: future `extend-ops-psp-movement-details-modal`) MUST
  import from the new path.
- **Sidebar update:** remove the `Financial Dashboard` entry; add
  `Movimientos` + `Cotizaciones` entries under the `Operaciones` block.
- **Implementation:** renames + small adjustments — no new behaviour is
  introduced versus the existing `ops-financial-dashboard` shape; this is
  a structural refactor surfaced via two capabilities instead of one.

## Capabilities

### Affected Capabilities

None (the canonical `<WhitelistAccountModal>` reuse is unchanged; the
`<MovementDetailsModal>` import path moves but no other capability has
imported it yet — `ops-psp` is the future consumer per its design.md
Open question 3).

### New Capabilities

- `ops-movimientos` (OPS module; movements ledger) — 7 requirements, ~21 scenarios.
- `ops-cotizaciones` (OPS module; quotes ledger) — 5 requirements, ~15 scenarios.

### Removed Capabilities

- `ops-financial-dashboard` — the entire capability is removed; its 11
  Requirements are split between `ops-movimientos` (Activity-tab behaviour)
  and `ops-cotizaciones` (Quotes-tab behaviour). The `?tab=` URL semantic
  is dropped because each capability is now a top-level page; deep-links
  to a specific movement (`?movement=:id`) move to `/movimientos?movement=:id`.

### Removed from scope

- **A combined dashboard surface** is NOT recreated under any name. If
  product later wants a dashboard-style summary (e.g. "movements + quotes
  KPIs in one screen"), it lands as widgets on the canonical `/` Dashboard
  per `core-modulo-genericos` — NOT as another OPS-specific
  `/some-dashboard` route.
- The `MovementDetailsModal` shape itself is unchanged (canonical home moves
  paths but the component keeps its props / emits / render).
- No new tests are added beyond mechanical relocation. The existing
  `MovementDetailsModal.spec.ts`, `ActivityTable.spec.ts`,
  `QuotesTable.spec.ts`, `api.spec.ts` are renamed/redistributed under the
  two new module folders.
