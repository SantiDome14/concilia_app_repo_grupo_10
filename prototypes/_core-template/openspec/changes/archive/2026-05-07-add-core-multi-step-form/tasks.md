# Tasks — add-core-multi-step-form

This change is a **contract-only** addition of the new `core-multi-step-form` capability. No application code is implemented in this change. The actual `<Wizard>` Vue component, the `useWizard()` composable, the visibility / navigation / persistence helpers will be implemented in a subsequent OpenSpec change when the TRD QuoteForm migration begins to consume the contract.

## 1. Spec deltas

- [ ] `specs/core-multi-step-form/spec.md` — NEW capability with 7 requirements:
  - [ ] `Multi-step forms MUST be declared via a typed step registry` (≥3 scenarios)
  - [ ] `Progress indicator MUST render canonical visual states for every step` (≥3 scenarios)
  - [ ] `Conditional step visibility MUST evaluate enabledWhen reactively` (≥3 scenarios)
  - [ ] `Per-step validation MUST gate forward navigation` (≥3 scenarios)
  - [ ] `Backward navigation MUST preserve data and respect revisitable` (≥3 scenarios)
  - [ ] `Wizard state MUST be persisted to sessionStorage when wizardId is configured` (≥4 scenarios)
  - [ ] `Composable useWizard MUST be the only consumer entry point` (≥3 scenarios)

## 2. Validation gates

- [ ] Run `openspec validate add-core-multi-step-form --strict` and confirm the change validates
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline specs still validate
- [ ] `npm run lint` passes (no source code changes — should be a no-op)
- [ ] `npm run type-check` passes (no source code changes — should be a no-op)
- [ ] `npm run test:run` passes (no source code changes — should be a no-op)
- [ ] `npm run spec:check` passes
- [ ] `npm run build:qa` passes

## 3. Documentation cross-references

- [ ] Verify `proposal.md` references TRD QuoteForm (3,048 LOC) as the canonical migration target that motivates the wizard pattern
- [ ] Verify `design.md` documents the boundary between `core-multi-step-form` (wizard orchestration, visibility, persistence) and `core-forms` (per-field validation, field types, vee-validate scope)
- [ ] Verify `design.md` records the rationale for sessionStorage (vs localStorage, vs IndexedDB, vs server-side drafts) for in-flight wizard state
- [ ] Verify `design.md` documents the explicit non-features (no parallel steps, no server-side drafts, no save-and-resume across sessions, no skip-to-arbitrary-step)

## 4. Archive

- [ ] After all validation gates pass, run `openspec archive add-core-multi-step-form`
- [ ] Confirm the CLI applies the new capability (`openspec/specs/core-multi-step-form/spec.md`) and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-core-multi-step-form/`
- [ ] Final commit with conventional message: `specs: add core-multi-step-form capability for wizard-style forms`
