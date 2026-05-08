# Tasks — extend-ops-psp-partner-rename-default-tab-and-filter

## 1. Spec deltas

- [ ] `specs/ops-psp/spec.md` — `## MODIFIED Requirements` block:
  - [ ] `The /psp page MUST be a Type-A page with 3 internal tabs ...` — drop localStorage scenario; Posición is the unconditional default.
  - [ ] `The /psp page header right-actions slot SHALL be tab-aware ...` — Posición now renders `Crear Movimiento` (no ViewToggle).
  - [ ] `The Posición tab MUST render the strict Módulo B shape ...` — labels rename Sponsor → Partner.
  - [ ] `The Movimientos tab MUST render a paginated ledger ...` — drop pill cards; Partner is a Select in the filter row.
  - [ ] `Coinag health MUST be polled every 60 s and surfaced inside the Posición tab per-sponsor row` — chip labels drop the partner name prefix.

## 2. Validation gates

- [ ] `openspec validate extend-ops-psp-partner-rename-default-tab-and-filter --strict`
- [ ] `openspec validate --all --strict`

## 3. Implementation tasks

- [ ] Update `src/pages/Psp.vue`:
  - [ ] Remove `readSavedTab()` from `initialTab` (drop localStorage as a tab source).
  - [ ] Render `Crear Movimiento` on Posición (no ViewToggle on Posición).
  - [ ] Rename `Posición, movimientos y cuentas operativas por banco sponsor.` → `... por partner.` in the page sub-label.
- [ ] Update `src/ops/psp/CoinagHealthIndicator.vue`:
  - [ ] `STATUS_LABEL`: `Operativo` / `Degradado` / `Caído` (drop Coinag prefix).
- [ ] Update `src/ops/psp/PosicionTree.vue`:
  - [ ] Heading `Posición por banco sponsor` → `Posición por partner`.
  - [ ] Select placeholder `Banco Sponsor · Todos` → `Partner · Todos`.
  - [ ] Aria-label `Filtrar por banco sponsor` → `Filtrar por partner`.
- [ ] Update `src/ops/movimientos/MovimientosFilters.vue`:
  - [ ] Remove the `<div data-testid="activity-sponsor-cards">` block.
  - [ ] Add a `<Select>` for `Partner` in the filter row, sourced from `activeSponsors()` (label-rendered via `getSponsorLabel`).
  - [ ] The data-testid for the new Select is `activity-filter-partner`.
- [ ] Update `src/ops/psp/MovementsFilters.vue`:
  - [ ] Same shape change (drop pill cards block; add Partner Select).
  - [ ] data-testid: `movements-filter-partner`.
- [ ] Update `src/ops/movimientos/MovimientosTable.vue`:
  - [ ] Column header `Sponsor` → `Partner`.
- [ ] Update `src/ops/psp/AccountsTable.vue`:
  - [ ] Column header `Sponsor` → `Partner`.
- [ ] Update tests:
  - [ ] `Psp.spec.ts` — assert `Crear Movimiento` is rendered on Posición and Movimientos; not on Cuentas. Assert ViewToggle is NOT rendered on Posición. Assert tab default is Posición regardless of localStorage.
  - [ ] Add `CoinagHealthIndicator.spec.ts` assertions for the new labels.
  - [ ] Update existing assertions for renamed labels where applicable.

## 4. Archive

- [ ] After validation gates green: `openspec archive extend-ops-psp-partner-rename-default-tab-and-filter`.

## 5. Follow-up changes

- [ ] **`extend-ops-psp-create-movement`** — wire the `Crear Movimiento` CTA on both Posición and Movimientos to the real mutation surface (single handler, both tabs).
- [ ] **`refactor-ops-psp-internal-rename-sponsor-to-partner`** — purely cosmetic internal rename (`SponsorCode` → `PartnerCode`, etc.). Low priority; only worth doing once the API contract also flips.
