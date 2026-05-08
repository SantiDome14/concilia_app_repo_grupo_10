# Tasks — refine-ops-psp-tab-aware-header-and-multi-sponsor

## 1. Spec deltas

- [ ] `specs/ops-psp/spec.md` — `## MODIFIED Requirements` block:
  - [ ] `Coinag health MUST be polled every 60 s and surfaced ...` — relocate from page header to per-sponsor row.
  - [ ] `The Posición tab MUST render the strict Módulo B shape ...` — list every active sponsor (BIND + Banco de Comercio) and add the per-sponsor health chip slot.
  - [ ] `The Movimientos tab MUST render a paginated ledger ...` — close the type/status catalog.
  - [ ] `Capability gating + sidebar entry visibility` — retire the page-level `psp:whitelist` gate; introduce `psp:create-movement` + `psp:create-account` capability strings (with `OPS_ADMIN` fallback).
- [ ] `specs/ops-psp/spec.md` — `## ADDED Requirements` block:
  - [ ] `The /psp page header right-actions slot SHALL be tab-aware: ViewToggle + main CTA per active tab`.

## 2. Validation gates

- [ ] `openspec validate refine-ops-psp-tab-aware-header-and-multi-sponsor --strict`
- [ ] `openspec validate --all --strict`

## 3. Implementation tasks

- [ ] Activate `BIND` + `BANCO_DE_COMERCIO` in `src/ops/psp/sponsor-catalog.ts` (`active: true`).
- [ ] Update `src/ops/psp/sponsor-catalog.spec.ts` (3 active entries instead of 1; `isActiveSponsor('BIND')` etc.).
- [ ] Create `src/ops/movimientos/catalog.ts` with `MOVEMENT_TYPE_OPTIONS` + `MOVEMENT_STATUS_OPTIONS` (each `{value, label}`).
- [ ] Update `src/pages/Psp.vue`:
  - [ ] Remove `<CoinagHealthIndicator>` from page header.
  - [ ] Wire tab-aware right-actions block: Posición = empty; Movimientos = `<ViewToggle>` + `Crear Movimiento`; Cuentas = `<ViewToggle>` + `Crear Cuenta`.
  - [ ] Add `viewMode` ref (per-tab or shared, with `'list'` default).
  - [ ] Add `onCrearMovimiento()` + `onCrearCuenta()` placeholder handlers (toast).
  - [ ] Remove `Habilitar cuenta` from page header. Keep `<WhitelistAccountModal>` import + state (still mounted, but no page-header trigger). Add a `// Pending re-cabling: drawer-context invocation` note.
  - [ ] Pass `health: healthQuery.data.value` into `<PosicionTree>`.
- [ ] Update `src/ops/psp/PosicionTree.vue`:
  - [ ] Accept `health: CoinagHealth | null` prop.
  - [ ] Inside each sponsor's collapsible header, render `<CoinagHealthIndicator>` ONLY when `row.code === 'COINAG'`. For other sponsors render a neutral `Sin integración` chip.
- [ ] Update `src/pages/Movimientos.vue`:
  - [ ] Import `MOVEMENT_TYPE_OPTIONS` + `MOVEMENT_STATUS_OPTIONS`.
  - [ ] Replace the `typeOptions` / `statusOptions` computed lists with the closed catalog values.
  - [ ] Pass labels through to the filter component (so the dropdown shows `COLLECTOR IN` instead of `COLLECTOR_IN`).
- [ ] Update `src/ops/movimientos/MovimientosFilters.vue`:
  - [ ] Accept `typeOptions: { value: string; label: string }[]` (and same for status, origin) instead of `string[]`.
- [ ] Update `src/ops/psp/MovementsFilters.vue` similarly (parity with the standalone Movimientos page).
- [ ] Update tests:
  - [ ] `sponsor-catalog.spec.ts` — 3 active sponsors.
  - [ ] Add `PosicionTree` test: renders 3 collapsibles; only COINAG row has `<CoinagHealthIndicator>`; BIND/BdC show `Sin integración`.
  - [ ] Add `Psp.vue` page test (or extend existing): tab-aware right-actions; `Crear Movimiento` only on Movimientos tab; `Crear Cuenta` only on Cuentas tab; no CTA on Posición.
  - [ ] Add `catalog.spec.ts` (optional smoke test of the catalog shape).

## 4. Archive

- [ ] After validation gates green: `openspec archive refine-ops-psp-tab-aware-header-and-multi-sponsor`.

## 5. Follow-up changes

- [ ] **`extend-ops-psp-create-movement`** — wire `Crear Movimiento` to a real mutation surface.
- [ ] **`extend-ops-psp-create-account`** — wire `Crear Cuenta` to a real mutation surface.
- [ ] **`extend-ops-psp-alternative-views`** — implement the cards / kanban renders for Movimientos and Cuentas tabs.
- [ ] **`extend-ops-psp-bind-integration`** + **`extend-ops-psp-banco-de-comercio-integration`** — once the partner endpoints exist, the catalog flip already in place + the per-sponsor health chip already in place mean the integration is purely a backend wiring (no further frontend structural changes needed).
