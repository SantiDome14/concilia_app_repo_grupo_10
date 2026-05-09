## 1. Domain types

- [x] 1.1 Create `src/types/banks-accounts.ts` declaring the union literals `EstructuraTipo` (`'Banco' | 'Banco digital' | 'ALyC' | 'Exchange' | 'Custodio' | 'PSP' | 'Proveedor'`), `CuentaTipo` (`'Cuenta Corriente' | 'CVU' | 'Wallet Pool' | 'Custodia' | 'Exchange Account' | 'Comitente'`), `Moneda` (`'ARS' | 'USD' | 'USDC' | 'USDT' | 'BTC'`), and `EstadoCatalogo` (`'Activa' | 'Inactiva'`).
- [x] 1.2 In the same file, declare the entity types `Sociedad { id, name, status }`, `Estructura { id, name, tipo, status }`, and `Cuenta { id, sociedadId, estructuraId, monedaId, tipoCuenta, nro, padreCuentaId?, status, contable? }`. Declare `AccountingConfig { cod, nombre, tipo, obs? }`. Declare a denormalised `BankAccountRecord` shape that the page consumes (one row = one Cuenta with its sociedad / estructura denormalised inline).
- [x] 1.3 Add a small helper `defaultCuentaTipoFor(estructuraTipo: EstructuraTipo): CuentaTipo` that returns the sensible default per the design (Banco / Banco digital → `Cuenta Corriente`; Exchange → `Exchange Account`; ALyC → `Comitente`; Custodio → `Custodia`; PSP → `CVU`; Proveedor → `Wallet Pool`).

## 2. API layer

- [x] 2.1 Create `src/api/banks-accounts.ts` exporting four functions: `fetchBanksAccounts()`, `createStructure(payload)`, `createAccount(payload)`, `updateAccountAccounting(id, payload)`. Each uses the shared axios client and zod-parses the response per `core-api-layer`.
- [x] 2.2 Declare zod schemas for the request payloads and the response shape. The response is an array of `BankAccountRecord`. Reject any unknown moneda value at the schema boundary (per design Decision 9).
- [x] 2.3 Errors propagate as `ApiError` per `core-api-layer`. Network 5xx and 401/403 are handled by the global interceptor; the page's mutations attach a per-error `Reintentar` toast for transient failures.

## 3. Data composable

- [x] 3.1 Compose the page-level data layer using `@tanstack/vue-query`'s `useQuery` for the read (`['banks-accounts']`) and `useMutation` for the three writes. Wire `useTable<BankAccountRecord>({ data, searchFields: ['banco', 'sociedad', 'nro'], pageSize: 25 })` to drive the visible rows.
- [x] 3.2 Expose a derived `kpis` computed that returns `{ estructuras, total, configuradas, sinConfigurar }` always computed from the **full** dataset, never from the filtered view (per spec Requirement 3).

## 4. Page component

- [x] 4.1 Create `src/pages/BanksAccounts.vue` using `<script setup lang="ts">`. Use the canonical L1/L2/L3 page skeleton from `core-layout`.
- [x] 4.2 Render the page header with the title `Bancos / Cuentas` and the two right-aligned CTAs (`Nueva Estructura` default-variant, `Nueva Cuenta` primary-variant). Wire `useCapabilities()` to gate each CTA per Requirement 8.
- [x] 4.3 Render the L2 KPI grid (4 cards) in the canonical order with the canonical tones (`Estructuras` neutral, `Cuentas totales` neutral, `Config. contable` success, `Sin configurar` warning).
- [x] 4.4 Render the persistent preparatory-accounting notice banner between the KPI grid and the filter row, info-toned, no Dismiss button, with the exact body text from spec Requirement 7.
- [x] 4.5 Render the filter row in the canonical order: search `<Input>` (debounced ~250 ms) + divider + 5 `<Select>` filters (`Sociedad`, `Tipo`, `Tipo de cuenta`, `Moneda`, `Config. contable`). Each Select MUST have a leading `Todas` / `Todos` option that clears its filter.
- [x] 4.6 Render the table with the 9 columns in the canonical order, plus the per-row Actions cell using the shared `ActionsMenu.vue` portal. Apply the canonical cell rules per Requirement 5 (mono font on `Nro. / Address`, badges for `Sociedad` / `Tipo` / `Moneda` / `Estado`, two-line accounting cell when configured, `Sin configurar` chip when null, dim em-dash for absent parent).
- [x] 4.7 Render the EmptyState canonical surface when `data.length === 0`, with the title `Sin cuentas en el catálogo`, body `Comenzá agregando una estructura y luego sus cuentas`, and a primary CTA `Nueva Estructura` that opens the same Create-Structure modal as the header CTA.
- [x] 4.8 Wire the per-row Actions menu items: `Configurar cuenta contable` (active, opens `ConfigureAccountingModal`), `Editar datos` (disabled with the V2 tag aligned right per Requirement 6).

## 5. Modals

- [x] 5.1 Create `src/components/banks-accounts/CreateStructureModal.vue`. Form fields: `Nombre` (Input, required), `Tipo` (Select, required, 7 options). Footer: Cancelar / `Crear estructura`. Submission calls `createStructure()`; on success toast `Estructura creada` and the catalog query invalidates.
- [x] 5.2 Create `src/components/banks-accounts/CreateAccountModal.vue`. Form fields per Requirement 2: `Sociedad` (Select), `Estructura` (Select, disabled until Sociedad is picked, options filtered to that Sociedad's estructuras), `Tipo de cuenta` (Select, default derived from chosen Estructura's `tipo` via `defaultCuentaTipoFor`), `Moneda` (Select, 5 options), `Nro. / Address` (Input, required), `Cuenta padre` (Select, optional, options filtered to cuentas of the same Sociedad). Footer: Cancelar / `Crear cuenta`. Dependent dropdowns reset their child on parent change per `core-forms`.
- [x] 5.3 Create `src/components/banks-accounts/ConfigureAccountingModal.vue`. Renders a read-only header `<ref>` block summarising the cuenta. Form fields: `Código` (Input, required), `Nombre` (Input, required, defaults to `${estructura} - ${cuenta}` when empty), `Tipo` (Input, free-text in v1 per design Open Question 2), `Observaciones` (Textarea, optional, max 500 chars). Footer: Cancelar / `Guardar`. Submission calls `updateAccountAccounting(id, payload)`; success toast `Configuración contable guardada`; error toast with `Reintentar`.

## 6. Routing & sidebar

- [x] 6.1 In `src/config/routes.ts`, add `BANKS_ACCOUNTS: '/banks-accounts'` to `ROUTE_PATHS` and `BANKS_ACCOUNTS: 'banks-accounts'` to `ROUTE_NAMES`.
- [x] 6.2 In `src/router/routes.ts`, register the new route lazy-loading `@/pages/BanksAccounts.vue`, with `meta.requiresAuth = true`, `meta.layout = 'shell'`, `meta.breadcrumb = 'Bancos / Cuentas'`, `meta.block = 'Catálogos'`, `meta.capabilities = ['banks-accounts:read', 'OPS_ADMIN']`.
- [x] 6.3 In `src/components/layout/Sidebar.vue`, add the `Bancos / Cuentas` entry to the `Catálogos` block as the third entry (after `Clientes` and `Instrucciones`). Pick a sensible icon from `lucide-vue-next` (suggestion: `Landmark` or `Building2`).

## 7. Tests

- [x] 7.1 Unit-test `defaultCuentaTipoFor` against all 7 `EstructuraTipo` inputs.
- [x] 7.2 Unit-test the zod schemas in `src/api/banks-accounts.ts` against valid + invalid sample payloads (especially: unknown `moneda` rejected, unknown `tipoCuenta` rejected, optional `padreCuentaId` accepted as `null`).
- [x] 7.3 Component test for `BanksAccounts.vue` happy-path mount: with a stubbed query returning 5 rows, assert the 4 KPI cards render with the right values, the 9 table columns render in canonical order, both CTAs render in the page header, the preparatory notice renders with the exact body text, and the EmptyState does not render.
- [x] 7.4 Component test for the empty-state branch: with a stubbed query returning `[]`, assert the EmptyState renders with the contracted title + body + CTA, and the table is NOT in the DOM.
- [x] 7.5 Component test for the KPI-vs-filter rule: render with 80 rows / 24 configured / 56 unconfigured; apply a `Sociedad` filter that narrows the visible set; assert the KPI cards still show `Estructuras = 30`, `Cuentas totales = 80`, `Config. contable = 24`, `Sin configurar = 56`.
- [x] 7.6 Component test for `ConfigureAccountingModal.vue`: open the modal with a row whose `contable` is set, assert the inputs prefill correctly; clear `cod`, click Save, assert the form does not submit and the inline error renders.
- [x] 7.7 Update the existing `Sidebar.spec.ts` to assert that the `Catálogos` block now contains three entries in this exact order: `Clientes → Instrucciones → Bancos / Cuentas`.

## 8. Manual verification

- [ ] 8.1 Run `npm run dev` and confirm:
  - `/banks-accounts` renders the new page with the page header + 4 KPIs + notice + filters + table.
  - The sidebar shows `Bancos / Cuentas` as the third entry under `Catálogos`.
  - Breadcrumb shows `Catálogos / Bancos / Cuentas`.
  - Both CTAs open their respective modals; cascading dropdowns in the Cuenta modal reset child on parent change.
  - Configurar cuenta contable modal opens with prefilled data when row already has a `contable`; saves successfully; the row updates inline; KPIs increment / decrement.
  - Editar datos in the Actions menu is visibly disabled with a `V2` tag and clicking does nothing.
  - Filter by `Config. contable: Sin configurar` narrows to unconfigured rows; KPIs remain at full-catalog values.
  - With an empty catalog the EmptyState renders correctly.

## 9. Quality gates

- [x] 9.1 `npm run lint` exits 0.
- [x] 9.2 `npm run type-check` exits 0.
- [x] 9.3 `npm run test:run` exits 0 (all suites green, including the 6 new test cases).
- [x] 9.4 `npm run spec:check` (`openspec validate --all --strict`) exits 0.
- [x] 9.5 `npm run build:qa` exits 0 and the QA bundle stays under the 400 KB gzipped budget per CLAUDE.md.
