## 1. Domain types (remove accounting concerns)

- [x] 1.1 In `src/ops/banks-accounts/types.ts`, remove the `AccountingConfig` interface entirely.
- [x] 1.2 In the same file, remove the optional `contable?: AccountingConfig | null` field from `Cuenta` and from `BankAccountRecord`.
- [x] 1.3 In the same file, remove the type alias `UpdateAccountingPayload`.
- [x] 1.4 Add a new exported type `UpdateAccountPayload = { tipoCuenta: CuentaTipo; moneda: Moneda; nro: string; padreCuentaId?: string | null; status: EstadoCatalogo }`.

## 2. API layer

- [x] 2.1 In `src/ops/banks-accounts/api.ts`, remove the endpoint constant `updateAccounting` and the function `updateAccountAccounting`.
- [x] 2.2 In the same file, remove the zod schemas `accountingConfigSchema` and `updateAccountingPayloadSchema`. Remove the `accountingConfig` and `updateAccountingPayload` properties from the public `schemas` export.
- [x] 2.3 In `bankAccountRecordSchema`, remove the `contable` property (currently nullable+optional). Also remove the `contable` reference from the test sample shape later (Group 7).
- [x] 2.4 Add a new endpoint constant `updateAccount: (id: string) => \`/banks-accounts/${id}\`` and a new client function `updateAccount(id, payload): Promise<BankAccountRecord>` that calls `apiClient.patch(...)`. Add a corresponding `updateAccountPayloadSchema` zod object and expose it via the public `schemas` export. The schema mirrors the new `UpdateAccountPayload` type.

## 3. Page component (remove accounting surfaces, activate Editar datos)

- [x] 3.1 In `src/pages/BanksAccounts.vue`, remove the imports of `ConfigureAccountingModal` and any imports unused after the removal (e.g., the `Info` icon if only used for the notice; the `AlertCircle` icon may still be needed for the error banner).
- [x] 3.2 Remove the `kpis.configuradas` and `kpis.sinConfigurar` derivations. Update the KPI grid to render only `Estructuras` and `Cuentas totales` in a `grid-cols-1 sm:grid-cols-2` layout.
- [x] 3.3 Remove the persistent preparatory-accounting notice block from the template entirely.
- [x] 3.4 Remove the `fCont` filter ref + its `fContModel` bridge. Remove the `Config. contable` `<Select>` from the filter row. Remove the `fCont` clauses from the `visibleRows` computed.
- [x] 3.5 Remove the `Cuenta contable` `<th>` from the table header and the `<td>` rendering the two-line / Sin-configurar cell from each row.
- [x] 3.6 Remove the `canConfigureAccounting` capability and the `accountingTarget` ref + `configureAccountingOpen` ref + `openAccounting` function.
- [x] 3.7 Add a new capability `canEditAccount = computed(() => can('banks-accounts:edit-account') || can('OPS_ADMIN'))`.
- [x] 3.8 Replace the per-row Actions menu contents: remove the `Configurar cuenta contable` button + the divider + the V2-disabled `Editar datos` placeholder. Render a single active `Editar datos` button that opens the new Edit-Account modal with the row's record. Hide the Actions trigger button entirely when `canEditAccount` is false (per the new spec scenario).
- [x] 3.9 Add `editAccountOpen` ref and `editAccountTarget` ref (`BankAccountRecord | null`) plus an `openEditAccount(row)` handler that sets both. Mount the new `<EditAccountModal v-model:open=… :record=… @saved="onMutationSuccess">`.
- [x] 3.10 Remove the `ConfigureAccountingModal` mount from the template.

## 4. New EditAccountModal component

- [x] 4.1 Create `src/ops/banks-accounts/EditAccountModal.vue`. Props: `open: boolean`, `record: BankAccountRecord | null`. Emits: `update:open`, `saved`.
- [x] 4.2 Render a Dialog with title `Editar cuenta` and a description that clarifies Sociedad and Estructura cannot be edited from this surface (those changes require deactivate + create-new).
- [x] 4.3 Render a read-only `<ref>` block at the top of the body summarising `Sociedad` and `Estructura` from the record (no editable inputs for them).
- [x] 4.4 Render the 5 editable fields per spec Requirement "The Edit-Account modal MUST allow editing tipoCuenta, moneda, nro, padreCuentaId, and status": `Tipo de cuenta` (`<Select>`, 6 options), `Moneda` (`<Select>`, 5 options), `Nro. / Address` (`<Input>`), `Cuenta padre` (`<Select>`, optional, options filtered to cuentas of the same Sociedad as the record — accept a `:existing-accounts` prop driven by the page query, OR fetch via `useQuery` like CreateAccountModal does), `Estado` (`<Select>` with `Activa` / `Inactiva`).
- [x] 4.5 Pre-fill all 5 fields from `record` on mount AND on `record` change (use `watch([open, record], ..., { immediate: true })` per the lesson learned from `ConfigureAccountingModal` — the `immediate: true` flag was the canonical fix when prefilling depended on a prop set before the open transition).
- [x] 4.6 Add inline danger-toned `Campo obligatorio` errors when `tipoCuenta`, `moneda`, `nro`, or `status` are empty on submit. Disable the submit button while any required field is empty or while submission is in flight.
- [x] 4.7 Footer pair: `Cancelar` (ghost) + `Guardar cambios` (primary). Submission calls `updateAccount(record.id, payload)`. On success: success toast `Cuenta actualizada`, close modal, emit `saved`. On error: error toast `No se pudo actualizar la cuenta` with a `Reintentar` action that re-submits the same payload (mirror the canonical pattern from `ConfigureAccountingModal`).
- [x] 4.8 Delete the file `src/ops/banks-accounts/ConfigureAccountingModal.vue`.

## 5. Tests

- [x] 5.1 In `src/ops/banks-accounts/api.spec.ts`, remove the entire test sample's `contable` field. Remove the test cases that exercise the `accountingConfig` schema. Add a new `describe('updateAccountPayload')` with at least: accepts a full payload, accepts `padreCuentaId: null`, rejects unknown moneda, rejects empty `nro`.
- [x] 5.2 In `src/pages/BanksAccounts.spec.ts`:
  - Update the sample dataset rows to drop the `contable` field.
  - In the happy-path test, change the assertions to expect 2 KPIs (`Estructuras = 4`, `Cuentas totales = 5`) instead of 4. Remove assertions that the preparatory notice renders.
  - Update the table-headers assertion to expect 9 columns (`Sociedad`, `Banco / Estructura`, `Tipo`, `Tipo de cuenta`, `Moneda`, `Nro. / Address`, `Cuenta padre`, `Estado`, `Acciones`) instead of 10.
  - In the empty-state test, change the assertion from "all four cards with value 0" to "both cards with value 0". Drop the assertions on `kpi-configuradas` / `kpi-sin-configurar` — those test IDs no longer exist.
  - Add a stub for the new `EditAccountModal` so the page mounts cleanly.
- [x] 5.3 Delete the file `src/ops/banks-accounts/ConfigureAccountingModal.spec.ts`.
- [x] 5.4 Create `src/ops/banks-accounts/EditAccountModal.spec.ts` covering at minimum:
  - Pre-fill: opens with a record whose `nro = '10.045'` and asserts the `nro` input value is `10.045` after `nextTick`.
  - Validation: clearing `nro` and clicking Save does not dispatch `updateAccount` and surfaces the inline error.
  - Stable identity: asserts there are no editable Sociedad / Estructura controls in the form.
  - Save dispatch: with all required fields valid, clicking Save calls `updateAccount(id, payload)` once with the expected 5-field payload.

## 6. Manual verification

- [ ] 6.1 Run `npm run dev` and confirm:
  - The page renders 2 KPI cards (no `Config. contable` / `Sin configurar`).
  - The table renders 8 columns plus an Actions column (no `Cuenta contable`).
  - The filter row renders 4 selects (no `Config. contable` filter).
  - No preparatory-accounting notice anywhere on the page.
  - Per-row Actions menu opens with exactly one active item: `Editar datos`. No V2 placeholder, no Configurar cuenta contable.
  - Editar datos opens the modal with all 5 fields prefilled, Sociedad + Estructura visible read-only.
  - With an empty catalog the EmptyState renders with both KPIs at 0.

## 7. Quality gates

- [x] 7.1 `npm run lint` exits 0.
- [x] 7.2 `npm run type-check` exits 0.
- [x] 7.3 `npm run test:run` exits 0 (full suite green; new EditAccountModal tests pass; deleted ConfigureAccountingModal tests gone; updated page tests assert the 2-KPI / 8-column shape).
- [x] 7.4 `npm run spec:check` (`openspec validate --all --strict`) exits 0.
- [x] 7.5 `npm run build:qa` exits 0; the BanksAccounts bundle stays under the 400 KB gzipped page-budget per CLAUDE.md.
