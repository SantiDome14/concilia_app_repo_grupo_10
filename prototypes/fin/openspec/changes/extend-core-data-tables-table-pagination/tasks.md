# Tasks — extend-core-data-tables-table-pagination

> Implementation checklist. Each task is independently verifiable. Apply in order — template canon first, then fin replica, then the page refactor that consumes both.

## 1. Pre-flight verification

- [ ] 1.1 Confirm fin's 5 quality gates green on the prior commit.
- [ ] 1.2 Confirm `prototypes/_core-template-frontend/` `openspec validate --all --strict` green.

## 2. Template canon — create `<TablePagination>`

- [ ] 2.1 Create `prototypes/_core-template-frontend/src/components/data-display/TablePagination.vue` with:
  - Props: `page: number`, `pageSize: number`, `total: number`, `totalPages: number`, `pageSizeOptions?: readonly number[] = [10, 25, 50, 100]`.
  - Emits: `update:page` (number), `update:pageSize` (number).
  - Internal `paginationPages` computed with the same overflow algorithm as the current `ModuloA.vue` inline implementation (`if tp <= 7 → all pages; else → [1, …, c-1, c, c+1, …, tp]`).
  - Markup mirrors `ModuloA.vue` lines 686-748 exactly (footer with `Page X of Y · N resultados`, `Show:` select, `‹` / numbered / `…` / `›` buttons).
  - Tailwind classes are the same as the current canon.
- [ ] 2.2 Add `TablePagination` export to `prototypes/_core-template-frontend/src/components/data-display/index.ts`.

## 3. Template canon — refactor `ModuloA.vue` to consume `<TablePagination>`

- [ ] 3.1 Edit `prototypes/_core-template-frontend/src/pages/ModuloA.vue`:
  - Add `import { TablePagination } from '@/components/data-display';`.
  - Remove the inline `<div v-if="view === 'list'" class="mt-3.5 ...">` pagination block (lines ~686-747).
  - Replace with `<TablePagination v-if="view === 'list'" :page="page" :pageSize="pageSize" :total="total" :totalPages="totalPages" @update:page="setPage" @update:pageSize="setPageSize" />`.
  - Remove the `paginationPages` computed from `<script setup>` (lines ~350-363) since `<TablePagination>` owns it internally.
- [ ] 3.2 Verify no other ModuloA.vue test references the old inline data-testid for pagination buttons — if it does, update the test to assert against `<TablePagination>` testids.

## 4. Template canon — spec deltas

- [ ] 4.1 Apply the MODIFIED Requirement from this change's `specs/core-data-tables/spec.md` into `prototypes/_core-template-frontend/openspec/specs/core-data-tables/spec.md`. Replace the existing "Tables MUST support client-side pagination with ellipsis navigation" Requirement with the new tightened one (8 scenarios).
- [ ] 4.2 Run `cd prototypes/_core-template-frontend && npm run spec:check` — expect 18/18 pass strict.

## 5. Template canon — CLAUDE.md + AGENTS.md

- [ ] 5.1 Edit `prototypes/_core-template-frontend/CLAUDE.md`, section "Component Conventions": add bullet under the `src/components/data-display/` mention:
  - `data-display/TablePagination.vue` — canonical pagination footer for client-side tables. Always paired with `useTable<T>()`.
- [ ] 5.2 Edit "Data Layer Conventions" → "Client-side data" subsection: add the sentence "Pagination UI MUST be rendered through `<TablePagination>` from `@/components/data-display`. Inline pagination markup or hand-rolled state refs in page components are rejected at review (see `core-data-tables` spec)."
- [ ] 5.3 Replicate the same edits byte-identical in `prototypes/_core-template-frontend/AGENTS.md`. `cmp CLAUDE.md AGENTS.md` exit 0.

## 6. Fin replica — `<TablePagination>` byte-identical

- [ ] 6.1 Replicate the file from step 2.1 into `prototypes/fin/src/components/data-display/TablePagination.vue` byte-identical.
- [ ] 6.2 Add the export to `prototypes/fin/src/components/data-display/index.ts`.
- [ ] 6.3 `cmp` to confirm byte-identical with template.

## 7. Fin replica — refactor `Disponibilidades.vue`

- [ ] 7.1 Edit `prototypes/fin/src/pages/Disponibilidades.vue`:
  - Add `import { useTable } from '@/composables/useTable';` and `import { TablePagination } from '@/components/data-display';`.
  - Replace the `pageBancosCuentas`, `totalPagesBancosCuentas`, `pagedCuentas`, `goBancosCuentasPage`, `PAGE_SIZE_OPTIONS`, `pageSize` state with `useTable<CuentaBanco>({ data: filteredCuentasRef, searchFields: ['banco', 'numero'], pageSize: 25 })` — wrap `filteredCuentas` computed as a Ref so `useTable` can subscribe.
  - Same for Movimientos: `useTable<MovimientoProjected>({ data: filteredMovimientosRef, searchFields: ['id', 'tipo'], pageSize: 25 })`.
  - Replace the two inline pagination footer blocks with `<TablePagination>` × 2 instances.
  - Remove `goBancosCuentasPage`, `goMovimientosPage`, the watch on `[filteredCuentas, pageSize]` and `[filteredMovimientos, pageSize]` (useTable clamps `page > totalPages` automatically).
- [ ] 7.2 Verify that the v-for over `pagedCuentas` / `pagedMovimientos` now references the `paged` ref from each `useTable` return.
- [ ] 7.3 Ensure `data-testid="bancos-cuentas-pagination"` and `data-testid="movimientos-pagination"` survive (apply them to the `<TablePagination>` instances).

## 8. Fin replica — spec delta + CLAUDE.md + AGENTS.md

- [ ] 8.1 Apply the same MODIFIED Requirement of step 4.1 into `prototypes/fin/openspec/specs/core-data-tables/spec.md`. Byte-identical with template canon for the touched Requirement.
- [ ] 8.2 Diff-check: `diff <(sed -n '...' prototypes/_core-template-frontend/openspec/specs/core-data-tables/spec.md) <(sed -n '...' prototypes/fin/openspec/specs/core-data-tables/spec.md)` returns empty for the touched lines.
- [ ] 8.3 Replicate the CLAUDE.md / AGENTS.md edits from step 5 into `prototypes/fin/`. Keep `cmp CLAUDE.md AGENTS.md` exit 0.

## 9. Validation gates — template

- [ ] 9.1 `cd prototypes/_core-template-frontend && npm run lint` exit 0.
- [ ] 9.2 `npm run type-check` exit 0.
- [ ] 9.3 `npm run test:run` exit 0 (existing ModuloA tests should pass; any test that asserted on inline pagination data-testid needs updating).
- [ ] 9.4 `npx openspec validate --all --strict` 18/18 pass.
- [ ] 9.5 `npm run build:qa` exit 0.

## 10. Validation gates — fin

- [ ] 10.1 `cd prototypes/fin && npm run lint` exit 0.
- [ ] 10.2 `npm run type-check` exit 0.
- [ ] 10.3 `npm run test:run` exit 0 (existing 327 tests pass; Disponibilidades.spec.ts continues to pass since data-testids are preserved).
- [ ] 10.4 `npx openspec validate --all --strict` 16/16 pass (13 specs + 3 active changes: `align-fin-prototype-to-playbook`, `add-fin-disponibilidades`, `extend-core-data-tables-table-pagination`).
- [ ] 10.5 `npm run build:qa` exit 0.

## 11. Handover

- [ ] 11.1 Working tree status confirmed (template files modified + fin files modified + new openspec change folder).
- [ ] 11.2 Suggested commit message printed for the user.
- [ ] 11.3 Hand off to the user. DO NOT run `git commit` or `git push`.
