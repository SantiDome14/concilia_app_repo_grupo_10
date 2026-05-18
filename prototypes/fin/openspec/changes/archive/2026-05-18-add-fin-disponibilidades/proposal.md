> Jira REQ: [REQ-50](https://arduasolutions.atlassian.net/browse/REQ-50)
> Module: FIN
> Depends on: `align-fin-prototype-to-playbook` (must merge first), REQ-42 (OPS — catálogo Bancos/Cuentas + imputación bidireccional, status SENT TO DEV), REQ-68 (manifest engine, satisfied by `core-actions-manifest`), REQ-69 (vistas Lista/Tarjetas/Tablero + ejes, satisfied by `core-module-types` + existing manifest engine)

# Add FIN — Tesorería — Disponibilidades (REQ-50)

## Why

The legacy treasury process at Ardua runs on Excel: balances are stale relative to bank reality, there is no distinction between disponible and comprometido, no traceability, no scale, and operational conciliation gets confused with accounting conciliation in a single human-driven process.

REQ-50 scopes the **Disponibilidades module** as the first operative feature of the Tesorería block in FIN. It answers the operational question "where is the money?" in terms of Sociedad → Banco → Cuenta, exposes the global ledger of movements that supports the position, and lets Finanzas operate on the Bancos/Cuentas catalogue with accounting-configuration lens. It replaces the Excel sheet with an auditable record, real-time position, and formal mechanisms for imputation + supervisión.

Backend has already partially built the system (`core-tes-backend` + legacy `core-tes-frontend`); REQ-50 consolidates the product decisions on that work and aligns FIN to the financial-core paradigm (generic modules, manifest engine, REQ-42's bidirectional imputation model, capability model).

The current fin scaffold (post-`align-fin-prototype-to-playbook`) ships a `Tesoreria.vue` page with three sub-tabs **Posición / Movimientos / Cola de asignación**, a top-level `Movimientos.vue` module, and a `fin.movimientos.actions.ts` manifest with 10 actions (imputación + conciliación + intercompany). All of that is the **pre-REQ-50** model. REQ-50 reorders the sub-tabs, removes Cola, adds Bancos/Cuentas, eliminates the top-level Movimientos module, drops the conciliación + intercompany actions, and reshapes the carga manual flow with local supervision (creator ≠ supervisor).

## What Changes

### New capability

- `fin-disponibilidades`: the contract for the Disponibilidades module. Type B page with 3 sub-tabs in fixed order (Posición / Bancos-Cuentas / Movimientos), Main CTA contextual per sub-tab, drill-down from Posición to Movimientos, bidirectional imputation consumed from REQ-42, local supervision for manual loads (forward-compatible with Inbox per REQ-71 when FIN adopts it), 8 fine-grained capabilities.

### Page rename + URL change

- **`src/pages/Tesoreria.vue` → `src/pages/Disponibilidades.vue`** (+ `Tesoreria.spec.ts` → `Disponibilidades.spec.ts`). The Sidebar block is "Tesorería" (group); the page is "Disponibilidades" (record). Today's file name conflates the two and grows debt as the Tesorería block adds sibling pages (Cobros, Pagos, etc.).
- `ROUTE_PATHS.TESORERIA` → `ROUTE_PATHS.DISPONIBILIDADES` (value: `/tesoreria` → `/disponibilidades`).
- `ROUTE_NAMES.TESORERIA` → `ROUTE_NAMES.DISPONIBILIDADES`.
- Sidebar entry under "Tesorería" block points at the new route.

### Deletions

- **`src/pages/Movimientos.vue` + `Movimientos.spec.ts`** — Movimientos as a top-level Back Office module is eliminated. In FIN, Movimientos is exclusively the sub-tab of Disponibilidades (per REQ-50 §A.2: same ledger, different lens; FIN's lens lives inside Disponibilidades). Route + Sidebar entry + `ROUTE_PATHS.MOVIMIENTOS` + `ROUTE_NAMES.MOVIMIENTOS` removed.
- **`src/manifests/fin.movimientos.actions.ts`** — the manifest of the deleted page. The 6 REQ-50 §5.7 actions migrate into a new manifest scoped to the Disponibilidades.Movimientos sub-tab. The 4 dropped actions (Asignar Proveedor, Asignar Partner, Asignar Banco/Exchange for TAX, Imputar a Cuenta Contable V2-disabled, Marcar Intercompany, Marcar con Diferencias, Marcar Conciliado) are out of scope per REQ-50.
- **`src/manifests/fin.tesoreria.cola_asignacion.actions.ts`** — the sub-module Cola de Asignación is eliminated. The action "Asignar Cuenta de Origen" reappears in the new Movimientos sub-tab manifest under the predicate `enable_when` of REQ-50 §5.7 (Asignar Banco y Cuenta on `lado_ardua_asignado === false`).
- **`src/mocks/fin/retiros_cola.ts`** — the mock data for the Cola.
- Type `RetiroCola` from `src/types/fin.ts`.

### Renames

- **`src/manifests/fin.tesoreria.actions.ts` → `src/manifests/fin.disponibilidades.actions.ts`**. Manifest key `'fin.tesoreria'` → `'fin.disponibilidades'`. The single existing module CTA "Cargar movimiento manual" becomes one of three contextual `module_ctas[]` controlled by `show_when` against the active sub-tab.

### Additions

- **`src/manifests/fin.disponibilidades.bancos_cuentas.actions.ts`** — new manifest for the Bancos/Cuentas sub-tab. `module_ctas[]`: "Crear nueva Cuenta" (capability `fin.disponibilidades.bancos_cuentas.crear`). `actions[]`: "Configurar cuenta contable" (capability `fin.disponibilidades.bancos_cuentas.configurar_contable`).
- **`src/manifests/fin.disponibilidades.movimientos.actions.ts`** — new manifest for the Movimientos sub-tab (independent from any OPS manifest per user decision; no shared-component vendoring). `actions[]`: 6 REQ-50 §5.7 actions with the precise `enable_when` predicates (Asignar/Editar Banco y Cuenta, Asignar/Editar Cliente, Confirmar/Rechazar carga manual). `kanban_axes[]`: 6 axes per REQ-50 §5.4 (Estado operativo default, Estado de imputación Lado Ardua, Estado de imputación Lado Cliente, Estado de supervisión, Tipo, Sociedad). Closure modal on transitions to terminal states.
- **`src/mocks/fin/bancos_cuentas.ts`** — catalogue mock with the columns from REQ-42 §8.1 + Cuenta contable column (Configurada / Sin configurar).
- **`src/mocks/fin/movimientos.ts`** — ledger mock with mix of OPS / TRD / Manual origins, operational states from REQ-42, supervision states, partial imputation on some rows.
- **`src/mocks/fin/disponibilidades.ts`** updated (Posición tree Sociedad → Cuenta with Propio/Cliente segmentation).
- **`src/pages/Disponibilidades.vue`** — implementation per REQ-50 §3–§7 (Posición tree, Bancos/Cuentas table, Movimientos with `<ViewToggle>`+`<KanbanBoard>`, drill-down from Posición with `cuenta_id` filter, KPIs L2 per sub-tab, contextual Main CTAs).
- **`src/types/fin.ts`** updates — `Movimiento` gets `requires_supervision: boolean`, `supervised_by: string | null`, `supervised_at: string | null`, `estado_de_supervision`, `origen: 'OPS' | 'TRD' | 'Manual'`. New types `CuentaBanco`, `Sociedad`, `PosicionNode`.
- **8 capabilities** declared in `useCapabilities` and seeded in dev (`plugins/auth0.ts`): `fin.disponibilidades.ver`, `.bancos_cuentas.crear`, `.bancos_cuentas.configurar_contable`, `.movimientos.imputar_ardua`, `.movimientos.imputar_cliente`, `.movimientos.cargar_directo`, `.movimientos.cargar_con_supervision`, `.movimientos.supervisar_carga`.

### Out of scope (explicitly removed from this change)

The following are documented in REQ-50 §"Fuera de alcance" and confirmed by the audit:

- **Conciliación contable automática** against bank statement / on-chain API / exchange confirmation (backend concern).
- **Conciliación operativa** stays in OPS (not duplicated in FIN).
- **Generación de asientos contables** — depends on FIN.Contabilidad (plan de cuentas operativo). The "Configurar cuenta contable" action in v1 stores metadata only, validated against the plan when it exists.
- **Vista de Disponibilidad** (Disponible vs Comprometido) — requires comprometido model not yet defined.
- **Vista de Exposición** — multimoneda + counterparty + rate.
- **Vista de Vencimientos** — does not apply to Disponibilidades.
- **Caja Chica**, **Inversiones**, **Monedas** — separate Tesorería sub-modules, deferred.
- **Generación de comprobantes y notificación al cliente** — other FIN modules.
- **Cierre operativo del día / cierre contable de período** — FIN.Contabilidad.
- **Integración del módulo Inbox para supervisión** — REQ-71 deferred; supervision is local in v1 with forward-compatibility designed.
- **OPS Bancos/Cuentas manifest in fin** — per user decision (point 3 of Fase 2 dialog), `fin.bancos_cuentas` is independent from any future `ops.bancos_cuentas`. No shared component or vendoring.

## Capabilities

### New Capabilities

- `fin-disponibilidades`: the contract for the Disponibilidades module of FIN's Tesorería block — Type B page with Posición / Bancos-Cuentas / Movimientos, contextual Main CTAs, drill-down, supervised manual load, bidirectional imputation consumed from REQ-42's primitives.

### Modified Capabilities

None.

## Impact

- **Pages:** 1 page renamed (Tesoreria → Disponibilidades), 1 page deleted (Movimientos), 1 page substantially rewritten.
- **Routes / config:** 2 path constants renamed (TESORERIA→DISPONIBILIDADES path `/tesoreria`→`/disponibilidades`), 1 path removed (MOVIMIENTOS).
- **Manifests:** 1 manifest renamed (tesoreria→disponibilidades), 2 manifests deleted (movimientos, tesoreria.cola_asignacion), 2 manifests created (disponibilidades.bancos_cuentas, disponibilidades.movimientos).
- **Mocks:** 1 mock deleted (retiros_cola), 2 mocks created (bancos_cuentas, movimientos), 1 mock updated (disponibilidades).
- **Types:** `Movimiento` extended with 5 fields, `RetiroCola` deleted, 3 new types added.
- **Capabilities:** 8 new fine-grained capability strings declared + seeded dev.
- **Sidebar:** 1 entry removed (Movimientos top-level), 1 entry's label remains "Disponibilidades" (icon Wallet) but pointing at the renamed route.
- **Tests:** existing tests in `Tesoreria.spec.ts` rewritten as `Disponibilidades.spec.ts`; `Movimientos.spec.ts` deleted; new tests for the supervision flow, drill-down, contextual CTAs, and the new manifests.
- **Bundle:** the chunk `Tesoreria-*.js` (~25.79 KB) becomes `Disponibilidades-*.js` with similar size; the chunk `Movimientos-*.js` (~32.53 KB) disappears.
- **Validation gates:** 5 gates in fin must remain green. `openspec validate --all --strict` adds the new capability to fin's tally (14 → 15).

## Baseline evidence

Precondition: `align-fin-prototype-to-playbook` committed (the audit baseline). All 5 quality gates passed pre-change. This change starts on top of that.

## Follow-up changes (not nominated here)

Each becomes its own change against its own REQ when scoped:

- `extend-fin-disponibilidades-inbox-supervision` — migrate the local supervision mechanism to Inbox-based when REQ-71 is implemented for FIN.
- `extend-fin-disponibilidades-asientos-contables` — connect "Configurar cuenta contable" to the FIN.Contabilidad plan de cuentas once it exists.
- `extend-fin-disponibilidades-conciliacion` — UI-level operative conciliation once the model is defined (not a duplication of OPS conciliation).
- `add-fin-caja-chica`, `add-fin-inversiones`, `add-fin-monedas` — siblings of Disponibilidades in the Tesorería block, when scoped.
