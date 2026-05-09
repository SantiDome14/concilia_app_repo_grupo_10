## REMOVED Requirements

### Requirement: The page MUST render exactly 4 KPI cards computed from the FULL catalog

**Reason**: 2 of the 4 KPI cards (`Config. contable`, `Sin configurar`) are accounting concerns that belong to the upcoming `fin` app, not OPS. Removing them lets `ops-banks-accounts` shrink to its operational shape; FIN will surface its own accounting KPIs when it lands.

**Migration**: replaced by the new ADDED Requirement "The page MUST render exactly 2 KPI cards computed from the FULL catalog" — the surviving KPIs (`Estructuras`, `Cuentas totales`) keep their order and tone unchanged.

### Requirement: The filter row MUST expose 1 free-text search and 5 select filters

**Reason**: the `Config. contable` filter (`Todas` / `Configuradas` / `Sin configurar`) was tied to the accounting surface and has no operational meaning once that surface leaves OPS.

**Migration**: replaced by the new ADDED Requirement "The filter row MUST expose 1 free-text search and 4 select filters" — the surviving four selects (`Sociedad`, `Tipo`, `Tipo de cuenta`, `Moneda`) keep their behaviour, options, and order.

### Requirement: The list MUST expose 9 columns plus a per-row Actions menu

**Reason**: the `Cuenta contable` column rendered the operator-entered accounting code + name, an FIN-bound concern. With the column gone, the table shrinks to 8 columns.

**Migration**: replaced by the new ADDED Requirement "The list MUST expose 8 columns plus a per-row Actions menu" — the surviving 8 columns (`Sociedad`, `Banco / Estructura`, `Tipo`, `Tipo de cuenta`, `Moneda`, `Nro. / Address`, `Cuenta padre`, `Estado`) keep their order, badges, and visual rules unchanged.

### Requirement: The Actions menu MUST expose `Configurar cuenta contable` (active) and `Editar datos` (V2-disabled)

**Reason**: `Configurar cuenta contable` belongs to the FIN surface; `Editar datos` is no longer V2-disabled because this change activates it.

**Migration**: replaced by the new ADDED Requirement "The Actions menu MUST expose `Editar datos` (active)" — the per-row menu now contains exactly one active item (`Editar datos`) that opens the Edit-Account modal.

### Requirement: The Configure-Accounting modal MUST capture cod, nombre, tipo, and obs

**Reason**: the Configure-Accounting modal was the operator UI for the accounting capture; with that capture leaving OPS, the modal has no callers.

**Migration**: the component file `src/ops/banks-accounts/ConfigureAccountingModal.vue` is deleted along with its spec. When the FIN app lands, FIN owns whatever surface it wants to capture accounting on; that surface is out of scope here.

### Requirement: The page MUST render a persistent preparatory-accounting notice

**Reason**: the notice existed to set operator expectations that the accounting capture inside OPS was preparatory until FIN took over. Now that the capture has left OPS entirely, the notice has nothing to explain.

**Migration**: the notice element is removed from the page; no replacement under OPS. If FIN's surface needs its own framing notice, FIN will declare it on its own page.

## ADDED Requirements

### Requirement: The page MUST render exactly 2 KPI cards computed from the FULL catalog

The L2 KPI grid SHALL render 2 cards in a `grid-cols-1 sm:grid-cols-2` layout, in this exact order:

1. **Estructuras** — count of unique structures across the catalog. Neutral tone. Sub-label `bancos, exchanges y custodios`.
2. **Cuentas totales** — count of all cuentas (`Activa` + `Inactiva`). Neutral tone. Sub-label `activas en el catálogo`.

KPIs MUST always derive from the full dataset returned by `GET /api/banks-accounts`, **never** from the rows visible after filters / search are applied.

#### Scenario: KPIs reflect the catalog state when no filter is applied

- **GIVEN** the catalog returns 80 cuentas across 30 estructuras
- **WHEN** the page mounts with no filter applied
- **THEN** the KPI row shows: `Estructuras = 30`, `Cuentas totales = 80`

#### Scenario: KPIs do NOT change when filters narrow the visible set

- **GIVEN** the same catalog as above
- **WHEN** the user picks `Sociedad: Circuit Pay SA` which narrows the visible rows to 18
- **THEN** the table renders 18 rows, but the KPIs still show `Estructuras = 30`, `Cuentas totales = 80` (catalog-state, not filtered-state)

### Requirement: The filter row MUST expose 1 free-text search and 4 select filters

The filter row SHALL render, left-to-right: a `Buscar por banco, sociedad o número` `<Input>` (debounced ~250 ms), then a vertical divider, then 4 `<Select>` filters in this exact order: `Sociedad`, `Tipo` (de estructura), `Tipo de cuenta`, `Moneda`. The search MUST match against the `banco` (estructura name), `sociedad`, AND `nro` fields of every row (case-insensitive substring). Each `<Select>` MUST surface a leading `Todas` / `Todos` option that clears the filter for that field.

#### Scenario: Free-text search narrows by banco, sociedad, or número

- **GIVEN** the catalog has cuentas at COINAG, BIND, MACRO across multiple sociedades
- **WHEN** the user types `coinag` in the search box
- **THEN** the table renders only rows where `banco === 'COINAG'`; other rows are hidden; the KPIs do not change

#### Scenario: Multiple filters combine via AND

- **GIVEN** the user selects `Sociedad: Haz Pagos SA` AND `Moneda: USD`
- **WHEN** the table re-renders
- **THEN** only rows whose Sociedad is `Haz Pagos SA` AND whose Moneda is `USD` remain visible

### Requirement: The list MUST expose 8 columns plus a per-row Actions menu

The table SHALL render columns in this exact order: `Sociedad`, `Banco / Estructura`, `Tipo`, `Tipo de cuenta`, `Moneda`, `Nro. / Address`, `Cuenta padre`, `Estado`, then the per-row Actions cell. Visual rules:

- `Sociedad` renders as a coloured badge whose tone comes from a per-sociedad palette (Circuit Pay SA / Haz Pagos SA / Ardua Solutions Corp / Astra Ventures each get a distinct neutral-leaning tone).
- `Tipo` renders as a coloured badge whose tone comes from a per-structure-type palette (`Banco`, `Banco digital`, `ALyC`, `Exchange`, `Custodio`, `PSP`, `Proveedor` each get a distinct tone).
- `Moneda` renders as a tone-coloured badge per the 5-currency palette (ARS / USD / USDC / USDT / BTC).
- `Nro. / Address` renders in a monospace font.
- `Cuenta padre` renders the parent cuenta's `nro` label when set; renders a dim em-dash (`—`) at 40 % opacity when the cuenta has no parent.
- `Estado` renders as a `success`-toned `Activa` badge or a neutral `Inactiva` badge.

The Actions cell MUST use the shared `ActionsMenu.vue` portal component per `core-actions-menu`. Inline `<td>` dropdowns are forbidden.

#### Scenario: A PSP ARS CVU renders its parent CBU

- **GIVEN** a cuenta with `tipoCuenta = 'CVU'`, `moneda = 'ARS'`, `padreCuentaId` pointing at the institution's master CBU cuenta
- **WHEN** the row renders
- **THEN** the `Cuenta padre` cell renders the parent's `nro` label (e.g., `CBU Haz Pagos · Coinag`); the cell is non-empty and not dim

#### Scenario: A cuenta without a parent renders the dim em-dash

- **GIVEN** a cuenta whose `padreCuentaId` is null
- **WHEN** the row renders
- **THEN** the `Cuenta padre` cell shows a dim em-dash (`—`) at reduced opacity

#### Scenario: An inactive cuenta renders the neutral status badge

- **GIVEN** a cuenta whose `status` is `Inactiva`
- **WHEN** the row renders
- **THEN** the `Estado` cell renders the `Inactiva` badge in the neutral tone (not the success tone reserved for `Activa`)

### Requirement: The Actions menu MUST expose `Editar datos` (active)

The portal-mounted Actions menu for every row SHALL render exactly one active item: `Editar datos`. Clicking it MUST open the Edit-Account modal pre-filled with the cuenta's current data. The menu MUST NOT contain any disabled or placeholder items in v1; if no further actions are gated for the operator, the menu still renders with `Editar datos` as its single entry.

#### Scenario: Editar datos opens the Edit-Account modal pre-filled with the cuenta's data

- **GIVEN** a row whose cuenta has `tipoCuenta = 'CVU'`, `moneda = 'ARS'`, `nro = '10.045'`, `padreCuentaId = null`, `status = 'Activa'`
- **WHEN** the user opens the Actions menu and clicks `Editar datos`
- **THEN** the Edit-Account modal opens with all five fields prefilled with the row's current values; the modal's `Sociedad` and `Estructura` lines are read-only and reflect the cuenta's current parents

#### Scenario: Operator without edit-account capability does not see the menu trigger

- **GIVEN** an authenticated user with capability `banks-accounts:read` only
- **WHEN** the row renders
- **THEN** the per-row Actions trigger button is hidden (the menu has no active items the user can perform); the rest of the row renders normally in read-only mode

### Requirement: The Edit-Account modal MUST allow editing tipoCuenta, moneda, nro, padreCuentaId, and status

The Edit-Account modal SHALL be an Edit-style modal per `core-modals`. The body renders a read-only header `<ref>` block summarising the cuenta's stable identity (Sociedad · Estructura), then a form with these editable fields:

- `tipoCuenta` (`<Select>`, required, label `Tipo de cuenta`, 6 options).
- `moneda` (`<Select>`, required, label `Moneda`, 5 options).
- `nro` (`<Input>`, required, label `Nro. / Address`).
- `padreCuentaId` (`<Select>`, optional, label `Cuenta padre`, options filtered to cuentas of the same Sociedad as the cuenta being edited; the leading option is `Sin cuenta padre` which clears the field).
- `status` (`<Select>`, required, label `Estado`, options `Activa` / `Inactiva`).

The fields `Sociedad` and `Estructura` MUST NOT appear as editable inputs. Changing those is semantically a different cuenta and must be done via deactivate + create-new, not edit.

The footer SHALL render the canonical Cancelar / `Guardar cambios` pair per `core-modals`. Submission SHALL call `PATCH /api/banks-accounts/:id` with the five fields and SHALL surface a `vue-sonner` success toast `Cuenta actualizada`. On error the toast is `No se pudo actualizar la cuenta` with a `Reintentar` action that re-submits the same payload.

#### Scenario: Saving valid edits dispatches PATCH and updates the row inline

- **GIVEN** the modal is open for a cuenta whose `nro` is `10.045`, with the operator changing `nro` to `10.046`
- **WHEN** the user clicks `Guardar cambios`
- **THEN** the client dispatches `PATCH /api/banks-accounts/:id` with `{ tipoCuenta, moneda, nro: '10.046', padreCuentaId, status }`; on 2xx response the modal closes; the row's `Nro. / Address` cell updates inline; a success toast surfaces

#### Scenario: Required fields cannot be left empty

- **GIVEN** the modal is open with `nro` cleared
- **WHEN** the user clicks `Guardar cambios`
- **THEN** the form does not submit; the `Nro. / Address` field shows the inline danger-toned error `Campo obligatorio` per `core-forms`

#### Scenario: Setting status to Inactiva soft-retires the cuenta

- **GIVEN** an active cuenta whose row shows the `Activa` badge
- **WHEN** the operator changes `status` to `Inactiva` and saves
- **THEN** the row's `Estado` cell flips to the neutral `Inactiva` badge; the `Cuentas totales` KPI does NOT decrement (the count includes both states)

#### Scenario: Sociedad and Estructura are visible read-only and cannot be edited

- **GIVEN** the modal is open
- **WHEN** the operator inspects the form
- **THEN** the read-only header block shows the cuenta's Sociedad and Estructura; there are no `<Select>` controls for those two fields anywhere in the form

## MODIFIED Requirements

### Requirement: The Bancos / Cuentas page MUST be a Type-A master list registered at `/banks-accounts`

The page SHALL be implemented at `src/pages/BanksAccounts.vue` and registered in `src/router/routes.ts` with `meta.requiresAuth = true`, `meta.layout = 'shell'`, `meta.breadcrumb = 'Bancos / Cuentas'`, and `meta.block = 'Catálogos'`. The composition SHALL follow the Type-A pattern from `core-module-types`: page header (title + 2 CTAs) → KPI grid (2 cards) → filter row (search + 4 selects) → paginated table → footer with pagination ellipsis. The route MUST be reachable via the OPS sidebar entry `Bancos / Cuentas` rendered under the `Catálogos` block as the third entry in the order `Clientes → Instrucciones → Bancos / Cuentas`.

#### Scenario: Authenticated navigation to `/banks-accounts` renders the Type-A page shell

- **GIVEN** an authenticated OPS user with role `OPS_ADMIN`
- **WHEN** the user navigates to `/banks-accounts`
- **THEN** the page renders with the AppShell (Sidebar + Topbar + Main); the page header shows the title `Bancos / Cuentas` and two CTAs (`Nueva Estructura`, `Nueva Cuenta`); the 2 KPI cards render below the header; the filter row + paginated table render below; no preparatory-accounting notice is rendered anywhere on the page

#### Scenario: Sidebar surfaces the page as the third entry under the `Catálogos` block

- **GIVEN** the OPS sidebar is rendered
- **WHEN** the user inspects the navigation
- **THEN** there is a `Catálogos` block containing the entries `Clientes`, `Instrucciones`, and `Bancos / Cuentas` in that exact order; the `Bancos / Cuentas` entry links to `/banks-accounts` and receives the active style when the route matches `/banks-accounts`

#### Scenario: Breadcrumb reflects the new block

- **GIVEN** an authenticated user navigates to `/banks-accounts`
- **WHEN** the topbar breadcrumb renders
- **THEN** it shows `Catálogos / Bancos / Cuentas`

### Requirement: The page MUST be capability-gated and MUST render an empty-state when the catalog is empty

Page-level access SHALL be gated by `banks-accounts:read || OPS_ADMIN`. CTAs and Actions menu items SHALL apply additional gates as follows:

- `Nueva Estructura` requires `banks-accounts:create-structure || OPS_ADMIN`.
- `Nueva Cuenta` requires `banks-accounts:create-account || OPS_ADMIN`.
- `Editar datos` requires `banks-accounts:edit-account || OPS_ADMIN`.

For v1, inline gating uses `OPS_ADMIN` as fallback for every capability check until `ops-roles` consolidates the OPS capability surface.

When the catalog is empty (`GET /api/banks-accounts` returns `[]`), the table area SHALL render the canonical `EmptyState` component per `core-error-handling` with the title `Sin cuentas en el catálogo` and the body `Comenzá agregando una estructura y luego sus cuentas`. The KPI cards still render but show zeros across the board. The empty state SHALL NOT contain an inline CTA — operators use the always-visible page-header `Nueva Estructura` CTA to start the catalog instead, avoiding two stacked CTAs in the same viewport.

#### Scenario: User without read capability is redirected to 403

- **GIVEN** an authenticated user whose roles include only `LEX_ADMIN`
- **WHEN** the user navigates directly to `/banks-accounts`
- **THEN** the page renders the canonical 403 surface (`Acceso denegado`) per `core-navigation`; the sidebar does NOT show the `Bancos / Cuentas` entry to begin with

#### Scenario: Empty catalog shows the EmptyState without an inline CTA

- **GIVEN** `GET /api/banks-accounts` returns `[]`
- **WHEN** the page renders
- **THEN** the KPI grid shows both cards with the value `0`; the table area is replaced by the `EmptyState` with title `Sin cuentas en el catálogo` and body `Comenzá agregando una estructura y luego sus cuentas`; no inline CTA is rendered inside the empty state; the page-header `Nueva Estructura` CTA remains visible (gated by `banks-accounts:create-structure || OPS_ADMIN`) and is the canonical entry point to start the catalog
