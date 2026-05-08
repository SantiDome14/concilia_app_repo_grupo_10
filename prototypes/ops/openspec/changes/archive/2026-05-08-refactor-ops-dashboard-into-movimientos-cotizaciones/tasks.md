# Tasks — refactor-ops-dashboard-into-movimientos-cotizaciones

## 1. Spec deltas

- [ ] `specs/ops-financial-dashboard/spec.md` — `## REMOVED Requirements` block listing all 11 requirements with reason `entire capability removed; refactored into ops-movimientos + ops-cotizaciones`.
- [ ] `specs/ops-movimientos/spec.md` — `## ADDED Requirements` block with 7 Requirements (movements ledger surface).
- [ ] `specs/ops-cotizaciones/spec.md` — `## ADDED Requirements` block with 5 Requirements (quotes ledger surface).

## 2. Validation gates

- [ ] `openspec validate refactor-ops-dashboard-into-movimientos-cotizaciones --strict`
- [ ] `openspec validate --all --strict`

## 3. Implementation tasks

- [ ] Rename `src/ops/financial-dashboard/` → `src/ops/movimientos/` (with renames inside: `ActivityFilters.vue` → `MovimientosFilters.vue`, `ActivityTable.vue` → `MovimientosTable.vue`, `*.spec.ts` accordingly).
- [ ] Move quote-related files to a NEW `src/ops/cotizaciones/`: `QuotesFilters.vue`, `QuotesTable.vue`, `QuotesTable.spec.ts`, types extracted from the shared `types.ts`.
- [ ] Split `src/ops/movimientos/types.ts` (formerly `financial-dashboard/types.ts`) into:
  - `src/ops/movimientos/types.ts` — `Movement`, `MovementDetails`, `MovementsListParams`, `MovementsListResponse`, `ReceiptResponse`.
  - `src/ops/cotizaciones/types.ts` — `Quote`, `QuotesListParams`, `QuotesListResponse`, `QuotesView`.
  - Drop the `DashboardTab` enum (no longer applicable).
- [ ] Split `src/ops/movimientos/api.ts` (formerly `financial-dashboard/api.ts`) into:
  - `src/ops/movimientos/api.ts` — `listMovements`, `getMovement`, `getReceipt`.
  - `src/ops/cotizaciones/api.ts` — `listQuotes`.
- [ ] Rename `src/pages/FinancialDashboard.vue` → `src/pages/Movimientos.vue` (gets ONLY the Activity-tab body) + create new `src/pages/Cotizaciones.vue` (gets ONLY the Quotes-tab body, including the sub-toggle).
- [ ] Update `src/router/routes.ts`:
  - Remove the `/financial-dashboard` route.
  - Add `/movimientos` and `/cotizaciones` routes.
  - Update the legacy redirect `/dashboard` to point to `/movimientos` (preserves operator intuition).
- [ ] Update `src/config/routes.ts` — remove `FINANCIAL_DASHBOARD`, add `MOVIMIENTOS` and `COTIZACIONES` constants.
- [ ] Update `src/components/layout/Sidebar.vue` — remove the `Financial Dashboard` entry, add `Movimientos` + `Cotizaciones` entries under `Operaciones`.
- [ ] Update test imports in the moved spec files; redistribute MovementDetailsModal.spec.ts to `ops-movimientos`.
- [ ] **Move keyword: `MovementDetailsModal` canonical home** is now `src/ops/movimientos/MovementDetailsModal.vue`. Update the OPS lessons-learned section in `prototypes/ops/MIGRATION-NOTES.md` to reflect the new path.

## 4. Archive

- [ ] After validation gates green: `openspec archive refactor-ops-dashboard-into-movimientos-cotizaciones`.
- [ ] Confirm: `openspec/specs/ops-financial-dashboard/` is removed; `openspec/specs/ops-movimientos/` and `openspec/specs/ops-cotizaciones/` exist.

## 5. Follow-up changes

- [ ] **`extend-ops-psp-movement-details-modal`** (already nominated; updated) — when this lands, it imports `<MovementDetailsModal>` from `@/ops/movimientos/MovementDetailsModal.vue` (new canonical home).
- [ ] **`extend-ops-cotizaciones-quote-actions`** (renamed from the previously-nominated `extend-ops-financial-dashboard-quote-actions`) — Pay Quote / DirectSwap / UnsupportedQuote modals.
- [ ] **`extend-ops-movimientos-create-movement`** (renamed from the previously-nominated `extend-ops-financial-dashboard-create-movement`) — Create Movement modal with the 4 sub-types.
- [ ] **`extend-ops-movimientos-csv-export`** (renamed from the previously-nominated `extend-ops-financial-dashboard-csv-export`).
- [ ] **`extend-ops-movimientos-kanban-view`** (renamed from `extend-ops-financial-dashboard-kanban-view`).
