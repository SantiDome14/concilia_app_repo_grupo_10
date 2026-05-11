# Tasks — extend-core-forms-from-prototype

This change is artifact-only at the contract level. Implementation of the custom `<Select>` component, the `dependsOn` prop, the dynamic-options query patterns, the dot-color rendering, and the manifest dialog field renderer happens in subsequent OpenSpec changes when the first Ardua core app starts migration.

The work below is grouped by affected layer, and every item is independently verifiable.

## 1. Spec deltas (`specs/core-forms/spec.md`)

- [x] ADDED Requirement: `Forms and modals MUST use a custom Select component, never native <select>` — 3 scenarios
- [x] ADDED Requirement: `Dependent Select fields MUST reset their value and re-derive options when the parent changes` — 3 scenarios
- [x] ADDED Requirement: `Dynamic Select options MUST be populated before the field first renders` — 3 scenarios
- [x] ADDED Requirement: `Select items MAY expose a state-color dot via the dotColor token` — 2 scenarios
- [x] ADDED Requirement: `Manifest dialog fields MUST map each declared type to its Vue equivalent and integrate with vee-validate` — 4 scenarios
- [x] ADDED Requirement: `Manifest dialog fields MUST disable themselves reactively when their declared prerequisites are unmet` — 3 scenarios
- [ ] Run `openspec validate extend-core-forms-from-prototype --strict` and confirm the change validates
- [ ] Run `openspec validate --all --strict` and confirm the 10 baseline specs still validate

## 2. Documentation updates (no code yet)

- [ ] Add a one-line cross-reference inside `openspec/specs/core-forms/spec.md` (after archive) pointing to the manifest field-type whitelist in `core-actions-menu` so reviewers can navigate the boundary.
- [ ] Confirm `CLAUDE.md` § Forms still reads correctly after the new requirements are merged into the baseline (no contradictions with the existing five baseline rules).

## 3. Validation gates

- [ ] `openspec validate extend-core-forms-from-prototype --strict` exits 0
- [ ] `openspec validate --all --strict` exits 0 (existing 10 specs + this change's deltas)
- [ ] Manual review: every new requirement uses SHALL or MUST, every Requirement has ≥ 2 Scenarios, every Scenario uses GIVEN/WHEN/THEN where the precondition is non-trivial.
- [ ] Manual review: every Vue/TS artifact named in the spec (`<Select>`, `<Textarea>`, `<DatePicker>`, `<Checkbox>`, `<FormControl>`, `useFieldValue`, `setFieldValue`, `Skeleton`, `dependsOn`, `dotColor`, `prerequisites`) is consistent with the project's pinned tech stack (`CLAUDE.md` § Tech Stack).
- [ ] Manual review: native `<select>` is named explicitly as the anti-pattern in the first new requirement.

## 4. Archive

- [ ] After all validation gates pass, run `openspec archive extend-core-forms-from-prototype`
- [ ] Confirm the CLI applies the 6 ADDED requirements into `openspec/specs/core-forms/spec.md` and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-extend-core-forms-from-prototype/`
- [ ] Final commit with conventional message: `specs: extend core-forms with custom Select, dependent fields, dynamic options, and dialog field types`

## 5. Follow-ups (out of scope here, tracked for future changes)

- [ ] Implement the custom `<Select>` component in `src/components/ui/Select.vue` using shadcn-vue + reka-ui, with `dotColor`, `dependsOn`, `searchable`, and the Teleport-based dropdown. Tracked under change slug `implement-custom-select-component` (TBD).
- [ ] Implement the manifest dialog renderer in `src/components/manifest/ManifestDialog.vue` with the seven field-type mapping and reactive prerequisites. Tracked under the manifest engine implementation change.
- [ ] Add Vitest coverage for the dependent-Select reset behavior and the prerequisite reactivity. Tracked alongside the component implementation.
