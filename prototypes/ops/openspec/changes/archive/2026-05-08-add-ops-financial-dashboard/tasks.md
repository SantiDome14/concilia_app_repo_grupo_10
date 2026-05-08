# Tasks — add-ops-financial-dashboard

This change is the **sixth and final OPS migration change**, closing the OPS
backlog. It scopes the `ops-financial-dashboard` capability and defines its
surface in OpenSpec; the implementation lands in a follow-up so the spec can
be reviewed in isolation first.

## 1. Spec deltas

- [ ] `specs/ops-financial-dashboard/spec.md` — NEW capability with 11 ADDED Requirements:
  - [ ] `The /financial-dashboard page MUST be a Type-A page with 2 internal tabs (Activity / Quotes) and URL-reflected active tab` (≥3 scenarios)
  - [ ] `The legacy /dashboard path SHALL redirect to /financial-dashboard?tab=activity` (≥3 scenarios)
  - [ ] `The Activity tab MUST render a paginated movements ledger with sponsor filter cards + filter row + search` (≥3 scenarios)
  - [ ] `Row click on a movement MUST open the shared MovementDetailsModal with a Descargar comprobante action` (≥3 scenarios)
  - [ ] `The Quotes tab MUST render a paginated quotes ledger with a sub-toggle Active / Historic and filter row` (≥3 scenarios — Decision 4)
  - [ ] `Quote action buttons (Pay / Swap / Unsupported) MUST be hidden in v1; the status renders as a read-only badge with a tooltip` (≥3 scenarios — Decision 6d)
  - [ ] `Import SWIFT and New Movement header CTAs MUST be hidden in v1` (≥3 scenarios)
  - [ ] `The MovementDetailsModal MUST live in src/ops/financial-dashboard/ as the canonical home; ops-psp's deferred row-click integration imports from here` (≥3 scenarios — Decision 2)
  - [ ] `Loading, validation, and error surfaces MUST follow the canonical core-error-handling patterns` (≥3 scenarios)
  - [ ] `The dashboard CTA + tab access MUST be gated by capability: dashboard:read, OPS_ADMIN as fallback` (≥3 scenarios)
  - [ ] `Quality-of-life: URL sync of tab + sub-toggle + filters; localStorage of last-active tab + sub-toggle; Movement Details deep-link via ?movement=:id; Quote status tooltip explaining hidden actions` (≥4 scenarios — Decision 6)

## 2. Validation gates

- [ ] Run `openspec validate add-ops-financial-dashboard --strict` and confirm the change validates.
- [ ] Run `openspec validate --all --strict` and confirm baseline + sibling changes still validate.
- [ ] No code changes in this change → no need for type-check / lint / test:run / build:qa.

## 3. Documentation cross-references

- [ ] Verify `proposal.md` references the legacy file at `core-ops-frontend/src/FinancialDashboard.vue` (6,592 LOC).
- [ ] Verify `design.md` documents:
  - The decision to keep v1 read-only at the data-mutation level (Decision 1) — same pattern as `ops-psp` Decision 3.
  - The decision to land MovementDetailsModal as the canonical home in this capability (Decision 2).
  - The decision to register at `/financial-dashboard`, NOT `/` (Decision 3).
  - The Quotes sub-toggle as a `view` URL param, not a third tab (Decision 4).
  - The cross-capability composition with `ops-psp` for sponsor filter cards but NOT cross-dashboard sponsor persistence (Decision 5).
  - The 4 quality-of-life refinements (Decision 6) + explicit OUT list.

## 4. Archive (after the implementation change lands)

- [ ] After the implementation change `implement-ops-financial-dashboard` is archived, archive this change too via `openspec archive add-ops-financial-dashboard`.
- [ ] Confirm the CLI applies the new capability (`openspec/specs/ops-financial-dashboard/spec.md`) and moves this change folder to `openspec/changes/archive/YYYY-MM-DD-add-ops-financial-dashboard/`.
- [ ] Final commit: `specs(ops): add ops-financial-dashboard capability for the OPS main cash dashboard`.

## 5. Follow-up changes

- [ ] **`implement-ops-financial-dashboard`** — writes `src/pages/FinancialDashboard.vue`, `src/ops/financial-dashboard/{api.ts,types.ts,*.vue}` including the canonical MovementDetailsModal, registers the route + legacy redirect, registers the sidebar entry. Validation gates: type-check / lint / test:run / spec:check / build:qa.
- [ ] **`extend-ops-financial-dashboard-create-movement`** (separate, future) — Create Movement modal with the 4 sub-types (DEPOSIT / WITHDRAWAL / FX / ADJUSTMENT). Likely coordinated with `extend-ops-psp-create-movement` so a single canonical modal lives here and is reused by PSP.
- [ ] **`extend-ops-financial-dashboard-quote-actions`** (separate, future) — Pay Quote / DirectSwap / UnsupportedQuote modals + Confirmation + WarningResult dialogs.
- [ ] **`extend-ops-psp-movement-details-modal`** (separate, future — already on the PSP backlog) — once this change lands MovementDetailsModal, the PSP follow-up wires Movimientos row-click to import the modal from here.
- [ ] **`extend-ops-financial-dashboard-kanban-view`** (separate, future) — kanban primitive for in-flight movements once product validates.
- [ ] **`extend-ops-financial-dashboard-csv-export`** (separate, future — coordinated with `extend-ops-psp-csv-export`).
- [ ] **`add-ops-roles`** (separate, future) — capability strings (`dashboard:read`, etc.).
