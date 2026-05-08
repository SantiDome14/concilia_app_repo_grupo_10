# Tasks — add-date-picker-component

This change is a **contract-only** extension of `core-forms`: two ADDED requirements covering the `<DatePicker>` component contract and the `daterange` manifest field type. No application code is implemented in this change.

## 1. Spec deltas

- [ ] `specs/core-forms/spec.md` — ADDED Requirement: `DatePicker component MUST support single and range modes with locale-aware rendering` (≥5 scenarios)
- [ ] `specs/core-forms/spec.md` — ADDED Requirement: `Manifest dialog daterange field type MUST render as DatePicker in range mode` (≥2 scenarios)

## 2. Validation gates

- [ ] Run `openspec validate add-date-picker-component --strict`
- [ ] Run `openspec validate --all --strict`
- [ ] `npm run lint` / `type-check` / `test:run` / `spec:check` / `build:qa` pass (no source changes — should be no-ops)

## 3. Documentation cross-references

- [ ] Verify `design.md` records the rationale for reka-ui Popover + date-fns + native input fallback (vs. heavy date libraries)
- [ ] Verify `design.md` documents the `@internationalized/date` evaluation and the final decision (CalendarDate vs. native Date)
- [ ] Verify `design.md` documents the explicit non-features (no time picker, no multi-month, no preset shortcuts)

## 4. Archive

- [ ] After validation gates pass, run `openspec archive add-date-picker-component`
- [ ] Final commit: `specs: add DatePicker component to core-forms with single and range modes`
