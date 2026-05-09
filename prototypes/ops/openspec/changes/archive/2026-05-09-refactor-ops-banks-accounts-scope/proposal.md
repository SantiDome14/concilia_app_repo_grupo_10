- Module: OPS

# Realign `ops-banks-accounts` to OPS-only ownership and complete the Edit-Account flow

## Why

Bancos / Cuentas is a **shared register** of the Ardua backoffice — `ops` owns the operational catalog (which accounts the group has at each partner / bank / exchange / custodian), and the upcoming `fin` app will consume it to assign each cuenta a cuenta contable and drive the Motor Contable's automatic asientos. The previous shape of `ops-banks-accounts` accumulated FIN-side concerns (a `Cuenta contable` column, an "Sin configurar" KPI, a Configure-Accounting modal, a "preparatorio" notice). Those concerns belong to `fin`, not `ops` — keeping them under OPS ownership creates duplicated responsibility, blocks FIN from owning its surface cleanly, and confuses operators about who is responsible for the accounting mapping.

This change removes every accounting-flavoured surface from the OPS module and finishes the Edit-Account flow that was deferred at creation as `V2`. After the change, OPS owns "the catalog of accounts" cleanly; FIN, when it lands as its own app, will consume `GET /api/banks-accounts` and add accounting concerns on its own surface.

## What Changes

**Removed (FIN-bound concerns leave OPS):**

- **BREAKING:** the KPI cards `Config. contable` and `Sin configurar` are removed from the L2 grid. The grid now renders 2 cards (`Estructuras`, `Cuentas totales`).
- **BREAKING:** the table column `Cuenta contable` is removed. The table now renders 8 columns instead of 9.
- **BREAKING:** the filter `Config. contable` (with options `Todas` / `Configuradas` / `Sin configurar`) is removed. The filter row now renders 4 selects.
- **BREAKING:** the per-row Actions menu item `Configurar cuenta contable` is removed.
- **BREAKING:** the persistent preparatory-accounting notice banner is removed. The page no longer states anything about FIN's plan-of-accounts.
- **BREAKING:** the inline `Nueva Estructura` CTA inside the EmptyState is removed (amended during verification). The always-visible page-header CTA is the canonical entry point — having two CTAs stacked in the same empty viewport was redundant.
- **BREAKING:** the API endpoint `PATCH /api/banks-accounts/:id/accounting` and the client function `updateAccountAccounting` are removed.
- **BREAKING:** the type `AccountingConfig` and the optional fields `Cuenta.contable` / `BankAccountRecord.contable` are removed from the OPS domain types.
- **BREAKING:** the zod schema `accountingConfig` and the `contable` property in `bankAccountRecord` are removed.
- The component `ConfigureAccountingModal.vue` is deleted along with its spec (`ConfigureAccountingModal.spec.ts`).
- The capability `banks-accounts:configure-accounting` is no longer used by OPS (FIN will declare its own when it lands).

**Added (Edit-Account flow lands):**

- The per-row Actions menu item `Editar datos` is now **active** (no V2 tag). It opens a new Edit-Account modal.
- New file `EditAccountModal.vue`: pre-fills the cuenta's current data and lets the operator edit `tipoCuenta`, `moneda`, `nro`, `padreCuentaId`, and `status`. Sociedad and Estructura are read-only inside the modal — changing those means a new cuenta, not an edit (preserves audit trail).
- New API endpoint `PATCH /api/banks-accounts/:id` and client function `updateAccount(id, payload)` with its zod schema.
- New capability gate `banks-accounts:edit-account` for the Edit action.
- New spec `EditAccountModal.spec.ts` covering preload + happy-path save.

**Reaffirmed (no change):**

- Page registration (`/banks-accounts`, `meta.block = 'Catálogos'`, breadcrumb `Bancos / Cuentas`).
- Sociedad → Estructura → Cuenta data shape (only the optional accounting fields drop).
- Cascading dropdowns in `Nueva Cuenta` (`Sociedad → Estructura → Cuenta padre`).
- The `defaultCuentaTipoFor` helper (used unchanged by both Create and Edit modals).
- Per-row Actions menu using the shared `ActionsMenu.vue` portal.

## Capabilities

### New Capabilities

_(none — `ops-banks-accounts` continues as the canonical capability; this change reshapes its scope.)_

### Modified Capabilities

- `ops-banks-accounts`: removes 6 Requirements that captured FIN-bound concerns (`4 KPI cards`, `5 filters`, `9 columns`, `Configurar cuenta contable + Editar datos V2-disabled` Actions menu, `Configure-Accounting modal`, `preparatory accounting notice`) and adds 5 Requirements reflecting the OPS-only shape (`2 KPI cards`, `4 filters`, `8 columns`, `Editar datos active` Actions menu, `Edit-Account modal`). The Type-A page-shell Requirement and the capability-gating + empty-state Requirement are MODIFIED to reflect the smaller surface.

## Impact

- **Code (deleted):** `src/ops/banks-accounts/ConfigureAccountingModal.vue`, `src/ops/banks-accounts/ConfigureAccountingModal.spec.ts`.
- **Code (created):** `src/ops/banks-accounts/EditAccountModal.vue`, `src/ops/banks-accounts/EditAccountModal.spec.ts`.
- **Code (edited):** `src/ops/banks-accounts/types.ts` (drop accounting types), `src/ops/banks-accounts/api.ts` (drop accounting endpoint + schemas, add `updateAccount`), `src/pages/BanksAccounts.vue` (drop accounting KPIs + column + filter + notice + menu item; activate Editar datos), `src/pages/BanksAccounts.spec.ts` (update KPI counts, drop accounting assertions, add Edit menu assertions), `src/ops/banks-accounts/api.spec.ts` (drop accounting schema tests, add updateAccount payload schema tests).
- **Specs:** `openspec/specs/ops-banks-accounts/spec.md` shrinks from 8 Requirements (with FIN concerns) to 7 Requirements (OPS-only). The capability is the same; the contracts shrink and refocus.
- **APIs:** `PATCH /api/banks-accounts/:id/accounting` removed; `PATCH /api/banks-accounts/:id` added.
- **Backwards compatibility:** the page URL and the Sociedad/Estructura/Cuenta shape stay the same. Data already captured under `contable` is **lost** from the OPS surface — once FIN's app lands it will own the accounting layer, but until then the existing operator-entered codes are not displayed anywhere. If preserving them as a one-time export matters, that is a separate operational task (not in scope for this code change).
- **Operator-facing impact:** on next deploy, the Bancos / Cuentas page is visibly leaner. Anyone who used the Configure-Accounting flow will not find it — flag in the release note that "configuración contable" is leaving OPS and will return as part of the future FIN app.
- **Out of scope:**
  - The future `fin` app and its accounting-mapping surface (separate change in a future `core-fin` repo or app namespace).
  - Migrating existing `contable` data into FIN's eventual storage (operational task, owned by whoever stands up FIN).
  - The `Eliminar cuenta` flow (still V2 — operators can deactivate via the Edit modal's `status` field).
