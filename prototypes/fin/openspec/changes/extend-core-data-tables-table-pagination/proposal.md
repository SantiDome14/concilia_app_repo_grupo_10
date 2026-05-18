> Jira REQ: [REQ-50](https://arduasolutions.atlassian.net/browse/REQ-50) (retroactive contract fix surfaced during REQ-50 implementation)
> Module: FIN + core-template-frontend
> Scope: cross-prototype — `prototypes/_core-template-frontend/` + `prototypes/fin/`

# Extend core-data-tables — promote TablePagination to a shared component, enforce useTable

## Why

While shipping REQ-50 (`add-fin-disponibilidades`), the Movimientos and Bancos / Cuentas sub-tabs introduced hand-rolled pagination state in `Disponibilidades.vue`: `pageBancosCuentas`, `pageMovimientos`, `pageSize` refs + computed `totalPagesBancosCuentas`, `pagedCuentas`, `pagedMovimientos` + `goBancosCuentasPage` / `goMovimientosPage` helpers. The pagination UI was inline (footer with Prev / Next buttons only).

This violates the `core-data-tables` capability contract:

> "Tables use the `useTable` composable for client-side, or `@tanstack/vue-query` for server-side. **Hand-rolled pagination is forbidden.**"

The template's canonical reference (`prototypes/_core-template-frontend/src/pages/ModuloA.vue`) follows the contract correctly: state comes from `useTable<T>()`, UI is the canon footer (`Page X of Y · N resultados` · `Show:` selector · numbered buttons with `…` overflow · `‹` / `›` arrows). But the UI is inlined in every page that uses it, which means:

1. **Duplication**: every page that paginates duplicates the same template — bug-prone, hard to evolve.
2. **No enforcement at component level**: a developer can copy a different inline pagination (like the one I shipped in Disponibilidades.vue) without anyone noticing until review.

Per product decision: *"los componentes y comportamientos canónicos los fija el core-template"*. This proposal promotes the canon footer to a shared `<TablePagination>` component in the template + replica in fin, and updates the contract to require it.

## What Changes

### `prototypes/_core-template-frontend/` (canon)

- Create `src/components/data-display/TablePagination.vue` with the canonical pagination UI (props: `page`, `pageSize`, `total`, `totalPages`, `pageSizeOptions?`; emits: `update:page`, `update:pageSize`). Uses the same `paginationPages` overflow algorithm as the current `ModuloA.vue` inline implementation.
- Refactor `src/pages/ModuloA.vue` to consume `<TablePagination>` in place of the inline footer.
- Export `<TablePagination>` from `src/components/data-display/index.ts`.
- Update `core-data-tables/spec.md`: tighten the existing pagination Requirement and add a new Scenario that explicitly mandates `<TablePagination>` for client-side tables.
- Update `CLAUDE.md` + `AGENTS.md` (Component Conventions section): mention `<TablePagination>` as the canonical surface; mention the `useTable` + `<TablePagination>` pair as the only valid client-side pagination implementation.

### `prototypes/fin/` (replica + REQ-50 cleanup)

- Replicate `<TablePagination>` at `prototypes/fin/src/components/data-display/TablePagination.vue` (byte-identical to template canon for the touched files).
- Export it from `src/components/data-display/index.ts` of fin.
- Refactor `src/pages/Disponibilidades.vue`:
  - Replace `pageBancosCuentas`, `pageMovimientos`, `pageSize`, `totalPagesBancosCuentas`, `totalPagesMovimientos`, `pagedCuentas`, `pagedMovimientos`, `goBancosCuentasPage`, `goMovimientosPage` with two `useTable<T>` calls — one for `CuentaBanco`, one for `MovimientoProjected`.
  - Replace the inline footers + ad-hoc `<select>` + `‹` `›` buttons with `<TablePagination>` × 2 instances bound to the two `useTable` states.
- Replicate the modified `core-data-tables` Requirement in `prototypes/fin/openspec/specs/core-data-tables/spec.md`.
- Update `CLAUDE.md` + `AGENTS.md` (byte-identical) to add the bullet on `<TablePagination>`.

### Out of scope

- Server-side pagination is unchanged: `@tanstack/vue-query` remains the canonical surface for paginated APIs; `<TablePagination>` is for client-side. Both paths stay.
- The Posición tree of Disponibilidades is NOT paginated (small dataset, structural tree). No `<TablePagination>` there.
- Replicating the new Requirement into other prototypes (`ops`, `lex`, `trd`, `clp`) is a follow-up.
- A possible `useServerTable` composable for server-side pagination is also a follow-up.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `core-data-tables`: tighten the pagination Requirement to explicitly mandate `<TablePagination>` + `useTable<T>` for client-side. Add a Scenario that prohibits inline pagination state in page components.

## Impact

- **Code (template):** new `<TablePagination>` (~80 lines), refactor `ModuloA.vue` (remove ~60 lines of inline pagination, add ≤ 8 lines of component usage).
- **Code (fin):** replica `<TablePagination>` (~80 lines), refactor `Disponibilidades.vue` (remove ~50 lines of hand-rolled state + inline UI, add ~20 lines of `useTable` × 2 + 2 component usages).
- **Specs (template + fin):** ~20 lines of new MODIFIED Requirement + 2 new Scenarios.
- **Docs (template + fin):** new bullet in Component Conventions section of CLAUDE.md/AGENTS.md (kept byte-identical per prototype).
- **Validation gates:** 5 gates in fin + `openspec validate --all --strict` in template.
- **Risk:** very low. The `<TablePagination>` UI is functionally identical to the current ModuloA inline implementation; the refactor is a code-extraction pattern. The `useTable` swap in Disponibilidades may surface subtle differences in initial-page state when filters change, but the composable already handles `page > totalPages` correctly (clamps to last page).

## Baseline evidence

After the previous commits (REQ-50 + sidebar adjustments), fin's 5 quality gates are green (39 files / 327 tests). This change must keep them green.

## Follow-up changes (not nominated here)

- `align-ops-data-tables-pagination` — replicate the new `<TablePagination>` Requirement into OPS prototype.
- `align-lex-data-tables-pagination` / `-trd-` / `-clp-` — same for the other prototypes.
- `add-server-table-pagination` — companion for `@tanstack/vue-query`-driven server-side pagination.
- `extend-fin-disponibilidades-search-and-filters` — once the carga manual UX is fleshed out, the Bancos / Cuentas + Movimientos tables will likely want richer search/filters — `useTable`'s `searchFields` already supports this.
