# Tasks — add-ops-psp

This change is the **fifth OPS migration change** after `add-ops-instructions`,
`add-ops-clients`, `add-ops-statements`, and `add-ops-account-instructions`.
It scopes the `ops-psp` capability and defines its surface in OpenSpec; the
implementation lands in a follow-up so the spec can be reviewed in isolation
first.

## 1. Spec deltas

- [ ] `specs/ops-psp/spec.md` — NEW capability with 10 ADDED Requirements:
  - [ ] `The /psp page MUST be a Type-A page with 3 internal tabs (Disponibilidad / Movimientos / Cuentas) and URL-reflected active tab` (≥3 scenarios)
  - [ ] `The legacy /psp/home and /psp/accounts paths SHALL redirect to /psp?tab=movimientos and /psp?tab=cuentas respectively` (≥3 scenarios)
  - [ ] `The Reconciliation Banner MUST render above the tabs as a stackable alert area dismissible to a per-session pill` (≥3 scenarios — Decisions 6 + 7c)
  - [ ] `The Disponibilidad tab MUST render one balance card per banco sponsor with click-to-filter cross-tab persistence` (≥3 scenarios — Decisions 2 + 7a)
  - [ ] `The Movimientos tab MUST render a paginated ledger with debounced search, filters and per-sponsor filter cards` (≥3 scenarios)
  - [ ] `The Cuentas tab MUST render a paginated accounts list with row-click opening a Drawer-based SWIFT transactions drill-down` (≥3 scenarios — Decision 4)
  - [ ] `The Habilitar cuenta CTA in Cuentas tab MUST reuse <WhitelistAccountModal> from ops-clients without duplicating its logic` (≥3 scenarios — Decision 5)
  - [ ] `Coinag health MUST be polled every 60 s and surfaced as a header indicator` (≥3 scenarios — Decision 8)
  - [ ] `Loading, validation, and error surfaces MUST follow the canonical core-error-handling patterns` (≥3 scenarios)
  - [ ] `The PSP module CTA + tab access MUST be gated by capability: psp:read for tab access, psp:whitelist for the Habilitar cuenta CTA, OPS_ADMIN as fallback` (≥3 scenarios)

## 2. Validation gates

- [ ] Run `openspec validate add-ops-psp --strict` and confirm the change validates.
- [ ] Run `openspec validate --all --strict` and confirm baseline + sibling changes still validate.
- [ ] No code changes in this change → no need for type-check / lint / test:run / build:qa.

## 3. Documentation cross-references

- [ ] Verify `proposal.md` references the legacy files at `core-ops-frontend/src/PSP.vue`, `src/views/psp/PSPHome.vue`, `src/views/psp/PSPAccounts.vue`, `src/components/ImportSwiftModal.vue` and ties to `MIGRATION-NOTES.md` Decision PSP-1 (refined version with 3 tabs).
- [ ] Verify `design.md` documents:
  - The decision to ship as ONE capability with 3 tabs, NOT split (Decision 1).
  - The Banco Sponsor open-set abstraction (Decision 2).
  - The decision to keep v1 read-only at the data-mutation level (Decision 3).
  - The decision to use Drawer (NOT modal or sub-route) for the Cuentas drill-down (Decision 4).
  - The decision to REUSE `<WhitelistAccountModal>` from `ops-clients` (Decision 5).
  - The stackable reconciliation banner area (Decision 6).
  - The 5 quality-of-life refinements (Decision 7) + explicit OUT list.
  - The Coinag health polling cadence + indicator (Decision 8).

## 4. Archive (after the implementation change lands)

- [ ] After the implementation change `implement-ops-psp` is archived, archive this change too via `openspec archive add-ops-psp`.
- [ ] Confirm the CLI applies the new capability (`openspec/specs/ops-psp/spec.md`) and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-ops-psp/`.
- [ ] Final commit: `specs(ops): add ops-psp capability for unified PSP module with Banco Sponsor abstraction`.

## 5. Follow-up changes

- [ ] **`implement-ops-psp`** — writes `src/pages/Psp.vue`, `src/ops/psp/{api.ts,types.ts,sponsor-catalog.ts,*.vue}`, registers the route + legacy redirects, registers the sidebar entry, extends `<WhitelistAccountModal>` from `ops-clients` with a `created` event for cache-invalidation chaining (composition-only, NOT a Requirement modification on `ops-clients`). Validation gates: type-check / lint / test:run / spec:check / build:qa.
- [ ] **`extend-ops-psp-create-movement`** (separate, future) — Create Movement modal with the 4 sub-types (regular / internal / collector / adjustment).
- [ ] **`extend-ops-psp-create-coinag-account`** (separate, future) — multi-step wizard for Coinag CVU generation.
- [ ] **`extend-ops-psp-edit-label`** (separate, future) — rename modal for Coinag accounts.
- [ ] **`extend-ops-psp-swift-import`** (separate, future) — SWIFT XML drag-drop parser using `core-file-upload`.
- [ ] **`extend-ops-psp-csv-export`** (separate, future) — Movements CSV export with the canonical `/movements/export` endpoint.
- [ ] **`extend-ops-psp-movement-details-modal`** (separate, future) — coordinated with `ops-financial-dashboard` migration; both modules adopt the shared modal at once.
- [ ] **`extend-ops-psp-sponsor-catalog-from-backend`** (separate, future) — when sponsor #3 lands, the catalog moves from file-level to `GET /sponsors`.
- [ ] **`add-ops-roles`** (separate, future) — capability strings (`psp:read`, `psp:whitelist`, `psp:create-movement`).
