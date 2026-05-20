> Jira REQ: [REQ-XX](https://arduasolutions.atlassian.net/browse/REQ-XX) (placeholder — replace before PR)
> Module: FIN
> Source of truth: [`features/fin/fin-tesoreria-disponibilidades.md`](../../../../features/fin/fin-tesoreria-disponibilidades.md) (closed 2026-05-20) + [`discoveries/fin-tesoreria-disponibilidades-discovery.md`](../../../../discoveries/fin-tesoreria-disponibilidades-discovery.md)

# Align FIN.Disponibilidades to the omnibus accounting model

## Why

The `fin-disponibilidades` capability was specced and shipped under REQ-50 v1 before the conceptual model of the module was closed. The discovery sessions that closed on 2026-05-20 reframed the entire module around **omnibus accounting**, the **ecuación maestra**, and the **society-scoped ledger** — a model that contradicts core decisions baked into the current prototype:

1. The Posición sub-tab today shows **Posición consolidada / Total Propio / Total Cliente** in USD-equivalent, and segments each Cuenta into `saldo_propio` + `saldo_cliente`. The closed model declares this framing **wrong**: under omnibus accounting "la pregunta '¿de qué cliente es la plata que está en esta cuenta?' está mal formulada". The KPIs must be **Bancos / Obligaciones / Pendientes / Capacidad Operativa**, expressed in moneda nativa with no cross-currency conversion in V1.
2. The Movimientos sub-tab today categorizes records by `origen` (`OPS` / `TRD` / `Manual`). The closed model categorizes movements along two ortogonal dimensions — **presencia de cliente × presencia de flujo físico** — yielding 6 categorías (A-F) that govern campos de carga, predicados de acciones y valores del estado de imputación. The `origen` field becomes a back-reference, not the primary lens.
3. The 12 `MovimientoTipo` values cover only the OPS-native vostro flow (DEPOSIT/WITHDRAWAL/COLLECTOR_*/etc). The closed model declares a 21-row matriz with **society-scoped doble entrada**, including **Préstamo intercompany** and **Sweeping cross-sociedad** that generate **two mirrored asientos**, one per sociedad. The current `Movimiento` shape has no `asiento_id`, no `evento_id`, no concept of cross-sociedad pairing.
4. The plan de cuentas implicit in the current prototype has 6 grupos. The closed model adds an 8th — **Patrimonio operativo** — to capture aportes propios and the residual operativo de Ardua, with T0 opening balance equal to the initial Capacidad Operativa.

Shipping any further FIN work on top of the current model would propagate the contradiction. The cost of correcting it grows with every consumer of `MovimientoTipo`, `MovimientoFin`, and `POSICION_KPIS`. We are still in prototype territory — this is the right moment to realign.

## What Changes

### Domain types (`src/types/fin.ts`)

- **MODIFY** `MovimientoTipo`: extend from 12 to **21** values to match the matriz of the feature. Net-new: `SPREAD`, `SOLICITUD_RETIRO_PENDING`, `DEPOSITO_PENDIENTE`, `ASIGNACION_PENDIENTE`, `AJUSTE_CREDITO`, `AJUSTE_DEBITO`, `MOV_ENTRE_CUENTAS_PROPIAS`, `PRESTAMO_INTERCOMPANY`, `SWEEPING_CROSS_SOCIEDAD`, `COMISION_BANCARIA`, `INTERES_BANCARIO`, `PAGO_PROVEEDOR`, `PAGO_SALARIOS`, `APORTE_CAPITAL`, `AJUSTE_MANUAL`. Legacy `COLLECTOR_IN/OUT`, `ADDITION`, `TAX` are removed cleanly (see design.md for the mapping table; mocks are rewritten under this change, no production consumer exists yet).
- **ADD** `MovimientoCategoria` literal union `'A' | 'B' | 'C' | 'D' | 'E' | 'F'` and a pure derivation `categoriaOf(tipo): MovimientoCategoria` that the manifest engine consumes through a thin selector. Categoría is **derived from `tipo`** (not stored) — see design.md Decision 1.
- **ADD** `evento_id?: string | null` and `asiento_id?: string | null` to `Movimiento`. Asientos espejo de Préstamo intercompany / Sweeping share `evento_id` and have distinct `asiento_id`.
- **ADD** account-group taxonomy: `GrupoContable` literal union with the 8 grupos of the feature (Disponibilidades, Obligaciones con clientes, Pendientes de asignación, Puente FX, Intercompany, Patrimonio operativo, Ingresos, Egresos).
- **REMOVE** `MovimientoOrigen` from being the manifest's primary discriminator. The field stays on `Movimiento` as a back-reference (for traceability + filter on the L3 toolbar) but the manifest's `show_when` predicates pivot to `categoria`.

### Mocks

- **REWRITE** `src/mocks/fin/disponibilidades.ts`:
  - `POSICION_KPIS` becomes a per-moneda structure with the 4 dimensions of the ecuación maestra (`Bancos`, `Obligaciones`, `Pendientes`, `CapacidadOperativa`), one row per moneda nativa held by the group. No USD-equivalent consolidation.
  - `POSICION_TREE` keeps the Sociedad → Cuenta hierarchy but **removes `saldo_propio` + `saldo_cliente`** from `CuentaPos`. Each cuenta exposes only `saldo` in its moneda nativa. Sociedad-level `totals` (per-moneda chips) stay.
- **REWRITE** `src/mocks/fin/movimientos.ts`: ledger covers every tipo of the new matriz with at least one representative record. Required pairs: one `PRESTAMO_INTERCOMPANY` (2 asientos espejo sharing `evento_id`); one `SWEEPING_CROSS_SOCIEDAD` (idem); one `DEPOSITO_PENDIENTE` followed by its `ASIGNACION_PENDIENTE`; one `SWAP_OUT` + `SWAP_IN` + `SPREAD` triple from a single ejecución; at least one `APORTE_CAPITAL` to feed Patrimonio operativo.
- **REWRITE** `MOVIMIENTOS_KPIS` to expose: Movimientos del día / Volumen ingresado / Volumen egresado (per-moneda, no USD-equivalent) / Pendientes de imputación / Pendientes de supervisión / **Pendientes de asignación** (depósitos pendientes sin asignar).

### Manifests (`src/manifests/`)

- **MODIFY** `fin.disponibilidades.actions.ts` — the module-scope manifest hosting the **Cargar movimiento manual** CTA. The `tipo` select must expose ONLY the FIN-registered tipos of the matriz: `COMISION_BANCARIA`, `INTERES_BANCARIO`, `PAGO_PROVEEDOR`, `PAGO_SALARIOS`, `MOV_ENTRE_CUENTAS_PROPIAS`, `PRESTAMO_INTERCOMPANY`, `SWEEPING_CROSS_SOCIEDAD`, `APORTE_CAPITAL`, `AJUSTE_MANUAL`. OPS-native tipos (DEPOSIT/WITHDRAWAL/SWAP_*/FEE/REBATE/etc) must NOT appear in this dialog. For `PRESTAMO_INTERCOMPANY` and `SWEEPING_CROSS_SOCIEDAD`, the dialog adds a second `sociedad_destino_id` field (the contraparte sociedad), and the engine generates 2 asientos espejo with a shared `evento_id`.
- **MODIFY** `fin.disponibilidades.movimientos.actions.ts` — replace `nostroOrManualPredicate()` (which keys off `origen` and a `record_type_in` whitelist of legacy tipos) with `nonVostroByCategoriaPredicate()` that keys off `categoria in {C, D, E}` (the categorías that FIN imputa, never OPS-vostro). Keep the 6 actions intact (Asignar/Editar Banco y Cuenta, Asignar/Editar Cliente, Confirmar/Rechazar carga manual).

### Page (`src/pages/Disponibilidades.vue`)

- Replace the Posición L2 KPI strip: 4 cards × multi-moneda rows (Bancos / Obligaciones / Pendientes / Capacidad Operativa).
- Drop the `Propio` and `Cliente` columns from the Posición tree table.
- Movimientos kanban: replace the `sociedad` and `origen`-derived predicates' surface with a new **Categoría** axis (A/B/C/D/E/F) alongside the existing axes.
- Drill-down on Posición.Cuenta → Movimientos.cuenta_id filter unchanged.

### Spec deltas (`specs/fin-disponibilidades/spec.md`)

- **MODIFIED Requirements**: the 4 KPI Requirement (rewrite per-moneda Bancos/Obligaciones/Pendientes/Capacidad); the Posición tree Requirement (drop Propio/Cliente segmentation per cuenta); the Cargar movimiento manual Requirement (FIN-side tipos only + 2nd-sociedad field for cross-sociedad); the Movimientos manifest Requirement (categoría-based predicates instead of `origen`-based).
- **ADDED Requirements**: ecuación maestra invariant (Bancos = Obligaciones + Pendientes + Capacidad Operativa per moneda y por sociedad/consolidado); 21-row matriz de tipos (closed contract — any tipo outside the matriz is rejected); 6-category dimension (A-F) derived from `(tipo, has_cliente, has_physical_flow)`; 8-group plan de cuentas incl. Patrimonio operativo; asientos society-scoped (cross-sociedad events generate 2 asientos espejo); inmutabilidad del ledger + corrección via Ajuste de Crédito / Débito / Manual.
- **REMOVED Requirements**: Propio/Cliente segmentation of saldos (replaced by the omnibus framing); the supervision/Posición exclusion Requirement is kept (still aligned with the feature's supervision rules).

### Out of scope (explicit, per the feature's "Restricciones" section)

- Generación de asientos contables formales — V1 modela asientos a nivel grupo contable, no por cuenta individual del plan formal.
- Desglose patrimonial formal del Patrimonio operativo (Capital social, Aportes irrevocables, Reservas, Resultados Acumulados) — V2 con el Motor Contable.
- Compensación automática de errores — Ajustes son carga manual con justificación obligatoria.
- Conciliación contable automática contra extracto / API on-chain / exchange.
- Conciliación operativa — sigue en OPS, no se duplica en FIN.
- Vista de Disponibilidad (Disponible vs Comprometido), Exposición, Vencimientos.
- Caja Chica, Inversiones.
- Conversiones cross-moneda y catálogo de monedas/tasas.
- Cierre operativo del día / cierre contable de período.
- Integración del módulo Inbox.

## Capabilities

### New Capabilities

None. The change reshapes an existing capability rather than adding new surfaces.

### Modified Capabilities

- `fin-disponibilidades`: substantial rewrite of 5 existing Requirements (KPIs, Posición tree, carga manual dialog, Movimientos manifest predicates, supervision/saldo interaction) + 6 new Requirements covering the omnibus invariants (ecuación maestra, tipos matrix, categoría dimension, plan de cuentas, asientos society-scoped, inmutabilidad).

## Impact

- **Types (`src/types/fin.ts`):** ~120 lines changed (10 new tipos in the union, derivation helper, 4 new optional fields on `Movimiento`, `GrupoContable` taxonomy).
- **Mocks (`src/mocks/fin/*.ts`):** full rewrite of `disponibilidades.ts` (~250 lines) + `movimientos.ts` (~700 lines for full coverage of the 21-row matriz with the required pairs).
- **Manifests (`src/manifests/fin.disponibilidades*.actions.ts`):** ~180 lines changed (predicate refactor, tipo whitelist, new `sociedad_destino_id` field for cross-sociedad).
- **Page (`src/pages/Disponibilidades.vue`):** ~150 lines changed (KPI strip, tree table, new categoría axis).
- **Specs (`specs/fin-disponibilidades/spec.md`):** ~250 lines changed (5 MODIFIED + 6 ADDED + 1 REMOVED Requirement set).
- **Tests (`src/pages/Disponibilidades.spec.ts`):** ~200 lines changed to assert the new KPI shape, the dropped Propio/Cliente columns, and the new tipo coverage in mocks.
- **Validation gates:** 5 gates (lint, type-check, test:run, spec:check, build:qa).
- **Risk: medium-high.** The change touches every layer of the module simultaneously. Mitigated by: (a) the prototype has no real backend consumers; (b) the supervision flow is unchanged so the most security-sensitive surface is left alone; (c) all changes are scoped to FIN.Disponibilidades — no side effects on Cotizaciones, Alertas, Inbox, or the cross-cutting standard modules.

## Baseline evidence

Branch `temp-open-spec/align-fin-disponibilidades-to-omnibus-model` is forked from `main` at commit `1c511cd` (clean working tree). The feature file in the parent framework repo (`features/fin/fin-tesoreria-disponibilidades.md`) was committed 2026-05-20 as part of the discovery closure. This proposal materialises that feature in the prototype.

## Follow-up changes (not nominated here)

- `extend-fin-disponibilidades-carga-manual-persistence` — wire the carga manual dialog's `on_confirm` to a movements store so new manual loads appear in the ledger (currently the engine creates the record but the page does not re-render the ledger).
- `add-fin-contabilidad-motor-v2` — Motor Contable formal con plan de cuentas y desglose patrimonial; introduce el ledger por cuenta individual y la generación automática de asientos formales.
- `extend-fin-disponibilidades-inbox-integration` — wire la supervisión queue al módulo Inbox cuando aterrice.
