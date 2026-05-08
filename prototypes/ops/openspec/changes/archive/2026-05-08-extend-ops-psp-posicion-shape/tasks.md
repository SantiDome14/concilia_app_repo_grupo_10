# Tasks — extend-ops-psp-posicion-shape

## 1. Spec deltas

- [ ] `specs/ops-psp/spec.md` — `## MODIFIED Requirements` block:
  - [ ] Modified Requirement: `The Posición tab MUST render the strict Módulo B shape (KPI grid + filter row + sponsor → accounts tree expansible)` — replaces the previous Disponibilidad simple cards-row.
  - [ ] Modified Requirement: `The Movimientos tab MUST render a 4-card KPI grid above the per-sponsor filter cards`.
- [ ] `specs/ops-psp/spec.md` — `## ADDED Requirements` block:
  - [ ] Added Requirement: `The legacy ?tab=disponibilidad query param SHALL redirect to ?tab=posicion`.

## 2. Validation gates

- [ ] `openspec validate extend-ops-psp-posicion-shape --strict`
- [ ] `openspec validate --all --strict`

## 3. Implementation tasks

- [ ] Create `src/ops/psp/PosicionKpis.vue` (4-card grid).
- [ ] Create `src/ops/psp/PosicionTree.vue` (sponsor → accounts tree).
- [ ] Create `src/ops/psp/MovimientosKpis.vue`.
- [ ] Refactor `src/pages/Psp.vue`:
  - Tab id `disponibilidad` → `posicion`; URL param + localStorage migration.
  - Replace the cards-row in the active-tab body with `<PosicionKpis>` + filter row + `<PosicionTree>`.
  - Add `<MovimientosKpis>` above the existing sponsor cards in Movimientos.
- [ ] Update `src/ops/psp/types.ts` (`PspTab` enum value `posicion`).
- [ ] Update tests (`AccountsTable.spec.ts` is unaffected; new tests for `PosicionTree`, `PosicionKpis`).
- [ ] Mark `<SponsorBalanceCard>` deprecated in the file header.

## 4. Archive

- [ ] After validation gates green: `openspec archive extend-ops-psp-posicion-shape`.

## 5. Follow-up changes

- [ ] **`extend-ops-psp-posicion-kpi-backend`** (separate, future) — when product wants pre-computed metrics from the backend for performance.
- [ ] **`chore-ops-psp-remove-deprecated-sponsor-balance-card`** (separate, future) — once a release is shipped without consumers, delete the deprecated component.
