# Tasks — extend-core-modals-from-prototype

This change is a contract-only extension of `core-modals`. No application code is modified by this change itself. Real implementation of the five new patterns (`<ClosureModal>`, `<Drawer>`, `<ModalInfo>`, `<KanbanAxisDialog>`, `useGlobalPortals()`) will happen in subsequent OpenSpec changes when individual apps begin migration.

## 1. Spec deltas

- [ ] `specs/core-modals/spec.md` — ADDED Requirement: `Closure modal MUST capture justification before committing a state-machine modal transition` (≥2 scenarios)
- [ ] `specs/core-modals/spec.md` — ADDED Requirement: `Workflow-typed records MUST open a Drawer side panel as the canonical detail surface` (≥2 scenarios)
- [ ] `specs/core-modals/spec.md` — ADDED Requirement: `Modals MUST support a local info-notice bar distinct from the global alert banner` (≥2 scenarios)
- [ ] `specs/core-modals/spec.md` — ADDED Requirement: `Multi-axis kanban activation MUST open the KanbanAxisDialog on first session use` (≥2 scenarios)
- [ ] `specs/core-modals/spec.md` — ADDED Requirement: `Portal-style overlays MUST register with the useGlobalPortals aggregator for outside-click dismissal` (≥2 scenarios)

## 2. Validation gates

- [ ] Run `openspec validate extend-core-modals-from-prototype --strict` and confirm the change validates
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline specs still validate
- [ ] `npm run lint` passes
- [ ] `npm run type-check` passes
- [ ] `npm run test:run` passes
- [ ] `npm run spec:check` passes
- [ ] `npm run build:qa` passes

## 3. Documentation cross-references

- [ ] Verify `proposal.md` references the companion `extend-core-data-tables-from-prototype` change for `mode: 'modal'` and `MOD_AXES` declarations
- [ ] Verify `design.md` documents the boundary between `<ModalInfo>` (this change) and the persistent alert banner (`core-error-handling`)
- [ ] Verify `design.md` documents the boundary between `<Drawer>` (this change) and the existing Detail modal (`core-modals` baseline)

## 4. Archive

- [ ] After all validation gates pass and the companion `extend-core-data-tables-from-prototype` change is archived, run `openspec archive extend-core-modals-from-prototype`
- [ ] Confirm the CLI applies the 5 new requirements into the baseline (`openspec/specs/core-modals/spec.md`) and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-extend-core-modals-from-prototype/`
- [ ] Final commit with conventional message: `specs: extend core-modals with closure modal, drawer, info bar, axis dialog, and global portal aggregator`
