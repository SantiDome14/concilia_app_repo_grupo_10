# Design — extend-core-data-tables-table-pagination

## Context

`core-data-tables` capability already mandates `useTable<T>` for client-side pagination state. The canonical UI implementation lives inline in `prototypes/_core-template-frontend/src/pages/ModuloA.vue` (line ~686): `Page X of Y · N resultados`, `Show:` page-size selector, numbered buttons with `…` overflow, `‹` / `›` arrows. The contract has the state side covered but the UI side is not encapsulated — every page that paginates copies the markup verbatim.

This surfaced as a real drift during REQ-50: when shipping `Disponibilidades.vue`, I implemented pagination from scratch (refs, computeds, helpers, simpler Prev/Next UI) instead of reaching for `useTable` + the canon footer. The audit caught it before merge.

Per product feedback: *"los componentes y comportamientos canónicos los fija el core-template"*. The fix is to:
1. Extract the canon UI into a shared `<TablePagination>` component.
2. Refactor the violating page (`Disponibilidades.vue`) and the canon reference (`ModuloA.vue`) to consume it.
3. Tighten the spec so the next developer (or the next agent) cannot ship the same drift.

## Goals / Non-Goals

**Goals:**

- Promote the pagination UI to a shared `<TablePagination>` component, byte-identical between template and fin.
- Make the `useTable<T>` + `<TablePagination>` pair the only spec-compliant client-side pagination implementation.
- Eliminate the hand-rolled pagination in `Disponibilidades.vue` and align it to canon.
- Keep the existing `useTable` composable contract unchanged (the state surface is correct; only the UI was missing).
- Tighten the `core-data-tables` spec so future hand-rolled implementations are rejected at review.

**Non-Goals:**

- Touching server-side pagination. `@tanstack/vue-query` stays as the canonical surface there.
- Designing a richer pagination UI (jump-to-page input, page jump, etc.) — out of v1 scope.
- Replicating the new Requirement into other prototypes (ops/lex/trd/clp). Each prototype gets its own follow-up change.
- Changing the `paginationPages` overflow algorithm. It already works correctly; we extract it as-is.

## Decisions

### Decision 1 — `<TablePagination>` is a shared component, not a `useTablePagination` composable

**Question:** the canonical pagination UI could be exposed as either (a) a Vue component `<TablePagination>` consumed via slots/props/emits, or (b) a composable `useTablePagination` that returns slots / render functions.

**Decision:** (a) — a Vue component.

**Why:**
- The pagination UI is mostly visual markup + a small amount of derivation (`paginationPages` overflow). A component is the natural shape for "extract a chunk of template".
- Composables are right when the same logic is reused across components with different rendering. Here the rendering is the same on every page that paginates — extracting only the logic (composable) would force every consumer to re-implement the markup. That's the bug we're fixing.
- Components in the canon (`<Segmenter>`, `<ViewToggle>`, `<CardsGrid>`, `<KanbanBoard>`) follow this exact shape: visual concern → component, state concern → composable. `<TablePagination>` slots into that convention.

**Alternatives considered:**
- Composable `useTablePagination(useTable)` that returns a `<TablePagination>` JSX — rejected. Mixes concerns. Vue's composables aren't great with JSX in `<script setup>` contexts.
- Headless component (`<TablePagination>` as render-less) — rejected. Adds boilerplate for every consumer and the markup is straightforward enough to expose as a regular component.

**Failure modes the rule prevents:**
- Two pages diverging in pagination visual: one uses the canon footer, the other re-rolls a simpler version.
- A future developer optimising the overflow algorithm in one place but missing the other.

### Decision 2 — `<TablePagination>` is dumb (props + emits), state lives in `useTable`

**Question:** `<TablePagination>` could (a) hold its own internal state and emit `page-change` / `page-size-change` events, or (b) be controlled — accepts `page` / `pageSize` props and emits `update:page` / `update:pageSize` (v-model style).

**Decision:** (b) controlled. State stays in `useTable<T>`.

**Why:**
- `useTable<T>` is the canonical state owner per `core-data-tables`. The component should reflect that state, not duplicate it.
- v-model-style emits play nicely with `useTable.setPage` and `useTable.setPageSize` — the parent page wires them in two lines.
- Controlled components are easier to test (no internal state, output is a function of props).

**Alternatives considered:**
- Uncontrolled / internal state — rejected. Duplicates state, fights useTable, breaks the contract.
- Pass the `useTable` instance directly as a prop — rejected. Couples the component to one specific composable shape; harder to use with future variations (e.g. server-side wrappers).

**Failure modes the rule prevents:**
- Two sources of truth for `page` (useTable + component internal). Out-of-sync renders.

### Decision 3 — Cross-prototype scope (template + fin in one proposal)

Following the same pattern as `align-fin-prototype-to-playbook`, this proposal touches both prototypes:
- Canon code (`<TablePagination>`, `ModuloA.vue` refactor) lives in `_core-template-frontend/`.
- Replica + REQ-50 cleanup lives in `prototypes/fin/`.

The OpenSpec change folder lives in `prototypes/fin/openspec/changes/` because the motivation is FIN-driven (surfaced by the REQ-50 hand-rolled implementation). The `proposal.md` "What Changes" section explicitly enumerates the template files modified.

**Replication strategy** (same as Decision 3 of `align-fin-prototype-to-playbook`): manual replica from template canon. A final `diff` check at task close ensures the new touched lines are byte-identical between the two.

OPS / LEX / TRD / CLP follow-ups are nominated explicitly in the OUT block.

### Decision 4 — Tighten the spec Requirement, don't add a new one

**Question:** core-data-tables already has a Requirement about pagination (`useTable` for client-side, server-side via vue-query). Adding a separate Requirement for `<TablePagination>` would duplicate the existing structure.

**Decision:** modify the existing Requirement to explicitly mandate the `<TablePagination>` UI component for client-side tables. Add 2 new Scenarios:
- Positive: a page using `useTable<T>` renders pagination through `<TablePagination>`.
- Negative: a page that uses refs + computeds + inline buttons in lieu of `<TablePagination>` is rejected at PR review (a "Failure modes the rule prevents" Scenario, structured as the antipattern detection).

**Why:**
- Spec-clarity. One Requirement, expanded — vs. two related Requirements.
- Less ceremony around what counts as "table pagination" — the spec stays focused on the operator behavior, not on internal architecture.

## Risks / Trade-offs

- **[Risk]** Refactor of `Disponibilidades.vue` may temporarily break tests that depend on `pageBancosCuentas` / `pageMovimientos` data-testids or page-size selector data-testids. **Mitigation:** the `<TablePagination>` component exposes data-testids that map 1:1 to the inline ones; the existing tests assert the existence of the wrapper + behavior, which the new component preserves.
- **[Risk]** The byte-identical replica of `<TablePagination>` between template and fin can drift in future development. **Mitigation:** add a tasks.md item that runs `diff` between the two files at the end of each touching change. This is the same convention as `align-fin-prototype-to-playbook` Decision 3.
- **[Risk]** A future server-side pagination case may want a different UI footer. **Mitigation:** `<TablePagination>` accepts the same v-model surface; a future `useServerTable` composable can emit the same shape. If the UI genuinely diverges, `<TablePagination>` exposes slots for over-rides — but that's a follow-up.
- **[Risk]** Existing tests of `ModuloA.vue` in the template that assert inline pagination markup will need to be updated. **Mitigation:** the touched markup is internal; behavioral tests (`setPage` works, `setPageSize` works, overflow renders correctly) keep working.

## Migration Plan

1. **Pre-flight:** confirm fin's 5 quality gates green on the prior commit.
2. **Template canon** (in order):
   - Create `<TablePagination>` in `_core-template-frontend/src/components/data-display/`.
   - Export it from the data-display barrel.
   - Refactor `ModuloA.vue` to consume it.
   - Update `core-data-tables/spec.md` with the modified Requirement + 2 new Scenarios.
   - Update `CLAUDE.md` / `AGENTS.md` (byte-identical).
   - Run `openspec validate --all --strict` in template.
3. **Fin replica**:
   - Replicate `<TablePagination>` byte-identical at `prototypes/fin/src/components/data-display/`.
   - Export from fin's data-display barrel.
   - Refactor `Disponibilidades.vue` to use `useTable<CuentaBanco>` + `useTable<MovimientoProjected>` + `<TablePagination>` × 2.
   - Replicate the spec change.
   - Update `CLAUDE.md` / `AGENTS.md` byte-identical.
   - Run the 5 quality gates.
4. **Diff check**: confirm `<TablePagination>` is byte-identical between template and fin for the touched files.
5. Hand off to user for commit.

**Rollback:** revert the commits. The `<TablePagination>` component disappears, `Disponibilidades.vue` falls back to my hand-rolled pagination (the immediate consequence). `ModuloA.vue` reverts to the inline canon footer.

## Open Questions

These default if no reviewer override:

- **Q1**: should `<TablePagination>` accept a `loading` prop (renders skeleton or disabled state during query refetch)? Defaulting to **no** for v1 — client-side tables don't have a loading window between user clicks. A future server-side variant may want this.
- **Q2**: should the canon page-size options be `[10, 25, 50, 100]` (current) or include `25`-only variations? Defaulting to **`[10, 25, 50, 100]`** (same as ModuloA today).
- **Q3**: should `<TablePagination>` render numbered buttons or fall back to Prev / Next only when total pages < 3? Defaulting to **always render numbered buttons** for consistency; the component's `paginationPages` algorithm already collapses to `[1]` cleanly for a single page.
- **Q4**: should the data-testid for the wrapper be `<table-id>-pagination` (composable from caller) or a single canonical `table-pagination`? Defaulting to **caller-provided via `data-testid` attribute on the component instance** — fits Vue's standard attrs inheritance.
