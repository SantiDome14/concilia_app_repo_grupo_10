## ADDED Requirements

### Requirement: The Bancos / Cuentas page MUST be a Type-A master list registered at `/banks-accounts`

The page SHALL be implemented at `src/pages/BanksAccounts.vue` and registered in `src/router/routes.ts` with `meta.requiresAuth = true`, `meta.layout = 'shell'`, `meta.breadcrumb = 'Bancos / Cuentas'`, and `meta.block = 'Catálogos'`. The composition SHALL follow the Type-A pattern from `core-module-types`: page header (title + 2 CTAs) → KPI grid (4 cards) → preparatory accounting notice → filter row (search + 5 selects) → paginated table → footer with pagination ellipsis. The route MUST be reachable via the OPS sidebar entry `Bancos / Cuentas` rendered under the `Catálogos` block as the third entry in the order `Clientes → Instrucciones → Bancos / Cuentas`.

#### Scenario: Authenticated navigation to `/banks-accounts` renders the Type-A page shell

- **GIVEN** an authenticated OPS user with role `OPS_ADMIN`
- **WHEN** the user navigates to `/banks-accounts`
- **THEN** the page renders with the AppShell (Sidebar + Topbar + Main); the page header shows the title `Bancos / Cuentas` and two CTAs (`Nueva Estructura`, `Nueva Cuenta`); the 4 KPI cards render below the header; the preparatory accounting notice renders next; the filter row + paginated table render below

#### Scenario: Sidebar surfaces the page as the third entry under the `Catálogos` block

- **GIVEN** the OPS sidebar is rendered
- **WHEN** the user inspects the navigation
- **THEN** there is a `Catálogos` block containing the entries `Clientes`, `Instrucciones`, and `Bancos / Cuentas` in that exact order; the `Bancos / Cuentas` entry links to `/banks-accounts` and receives the active style when the route matches `/banks-accounts`

#### Scenario: Breadcrumb reflects the new block

- **GIVEN** an authenticated user navigates to `/banks-accounts`
- **WHEN** the topbar breadcrumb renders
- **THEN** it shows `Catálogos / Bancos / Cuentas`

### Requirement: The page header MUST expose two CTAs — `Nueva Estructura` and `Nueva Cuenta` (primary)

The page header SHALL render exactly two right-aligned `<Button>` CTAs side by side per `core-layout`. The first CTA is `Nueva Estructura` (default variant, opens the Create-Structure modal). The second CTA is `Nueva Cuenta` (primary variant, opens the Create-Account modal). The CTAs SHALL be visible to operators with capability `banks-accounts:create` or role `OPS_ADMIN`. Operators without those capabilities SHALL still see the page (read-only) but the CTAs are hidden.

#### Scenario: ADMIN sees both CTAs and they open their canonical modals

- **GIVEN** an authenticated `OPS_ADMIN` user on `/banks-accounts`
- **WHEN** the user clicks `Nueva Estructura`
- **THEN** the Create-Structure modal opens with form fields for `Nombre`, `Tipo` (`<Select>` with the 7 enum values), and the Cancelar / `Crear estructura` footer pair per `core-modals`

#### Scenario: VIEWER does not see the CTAs

- **GIVEN** an authenticated user with capability `banks-accounts:read` but neither `banks-accounts:create` nor `OPS_ADMIN`
- **WHEN** the page renders
- **THEN** the title `Bancos / Cuentas` and the table render normally, but the page header right-side is empty (both CTAs are hidden)

#### Scenario: Clicking Nueva Cuenta opens the Create-Account modal with cascading dropdowns

- **GIVEN** the user clicks `Nueva Cuenta`
- **WHEN** the Create-Account modal opens
- **THEN** the modal renders form fields in this order: `Sociedad` (`<Select>`), `Estructura` (`<Select>`, disabled until Sociedad is picked), `Tipo de cuenta` (`<Select>`, with default derived from the chosen Estructura's `tipo`), `Moneda` (`<Select>` with the 5 enum values), `Nro. / Address` (`<Input>`), `Cuenta padre` (`<Select>`, optional, options filtered to cuentas of the same Sociedad), and the Cancelar / `Crear cuenta` footer pair

### Requirement: The page MUST render exactly 4 KPI cards computed from the FULL catalog

The L2 KPI grid SHALL render 4 cards in a `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` layout, in this exact order:

1. **Estructuras** — count of unique structures across the catalog. Neutral tone. Sub-label `bancos, exchanges y custodios`.
2. **Cuentas totales** — count of all cuentas (`Activa` + `Inactiva`). Neutral tone. Sub-label `activas en el catálogo`.
3. **Config. contable** — count of cuentas where `contable` is set. Success tone (`success` per `core-theming`). Sub-label `cuentas con cuenta asignada`.
4. **Sin configurar** — count of cuentas where `contable` is null. Warning tone (`warning` per `core-theming`). Sub-label `pendientes de mapeo contable`.

KPIs MUST always derive from the full dataset returned by `GET /api/banks-accounts`, **never** from the rows visible after filters / search are applied.

#### Scenario: KPIs reflect the catalog state when no filter is applied

- **GIVEN** the catalog returns 80 cuentas across 30 estructuras, of which 24 have `contable` set
- **WHEN** the page mounts with no filter applied
- **THEN** the KPI row shows: `Estructuras = 30`, `Cuentas totales = 80`, `Config. contable = 24`, `Sin configurar = 56`

#### Scenario: KPIs do NOT change when filters narrow the visible set

- **GIVEN** the same catalog as above, KPIs already rendered
- **WHEN** the user picks `Sociedad: Circuit Pay SA` which narrows the visible rows to 18
- **THEN** the table renders 18 rows, but the KPIs still show `Estructuras = 30`, `Cuentas totales = 80`, `Config. contable = 24`, `Sin configurar = 56` (catalog-state, not filtered-state)

### Requirement: The filter row MUST expose 1 free-text search and 5 select filters

The filter row SHALL render, left-to-right: a `Buscar por banco, sociedad o número` `<Input>` (debounced ~250 ms), then a vertical divider, then 5 `<Select>` filters in this order: `Sociedad`, `Tipo` (de estructura), `Tipo de cuenta`, `Moneda`, `Config. contable`. The search MUST match against the `banco` (estructura name), `sociedad`, AND `nro` fields of every row (case-insensitive substring). Each `<Select>` MUST surface a leading `Todas` / `Todos` option that clears the filter for that field. The `Config. contable` `<Select>` SHALL have exactly 3 options: `Todas`, `Configuradas`, `Sin configurar`.

#### Scenario: Free-text search narrows by banco, sociedad, or número

- **GIVEN** the catalog has cuentas at COINAG, BIND, MACRO across multiple sociedades
- **WHEN** the user types `coinag` in the search box
- **THEN** the table renders only rows where `banco === 'COINAG'`; other rows are hidden; the KPIs do not change

#### Scenario: Multiple filters combine via AND

- **GIVEN** the user selects `Sociedad: Haz Pagos SA` AND `Moneda: USD`
- **WHEN** the table re-renders
- **THEN** only rows whose Sociedad is `Haz Pagos SA` AND whose Moneda is `USD` remain visible

#### Scenario: Config. contable filter exposes the configured-vs-unconfigured split

- **GIVEN** the user selects `Config. contable: Sin configurar`
- **WHEN** the table re-renders
- **THEN** only rows where `contable` is null are visible; the user can quickly walk every cuenta that still needs a code

### Requirement: The list MUST expose 9 columns plus a per-row Actions menu

The table SHALL render columns in this exact order: `Sociedad`, `Banco / Estructura`, `Tipo`, `Tipo de cuenta`, `Moneda`, `Nro. / Address`, `Cuenta padre`, `Estado`, `Cuenta contable`, then the per-row Actions cell. Visual rules:

- `Sociedad` renders as a coloured badge whose tone comes from a per-sociedad palette (Circuit Pay SA / Haz Pagos SA / Ardua Solutions Corp / Astra Ventures each get a distinct neutral-leaning tone).
- `Tipo` renders as a coloured badge whose tone comes from a per-structure-type palette (`Banco`, `Banco digital`, `ALyC`, `Exchange`, `Custodio`, `PSP`, `Proveedor` each get a distinct tone).
- `Moneda` renders as a tone-coloured badge per the 5-currency palette (ARS / USD / USDC / USDT / BTC).
- `Nro. / Address` renders in a monospace font.
- `Cuenta padre` renders the parent cuenta's `nro` label when set; renders a dim em-dash (`—`) at 40 % opacity when the cuenta has no parent.
- `Estado` renders as a `success`-toned `Activa` badge or a neutral `Inactiva` badge.
- `Cuenta contable` renders as a two-line cell when `contable` is set: line 1 is the monospace `cod`, line 2 is the smaller-font `nombre`. When `contable` is null, the cell renders the `Sin configurar` chip with a warning info-icon.

The Actions cell MUST use the shared `ActionsMenu.vue` portal component per `core-actions-menu`. Inline `<td>` dropdowns are forbidden.

#### Scenario: A configured cuenta renders the two-line accounting cell

- **GIVEN** a cuenta whose `contable` is `{ cod: '1.1.01', nombre: 'COINAG - Cta ARS 10.045', tipo: 'act-disp', obs: 'Cuenta operativa PSP ARS' }`
- **WHEN** the row renders
- **THEN** the `Cuenta contable` cell shows two stacked lines: `1.1.01` (monospace, brighter) and `COINAG - Cta ARS 10.045` (smaller, dimmer)

#### Scenario: An unconfigured cuenta renders the Sin configurar chip

- **GIVEN** a cuenta whose `contable` is `null`
- **WHEN** the row renders
- **THEN** the `Cuenta contable` cell shows a single `Sin configurar` chip with a warning info icon, in the warning tone

#### Scenario: A PSP ARS CVU renders its parent CBU

- **GIVEN** a cuenta with `tipoCuenta = 'CVU'`, `moneda = 'ARS'`, `padreCuentaId` pointing at the institution's master CBU cuenta
- **WHEN** the row renders
- **THEN** the `Cuenta padre` cell renders the parent's `nro` label (e.g., `CBU Haz Pagos · Coinag`); the cell is non-empty and not dim

### Requirement: The Actions menu MUST expose `Configurar cuenta contable` (active) and `Editar datos` (V2-disabled)

The portal-mounted Actions menu for every row SHALL render exactly two items in this order:

1. **`Configurar cuenta contable`** — active. Opens the Configure-Accounting modal with the row's current `contable` data prefilled (if any). Item displays a small `Editar` tag at the right when the cuenta already has a configured `contable`, and no tag otherwise.
2. **`Editar datos`** — disabled in v1. Item displays a `V2` tag at the right side. Clicking does not open anything.

#### Scenario: Configurar cuenta contable opens the modal and prefills existing data

- **GIVEN** a row whose cuenta already has `contable.cod = '1.1.01'`
- **WHEN** the user opens the Actions menu and clicks `Configurar cuenta contable`
- **THEN** the Configure-Accounting modal opens with `cod = '1.1.01'` prefilled in the input

#### Scenario: Editar datos is visibly disabled with a V2 tag

- **GIVEN** the user opens the Actions menu on any row
- **WHEN** the menu renders
- **THEN** the second item `Editar datos` is rendered with a disabled style (lower opacity, no hover affordance) and a small `V2` tag aligned to the right; clicking it does not open a modal nor mutate state

### Requirement: The Configure-Accounting modal MUST capture cod, nombre, tipo, and obs

The Configure-Accounting modal SHALL be a Detail-or-Edit-style modal per `core-modals`. The body renders a read-only header `<ref>` block summarising the cuenta (Estructura · Tipo de cuenta · Moneda · Nro · Sociedad · Cuenta padre when present), then a form with these fields:

- `cod` (`<Input>`, required, label `Código`, placeholder `Ej. 1.1.01`).
- `nombre` (`<Input>`, required, label `Nombre`, default value `${estructura} - ${cuenta}` if the field is empty).
- `tipo` (`<Input>` in v1 — free text label `Tipo`. The schema is `AccountingType` and SHALL be promoted to a `<Select>` once FIN publishes the plan-of-accounts).
- `obs` (`<Textarea>`, optional, label `Observaciones`, max 500 chars).

The footer SHALL render the canonical Cancelar / `Guardar` pair per `core-modals`. Submission SHALL call `PATCH /api/banks-accounts/:id/accounting` and surface a `vue-sonner` success toast `Configuración contable guardada`. On error the toast is `No se pudo guardar la configuración contable` with a `Reintentar` action that re-submits the same payload.

#### Scenario: Saving valid accounting config dispatches PATCH and updates the row inline

- **GIVEN** the modal is open for a cuenta whose `contable` is `null`, with `cod = '1.1.05'`, `nombre = 'COINAG - Cta ARS 10.060'`, `tipo = 'act-disp'`, `obs = ''`
- **WHEN** the user clicks `Guardar`
- **THEN** the client dispatches `PATCH /api/banks-accounts/:id/accounting` with the four fields; on 2xx response the modal closes; the row's `Cuenta contable` cell updates from the `Sin configurar` chip to the two-line `1.1.05 / COINAG - Cta ARS 10.060`; the `Config. contable` KPI increments by 1 and `Sin configurar` decrements by 1; a success toast surfaces

#### Scenario: Required fields cannot be left empty

- **GIVEN** the modal is open with `cod` empty
- **WHEN** the user clicks `Guardar`
- **THEN** the form does not submit; the `Código` field shows the inline danger-toned error `Campo obligatorio` per `core-forms`

### Requirement: The page MUST render a persistent preparatory-accounting notice

A persistent info-toned notice banner SHALL render between the KPI grid and the filter row, at the top of the table area, with the exact body text:

> "La configuración contable de este módulo es **preparatoria**. Cuando FIN defina el plan de cuentas operativo del grupo, cada cuenta aquí configurada se validará y vinculará al asiento tipo correspondiente del Motor Contable."

The notice SHALL render in the info tone per `core-error-handling` (info background + info-toned border, info icon at the left, no Dismiss button — this is a persistent-context banner, not a transient alert). The notice MUST be visible on every render of the page; the operator cannot dismiss it. The notice's body text remains in place until the spec is amended (in the follow-up `wire-banks-accounts-to-fin-plan-of-accounts` change once FIN's Motor Contable lands).

#### Scenario: The notice renders persistently and cannot be dismissed

- **GIVEN** an authenticated user navigates to `/banks-accounts`
- **WHEN** the page mounts
- **THEN** the notice banner is visible above the filter row in info tone with the exact body text and the info icon; there is no `Cerrar` / `Dismiss` button on the banner

### Requirement: The page MUST be capability-gated and MUST render an empty-state when the catalog is empty

Page-level access SHALL be gated by `banks-accounts:read || OPS_ADMIN`. CTAs and Actions menu items SHALL apply additional gates as follows:

- `Nueva Estructura` requires `banks-accounts:create-structure || OPS_ADMIN`.
- `Nueva Cuenta` requires `banks-accounts:create-account || OPS_ADMIN`.
- `Configurar cuenta contable` requires `banks-accounts:configure-accounting || OPS_ADMIN`.

For v1, inline gating uses `OPS_ADMIN` as fallback for every capability check until `ops-roles` consolidates the OPS capability surface.

When the catalog is empty (`GET /api/banks-accounts` returns `[]`), the table area SHALL render the canonical `EmptyState` component per `core-error-handling` with the title `Sin cuentas en el catálogo` and the body `Comenzá agregando una estructura y luego sus cuentas`. The empty-state body SHALL include a primary CTA `Nueva Estructura` whose action is identical to the page-header CTA. The KPI cards still render but show zeros across the board.

#### Scenario: User without read capability is redirected to 403

- **GIVEN** an authenticated user whose roles include only `LEX_ADMIN`
- **WHEN** the user navigates directly to `/banks-accounts`
- **THEN** the page renders the canonical 403 surface (`Acceso denegado`) per `core-navigation`; the sidebar does NOT show the `Bancos / Cuentas` entry to begin with

#### Scenario: Empty catalog shows the EmptyState with a Nueva Estructura CTA

- **GIVEN** `GET /api/banks-accounts` returns `[]`
- **WHEN** the page renders
- **THEN** the KPI grid shows all four cards with the value `0`; the table area is replaced by the `EmptyState` with title `Sin cuentas en el catálogo`, body `Comenzá agregando una estructura y luego sus cuentas`, and a primary CTA `Nueva Estructura` that opens the Create-Structure modal
