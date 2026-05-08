> Jira REQ: — (no ticket; sixth and final OPS migration change after `add-ops-instructions`, `add-ops-clients`, `add-ops-statements`, `add-ops-account-instructions`, `add-ops-psp`)
> Module: OPS

# Add ops-financial-dashboard — main cash dashboard with Activity + Quotes tabs

## Why

The legacy `core-ops-frontend` ships the main cash dashboard as
`FinancialDashboard.vue` (6,592 LOC), the largest single file in OPS by line
count. The page is registered at the legacy app's `/` (root) and `/dashboard`,
making it the operational home for OPS users. It is composed of:

- **Activity tab** — paginated movements ledger across all sponsors (the
  combined view of operations partner activity), with a filter row, header
  CTAs `Import SWIFT` and `New Movement`, and a per-row click that opens a
  shared `MovementDetails` modal.
- **Quotes tab** — quotes ledger with a sub-toggle `Active Quotes / Historic
  Quotes`, a filter row, and a per-row "Status" affordance that, depending on
  the quote shape, opens one of three modals: `PayQuote`,
  `DirectSwap`, `UnsupportedQuote`.
- **Modals (~3,500 LOC of the file)** — `CreateMovement` is a branched
  state machine across at least 4 sub-types (DEPOSIT / WITHDRAWAL / FX /
  ADJUSTMENT) with currency selectors that lock per type; `MovementDetails`,
  `Receipt download`, `ImportSwift`, `PayQuote`, `DirectSwap`,
  `UnsupportedQuote`, `WarningResult`, `Confirmation`.

This is the **last and largest OPS migration on the backlog**; v1
intentionally **scopes lectura + Movement Details modal + Receipt download**
+ the read-only Quotes table (action buttons hidden). Every mutation
(`CreateMovement`, `PayQuote`, `DirectSwap`, `UnsupportedQuote`, `ImportSwift`)
defers to a follow-up. Same pattern as `ops-psp` per its design.md
Decision 3.

The Movement Details modal landing in this change is the **canonical home**
for the modal — `ops-psp`'s deferred row-click integration (per its design.md
Open question 3) imports from `src/ops/financial-dashboard/` rather than
recreating it. Composition-only cross-capability — no Requirement modification
on `ops-psp` until that follow-up lands.

The legacy `/dashboard` URL is **absorbed** via redirect: `/dashboard` →
`/financial-dashboard?tab=activity`. The `/` URL is owned by the generic
Dashboard page from `core-modulo-genericos` (the operator's home today
shows generic widgets; if product later wants the financial dashboard back
at `/`, it lands as a per-app override on the canonical Dashboard surface).

## What Changes

- **Create the `ops-financial-dashboard` capability.** New spec at `openspec/specs/ops-financial-dashboard/spec.md` (materialised on archive) with the Requirements unifying the legacy Activity + Quotes tabs. Concretely covers:

  1. The `/financial-dashboard` page is a Type-A page with 2 internal tabs (`Activity`, `Quotes`).
  2. The active tab is reflected in the URL via `?tab=activity|quotes` so back-navigation restores. Last-active-tab also persists in `localStorage` (Decision 6 quality-of-life refinement).
  3. The legacy path `/dashboard` SHALL redirect to `/financial-dashboard?tab=activity`.
  4. **Activity tab** renders the paginated movements ledger with the canonical column set (`Fecha · Tipo · Origen · Destino · Moneda · Monto · Estado · Sponsor · Cliente`) + filter row (search + type + status + origin) + per-sponsor filter cards (cross-tab compatible with `ops-psp`'s sponsor filter).
  5. Row click on a movement SHALL open the `<MovementDetailsModal>` (centred dialog) showing the full movement record + a `Descargar comprobante` action that hits `GET /receipt/:id` and opens the URL in a new tab.
  6. **Quotes tab** renders the paginated quotes ledger with a sub-toggle `Active Quotes / Historic Quotes`, filter row, and the canonical column set (`Cliente · Par · Operación · Term · Monto · Rate · Calculado · Estado · Fecha`). Row click in v1 is a NO-OP (cursor-default — the action modals defer to follow-ups).
  7. The `Import SWIFT` and `New Movement` header CTAs are **hidden in v1** (no `disabled` button, no "Próximamente"); they re-appear when their respective follow-ups land.
  8. The Quotes status-cell action buttons (`Pay`, `Swap`, `Unsupported`) are **hidden in v1**; the status renders as a read-only badge.
  9. Coinag health indicator + reconciliation banner are NOT shown here (those belong to `ops-psp`); the financial dashboard renders the AppShell's standard Topbar without those PSP-specific decorations.
  10. Skeleton + EmptyState + 5xx retry banner — all from `core-error-handling`.
  11. CTA + tab access gated by `dashboard:read` capability or `OPS_ADMIN`.

- **Define the typed surface.** Files materialised on implementation:
  - `src/pages/FinancialDashboard.vue` — page entry registered at `/financial-dashboard`.
  - `src/ops/financial-dashboard/api.ts` — endpoint wrappers (`listMovements`, `listQuotes`, `getMovement`, `getReceipt`).
  - `src/ops/financial-dashboard/types.ts` — `Movement`, `MovementDetails`, `Quote`, `MovementsListParams`, `QuotesListParams`, `QuotesView`, `DashboardTab`.
  - `src/ops/financial-dashboard/ActivityFilters.vue` — filter row for Activity tab (sponsor cards + 3 selects + search debounced).
  - `src/ops/financial-dashboard/ActivityTable.vue` — the movements table + row click.
  - `src/ops/financial-dashboard/QuotesFilters.vue` — Quotes filter row + sub-toggle.
  - `src/ops/financial-dashboard/QuotesTable.vue` — quotes ledger.
  - `src/ops/financial-dashboard/MovementDetailsModal.vue` — **shared** centred dialog used by this capability AND (via cross-capability composition) `ops-psp` when its follow-up lands.

- **Wire the trigger.** A new sidebar entry under the `Operaciones` block (alongside `Clientes` and `PSP`). The icon is `LayoutDashboard` (generic) or `LineChart` (financial-flavoured) from `lucide-vue-next` — to be confirmed in implementation. The entry is gated by `dashboard:read` capability or `OPS_ADMIN`.

- **Integrate with sibling capabilities — referenced, not edited.**
  - `core-layout` — page header with title.
  - `core-module-types` — Type-A composition with sub-module tabs.
  - `core-data-tables` — table primitive, debounced filters, server-side pagination.
  - `core-modals` — centred Dialog for the Movement Details modal.
  - `core-forms` — `<Input>`, `<Select>` for filters.
  - `core-api-layer` — shared axios + `ApiError`.
  - `core-error-handling` — Skeleton, EmptyState, alert banners, toasts.
  - `core-navigation` — route registration + `/dashboard` redirect.
  - **`ops-psp`** — reuses the sponsor filter cards for the cross-tab sponsor filter. Composition-only — NO Requirement modification on `ops-psp`. The MovementDetails modal SHALL live in `src/ops/financial-dashboard/`; when `extend-ops-psp-movement-details-modal` lands, that change imports the modal from here (no duplication).
  - **`ops-roles`** (companion change, future) — `dashboard:*` capability strings; for now declared inline.

## Capabilities

### Affected Capabilities

None modified by this change. The cross-capability composition with `ops-psp`
(sponsor filter cards reuse + future MovementDetails import) is composition-
only.

### New Capabilities

- `ops-financial-dashboard` (OPS module; main cash dashboard with Activity + Quotes tabs) — 11 requirements, ~33 scenarios.

### Non-capability artifacts

- `src/pages/FinancialDashboard.vue` — page entry.
- `src/ops/financial-dashboard/{api.ts,types.ts,*.vue}` — typed surface.
- Sidebar entry under `Operaciones` block.

### Removed from scope

- **Create Movement modal** (4+ sub-types: DEPOSIT / WITHDRAWAL / FX / ADJUSTMENT). The legacy modal is ~3,000 LOC. Lands as `extend-ops-financial-dashboard-create-movement` (probably coordinated with `extend-ops-psp-create-movement` so a single canonical movement-creation modal lives in `src/ops/financial-dashboard/CreateMovementModal.vue` and is reused).
- **Pay Quote / DirectSwap / UnsupportedQuote modals**. Lands as `extend-ops-financial-dashboard-quote-actions`.
- **Confirmation / Warning Result modals**. Internal helpers of the deferred quote-action flow; land with `extend-ops-financial-dashboard-quote-actions`.
- **Import SWIFT modal** — already deferred in `ops-psp` as `extend-ops-psp-swift-import`. The follow-up that ships SWIFT import will declare it in `src/ops/financial-dashboard/` (or a shared location) so both capabilities reuse the same component, mirroring the MovementDetails pattern.
- **CSV export of movements** — already deferred in `ops-psp` as `extend-ops-psp-csv-export`. Same pattern: when it lands, the export action is exposed from both surfaces (Activity + PSP Movimientos).
- **KPI strip on top of the dashboard** (cash totals, daily volume, etc.) — does NOT exist in the legacy. If product wants it later, lands as `extend-ops-financial-dashboard-kpi-strip`.
- **Receipt PDF generation** for non-`movement` records (e.g. quotes, account-instructions) — only `GET /receipt/:movement_id` is in v1.
