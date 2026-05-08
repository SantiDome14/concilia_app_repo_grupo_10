# Tasks — add-ops-instructions

This change is the **pilot domain change for OPS migration**. It scopes the
`ops-instructions` capability and defines its surface in OpenSpec; the
implementation lands in a follow-up so the spec can be reviewed in isolation
first. Once the spec is archived, the implementation change writes the
`src/pages/Instructions.vue` page, the `src/ops/instructions/*` typed surface,
and the manifest.

## 1. Spec deltas

- [ ] `specs/ops-instructions/spec.md` — NEW capability with 8 ADDED Requirements:
  - [ ] `The Instructions page MUST be a Type-A master list registered at /instructions` (≥3 scenarios)
  - [ ] `The list MUST expose the canonical column set and surface row click as the Detail modal trigger` (≥3 scenarios)
  - [ ] `Filters MUST be debounced for text and immediate for select, with state surviving Back navigation` (≥3 scenarios)
  - [ ] `The Header CTA + Crear instrucción MUST open a Create modal gated by role` (≥3 scenarios)
  - [ ] `The Create / Edit form MUST capture name, currency, description, and a dynamic attributes array` (≥3 scenarios)
  - [ ] `Save flow MUST orchestrate the two API calls atomically with a retry banner on partial failure` (≥3 scenarios)
  - [ ] `The Detail modal MUST be the canonical read-only surface; the legacy /view route is absorbed` (≥3 scenarios)
  - [ ] `Eliminar action MUST use the destructive confirmation dialog and emit cache-invalidating refresh on success` (≥3 scenarios)
  - [ ] `Loading, empty, and error surfaces MUST follow the canonical core-error-handling patterns` (≥3 scenarios)

## 2. Validation gates

- [ ] Run `openspec validate add-ops-instructions --strict` and confirm the change validates.
- [ ] Run `openspec validate --all --strict` and confirm baseline + sibling LEX changes still validate.
- [ ] No code changes in this change → no need for type-check / lint / test:run / build:qa.

## 3. Documentation cross-references

- [ ] Verify `proposal.md` references the migration source paths in `MIGRATION-NOTES.md` §4.6 (`InstructionsList.vue`), §4.7 (`InstructionForm.vue`), and the Detail counterpart in §2 of the folder layout.
- [ ] Verify `design.md` documents the unification rationale (3 routes → 1 + 3 modals) and the trade-offs of orchestrating the two-phase save client-side.
- [ ] Verify `design.md` records the decision NOT to use `useDynamicForm` for the form (the schema is known at build time per `core-actions-manifest`; runtime schemas are used only when the backend declares the field set, which is not the case here).

## 4. Archive (after the implementation change lands)

- [ ] After the implementation change `implement-ops-instructions` is archived, archive this change too via `openspec archive add-ops-instructions`. Order matters: the spec scopes the contract, the implementation fulfils it.
- [ ] Confirm the CLI applies the new capability (`openspec/specs/ops-instructions/spec.md`) and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-ops-instructions/`.
- [ ] Final commit with conventional message: `specs(ops): add ops-instructions capability for payment routing templates`.

## 5. Follow-up changes

- [ ] **`implement-ops-instructions`** — writes `src/pages/Instructions.vue`, `src/ops/instructions/{api.ts,types.ts,InstructionsTable.vue,CreateInstructionModal.vue,EditInstructionModal.vue,InstructionDetailModal.vue,manifest.ts}`, registers the route, registers the sidebar entry, registers the manifest, adds `localStorage` page-size persistence, adds Vitest coverage targeting ≥90 % on the api wrappers and the form orchestrator. Validation gates: type-check / lint / test:run / spec:check / build:qa. **Order:** lands AFTER `add-ops-instructions` is archived.
- [ ] **`add-ops-roles`** (separate, future) — when the role matrix consolidates for OPS, the inline role gating in `ops-instructions`'s manifest is replaced with the canonical capability strings (`instructions:create`, `instructions:edit`, `instructions:delete`).
