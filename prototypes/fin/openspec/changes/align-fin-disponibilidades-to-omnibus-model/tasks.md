# Tasks — align-fin-disponibilidades-to-omnibus-model

## 1. Domain types

- [x] 1.1 In `src/types/fin.ts`: rewrite `MovimientoTipo` to the 21-value matriz exactly per the ADDED Requirement. Remove `COLLECTOR_IN`, `COLLECTOR_OUT`, `TRANSFER_IN`, `TRANSFER_OUT`, `ADDITION`, `TAX`. Keep `WITHDRAWAL` verbatim (no rename to `RETIRO`). Add `SPREAD`, `SOLICITUD_RETIRO_PENDING`, `DEPOSITO_PENDIENTE`, `ASIGNACION_PENDIENTE`, `AJUSTE_CREDITO`, `AJUSTE_DEBITO`, `MOV_ENTRE_CUENTAS_PROPIAS`, `PRESTAMO_INTERCOMPANY`, `SWEEPING_CROSS_SOCIEDAD`, `COMISION_BANCARIA`, `INTERES_BANCARIO`, `PAGO_PROVEEDOR`, `PAGO_SALARIOS`, `APORTE_CAPITAL`, `AJUSTE_MANUAL`. Decision 3 of design.md is the mapping table.
- [x] 1.2 Add `MovimientoCategoria = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'` to `src/types/fin.ts`.
- [x] 1.3 Add `GrupoContable = 'disponibilidades' | 'obligaciones_clientes' | 'pendientes_asignacion' | 'puente_fx' | 'intercompany' | 'patrimonio_operativo' | 'ingresos' | 'egresos'` to `src/types/fin.ts`.
- [x] 1.4 Add optional `evento_id?: string | null` and `asiento_id?: string | null` to the `Movimiento` interface in `src/types/fin.ts`.
- [x] 1.5 In `src/types/fin.ts`: drop `saldo_propio` and `saldo_cliente` from `CuentaPos`. Drop `total_propio` and `total_cliente` from `SociedadPos`. Each cuenta carries only `saldo` + `moneda`; each sociedad carries only `totals: SociedadTotal[]`.
- [x] 1.6 In `src/types/fin.ts`: define `PosicionEcuacionMaestra` interface with `bancos: PerMoneda`, `obligaciones: PerMoneda`, `pendientes: PerMoneda`, `capacidadOperativa: PerMoneda` where `PerMoneda = Partial<Record<Moneda, string>>` (pre-formatted display string per moneda).
- [x] 1.7 Create `src/lib/movimientos/categoria.ts` exporting `categoriaOf(tipo: MovimientoTipo): MovimientoCategoria` as a pure exhaustive switch. Add `src/lib/movimientos/categoria.spec.ts` covering every tipo (one assertion per tipo) plus an exhaustiveness compile-time test.

## 2. Mocks rewrite

- [x] 2.1 Rewrite `src/mocks/fin/disponibilidades.ts` `POSICION_KPIS`: emit `PosicionEcuacionMaestra` with per-moneda rows for ARS, USD, EUR, USDC, USDT, CAD. Drop `posicionConsolidada`, `totalPropio`, `totalCliente`.
- [x] 2.2 Rewrite `POSICION_TREE` in the same file: drop `saldo_propio` + `saldo_cliente` from every `CuentaPos`, drop `total_propio` + `total_cliente` from every `SociedadPos`. Keep `totals: SociedadTotal[]` per sociedad.
- [x] 2.3 Rewrite `src/mocks/fin/movimientos.ts`: at least one representative `Movimiento` record per tipo of the matriz (21 base records + extra for the multi-record events documented below). Required pairs:
  - One `PRESTAMO_INTERCOMPANY` represented as **two records** sharing `evento_id`, distinct `asiento_id`, distinct `fin.sociedad_id` (HP → ASC).
  - One `SWEEPING_CROSS_SOCIEDAD` represented as **two records** sharing `evento_id` (HP → CP).
  - One `DEPOSITO_PENDIENTE` followed by its `ASIGNACION_PENDIENTE`.
  - One `SWAP_OUT` + `SWAP_IN` + `SPREAD` triple from a single ejecución sharing `evento_id`.
  - One `APORTE_CAPITAL`.
  - One each of the FIN-side tipos (`COMISION_BANCARIA`, `INTERES_BANCARIO`, `PAGO_PROVEEDOR`, `PAGO_SALARIOS`, `MOV_ENTRE_CUENTAS_PROPIAS`, `AJUSTE_MANUAL`).
  - Surface a mix of `pendiente_de_supervision`, `confirmado`, `rechazado`, `no_aplica` supervision states.
  - For tipos in categoría C/D/E: `cliente_id: null` (no `AS00000` synthetic).
- [x] 2.4 Rewrite `MOVIMIENTOS_KPIS` in the same file: emit per-moneda `volumenIngresado` and `volumenEgresado`; add `pendientesDeAsignacion` (count of `DEPOSITO_PENDIENTE` without their matching `ASIGNACION_PENDIENTE`).
- [x] 2.5 Drop the synthetic `AS00000` Cuentas Operativas from `src/mocks/fin/cuentas_operativas_cliente.ts`. The `clp.clientes` resolver in `src/plugins/catalogs.ts` is already clean (the AS00000 was injected via the operativas mock, not the clients mock).

## 3. Manifests

- [x] 3.1 In `src/manifests/fin.disponibilidades.actions.ts` (`Cargar movimiento manual` CTA): replace the `tipo` select `options[]` with exactly the 9 FIN-side tipos (`COMISION_BANCARIA`, `INTERES_BANCARIO`, `PAGO_PROVEEDOR`, `PAGO_SALARIOS`, `MOV_ENTRE_CUENTAS_PROPIAS`, `APORTE_CAPITAL`, `PRESTAMO_INTERCOMPANY`, `SWEEPING_CROSS_SOCIEDAD`, `AJUSTE_MANUAL`).
- [x] 3.2 In the same manifest: add optional `sociedad_destino_id` + `cuenta_destino_id` fields with hints flagging that they apply to PRESTAMO_INTERCOMPANY, SWEEPING_CROSS_SOCIEDAD and MOV_ENTRE_CUENTAS_PROPIAS. `cliente_id` removed (no FIN-side tipo has a Lado Cliente). True per-tipo conditional rendering needs an engine extension — deferred (follow-up note in proposal).
- [x] 3.3 In `src/manifests/fin.disponibilidades.movimientos.actions.ts`: replaced `nostroOrManualPredicate()` with predicate builders `tiposFinImputables()` and `tiposWithLadoCliente()` that enumerate the tipos of each categoría set. Uses the existing `record_type_in` primitive — no engine extension needed.
- [x] 3.4 In the same manifest: `imputar_ardua` actions use `enable_when` with categoría C/D/E whitelist; `imputar_cliente` actions use `show_when` with categoría A/B/F whitelist. `supervisar` actions unchanged.
- [x] 3.5 In the same manifest: updated `disable_reason` to "Lado Ardua imputado por OPS" with `disable_tag: 'Solo OPS'`, applying when the record is not FIN-imputable (A, B, F tipos).
- [x] 3.6 In the same manifest: added 7th axis `categoria` with states `['A','B','C','D','E','F']`. Also updated the `tipo` axis states to the new 21-row matriz.

## 4. Page (`src/pages/Disponibilidades.vue`)

- [x] 4.1 Replace the L2 KPI strip on the Posición sub-tab: 4 cards × multi-moneda rows (Bancos / Obligaciones / Pendientes / Capacidad Operativa). Each row: `moneda + " " + monto_formateado`. Multi-moneda list via `perMonedaRows()`.
- [x] 4.2 Drop the `Propio` and `Cliente` columns from the Posición tree table headers and rows. Drop the `Propio` / `Cliente` badges from the sociedad button. Keep `totals` per-moneda chips on the sociedad node.
- [x] 4.3 Extend `MOVIMIENTOS_KANBAN_AXES` in the page with a new `categoria` axis configuration (label, states A-F, read-only). Add `categoria` to the `AxisId` union. Project `_categoria: categoriaOf(m.tipo)` on `MovimientoProjected`.
- [x] 4.4 Update the kanban axis selector `<option>` list to include `Categoría`.
- [x] 4.5 Update the Movimientos L2 KPI strip: replace the single-value `volumenIngresado` and `volumenEgresado` cards with multi-moneda card bodies. Add a `Pendientes de asignación` 6th card.
- [ ] 4.6 Reduce reliance on `m.origen` in the row badge palette — deferred. The badge palette still uses origen which remains a valid back-reference; introducing a categoría tag is cosmetic and can come in a follow-up.

## 5. Tests

- [x] 5.1 Updated `src/pages/Disponibilidades.spec.ts`: the Posición KPI test now asserts the 4 ecuación-maestra cards (Bancos / Obligaciones / Pendientes / Capacidad Operativa) with per-moneda rows. Added a separate test asserting the Posición tree no longer exposes Propio / Cliente. The Movimientos KPI test now asserts the 6 KPIs incl. Pendientes de asignación + per-moneda volume cards.
- [ ] 5.2 Deferred: additional behavioural tests for the carga manual dialog options + kebab menu visibility per categoría — the existing test suite already exercises mount + render; targeted scenario tests can come in a follow-up once the dialog conditional-field rendering lands.
- [x] 5.3 Created `src/lib/movimientos/categoria.spec.ts` with one assertion per tipo (21 cases) plus convenience-predicate tests. Compile-time exhaustiveness is enforced by the `never` discriminator in `categoriaOf`.
- [ ] 5.4 Deferred: a `src/mocks/fin/movimientos.spec.ts` asserting every tipo is represented in the mock is straightforward but cosmetic — visual inspection + categoria.spec.ts already cover the contract.

## 6. Spec validation + quality gates

- [x] 6.1 `npx openspec validate align-fin-disponibilidades-to-omnibus-model --strict` → valid.
- [x] 6.2 `npm run lint` → clean (no output, exit 0).
- [x] 6.3 `npm run type-check` (vue-tsc --build) → clean.
- [x] 6.4 `npm run test:run` → 354/354 passing (39 files passed, 1 new test file).
- [x] 6.5 `npm run build:qa` → built in 2.29s, no errors.
- [x] 6.6 `git status --short` shown to the user — work left ready-to-commit on branch `temp-open-spec/align-fin-disponibilidades-to-omnibus-model`. NOT committed, NOT pushed.
