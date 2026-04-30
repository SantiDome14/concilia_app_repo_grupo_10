# Tasks — extend-core-data-tables-from-prototype

This change is **artifact-only at the contract level**. No application code is modified here; the spec delta defines the contract, and downstream changes (per-app migration) implement the patterns.

## 1. Spec delta

- [x] `specs/core-data-tables/spec.md` — ADDED Requirement: `Period filter MUST be a privileged single-value filter pinned at the start of the L3 filter row` (3 scenarios)
- [x] `specs/core-data-tables/spec.md` — ADDED Requirement: `Modules MUST declare their supported views via a typed views array` (4 scenarios)
- [x] `specs/core-data-tables/spec.md` — ADDED Requirement: `Tarjetas view MUST render via CardsGrid + CardItem with three mandatory zones` (3 scenarios)
- [x] `specs/core-data-tables/spec.md` — ADDED Requirement: `Tablero view MUST be state-driven with one column per declared state` (4 scenarios)
- [x] `specs/core-data-tables/spec.md` — ADDED Requirement: `Modules with multiple orthogonal state machines MUST declare axes and resolve via KanbanAxisDialog` (4 scenarios)
- [x] `specs/core-data-tables/spec.md` — ADDED Requirement: `Severity MUST be glanceable via colored left border on cards and inset shadow on rows` (3 scenarios)
- [x] `specs/core-data-tables/spec.md` — ADDED Requirement: `Every record-list table MUST render a leftmost monospaced ID column that is never user-hidden` (3 scenarios)
- [x] `specs/core-data-tables/spec.md` — ADDED Requirement: `Tables MUST render an Acciones column at the rightmost position when per-row actions exist and MUST omit it entirely otherwise` (3 scenarios)
- [x] `specs/core-data-tables/spec.md` — ADDED Requirement: `Tables MAY expose a derived imputacion badge that uses the canonical Badge color mapping` (3 scenarios)
- [x] `specs/core-data-tables/spec.md` — ADDED Requirement: `Pagination state MUST be shared across all views of the same module` (4 scenarios)

## 2. Validation

- [ ] Run `openspec validate extend-core-data-tables-from-prototype --strict` and confirm the change validates
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline specs still validate
- [ ] Confirm no spec under `openspec/specs/` has been modified by this change folder (this is purely a delta)

## 3. Cross-check with sibling changes

- [ ] Confirm `core-actions-menu` extension (sibling change) does not duplicate the Acciones column presence rule (we own it; they own the menu styling)
- [ ] Confirm `core-actions-manifest` extension (sibling change) owns the imputacion computation; this change only owns the badge rendering contract
- [ ] Confirm `core-error-handling` extension (sibling change) catalogs the anti-patterns this requirement set forbids (kanban without states, two axes with same `stateField`)
- [ ] Confirm `core-theming` extension (sibling change, if any) defines the `severity-*` class tokens and the `--danger` / `--warning` / `--info` / `--t4` tokens consumed here

## 4. Downstream implementation tracking (out of scope of this change)

These tasks are recorded here for traceability. They are NOT executed by this change — each is a separate `feat:` change once the spec is archived.

- [ ] Reference module in `core-template` implements `<ViewToggle>`, `<CardsGrid>`, `<CardItem>`, `<KanbanBoard>`, `<KanbanAxisDialog>` against this spec
- [ ] Reference module declares a multi-axis kanban example (workflow + imputacion) to exercise requirement #5
- [ ] `useViewMode()` composable is added to `src/composables/useViewMode.ts`
- [ ] `usePeriodStore()` Pinia slice is added to `src/stores/period.ts`
- [ ] `severity-critical`, `severity-high`, `severity-medium`, `severity-low` classes are added to `src/styles/globals.css`
- [ ] `nextSequentialId(prefix)` utility is added to `src/lib/id.ts`
- [ ] `<Badge>` accepts `imputacion` semantic variant mapping (warning / info / success)

## 5. Archive

- [ ] After all validation gates pass, run `openspec archive extend-core-data-tables-from-prototype`
- [ ] Confirm the CLI applies the 10 deltas into `openspec/specs/core-data-tables/spec.md` and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-extend-core-data-tables-from-prototype/`
- [ ] Final commit with conventional message: `specs: extend core-data-tables with views, kanban, multi-axis state machines, severity, and ID column`
