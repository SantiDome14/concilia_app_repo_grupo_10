# Tasks — extend-core-layout-from-prototype

This change is artifact-only at the contract level. No application code is modified by this change itself. Implementation of the four new contracts (`<Segmenter>`, `<ViewToggle>` ordering inside the actions area, body-fixed scroll CSS contract, `<MasterDetailLayout>`) will land in subsequent OpenSpec changes when individual apps begin migrating onto the Vue template.

## 1. Spec deltas

- [ ] `specs/core-layout/spec.md` — ADDED Requirement: `Pages MUST place controls per the three-level framework (Segmentación / Vista / Filtros)`, 4 scenarios
- [ ] `specs/core-layout/spec.md` — ADDED Requirement: `L1 segmentation MUST be expressed via a <Segmenter> component in the page header actions area`, 4 scenarios
- [ ] `specs/core-layout/spec.md` — ADDED Requirement: `Scroll MUST live inside the Main container, never on the document body`, 3 scenarios
- [ ] `specs/core-layout/spec.md` — ADDED Requirement: `Pages MUST support Master-Detail as a third structural layout`, 4 scenarios

## 2. Validation gates

- [ ] Run `openspec validate extend-core-layout-from-prototype --strict` and confirm the change validates
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline still validates after the four deltas are applied
- [ ] Confirm `openspec/specs/core-layout/spec.md` will grow from 6 requirements to 10 once the change is archived
- [ ] Confirm cross-references in the new requirements (period filter privileges → `core-data-tables`; anti-pattern enforcement → `core-error-handling`) point to existing capabilities and do not introduce dangling links

## 3. Archive

- [ ] After all validation gates pass, run `openspec archive extend-core-layout-from-prototype`
- [ ] Confirm the CLI applies the four deltas into the baseline (`openspec/specs/core-layout/spec.md`) and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-extend-core-layout-from-prototype/`
- [ ] Final commit with conventional message: `feat(specs): extend core-layout with prototype's three-level control framework`
