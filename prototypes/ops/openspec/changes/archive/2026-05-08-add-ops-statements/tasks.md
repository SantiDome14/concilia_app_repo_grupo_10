# Tasks — add-ops-statements

This change is the **third OPS migration change** after `add-ops-instructions`
and `add-ops-clients`. It scopes the `ops-statements` capability and defines
its surface in OpenSpec; the implementation lands in a follow-up so the spec
can be reviewed in isolation first.

## 1. Spec deltas

- [ ] `specs/ops-statements/spec.md` — NEW capability with 8 ADDED Requirements:
  - [ ] `The Generate Statement modal MUST be reachable from the master list header AND from the detail page header, with the detail entry pre-populating the client` (≥3 scenarios)
  - [ ] `The flow MUST guide the user through three logical steps inside one Dialog: client selection → account selection → date range` (≥3 scenarios)
  - [ ] `The Account selector MUST group the client's accounts by currency in an accordion, with smart single-account default` (≥3 scenarios — incl. single-account auto-select per Decision 7a)
  - [ ] `The Date Range picker MUST offer the 8 canonical quick-filter chips, with localStorage persistence of the last-chosen range` (≥3 scenarios — incl. range persistence per Decision 7b)
  - [ ] `Submit MUST POST /statement with the canonical ISO 8601 UTC payload, support cancel-during-flight, and surface a re-openable success toast` (≥4 scenarios — incl. cancel via AbortController per Decision 7d and re-open toast per Decision 7e)
  - [ ] `The Generate Statement CTA MUST be visible only to users with clients:statement capability or OPS_ADMIN role` (≥3 scenarios)
  - [ ] `Loading, validation, and error surfaces MUST follow the canonical core-error-handling patterns` (≥3 scenarios)
  - [ ] `The modal MUST render a pre-submit preview card consolidating client + account + range before enabling Generar` (≥3 scenarios — Decision 7c)

## 2. Validation gates

- [ ] Run `openspec validate add-ops-statements --strict` and confirm the change validates.
- [ ] Run `openspec validate --all --strict` and confirm baseline + sibling changes still validate.
- [ ] No code changes in this change → no need for type-check / lint / test:run / build:qa.

## 3. Documentation cross-references

- [ ] Verify `proposal.md` references the migration source in `MIGRATION-NOTES.md` §5 (Reusable components — `GenerateStatementModal`) and the legacy file at `core-ops-frontend/src/components/GenerateStatementModal.vue` (940 LOC).
- [ ] Verify `design.md` documents:
  - The decision to ship two trigger surfaces with detail pre-population.
  - The decision to ship as a modal-only feature (no route).
  - The decision NOT to add step-up MFA (read-only export, contrast with SignUp's credential creation).
  - The decision to reuse `<ClientFilters>` from `ops-clients` instead of rolling a new picker.
  - The decision to extract the quick-filter resolution to a pure helper for testability.
  - The decision to preserve single-account-per-statement (backend constraint + product not validated).
  - The decision to land 5 quality-of-life refinements over the legacy modal (Decision 7) — smart single-account default, range persistence, preview card, cancel-during-submit, re-open toast — with the explicit list of refinements DEFERRED to follow-ups.

## 4. Archive (after the implementation change lands)

- [ ] After the implementation change `implement-ops-statements` is archived, archive this change too via `openspec archive add-ops-statements`. Order matters: the spec scopes the contract, the implementation fulfils it.
- [ ] Confirm the CLI applies the new capability (`openspec/specs/ops-statements/spec.md`) and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-ops-statements/`.
- [ ] Final commit with conventional message: `specs(ops): add ops-statements capability for on-demand statement PDF generation`.

## 5. Follow-up changes

- [ ] **`implement-ops-statements`** — writes `src/ops/statements/{api.ts,types.ts,quick-filters.ts,GenerateStatementModal.vue,StatementClientStep.vue,StatementAccountStep.vue,StatementDateStep.vue}`, adds the second header CTA in `src/pages/Clients.vue` and `src/pages/ClientDetail.vue`, extends `<ClientFilters>` from `ops-clients` with picker mode (component-API change, NOT a Requirement modification), adds Vitest coverage targeting ≥90 % on the api wrapper, the quick-filters helper, and the modal step machine. Validation gates: type-check / lint / test:run / spec:check / build:qa. **Order:** lands AFTER `add-ops-statements` is archived.
- [ ] **`extend-ops-statements-history`** (separate, future) — adds a `<RecentStatements>` section to the detail page surfacing previously-generated statements with re-download links.
- [ ] **`extend-ops-statements-bulk`** (separate, future) — when product validates the use case, adds a bulk-generation surface (likely a separate page) that loops through clients/accounts.
- [ ] **`extend-ops-statements-audit-drawer`** (separate, future) — Drawer-based audit view of who generated each statement and when.
- [ ] **`add-ops-roles`** (separate, future) — when the role matrix consolidates, the inline role gating in `ops-statements` is replaced with the canonical capability strings (`clients:statement`).
