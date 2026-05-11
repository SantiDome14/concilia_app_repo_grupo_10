# Tasks — add-core-auth-step-up

This change is a **contract-only** extension of `core-auth`: five ADDED requirements covering trigger, expiration, wrapper, errors, and reactive state. No application code is implemented in this change. The actual `useStepUp()` composable, `withStepUp()` helper, typed error classes, and the internal TTL timer will be implemented in a subsequent OpenSpec change when the OPS migration begins to consume the contract.

## 1. Spec deltas

- [ ] `specs/core-auth/spec.md` — ADDED Requirement: `Step-up authentication MUST elevate the session via Auth0 loginWithPopup with an explicit prompt` (≥3 scenarios)
- [ ] `specs/core-auth/spec.md` — ADDED Requirement: `Elevated session MUST auto-expire after a configurable timeout` (≥3 scenarios)
- [ ] `specs/core-auth/spec.md` — ADDED Requirement: `Sensitive operations MUST run inside withStepUp wrapper, never with manual elevation checks` (≥3 scenarios)
- [ ] `specs/core-auth/spec.md` — ADDED Requirement: `Failed step-up MUST surface a typed error so apps can branch on the cause` (≥4 scenarios)
- [ ] `specs/core-auth/spec.md` — ADDED Requirement: `Step-up state MUST be inspectable via reactive isElevated and elevatedUntil` (≥3 scenarios)

## 2. Validation gates

- [ ] Run `openspec validate add-core-auth-step-up --strict` and confirm the change validates
- [ ] Run `openspec validate --all --strict` and confirm the existing baseline specs still validate
- [ ] `npm run lint` passes (no source code changes — should be a no-op)
- [ ] `npm run type-check` passes (no source code changes — should be a no-op)
- [ ] `npm run test:run` passes (no source code changes — should be a no-op)
- [ ] `npm run spec:check` passes
- [ ] `npm run build:qa` passes

## 3. Documentation cross-references

- [ ] Verify `proposal.md` documents that the optional `<StepUpModal>` UI component is app-decision (the spec contracts the composable, not a specific UI surface)
- [ ] Verify `design.md` records the rationale for popup-first / redirect-fallback strategy and the implications on sites that disallow popups by tenant policy
- [ ] Verify `design.md` documents the boundary between `core-auth` (this change: token-level elevation) and `core-error-handling` (where the typed errors are typically surfaced as toasts / banners)
- [ ] Verify `design.md` records the rationale for the 5-minute default TTL (security vs. UX trade-off)

## 4. Archive

- [ ] After all validation gates pass, run `openspec archive add-core-auth-step-up`
- [ ] Confirm the CLI applies the five new requirements into the baseline (`openspec/specs/core-auth/spec.md`) and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-core-auth-step-up/`
- [ ] Final commit with conventional message: `specs: extend core-auth with MFA / step-up authentication`
