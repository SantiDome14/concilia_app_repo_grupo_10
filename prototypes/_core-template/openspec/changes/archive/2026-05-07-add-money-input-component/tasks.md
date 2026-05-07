# Tasks — add-money-input-component

This change is a **contract-only** extension of `core-forms`: two ADDED requirements covering the `<MoneyInput>` component contract and the `money` manifest field type.

## 1. Spec deltas

- [ ] `specs/core-forms/spec.md` — ADDED Requirement: `MoneyInput component MUST format value live with locale-aware separators and emit raw numeric value` (≥6 scenarios)
- [ ] `specs/core-forms/spec.md` — ADDED Requirement: `Manifest dialog money field type MUST render as MoneyInput with currency-aware decimals` (≥2 scenarios)

## 2. Validation gates

- [ ] Run `openspec validate add-money-input-component --strict`
- [ ] Run `openspec validate --all --strict`
- [ ] `npm run lint` / `type-check` / `test:run` / `spec:check` / `build:qa` pass

## 3. Documentation cross-references

- [ ] Verify `design.md` records the rationale for emitting numeric `v-model` (never formatted string)
- [ ] Verify `design.md` documents the relationship between MoneyInput and a sibling currency selector
- [ ] Verify `design.md` documents the explicit non-features (no FX conversion, no percent input, no scientific notation, no embedded currency selector)

## 4. Archive

- [ ] After validation gates pass, run `openspec archive add-money-input-component`
- [ ] Final commit: `specs: add MoneyInput component to core-forms with locale-aware formatting`
