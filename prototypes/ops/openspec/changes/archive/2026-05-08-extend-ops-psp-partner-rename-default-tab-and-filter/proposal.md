> Jira REQ: — (no ticket; UX correction surfaced from operator testing 2026-05-08)
> Module: OPS

# Extend ops-psp — Partner rename, Posición default + Crear Movimiento, partner-as-filter, generic health chip

## Why

A second round of operator testing on `/psp` (after
`refine-ops-psp-tab-aware-header-and-multi-sponsor` landed) surfaced
five small but coherent corrections:

1. **Posición MUST be the hard default tab.** Today the page reads
   `localStorage:ops:psp:lastTab` before falling back to Posición. The
   side-effect: an operator who last visited Movimientos lands on
   Movimientos when they expected the canonical Posición view. Drop
   the localStorage-as-default-source; Posición is the unconditional
   default when no `?tab=` query param is set.

2. **`Crear Movimiento` MUST also render on the Posición tab.**
   Posición is a high-traffic landing surface — the operator's main
   action from there is creating a movement. Today `Crear Movimiento`
   is only visible on Movimientos. Render it on Posición as well.
   Posición still does NOT mount a `<ViewToggle>` (the tab is an
   informational drilldown, not a list view).

3. **Rename the open-set abstraction's user-facing label from
   `Sponsor` / `Banco Sponsor` to `Partner`.** The operator vocabulary
   has stabilised on "partner" — matching how the integration team and
   the legacy product use the term. This is a USER-FACING rename
   only: column headings, dropdown labels, filter placeholders, page
   sub-labels. Internal type names (`SponsorCode`, `BancoSponsor`)
   and the API field name (`sponsor: string`) STAY — the cost of
   renaming the data layer is high (API contract + queryKey + many
   call sites) and the value is purely cosmetic.

4. **Movimientos partner filter MUST be a Select, not pill cards.**
   Today the Movimientos tab body opens with a row of partner pill
   cards (one per active partner). Per the operator review, the
   partner filter SHALL be relocated into the filter row alongside
   `Tipo` / `Estado` / `Origen` (a fourth `Partner` Select). This is
   visually consistent with the standalone `/movimientos` page after
   the same change is mirrored there.

5. **The Coinag health chip label MUST drop the partner name.** Today
   it reads `Coinag operativo` / `Coinag degradado` / `Coinag caído`.
   The chip already lives inside the COINAG row's collapsible header
   (per `refine-ops-psp-tab-aware-header-and-multi-sponsor`) — the
   sponsor name is redundant in the label. The new labels are
   generic: `Operativo` / `Degradado` / `Caído`.

## What Changes

- **Modify `ops-psp` Requirement: `The /psp page MUST be a Type-A page
  with 3 internal tabs (Posición / Movimientos / Cuentas) and
  URL-reflected active tab`** — drop the localStorage scenario; the
  initial tab MUST default to `posicion` whenever no `?tab=` query
  param is set, ignoring any persisted state.
- **Modify `ops-psp` Requirement: `The /psp page header right-actions
  slot SHALL be tab-aware: ViewToggle + main CTA per active tab`** —
  Posición now renders the main CTA `Crear Movimiento` (no
  `<ViewToggle>` — Posición is an informational drilldown). Movimientos
  and Cuentas unchanged. The order on Movimientos and Cuentas remains:
  `<ViewToggle>` first, then the main CTA.
- **Modify `ops-psp` Requirement: `The Posición tab MUST render the
  strict Módulo B shape (KPI grid + filter row + sponsor → accounts
  tree expansible)`** — every user-facing string referring to
  "sponsor" / "banco sponsor" SHALL render as "partner" / "banco
  partner". Internal type names / data field stay.
- **Modify `ops-psp` Requirement: `The Movimientos tab MUST render a
  paginated ledger with debounced search, filters and per-sponsor
  filter cards`** — the Movimientos tab body SHALL drop the per-
  partner pill cards row. The partner filter SHALL be a `<Select>`
  control in the filter row (alongside `Tipo` / `Estado` / `Origen`,
  with an `ALL` sentinel). The `?sponsor=` URL param semantics stay
  unchanged (still emitted on selection; legacy bookmarks still work).
- **Modify `ops-psp` Requirement: `Coinag health MUST be polled every
  60 s and surfaced inside the Posición tab per-sponsor row`** — the
  chip labels SHALL be `Operativo` / `Degradado` / `Caído` (no
  partner name prefix); the chip remains scoped to the COINAG
  collapsible header per the prior change. The neutral `Sin
  integración` placeholder for non-integrated partners is unchanged.
- **Implementation surface:**
  - `src/pages/Psp.vue` — drop `readSavedTab()` from `initialTab`;
    `writeSavedTab()` may stay no-op or be removed; render `Crear
    Movimiento` on Posición too (no ViewToggle on Posición).
  - `src/ops/psp/CoinagHealthIndicator.vue` — `STATUS_LABEL` uses
    `Operativo` / `Degradado` / `Caído` (no `Coinag` prefix).
  - `src/ops/psp/PosicionTree.vue` — heading + filter labels rename
    `Banco Sponsor` → `Partner` / `Banco Partner`.
  - `src/ops/movimientos/MovimientosFilters.vue` — drop the partner
    pill cards section; add a `Partner` Select to the filter row.
  - `src/ops/psp/MovementsFilters.vue` — same shape change.
  - `src/ops/movimientos/MovimientosTable.vue` +
    `src/ops/psp/AccountsTable.vue` — column heading `Sponsor` →
    `Partner`.
  - All other user-facing `Sponsor` strings audited and renamed.

## Capabilities

### Affected Capabilities

- `ops-psp` — 5 Modified Requirements.

### New Capabilities

None.

### Removed from scope

- **Internal type renames (`SponsorCode` → `PartnerCode`,
  `BancoSponsor` → `BancoPartner`).** Out of scope. Cost is high
  (API contract + queryKey strings + every test + every cross-
  capability composition); value is purely cosmetic. The user-facing
  rename is sufficient. Internal docs use "sponsor" interchangeably
  with "partner" until a future cleanup pass.
- **Movement create surface.** The `Crear Movimiento` CTA continues
  to ship as a placeholder toast on both Posición and Movimientos
  (same handler) until `extend-ops-psp-create-movement` lands a real
  mutation surface.
