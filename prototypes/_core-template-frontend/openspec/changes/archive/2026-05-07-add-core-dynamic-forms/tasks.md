# Tasks — add-core-dynamic-forms

This change is a **contract-only** addition of the new `core-dynamic-forms` capability plus deltas to `core-actions-manifest` (shared type registry) and `core-forms` (DynamicForm component). No application code is implemented in this change. The actual `useDynamicForm()` composable, the FieldConfig Zod validator, the `<DynamicForm>` Vue component, and the conditional-visibility evaluator will be implemented in a subsequent OpenSpec change when the first runtime-schema consumer (TRD alert configs) begins migration.

## 1. Spec deltas

- [ ] `specs/core-dynamic-forms/spec.md` — NEW capability with 5 requirements:
  - [ ] `Runtime FieldConfig schema MUST conform to the canonical Zod-validated shape` (≥3 scenarios)
  - [ ] `DynamicForm component MUST render fields by resolving the manifest type registry at runtime` (≥4 scenarios)
  - [ ] `Runtime field schemas MUST share the type registry with build-time manifests` (≥2 scenarios)
  - [ ] `Runtime FieldConfig MUST support reactive conditional visibility` (≥3 scenarios)
  - [ ] `Composable useDynamicForm MUST be the only consumer entry point for runtime schemas` (≥3 scenarios)
- [ ] `specs/core-actions-manifest/spec.md` — ADDED Requirement: `Manifest engine MUST support runtime field schemas via the useDynamicForm composable` (≥2 scenarios)
- [ ] `specs/core-forms/spec.md` — ADDED Requirement: `DynamicForm component MUST consume useDynamicForm and render fields per the runtime schema` (≥3 scenarios)

## 2. Validation gates

- [ ] Run `openspec validate add-core-dynamic-forms --strict`
- [ ] Run `openspec validate --all --strict`
- [ ] `npm run lint` / `type-check` / `test:run` / `spec:check` / `build:qa` pass

## 3. Documentation cross-references

- [ ] Verify `proposal.md` references TRD AlertConfig + FieldConfig as the canonical motivation
- [ ] Verify `design.md` records the rationale for sharing one type registry between build-time and runtime (vs. parallel registries)
- [ ] Verify `design.md` documents the boundary between `core-actions-manifest` (build-time + registry singleton) and `core-dynamic-forms` (runtime consumer of that registry)
- [ ] Verify `design.md` documents the explicit non-features (no runtime regex validation, no field groups / sections, no localization runtime, no server-side schema versioning)

## 4. Archive

- [ ] After validation gates pass, run `openspec archive add-core-dynamic-forms`
- [ ] Confirm the CLI applies the new capability (`openspec/specs/core-dynamic-forms/spec.md`), the modified `core-actions-manifest`, and the modified `core-forms`, then moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-core-dynamic-forms/`
- [ ] Final commit with conventional message: `specs: add core-dynamic-forms capability for runtime-schema form rendering`
