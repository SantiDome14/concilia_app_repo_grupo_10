# Tasks — add-ops-clients

This change is the **second OPS migration change** after the `ops-instructions` pilot. It scopes
the `ops-clients` capability and defines its surface in OpenSpec; the implementation lands in a
follow-up so the spec can be reviewed in isolation first. Once the spec is archived, the
implementation change writes the `src/pages/Clients.vue` master, the `src/pages/ClientDetail.vue`
detail, the `src/ops/clients/*` typed surface, the SignUp + Whitelist modals, and the
`/users → /clients` redirect.

## 1. Spec deltas

- [ ] `specs/ops-clients/spec.md` — NEW capability with 11 ADDED Requirements:
  - [ ] `The Clients page MUST be a Type-A master list registered at /clients` (≥3 scenarios)
  - [ ] `The list MUST expose CUIT/CUIL, Nombre, Email, Activo and Estado Portal columns and surface row click as detail navigation` (≥3 scenarios)
  - [ ] `Filters MUST be debounced for text and immediate for select, with state surviving Back navigation` (≥3 scenarios)
  - [ ] `The Header CTA "Alta de Cliente en APP" MUST open a SignUp modal gated by step-up authentication` (≥3 scenarios)
  - [ ] `The Estado Portal column MUST derive its value from a single deterministic helper` (≥3 scenarios)
  - [ ] `The /clients/:id detail page MUST be a Type-B surface composed of info card + accounts list + recent movements` (≥3 scenarios)
  - [ ] `Each account MUST be expandable to show its instructions with Copy and Letter actions` (≥3 scenarios)
  - [ ] `The "Whitelistar Cuenta" CTA MUST open a 2-step inline modal (validate-then-confirm) gated by the presence of a Coinag instruction` (≥3 scenarios)
  - [ ] `The Confirmation Letter generator MUST handle single-rail (direct) and multi-rail (picker) cases and open the result in a new tab` (≥3 scenarios)
  - [ ] `Loading, empty, and error surfaces MUST follow the canonical core-error-handling patterns` (≥3 scenarios)
  - [ ] `The legacy /users path SHALL redirect to /clients` (≥3 scenarios)

## 2. Validation gates

- [ ] Run `openspec validate add-ops-clients --strict` and confirm the change validates.
- [ ] Run `openspec validate --all --strict` and confirm baseline + sibling changes still validate.
- [ ] No code changes in this change → no need for type-check / lint / test:run / build:qa.

## 3. Documentation cross-references

- [ ] Verify `proposal.md` references the migration source paths in `MIGRATION-NOTES.md` §4.4 (`UserDashboard.vue` — actually clients) and §4.5 (`ClientDetail.vue`), plus the modal sources in §5 (`SignUpUserModal`).
- [ ] Verify `design.md` documents:
  - The decision to ship the detail as a full route (Type-B), NOT a modal (the difference vs. `ops-instructions`).
  - The decision to derive `Estado Portal` from a single typed helper, not inline switches.
  - The decision to ship Whitelist as one modal with an internal 2-step state machine.
  - The decision to add step-up MFA to SignUp (the legacy did NOT have it).
  - The decision to keep `Instruction` (template) and `AccountInstruction` (binding) as distinct types.
  - The decision to defer the recent-movements modal to `ops-financial-dashboard` and the wizard to a follow-up extension.

## 4. Archive (after the implementation change lands)

- [ ] After the implementation change `implement-ops-clients` is archived, archive this change too via `openspec archive add-ops-clients`. Order matters: the spec scopes the contract, the implementation fulfils it.
- [ ] Confirm the CLI applies the new capability (`openspec/specs/ops-clients/spec.md`) and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-ops-clients/`.
- [ ] Final commit with conventional message: `specs(ops): add ops-clients capability for clients master + detail with whitelisting`.

## 5. Follow-up changes

- [ ] **`implement-ops-clients`** — writes `src/pages/Clients.vue`, `src/pages/ClientDetail.vue`, `src/ops/clients/{api.ts,types.ts,ClientsTable.vue,ClientFilters.vue,SignUpUserModal.vue,WhitelistAccountModal.vue,AccountCard.vue,InstructionRow.vue,RecentMovementsTable.vue,portal-status.ts}`, registers the routes (incl. `/users → /clients` redirect), registers the sidebar entry under a new `Operaciones` block, adds Vitest coverage targeting ≥90 % on the api wrappers, the portal-status helper, and the Whitelist modal's state machine. Validation gates: type-check / lint / test:run / spec:check / build:qa. **Order:** lands AFTER `add-ops-clients` is archived.
- [ ] **`extend-ops-instructions-create-from-client`** OR **`add-ops-account-instructions`** (separate, future) — migrates the 4-step wizard at `/clients/:id/instructions/create` for creating an `account_instruction` (the binding). Whether it extends `ops-instructions` or creates a new capability is decided in that change's design.
- [ ] **`add-ops-statements`** (separate, future) — migrates the `Generar Statement` modal that lives in the legacy `/users` header.
- [ ] **`extend-ops-clients-movement-modal-integration`** (separate, future) — once `ops-financial-dashboard` lands, modifies a Requirement of `ops-clients` to make the recent movements rows clickable, opening the canonical movement detail modal.
- [ ] **`add-ops-roles`** (separate, future) — when the role matrix consolidates, the inline role gating in `ops-clients`'s components is replaced with the canonical capability strings (`clients:whitelist`, `clients:invite`).
