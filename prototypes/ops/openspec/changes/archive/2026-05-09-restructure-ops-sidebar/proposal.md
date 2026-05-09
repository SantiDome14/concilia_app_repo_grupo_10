- Module: OPS

# Restructure the OPS Sidebar into Operaciones / Custodia / Catálogos

## Why

The current OPS sidebar groups every operational module under a single `Operaciones` block plus a thin `Configuración` block, which does not reflect the real domain shape: PSP is a custody surface (where Ardua holds funds with a third-party PSP), Clientes is a master-data catalog, and the future `Bancos / Cuentas` module is also a catalog. Keeping all of them under `Operaciones` flattens semantically distinct surfaces and makes the upcoming `Bancos / Cuentas` module impossible to place coherently. Now is the right moment because the new module is about to land in a follow-up change (`add-ops-banks-accounts`); restructuring first leaves a clean slot for it without an additional sidebar reshuffle.

## What Changes

- **Rename block** `Configuración` → `Catálogos` in the OPS sidebar. Existing modules in that block (today only `Instrucciones`) move with the rename.
- **Add new block** `Custodia` between `Operaciones` and `Catálogos` in the sidebar order.
- **Move module** `PSP` from `Operaciones` → `Custodia`.
- **Move module** `Clientes` from `Operaciones` → `Catálogos`.
- **Reaffirm placement** of `Movimientos` and `Cotizaciones` in `Operaciones` (no delta required — their existing specs already pin them there).
- **Update** the `meta.block` value on the affected routes in `src/router/routes.ts`.
- **Update** the `blocks` array in `src/components/layout/Sidebar.vue` to declare the three blocks in this order: `Operaciones`, `Custodia`, `Catálogos`.
- **No URL changes.** All existing route paths (`/clients`, `/psp`, `/instructions`, `/movimientos`, `/cotizaciones`) remain unchanged. No redirects are needed.
- **No new capabilities** are introduced — `Bancos / Cuentas` lands as its own change.

## Capabilities

### New Capabilities

_(none — the new `Bancos / Cuentas` module ships in the follow-up change `add-ops-banks-accounts`)_

### Modified Capabilities

- `ops-clients`: the Scenario `Sidebar surfaces the page under the Operaciones block` is rewritten so the `Clientes` entry surfaces under the `Catálogos` block. The Requirement title `meta.block` value updates from `Operaciones` to `Catálogos`.
- `ops-psp`: the Scenarios that assert the `PSP` entry under the `Operaciones` block (ADMIN sees / VIEWER sees) are rewritten to assert it under the `Custodia` block. The Requirement title `meta.block` value updates from `Operaciones` to `Custodia`.
- `ops-instructions`: the Scenario `Sidebar surfaces the page under the Configuración block` is rewritten so the `Instrucciones` entry surfaces under the `Catálogos` block. The Requirement title `meta.block` value updates from `Configuración` to `Catálogos`.

## Impact

- **Code:** `prototypes/ops/src/components/layout/Sidebar.vue` (the `blocks` array), `prototypes/ops/src/router/routes.ts` (`meta.block` on three routes).
- **Specs:** delta-MODIFIED files for `ops-clients`, `ops-psp`, `ops-instructions`.
- **Tests:** any unit / e2e test that asserts the sidebar groups Clientes / PSP / Instrucciones under their previous blocks must update its expected block name. No new tests required.
- **APIs / dependencies:** none.
- **Backwards compatibility:** breadcrumbs derived from `meta.block` change for the three affected routes (`Operaciones / Clientes` → `Catálogos / Clientes`, etc.). No URL changes, so external links and bookmarks continue to work.
- **Operator-facing impact:** the sidebar order and labels change for OPS users on next deploy. Worth flagging in the release note.
