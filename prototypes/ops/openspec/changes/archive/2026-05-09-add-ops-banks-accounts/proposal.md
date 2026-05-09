- Module: OPS

# Add the Bancos / Cuentas module — master catalog of Ardua accounts with preparatory accounting config

## Why

Ardua holds funds across multiple legal entities (`Sociedad`), at multiple institutions (`Estructura`: banks, ALyCs, exchanges, PSPs, custodians, providers), spread across multiple accounts per institution and per currency. Today there is no single OPS surface that exposes that catalog: the data lives implicitly inside the PSP page (Coinag-only), inside spreadsheets (`CUENTAS_ESTRUCTURAS.xlsx`), and inside operator memory. That gap blocks three downstream needs:

1. **Movimientos** needs to assign every entry/exit a `Sociedad → Estructura → Cuenta` triple from a managed dropdown — today operators retype free-text and the picker drifts.
2. **PSP** needs to declare its accounts under the same catalog as the rest of the institutions, so PSP is just one structure type among others (not a parallel ontology).
3. **FIN** is about to define the operational plan-of-accounts; OPS needs a place to capture, **preparatorily**, the accounting code mapped to each cuenta so that when FIN's Motor Contable lands the wiring is already drafted and just needs validation.

`ops-banks-accounts` is the master catalog that solves all three. It lands as a Type-A page under the `Catálogos` block of the OPS sidebar.

## What Changes

- **New page** `src/pages/BanksAccounts.vue`, registered at `/banks-accounts` with `meta.block = 'Catálogos'` and `meta.breadcrumb = 'Bancos / Cuentas'`. Per the OpenSpec L1/L2/L3 contract: page header (title + 2 CTAs) → KPI grid (4 cards) → filter row (search + 5 select filters) → paginated table (9 columns + per-row actions menu).
- **New page-header CTAs** `Nueva Estructura` and `Nueva Cuenta` (primary). Both open Create modals (canonical `core-modals` Create variant).
- **New 4-KPI row:** `Estructuras` (count of unique structures, neutral) · `Cuentas totales` (count of accounts, neutral) · `Config. contable` (count of accounts with accounting code, success-toned green) · `Sin configurar` (count of accounts pending mapping, warning-toned amber). KPIs always derived from the **full** dataset, not the filtered visible set.
- **New filters row:** a free-text search `Buscar por banco, sociedad o número` plus 5 selects: `Sociedad`, `Tipo` (de estructura), `Tipo de cuenta`, `Moneda`, `Config. contable` (`Configuradas` / `Sin configurar`).
- **New table** (9 columns + per-row Actions menu): `Sociedad` (badge), `Banco / Estructura`, `Tipo` (badge by structure-type colour), `Tipo de cuenta`, `Moneda` (currency badge), `Nro. / Address` (mono font), `Cuenta padre`, `Estado` (`Activa` / `Inactiva` badge), `Cuenta contable` (two-line: code + name).
- **New per-row actions** (via shared `ActionsMenu.vue` portal): `Configurar cuenta contable` (active — opens Edit modal), `Editar datos` (disabled with `V2` tag in v1).
- **New `Configurar cuenta contable` modal** — Edit-style, captures code (`cod`), name (`nombre`), accounting type (`tipo`), and free-text observations (`obs`). Save persists, Detail mode replaces Sin configurar with the configured code in the row.
- **New blue notice** at the top of the table area (alert banner, info-toned per `core-error-handling`): explains that the accounting configuration is **preparatory** until FIN's Motor Contable lands.
- **New domain types** `Sociedad`, `EstructuraTipo` (`'Banco' | 'Banco digital' | 'ALyC' | 'Exchange' | 'Custodio' | 'PSP' | 'Proveedor'`), `CuentaTipo` (operational variants: `'Cuenta Corriente' | 'CVU' | 'Wallet Pool' | 'Custodia' | 'Exchange Account' | 'Comitente'`), `Moneda`, and `BankAccountRecord`.
- **New API endpoints** (read-only in v1 happy path): `GET /api/banks-accounts`, `POST /api/banks-accounts` (Crear Cuenta), `POST /api/banks-accounts/structures` (Crear Estructura), `PATCH /api/banks-accounts/:id/accounting` (Configurar cuenta contable). Per `core-api-layer` all errors normalise to `ApiError`.
- **Sidebar entry update** — adds the `Bancos / Cuentas` entry in `Sidebar.vue` under `Catálogos`, in the order `Clientes → Instrucciones → Bancos / Cuentas` (per `restructure-ops-sidebar`'s left-to-right layout extended).
- **No URL aliases / redirects.** No legacy URL is being absorbed. New route is `/banks-accounts` only.

## Capabilities

### New Capabilities

- `ops-banks-accounts`: the OPS master catalog of `Sociedad → Estructura → Cuenta`. Owns the page, the columns, the filters, the KPIs, the two Create CTAs, the `Configurar cuenta contable` flow, and the rule that the accounting configuration is preparatory until FIN's Motor Contable lands.

### Modified Capabilities

_(none — `ops-instructions` already states that "entries for additional Catálogos modules MAY appear when their respective capabilities land", and `ops-clients` only asserts that `Clientes` is the **first** entry in Catálogos, which remains true after this change. No delta needed for either.)_

## Impact

- **Code:** new files `src/pages/BanksAccounts.vue`, `src/types/banks-accounts.ts`, `src/api/banks-accounts.ts` (axios calls + zod parse), `src/composables/useBanksAccountsTable.ts` (or use `useTable` directly if client-side fits), and the three modals: `src/components/banks-accounts/CreateStructureModal.vue`, `src/components/banks-accounts/CreateAccountModal.vue`, `src/components/banks-accounts/ConfigureAccountingModal.vue`. Update `src/components/layout/Sidebar.vue` to add the entry, `src/router/routes.ts` to register the route, and `src/config/routes.ts` to add `BANKS_ACCOUNTS` to `ROUTE_PATHS` + `ROUTE_NAMES`.
- **Specs:** new spec `openspec/specs/ops-banks-accounts/spec.md` with the canonical Requirements (no MODIFIED deltas — the existing `ops-clients` and `ops-instructions` specs already accommodate Bancos / Cuentas joining the Catálogos block).
- **Tests:** unit tests for the type guards (structure-type → cuenta-type derivation), zod parsers, and KPI counters; component test for the page mount that asserts the L2 KPI grid renders 4 cards in canonical order, the table renders the 9 columns, and the two CTAs are present.
- **APIs / dependencies:** four new API endpoints under `/api/banks-accounts/*`. No new npm dependencies — vee-validate + zod + tanstack/vue-query handle forms, validation and server data.
- **Backwards compatibility:** none affected. New module, new URL, new spec.
- **Operator-facing impact:** new sidebar entry and a new master-data surface. The blue `preparatorio` notice is the canonical channel for setting expectations about the accounting column.
- **Out of scope (deferred to follow-up changes):** the wiring of Movimientos and PSP to consume this catalog as their dropdown source; the actual Motor Contable validation against FIN's plan-of-accounts (depends on FIN delivery).
