> Jira REQ: — (no ticket; fifth OPS migration change after `add-ops-instructions`, `add-ops-clients`, `add-ops-statements`, `add-ops-account-instructions`)
> Module: OPS

# Add ops-psp — single capability with 3 tabs (Disponibilidad / Movimientos / Cuentas) over the Banco Sponsor abstraction

## Why

The legacy `core-ops-frontend` ships PSP across **two routes** glued by a third
shell page:

- `PSP.vue` (617 LOC) — layout shell hosting `/psp/home` and `/psp/accounts` as router-view children, loading shared data on mount: `pspInfo`, Coinag health (polled every 60 s), and the balance reconciliation snapshot.
- `PSPHome.vue` (6,604 LOC) — the "Movements" tab: reconciliation banner + Coinag collector account card + paginated ledger + 5+ modals (Create Movement with three sub-types, Create Coinag CVU, Coinag Account details, Whitelist).
- `PSPAccounts.vue` (1,798 LOC) — the "Accounts" tab: same banner + collector card + paginated accounts list + Create Coinag Account modal + Edit Label modal.
- `ImportSwiftModal.vue` (529 LOC) — XML parser drag-drop for ISO 20022 / pacs.008 messages, used to ingest SWIFT transactions.

The two-route split is a side-effect of the legacy not having a sub-module-tabs
primitive — there's no UX reason for it. Per `MIGRATION-NOTES.md` Decision PSP-1
the new template paradigm collapses both routes into **one capability `ops-psp`**
registered at `/psp`, with **three internal tabs** following the Módulo B shape:

- **Disponibilidad** — saldos disponibles agrupados por banco sponsor (Coinag activo hoy; BIND + Banco de Comercio en roadmap), con balance reconciliation banner stackable arriba cuando hay mismatch.
- **Movimientos** — ledger paginado + filtros (search / tipo / origen / estado) + cards por sponsor que también actúan como filtros de un click ("ver solo movimientos de Coinag").
- **Cuentas** — lista paginada de cuentas operativas; click en una row abre un drawer con drill-down de SWIFT transactions (lo que hoy es el legacy `PSPAccounts.vue`).

The `Banco Sponsor` abstraction is **open-set from day one** per Decision PSP-1
(NOT hardcoded as `'COINAG'`): the sponsor catalog is sourced from a backend
endpoint or a typed enum so adding BIND or Banco de Comercio later is a
config change, not a code change in every section.

This is the **richest OPS migration on the backlog** by file size; v1
intentionally **scopes lectura + Whitelist integration** with `ops-clients`,
deferring the heavier modals (Create Movement, Create Coinag CVU, Edit Label,
SWIFT XML import) to follow-up changes. The Movement details modal is shared
with the future `ops-financial-dashboard` and lands when that capability is
migrated.

The legacy URLs `/psp/home` and `/psp/accounts` are **absorbed** via redirects:
`/psp/home` → `/psp?tab=movimientos`, `/psp/accounts` → `/psp?tab=cuentas`.
Bookmarks keep working.

## What Changes

- **Create the `ops-psp` capability.** New spec at `openspec/specs/ops-psp/spec.md` (materialised on archive) with the Requirements unifying the legacy PSP shell + tabs. Concretely covers:

  1. The `/psp` page is a Type-A page with 3 internal tabs (NOT segmentation — these are sub-modules per `core-module-types` Type-A composition).
  2. The active tab is reflected in the URL via `?tab=disponibilidad|movimientos|cuentas` so back-navigation restores the tab state. Last-active-tab also persists in `localStorage` (Decision 7e) so opening the module via the sidebar entry remembers the operator's previous context.
  3. The legacy paths `/psp/home` and `/psp/accounts` SHALL redirect to `/psp?tab=movimientos` and `/psp?tab=cuentas` respectively.
  4. The Reconciliation Banner SHALL render above the tabs as a **stackable** alert area (one alert per banco sponsor with mismatch). Today's catalog (Coinag only) renders one banner; once BIND + Banco de Comercio land, the array grows. Per Decision 7c the banner is dismissible to a small pill for the session — clicking the pill expands the banner back.
  5. **Disponibilidad** tab renders one balance card per banco sponsor showing current balance + last-checked timestamp + click-to-filter semantics (clicking a card pre-applies the sponsor filter on Movimientos and Cuentas if the operator switches tabs).
  6. **Movimientos** tab renders the paginated ledger with debounced search (300 ms) + filters (`sponsor`, `tipo`, `origen`, `estado`) + per-sponsor filter cards above the table that act as one-click filters with active state.
  7. **Cuentas** tab renders the paginated accounts list with row-click opening a Drawer per `core-modals` Drawer pattern; the drawer shows SWIFT transactions for the chosen account.
  8. The `Habilitar cuenta` CTA in the Cuentas tab SHALL reuse `<WhitelistAccountModal>` from `ops-clients` (no duplication of the modal logic; this capability composes on top of the modal and inherits its 2-step state machine, validate-then-confirm UX, and 4xx/5xx error handling).
  9. Coinag health SHALL be polled every 60 s via vue-query's `refetchInterval` (Decision 7d also auto-refreshes Disponibilidad balances on the same cadence). A small status indicator in the page header shows healthy/degraded/down.
  10. Skeleton + EmptyState + 5xx retry banner — all from `core-error-handling`.

- **Define the typed surface.** Files materialised on implementation:
  - `src/pages/Psp.vue` — page entry registered at `/psp` with `meta.requiresAuth = true`, `meta.layout = 'shell'`, `meta.breadcrumb = 'PSP'`, `meta.block = 'PSP'`.
  - `src/ops/psp/api.ts` — endpoint wrappers using the shared `apiClient` (`getPspInfo`, `getCoinagHealth`, `listSponsorBalances`, `listMovements`, `listAccounts`, `getAccountSwiftTransactions`).
  - `src/ops/psp/types.ts` — `BancoSponsor`, `SponsorBalance`, `ReconciliationSnapshot`, `PspMovement`, `PspAccount`, `SwiftTransaction`, `MovementsListParams`, `AccountsListParams`, `PspTab`.
  - `src/ops/psp/sponsor-catalog.ts` — open-set sponsor catalog (Coinag active, BIND/Banco de Comercio roadmap stubs) + helpers `getSponsorByCode()`, `getSponsorLabel()`. Pure functions, testable in isolation.
  - `src/ops/psp/SponsorBalanceCard.vue` — single sponsor balance card used in Disponibilidad tab.
  - `src/ops/psp/ReconciliationBanner.vue` — stackable banner area + dismissible-to-pill toggle.
  - `src/ops/psp/MovementsTable.vue` — table-specific composition (columns, row click → details modal — DEFERRED).
  - `src/ops/psp/MovementsFilters.vue` — filter row + sponsor cards.
  - `src/ops/psp/AccountsTable.vue` — table-specific composition for the Cuentas tab.
  - `src/ops/psp/SwiftTransactionsDrawer.vue` — drawer body for the Cuentas drill-down.
  - `src/ops/psp/CoinagHealthIndicator.vue` — page header indicator.

- **Wire the trigger.** A new sidebar entry `PSP` under the `Operaciones` block (alongside `Clientes` from `ops-clients`). The icon is `Banknote` from `lucide-vue-next` (or similar). The entry is gated by `psp:read` capability or `OPS_ADMIN`.

- **Integrate with sibling capabilities — referenced, not edited.**
  - `core-layout` — page header with title + Coinag health indicator + (capability-gated) CTAs.
  - `core-module-types` — Type-A page with sub-module tabs (Módulo B shape).
  - `core-data-tables` — table primitive, debounced filters, server-side pagination for Movements + Accounts.
  - `core-modals` — Drawer for the Cuentas drill-down; reuses existing modals from `ops-clients` (no new modals here).
  - `core-actions-menu` — N/A in v1 (no per-row actions; row click on Cuentas opens the drawer).
  - `core-forms` — `<Input>`, `<Select>` for filters; vee-validate where applicable.
  - `core-api-layer` — shared axios + `ApiError`. Replaces the legacy hand-rolled fetch + manual headers.
  - `core-error-handling` — Skeleton, EmptyState, alert banners (the Reconciliation banner area uses the canonical stackable-alerts pattern), toasts.
  - `core-navigation` — `/psp/home` + `/psp/accounts` redirects.
  - **`ops-clients`** — reuse `<WhitelistAccountModal>` for the Habilitar cuenta CTA. Composition-only — NO Requirement modification on `ops-clients`.
  - **`ops-roles` (companion change, future)** — `psp:*` capability strings; for now declared inline.

## Capabilities

### Affected Capabilities

None modified by this change. The composition with `ops-clients`
(`<WhitelistAccountModal>` reuse) is composition-only.

### New Capabilities

- `ops-psp` (OPS module; Disponibilidad / Movimientos / Cuentas with Banco Sponsor abstraction) — 10 requirements, ~30 scenarios.

### Non-capability artifacts

- `src/pages/Psp.vue` — page entry registered at `/psp`.
- `src/ops/psp/{api.ts,types.ts,sponsor-catalog.ts,*.vue}` — typed surface.
- Sidebar entry `PSP` under the `Operaciones` block.

### Removed from scope

- **Create Movement modal** (with the 3 sub-types: regular, internal, collector, adjustment). The legacy modal is enormous (multiple branches per type). Lands as `extend-ops-psp-create-movement` once the read-side is solid.
- **Create Coinag Account / Generate CVU modal** (multi-step flow: client picker → confirm → success). Lands as `extend-ops-psp-create-coinag-account`.
- **Edit Label modal** (rename a Coinag account). Small follow-up `extend-ops-psp-edit-label`.
- **ImportSwiftModal** (XML parser drag-drop for pacs.008). Reuses `core-file-upload` when migrated; lands as `extend-ops-psp-swift-import`.
- **Movement details modal** (opens on row click in Movimientos). Shared with `ops-financial-dashboard` (Activity tab uses the same modal). DEFERRED — when the dashboard capability is migrated, both modules adopt the shared modal at once via a coordinated extension.
- **CSV export of movements** (`/movements/export`). Useful, low-cost; **could** ship in v1 but doesn't affect the architectural shape. Cut for v1 to keep scope bounded; lands as `extend-ops-psp-csv-export`.
- **Coinag account details modal** (the read-only inspection view of a CVU). Out of v1; the relevant data surfaces in the Cuentas drawer when the operator clicks an account. The legacy modal is duplicated content of the drawer.
- **CRUD on banco sponsors themselves** (the catalog of integrations: Coinag, BIND, Banco de Comercio). Owned by future `ops-sponsors` capability when product validates the use case (today the catalog is config-driven).
- **Movement type segmentation** (regular / internal / collector / adjustment) AS UI segmentation — the v1 Movimientos tab lists ALL types in one ledger with a filter. The legacy treats each type as its own sub-flow (mainly for creation); this is a creation concern, not a listing concern.
