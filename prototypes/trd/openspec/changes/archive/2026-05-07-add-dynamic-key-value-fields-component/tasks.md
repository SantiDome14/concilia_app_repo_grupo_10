# Tasks — add-dynamic-key-value-fields-component

This change is a **contract-only** extension of `core-forms`: two ADDED requirements covering `<DynamicKeyValueFields>` and the `key-value-array` manifest field type.

## 1. Spec deltas

- [ ] `specs/core-forms/spec.md` — ADDED Requirement: `DynamicKeyValueFields component MUST manage a reorderable list of key-value rows with per-row validation` (≥7 scenarios)
- [ ] `specs/core-forms/spec.md` — ADDED Requirement: `Manifest dialog key-value-array field type MUST render as DynamicKeyValueFields with the declared key/value schemas` (≥2 scenarios)

## 2. Validation gates

- [ ] Run `openspec validate add-dynamic-key-value-fields-component --strict`
- [ ] Run `openspec validate --all --strict`
- [ ] `npm run lint` / `type-check` / `test:run` / `spec:check` / `build:qa` pass

## 3. Documentation cross-references

- [ ] Verify `design.md` records the rationale for vueuse/useDraggable vs. a third-party drag-drop library
- [ ] Verify `design.md` documents the duplicateKeyPolicy options and when each fits
- [ ] Verify `design.md` documents the explicit non-features (no autocomplete on key, no cross-component drag, no bulk paste, no edit-in-dialog)

## 4. Archive

- [ ] After validation gates pass, run `openspec archive add-dynamic-key-value-fields-component`
- [ ] Final commit: `specs: add DynamicKeyValueFields component to core-forms with reorderable rows and per-row validation`
