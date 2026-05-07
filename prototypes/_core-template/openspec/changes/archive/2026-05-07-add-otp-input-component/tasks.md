# Tasks — add-otp-input-component

This change is a **contract-only** extension of `core-forms`: two ADDED requirements covering `<OtpInput>` and the `otp` manifest field type.

## 1. Spec deltas

- [ ] `specs/core-forms/spec.md` — ADDED Requirement: `OtpInput component MUST render N independent slots with autofocus advance and paste support` (≥6 scenarios)
- [ ] `specs/core-forms/spec.md` — ADDED Requirement: `Manifest dialog otp field type MUST render as OtpInput with the declared length` (≥2 scenarios)

## 2. Validation gates

- [ ] Run `openspec validate add-otp-input-component --strict`
- [ ] Run `openspec validate --all --strict`
- [ ] `npm run lint` / `type-check` / `test:run` / `spec:check` / `build:qa` pass

## 3. Documentation cross-references

- [ ] Verify `design.md` records the rationale for hand-rolled vs. `input-otp` library
- [ ] Verify `design.md` documents the relationship to `add-core-auth-step-up` (companion when MFA via OTP is the chosen second factor)
- [ ] Verify `design.md` documents the explicit non-features (no resend button, no countdown, no biometric support — those are app-side compositions)

## 4. Archive

- [ ] After validation gates pass, run `openspec archive add-otp-input-component`
- [ ] Final commit: `specs: add OtpInput component to core-forms with autofocus advance and paste support`
