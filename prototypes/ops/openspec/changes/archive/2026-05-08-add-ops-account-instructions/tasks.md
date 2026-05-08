# Tasks — add-ops-account-instructions

This change is the **fourth OPS migration change** after `add-ops-instructions`,
`add-ops-clients`, and `add-ops-statements`. It scopes the
`ops-account-instructions` capability and defines its surface in OpenSpec; the
implementation lands in a follow-up so the spec can be reviewed in isolation
first.

## 1. Spec deltas

- [ ] `specs/ops-account-instructions/spec.md` — NEW capability with 12 ADDED Requirements:
  - [ ] `The Create Account Instruction wizard MUST be reachable from the /clients/:id detail page header with the client pre-populated` (≥3 scenarios — incl. legacy URL absorption)
  - [ ] `The wizard MUST guide the user through 3 steps inside one Dialog using the core-multi-step-form Wizard primitive` (≥3 scenarios)
  - [ ] `The Account selector MUST exclude ARS-currency accounts and offer a smart single-account default` (≥3 scenarios — Decision 7a)
  - [ ] `The Template selector MUST be searchable by name and rail with 300 ms debounce` (≥3 scenarios)
  - [ ] `The Field Values step MUST hydrate the template's attribute schema, prepopulate client variables, and apply the SWIFT-rail reference rule` (≥3 scenarios — Decision 5)
  - [ ] `The Field Values step MUST render a live letter preview side-by-side with the inputs` (≥3 scenarios — Decision 6)
  - [ ] `The Rails step MUST allow multi-select from the canonical rails catalog with at least one selection required to enable submit` (≥3 scenarios)
  - [ ] `Submit MUST POST /account-instruction with the canonical payload, support cancel via AbortController, map field-level validation errors inline, and invalidate the client cache` (≥4 scenarios — Decisions 7b + 7d)
  - [ ] `The wizard MUST persist its draft to localStorage per client and restore it on next opening` (≥3 scenarios — Decision 7e)
  - [ ] `Loading, validation, and error surfaces MUST follow the canonical core-error-handling patterns` (≥3 scenarios)
  - [ ] `The Crear instrucción de cuenta CTA MUST be visible only to users with clients:create-account-instruction capability or OPS_ADMIN role` (≥3 scenarios)
  - [ ] `The modal MUST render a pre-submit preview card consolidating account + template + values + rails before enabling Crear` (≥3 scenarios — Decision 7c)

## 2. Validation gates

- [ ] Run `openspec validate add-ops-account-instructions --strict` and confirm the change validates.
- [ ] Run `openspec validate --all --strict` and confirm baseline + sibling changes still validate.
- [ ] No code changes in this change → no need for type-check / lint / test:run / build:qa.

## 3. Documentation cross-references

- [ ] Verify `proposal.md` references the migration source in `MIGRATION-NOTES.md` §4.5 (legacy detail page links to wizard) and the legacy file at `core-ops-frontend/src/views/Clients/CreateInstruction.vue` (~800 LOC).
- [ ] Verify `design.md` documents:
  - The decision to create a NEW capability instead of extending `ops-instructions` (Decision 1).
  - The decision to ship as a modal mounted from the detail page, with legacy URL redirect (Decision 2).
  - The decision to use the `core-multi-step-form` Wizard primitive instead of a hand-rolled step machine (Decision 3).
  - The decision to size the modal at `xl` to fit the side-by-side preview (Decision 4).
  - The decision to extract interpolation + SWIFT-rule to pure helpers (Decision 5).
  - The decision to extract live letter preview to a dedicated component (Decision 6).
  - The decision to land 5 quality-of-life refinements (Decision 7) — smart single-account default, inline field validation, pre-submit preview card, cancel-during-submit, draft persistence — with the explicit list of refinements DEFERRED.
  - The decision NOT to add step-up MFA (operational data, contrast with SignUp credential creation; Decision 8).

## 4. Archive (after the implementation change lands)

- [ ] After the implementation change `implement-ops-account-instructions` is archived, archive this change too via `openspec archive add-ops-account-instructions`. Order matters: the spec scopes the contract, the implementation fulfils it.
- [ ] Confirm the CLI applies the new capability (`openspec/specs/ops-account-instructions/spec.md`) and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-ops-account-instructions/`.
- [ ] Final commit with conventional message: `specs(ops): add ops-account-instructions capability for wizard-driven account_instruction creation`.

## 5. Follow-up changes

- [ ] **`implement-ops-account-instructions`** — writes `src/ops/account-instructions/{api.ts,types.ts,interpolation.ts,draft-storage.ts,AccountTemplateStep.vue,FieldValuesStep.vue,RailsStep.vue,LetterPreview.vue,AccountInstructionPreviewCard.vue,CreateAccountInstructionModal.vue}`, adds the third header CTA in `src/pages/ClientDetail.vue`, registers the legacy URL redirect in `src/router/routes.ts`, adds Vitest coverage targeting ≥90 % on the api wrapper, the interpolation helpers, the draft-storage helper, the Letter preview component, and the wizard step machine. Validation gates: type-check / lint / test:run / spec:check / build:qa. **Order:** lands AFTER `add-ops-account-instructions` is archived.
- [ ] **`extend-ops-account-instructions-edit`** (separate, future) — when product validates the use case, adds the Edit flow on existing bindings (the template's attribute schema may have changed since binding creation, so this is non-trivial and merits its own design phase).
- [ ] **`extend-ops-account-instructions-letter-template-binding`** (separate, future) — when marketing wants to A/B test the confirmation letter copy, the LetterPreview component takes a `letterTemplate` prop sourced from a backend resource.
- [ ] **`extend-ops-account-instructions-audit-drawer`** (separate, future) — Drawer-based audit view of who created each binding and when.
- [ ] **`add-ops-roles`** (separate, future) — when the role matrix consolidates, the inline role gating in `ops-account-instructions` is replaced with the canonical capability strings (`clients:create-account-instruction`).
