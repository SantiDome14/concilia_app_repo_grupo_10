# fin-disponibilidades — Spec deltas (align-fin-disponibilidades-to-omnibus-model)

## ADDED Requirements

### Requirement: The ecuación maestra MUST hold per moneda for every sociedad and the consolidated group

The system SHALL maintain the invariant

```
Σ Bancos (físico) = Σ Obligaciones + Σ Pendientes + Σ Capacidad Operativa
```

valid in every moment, for every moneda M, and for every aggregation level (per sociedad and consolidated across all sociedades). The four dimensions SHALL be defined as:

| Dimensión | Definición | Fuente |
|---|---|---|
| Bancos | Saldo físico real en todas las cuentas activas | Catálogo de Bancos / Cuentas |
| Obligaciones | Total adeudado por Ardua a clientes | Cuenta contable "Obligaciones con clientes" del ledger |
| Pendientes | Fondos ingresados físicamente sin identificar cliente | Cuenta técnica "Pendientes de asignación" |
| Capacidad Operativa | Residual `Bancos − Obligaciones − Pendientes` | Computado |

Capacidad Operativa SHALL be computed as the residual; it is never a directly observable saldo. The invariant SHALL fail-closed: if any moneda-sociedad pair violates the equation by more than the configured tolerance, the system SHALL flag a **break** and prevent confirmation of further manual loads in that sociedad until investigated.

V1 does NOT apply cross-currency conversions: every KPI and saldo SHALL be presented in its moneda nativa.

#### Scenario: Capacidad Operativa is the residual per moneda

- **GIVEN** Sociedad `HP` holds in ARS: Bancos 1_000_000, Obligaciones 600_000, Pendientes 50_000
- **WHEN** the Posición sub-tab renders
- **THEN** the Capacidad Operativa for `HP / ARS` is `350_000` (residual)
- **AND** the value is NOT read from a stored field — it is computed at render

#### Scenario: No cross-currency conversion in V1

- **GIVEN** Sociedad `ASC` holds Bancos in USD (10_000_000), CAD (1_000_000), and USDC (500_000)
- **WHEN** the Posición sub-tab renders the Bancos KPI for `ASC`
- **THEN** the KPI card shows three rows: `USD 10_000_000`, `CAD 1_000_000`, `USDC 500_000`
- **AND** NO row shows a consolidated USD-equivalent figure
- **AND** NO conversion is applied between monedas

#### Scenario: Break detection prevents further confirmations

- **GIVEN** the ecuación maestra for `HP / ARS` is violated by 1_000 ARS (above tolerance)
- **WHEN** a supervisor attempts to confirm a manual movement in `HP`
- **THEN** the confirmation is blocked
- **AND** an inline error reads "Ecuación maestra desbalanceada en HP / ARS — investigar antes de confirmar"

### Requirement: The 21-row matriz de tipos MUST be the closed contract of MovimientoTipo

The `MovimientoTipo` union SHALL contain exactly the 21 values enumerated in the feature's matriz (one value per row of the matriz). Note that some "events" in the feature prose collapse onto the same union value (e.g., legacy collector flows map to `DEPOSIT`/`WITHDRAWAL`); the matriz row is what matters.

| Tipo | Registra |
|---|---|
| `DEPOSIT` | OPS |
| `WITHDRAWAL` | OPS |
| `FEE` | OPS |
| `REBATE` | OPS |
| `SWAP_OUT` | OPS |
| `SWAP_IN` | OPS |
| `SPREAD` | OPS |
| `SOLICITUD_RETIRO_PENDING` | OPS |
| `DEPOSITO_PENDIENTE` | OPS |
| `ASIGNACION_PENDIENTE` | OPS |
| `AJUSTE_CREDITO` | OPS |
| `AJUSTE_DEBITO` | OPS |
| `MOV_ENTRE_CUENTAS_PROPIAS` | FIN |
| `PRESTAMO_INTERCOMPANY` | FIN |
| `SWEEPING_CROSS_SOCIEDAD` | FIN |
| `COMISION_BANCARIA` | FIN |
| `INTERES_BANCARIO` | FIN |
| `PAGO_PROVEEDOR` | FIN |
| `PAGO_SALARIOS` | FIN |
| `APORTE_CAPITAL` | FIN |
| `AJUSTE_MANUAL` | FIN |

Any event that does not fit one of these rows SHALL be treated as a missing tipo in the matriz, not as a manifest gap. Adding a new tipo SHALL require an OpenSpec change that extends both this Requirement and the `MovimientoTipo` union.

#### Scenario: Type system rejects unknown tipos

- **WHEN** a mock or a manual load tries to declare a `Movimiento` with `tipo: 'FOO_BAR'`
- **THEN** the TypeScript build fails with a discriminated-union mismatch
- **AND** no runtime check is needed — the type system enforces closure

#### Scenario: Exhaustiveness checked in categoría derivation

- **GIVEN** `categoriaOf(tipo: MovimientoTipo): MovimientoCategoria` is a pure switch on every tipo
- **WHEN** a new tipo is added to the union without a matching branch in `categoriaOf`
- **THEN** the TypeScript compiler reports `Type 'never' is not assignable to type 'MovimientoCategoria'` on the default branch

### Requirement: Movimientos MUST be classified by Categoría (A-F) derived from tipo + cliente + flujo físico

Every `Movimiento` SHALL be classified by a derived `Categoria: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'` computed from `(tipo, has_cliente, has_physical_flow)`:

| Categoría | Descripción | Tipos representativos |
|---|---|---|
| A | Con cliente + físico | `DEPOSIT`, `WITHDRAWAL` |
| B | Con cliente, sin físico | `FEE`, `REBATE`, `SWAP_OUT/IN` (cliente), `AJUSTE_CREDITO`, `AJUSTE_DEBITO`, `ASIGNACION_PENDIENTE` |
| C | Sin cliente + físico (interno) | `COMISION_BANCARIA`, `INTERES_BANCARIO`, `PAGO_PROVEEDOR`, `PAGO_SALARIOS`, `MOV_ENTRE_CUENTAS_PROPIAS`, `APORTE_CAPITAL` |
| D | Sin cliente + físico (cross-sociedad) | `PRESTAMO_INTERCOMPANY`, `SWEEPING_CROSS_SOCIEDAD` |
| E | Sin cliente, sin físico | `SPREAD`, `AJUSTE_MANUAL` (sin cliente) |
| F | Cliente NO IDENTIFICADO | `DEPOSITO_PENDIENTE` |

The categoría SHALL be derived, NOT stored. The page SHALL project records through `categoriaOf(tipo)` and expose `_categoria` as a derived field on the projected shape (same pattern as `_imp_ardua`, `_imp_cliente`, `_sociedad`).

For categorías **C, D, and E**, the Lado Cliente field SHALL NOT apply — it is not "vacío", not "sin asignar", not imputable to a synthetic placeholder. The contrapartida económica is a formal cuenta contable (Ingresos / Egresos / Patrimonio operativo / Intercompany / Puente FX).

#### Scenario: Categoría drives axis selection on Tablero

- **GIVEN** the Movimientos sub-tab is in Tablero view with axis `Categoría`
- **WHEN** the Tablero renders
- **THEN** the columns are `A`, `B`, `C`, `D`, `E`, `F` in that fixed order
- **AND** each movimiento card lands in the column matching `categoriaOf(m.tipo)`

#### Scenario: Asignar Cliente is hidden for C/D/E categorías

- **GIVEN** a movimiento has `tipo: 'COMISION_BANCARIA'` (categoría C)
- **WHEN** the operator opens the kebab menu of that row
- **THEN** the actions "Asignar Cliente" and "Editar Cliente" are NOT present
- **AND** the actions "Asignar Banco y Cuenta" and "Editar Banco y Cuenta" remain available

#### Scenario: Asignar Cliente visible for A/B/F categorías

- **GIVEN** a movimiento has `tipo: 'FEE'` (categoría B)
- **WHEN** the operator opens the kebab menu of that row
- **THEN** the action "Asignar Cliente" is present when `fin.cliente_id === null`
- **AND** is enabled subject to the standard capability check

### Requirement: The plan de cuentas MUST organise into 8 grupos contables including Patrimonio operativo

The system SHALL operate over 8 grupos de cuentas contables (no plan de cuentas formal — that arrives with the Motor Contable in V2):

| Grupo | Naturaleza |
|---|---|
| Disponibilidades | Activo · única cuenta con realidad física |
| Obligaciones con clientes | Pasivo |
| Pendientes de asignación | Pasivo · cuenta técnica |
| Puente FX | Técnica multimoneda |
| Intercompany | Técnica entre sociedades del grupo |
| Patrimonio operativo | Pasivo / Patrimonio |
| Ingresos | Resultado |
| Egresos | Resultado |

In V1, **Patrimonio operativo** SHALL be modelled as a single aggregated technical account with a T0 opening balance equal to the initial Capacidad Operativa (`Bancos inicial − Obligaciones inicial − Pendientes inicial`). The formal patrimonial split (Capital social, Aportes irrevocables, Reservas, Resultados Acumulados) is OUT of scope for V1 and arrives with the Motor Contable in V2.

`APORTE_CAPITAL` movements SHALL credit Patrimonio operativo and debit Disponibilidades (the cuenta receiving the aporte).

#### Scenario: Patrimonio operativo opens at T0 = initial Capacidad Operativa

- **GIVEN** at T0 the group has consolidated Bancos `2_000_000 USD`, Obligaciones `1_400_000 USD`, Pendientes `100_000 USD`
- **WHEN** the system computes the T0 opening balance of Patrimonio operativo
- **THEN** the value is `500_000 USD` (= 2_000_000 − 1_400_000 − 100_000)

#### Scenario: APORTE_CAPITAL increments Patrimonio operativo

- **GIVEN** a new `APORTE_CAPITAL` of `100_000 USD` is loaded and confirmed
- **WHEN** the Posición sub-tab re-renders
- **THEN** Bancos in USD increases by 100_000 (the cuenta receiving the aporte)
- **AND** Capacidad Operativa in USD increases by 100_000 (since Obligaciones and Pendientes are unchanged)
- **AND** the ledger entry credits Patrimonio operativo

### Requirement: Asientos contables MUST be society-scoped; cross-sociedad events MUST generate two mirrored asientos linked by evento_id

Every `Movimiento` SHALL carry exactly one `sociedad_id` (via `fin.sociedad_id`) and exactly one `asiento_id`. The asiento represents the Db/Cr pair captured in the matriz row.

When an operative event affects two sociedades (`PRESTAMO_INTERCOMPANY` or `SWEEPING_CROSS_SOCIEDAD`), the system SHALL generate **two distinct `Movimiento` records**, each with:

- A distinct `id`.
- A distinct `asiento_id`.
- A different `sociedad_id` (one for the origen sociedad, one for the destino sociedad).
- The same `tipo`.
- The same `evento_id` — a shared correlation id linking the two halves.

Each half SHALL be fully accountable on its own sociedad's ledger. The ecuación maestra SHALL hold independently per sociedad after the two asientos are persisted.

The supervision flag, if any, SHALL apply atomically to the pair: confirming the pair confirms both halves; rejecting the pair rejects both halves; neither half can be confirmed or rejected without the other.

#### Scenario: Préstamo intercompany generates two records sharing evento_id

- **GIVEN** the operator loads a `PRESTAMO_INTERCOMPANY` of `500_000 USD` from `HP` to `ASC`
- **WHEN** the supervisor confirms
- **THEN** two Movimiento records are persisted:
  - One with `fin.sociedad_id: 'hp'`, `asiento_id: 'AS-99001-HP'`, `evento_id: 'EV-99001'`
  - One with `fin.sociedad_id: 'asc'`, `asiento_id: 'AS-99001-ASC'`, `evento_id: 'EV-99001'`
- **AND** both records share `tipo: 'PRESTAMO_INTERCOMPANY'` and `evento_id: 'EV-99001'`

#### Scenario: Per-sociedad ledger filter shows only that sociedad's half

- **GIVEN** the Movimientos sub-tab has a filter `sociedad_id = 'hp'` applied
- **WHEN** the table renders the two halves of a Préstamo intercompany
- **THEN** ONLY the `HP` half is visible
- **AND** the `ASC` half is filtered out

#### Scenario: Rejecting one half rejects the pair

- **GIVEN** a Préstamo intercompany pair in `pendiente_de_supervision`
- **WHEN** the supervisor rejects the `HP` half
- **THEN** both halves transition to `rechazado` atomically
- **AND** neither half contributes to any Posición saldo in any future render
- **AND** the audit log records the rejection of the pair, not just one half

### Requirement: Movimientos MUST be inmutables; corrections MUST be registered via Ajuste de Crédito / Débito / Manual

Once persisted, a `Movimiento` SHALL be inmutable. The system SHALL NOT expose any action to edit or delete a `Movimiento`. Errors SHALL be corrected by registering a compensating movement of the appropriate type:

| Compensación | Aplica cuando |
|---|---|
| `AJUSTE_CREDITO` | Corrección a favor del cliente (devolución de fee cobrado de más, etc.) |
| `AJUSTE_DEBITO` | Corrección a favor de Ardua (fee no cobrado, crédito incorrecto, etc.) |
| `AJUSTE_MANUAL` | Casos no contemplados, con justificación textual obligatoria |

Ajustes SHALL be loaded manually with a mandatory justification field; they SHALL NOT be generated automatically by the system. The original `Movimiento` SHALL remain visible in the ledger.

The Detail modal of any `Movimiento` SHALL NOT expose an "Editar" or "Eliminar" button. The only modifications available SHALL be the imputation actions (Asignar / Editar Banco y Cuenta, Asignar / Editar Cliente) which write metadata fields (`fin.sociedad_id`, `fin.cuenta_id`, `fin.cliente_id`, `fin.cuenta_operativa_cliente_id`) — they SHALL NOT modify amount, fecha, tipo, or any field that carries economic content.

#### Scenario: Detail modal exposes no Edit or Delete action

- **GIVEN** the operator opens the Detail modal of any `Movimiento`
- **WHEN** the modal renders
- **THEN** the footer exposes only "Cerrar"
- **AND** NO "Editar" or "Eliminar" button is present

#### Scenario: Ajuste de Crédito requires justification

- **GIVEN** the operator opens "Cargar movimiento manual" and selects `tipo: 'AJUSTE_CREDITO'`
- **WHEN** the operator submits without filling "Motivo"
- **THEN** the dialog blocks submission with an inline error on Motivo

## MODIFIED Requirements

### Requirement: Posición sub-tab MUST render the ecuación maestra per moneda and a hierarchical tree Sociedad → Cuenta

The Posición sub-tab SHALL render two surfaces:

**L2 KPI strip — 4 cards, one per dimensión de la ecuación maestra:**

| Card | Body |
|---|---|
| Bancos | Rows per moneda held by the group, value in moneda nativa |
| Obligaciones | Rows per moneda held by the group, value in moneda nativa |
| Pendientes | Rows per moneda held by the group, value in moneda nativa |
| Capacidad Operativa | Rows per moneda — value is the residual `Bancos − Obligaciones − Pendientes` per moneda |

Each card SHALL render every moneda where any of the four dimensions is non-zero. The card SHALL NOT collapse to a USD-equivalent or to any other consolidated figure. The 4 KPIs SHALL satisfy the ecuación maestra at every render.

**L3 Tree Sociedad → Cuenta:**

The tree SHALL render top-level nodes per Sociedad, with the active Cuentas of that Sociedad as children. Each node SHALL expose:

- For Sociedad: per-moneda totals (one chip per moneda held) reading the physical saldo of the cuentas of that sociedad. NO Propio / Cliente split.
- For Cuenta: a single saldo in moneda nativa.

Inactive Cuentas (`status === 'Inactiva'`) SHALL NOT appear in Posición.

The previous `saldo_propio` / `saldo_cliente` segmentation per cuenta is removed (see "Propio / Cliente segmentation removal" below in REMOVED). The omnibus model declares that the per-cuenta segmentation is malformed — the system does not answer the question "¿de qué cliente es la plata que está en esta cuenta?".

#### Scenario: KPI strip renders 4 cards with per-moneda rows

- **GIVEN** the group holds positions in ARS, USD, EUR, USDC, USDT, CAD
- **WHEN** the Posición L2 KPI strip renders
- **THEN** the strip has exactly 4 cards: Bancos, Obligaciones, Pendientes, Capacidad Operativa
- **AND** each card body shows one row per moneda
- **AND** every Capacidad Operativa row equals `Bancos.row − Obligaciones.row − Pendientes.row` for that moneda

#### Scenario: Tree exposes only physical saldo per cuenta

- **GIVEN** the mock data exposes 4 sociedades and 12 active cuentas
- **WHEN** the Posición tree expands a sociedad
- **THEN** each cuenta row shows: name, detail, saldo (moneda nativa), moneda
- **AND** NO Propio column is present
- **AND** NO Cliente column is present

#### Scenario: Inactive cuentas excluded

- **GIVEN** a Cuenta has `status: 'Inactiva'` in the catalogue
- **WHEN** the Posición sub-tab renders
- **THEN** that Cuenta is NOT in the tree
- **AND** the Sociedad node's per-moneda totals exclude that Cuenta's saldo

### Requirement: Cargar movimiento manual dialog MUST expose only FIN-registered tipos and support cross-sociedad pair generation

The dialog opened by the "Cargar movimiento manual" Main CTA SHALL expose, in its `tipo` select field, only the FIN-registered tipos of the matriz:

| Tipo | Categoría |
|---|---|
| `COMISION_BANCARIA` | C |
| `INTERES_BANCARIO` | C |
| `PAGO_PROVEEDOR` | C |
| `PAGO_SALARIOS` | C |
| `MOV_ENTRE_CUENTAS_PROPIAS` | C |
| `APORTE_CAPITAL` | C |
| `PRESTAMO_INTERCOMPANY` | D |
| `SWEEPING_CROSS_SOCIEDAD` | D |
| `AJUSTE_MANUAL` | E |

OPS-registered tipos (DEPOSIT / WITHDRAWAL / FEE / REBATE / SWAP_* / SPREAD / SOLICITUD_RETIRO_PENDING / DEPOSITO_PENDIENTE / ASIGNACION_PENDIENTE / AJUSTE_CREDITO / AJUSTE_DEBITO) SHALL NOT appear in the dialog. They are loaded through OPS, not through FIN.

The dialog SHALL be context-aware on the tipo:

- For `PRESTAMO_INTERCOMPANY` and `SWEEPING_CROSS_SOCIEDAD`: the dialog SHALL render two Sociedad fields (`sociedad_origen_id` and `sociedad_destino_id`), two Cuenta fields (one filtered by each sociedad), and a single Monto. On confirm, the engine SHALL generate two `Movimiento` records sharing `evento_id` (per the society-scoped asientos Requirement).
- For all other FIN-side tipos: the dialog renders a single Sociedad + single Cuenta.

The dialog SHALL validate required fields and apply the lookups cascade (Sociedad → Cuenta, Cliente → Cuenta Operativa where applicable) as before. The "Cliente" field SHALL be hidden when the chosen tipo is in categoría C/D/E.

#### Scenario: Tipo select exposes only the 9 FIN-side tipos

- **GIVEN** the operator opens "Cargar movimiento manual"
- **WHEN** the `tipo` select opens
- **THEN** the options listed are exactly: `COMISION_BANCARIA`, `INTERES_BANCARIO`, `PAGO_PROVEEDOR`, `PAGO_SALARIOS`, `MOV_ENTRE_CUENTAS_PROPIAS`, `APORTE_CAPITAL`, `PRESTAMO_INTERCOMPANY`, `SWEEPING_CROSS_SOCIEDAD`, `AJUSTE_MANUAL`
- **AND** no OPS-registered tipo appears

#### Scenario: Préstamo intercompany dialog renders two-sociedad fields

- **GIVEN** the operator selects `tipo: 'PRESTAMO_INTERCOMPANY'`
- **WHEN** the dialog re-renders for the chosen tipo
- **THEN** the dialog exposes `sociedad_origen_id`, `cuenta_origen_id`, `sociedad_destino_id`, `cuenta_destino_id`, `monto`, `moneda`, `fecha`, `motivo`
- **AND** the cuenta_origen and cuenta_destino lookups are filtered each by their sociedad

#### Scenario: Confirm of cross-sociedad generates two records sharing evento_id

- **GIVEN** the operator fills `sociedad_origen: 'hp'`, `cuenta_origen: 'cu-hp-bind-1'`, `sociedad_destino: 'asc'`, `cuenta_destino: 'cu-asc-bridge-1'`, `monto: 500_000`, `moneda: 'USD'`
- **WHEN** the operator confirms
- **THEN** two `Movimiento` records are created, each with its own `id`, `asiento_id`, and `sociedad_id`
- **AND** both records share the same `evento_id`
- **AND** both records share `tipo: 'PRESTAMO_INTERCOMPANY'`

#### Scenario: Cliente field hidden for categoría C tipos

- **GIVEN** the operator selects `tipo: 'COMISION_BANCARIA'` (categoría C)
- **WHEN** the dialog re-renders
- **THEN** no `cliente_id` field is present in the dialog
- **AND** no `cuenta_operativa_cliente_id` field is present
- **AND** the dialog accepts only Sociedad + Cuenta + amount + Motivo

### Requirement: Movimientos sub-tab MUST list the global ledger with three views and 7 reconfigurable axes including Categoría

The Movimientos sub-tab SHALL render the global ledger of FIN, including movements registered by either app (`origen ∈ {'OPS', 'FIN'}` — `'TRD'` no aplica al ledger de Disponibilidades, and the legacy `'Manual'` collapses into `'FIN'`). The view SHALL NOT apply any filter by origin at mount; the operator MAY filter via the L3 toolbar. The L2 KPI strip SHALL expose:

| KPI | Body |
|---|---|
| Movimientos del día | Count |
| Volumen ingresado | Per-moneda rows (no USD-equivalent in V1) |
| Volumen egresado | Per-moneda rows (no USD-equivalent in V1) |
| Pendientes de imputación | Count |
| Pendientes de supervisión | Count |
| Pendientes de asignación | Count of `DEPOSITO_PENDIENTE` records without their matching `ASIGNACION_PENDIENTE` |

The sub-tab SHALL expose three views via `<ViewToggle>`: **Lista** (default), **Tarjetas**, **Tablero**. The Tablero view SHALL be state-driven by an axis selector that allows switching between **seven** axes:

| Axis | Values |
| --- | --- |
| Estado operativo (default) | Pending / Processing / Completed / Failed |
| Estado de imputación Lado Ardua | Sin asignar / Asignado |
| Estado de imputación Lado Cliente | Sin asignar / Asignado / No aplica |
| Estado de supervisión | Pendiente de supervisión / Confirmado / Rechazado (no_aplica hidden) |
| Tipo de movimiento | One column per tipo of the matriz (21 columns) |
| Sociedad | One column per active Sociedad |
| **Categoría** | A / B / C / D / E / F |

The `Categoría` axis SHALL be the default lens for predicate evaluation (replacing the `origen`-based discrimination of the previous Requirement). The `origen` field SHALL remain visible as a column / badge in Lista and Tarjetas views but SHALL NOT be the primary categorisation.

#### Scenario: Categoría axis renders 6 columns

- **GIVEN** the Movimientos sub-tab is in Tablero view
- **WHEN** the operator selects axis `Categoría`
- **THEN** the Tablero renders 6 columns: A, B, C, D, E, F in that fixed order
- **AND** each card lands in the column matching `categoriaOf(card.tipo)`

#### Scenario: Lista view exposes 21 distinct tipos

- **GIVEN** the mock data covers every tipo of the matriz
- **WHEN** the Lista view renders
- **THEN** at least one row exists per tipo across the data set
- **AND** the Tipo column displays the tipo string (uppercase snake case)

#### Scenario: KPI strip volumes are per-moneda

- **GIVEN** the day's movements include ingresos in ARS, USD, and USDC
- **WHEN** the "Volumen ingresado" KPI renders
- **THEN** the card body shows three rows, one per moneda, each with the moneda nativa total
- **AND** NO USD-equivalent consolidated figure is shown

### Requirement: Movimientos MUST expose six contextual row-level actions gated by categoría (not by origen)

Each row of the Movimientos table SHALL expose a `⋯` kebab menu via `<ManifestActionsMenu :manifest-key="fin.disponibilidades.movimientos">` with up to six actions, each gated by its `enable_when` predicate. The predicate base SHALL switch from `origen` to `categoría`:

| Action | Capability | `show_when` | `enable_when` |
|---|---|---|---|
| Asignar Banco y Cuenta | `imputar_ardua` | `categoría ∈ {C, D, E}` (FIN-imputed) | `fin.cuenta_id === null` |
| Editar Banco y Cuenta | `imputar_ardua` | idem | `fin.cuenta_id !== null` |
| Asignar Cliente | `imputar_cliente` | `categoría ∈ {A, B, F}` (cliente applies) | `fin.cliente_id === null` |
| Editar Cliente | `imputar_cliente` | idem | `fin.cliente_id !== null` |
| Confirmar carga manual | `supervisar_carga` | always (manuales) | `requires_supervision === true` AND `supervised_by === null` AND `created_by !== current_user` |
| Rechazar carga manual | `supervisar_carga` | always (manuales) | idem |

For movimientos en categoría A (DEPOSIT, WITHDRAWAL) and B (FEE, REBATE, SWAP cliente, AJUSTE_*) the imputación de Banco y Cuenta is realised by OPS, not by FIN — the action SHALL show but stay disabled with `disable_reason: 'Imputado desde OPS'` and `disable_tag: 'Solo OPS'`. For categoría F (DEPOSITO_PENDIENTE) the Asignar Cliente action SHALL be the path to register the matching ASIGNACION_PENDIENTE.

The `created_by !== current_user` predicate is enforced at the page level (the actions menu hides the entry when the current user is the creator); the manifest's `enable_when` only checks the gating conditions the engine can express today.

#### Scenario: Asignar Banco y Cuenta shown but disabled for categoría A

- **GIVEN** a movimiento has `tipo: 'DEPOSIT'` (categoría A) and `fin.cuenta_id !== null` (OPS already imputed)
- **WHEN** the operator opens the kebab menu
- **THEN** "Editar Banco y Cuenta" is present but disabled
- **AND** the disabled tag reads "Solo OPS"
- **AND** the disable_reason tooltip reads "Imputado desde OPS"

#### Scenario: Asignar Banco y Cuenta enabled for categoría C

- **GIVEN** a movimiento has `tipo: 'COMISION_BANCARIA'` (categoría C) and `fin.cuenta_id === null`
- **WHEN** the operator opens the kebab menu
- **THEN** "Asignar Banco y Cuenta" is enabled
- **AND** clicking it opens the dialog

#### Scenario: Asignar Cliente hidden for categoría C/D/E

- **GIVEN** a movimiento has `tipo: 'INTERES_BANCARIO'` (categoría C)
- **WHEN** the operator opens the kebab menu
- **THEN** neither "Asignar Cliente" nor "Editar Cliente" is present (predicate `categoría ∈ {A, B, F}` fails)

#### Scenario: Confirmar carga manual hidden for the creator (unchanged)

- **GIVEN** a movimiento was created by user `U1` with `requires_supervision: true, supervised_by: null`
- **WHEN** user `U1` opens the kebab menu of that movement
- **THEN** the "Confirmar carga manual" entry is NOT present

### Requirement: Carga manual dialog MUST validate required fields and route to direct-or-supervised flow per creator capability

The "Cargar movimiento manual" CTA SHALL open a dialog that validates required fields depending on the chosen tipo. The field set SHALL be:

| Field | Required when |
|---|---|
| `tipo` | Always |
| `sociedad_id` | Always for single-sociedad tipos |
| `cuenta_id` | Always for single-sociedad tipos |
| `sociedad_origen_id` | Tipo ∈ {PRESTAMO_INTERCOMPANY, SWEEPING_CROSS_SOCIEDAD} |
| `cuenta_origen_id` | idem |
| `sociedad_destino_id` | idem |
| `cuenta_destino_id` | idem |
| `fecha` | Always |
| `monto` | Always |
| `moneda` | Always |
| `cliente_id` | NEVER for FIN-side tipos (all are categoría C/D/E) |
| `motivo` | Always (text ≥ 10 chars) |
| `referencia` | Optional |

On confirm:

- If the creator holds `fin.disponibilidades.movimientos.cargar_directo`, the movement SHALL be persisted with `requires_supervision: false`, impact saldos immediately, and the Posición sub-tab SHALL include its amount on next render.
- If the creator holds `fin.disponibilidades.movimientos.cargar_con_supervision`, the movement SHALL be persisted with `requires_supervision: true`, displayed with the "Pendiente de supervisión" badge in the Movimientos sub-tab, and SHALL NOT impact saldos until confirmed.
- For cross-sociedad tipos (PRESTAMO_INTERCOMPANY, SWEEPING_CROSS_SOCIEDAD), the engine SHALL create two `Movimiento` records sharing `evento_id` (per the society-scoped asientos Requirement). Both halves SHALL inherit `requires_supervision` from the same capability check on the creator — they are confirmed or rejected as a pair.

#### Scenario: Required-field validation blocks submission

- **GIVEN** the operator leaves "Motivo" empty
- **WHEN** the operator clicks "Cargar movimiento"
- **THEN** the dialog displays an inline error under "Motivo" reading "Motivo es obligatorio (≥ 10 caracteres)"
- **AND** the submit button is disabled

#### Scenario: Direct flow with cargar_directo

- **GIVEN** the operator holds `cargar_directo` (NOT `cargar_con_supervision`)
- **WHEN** the operator fills all required fields and confirms with a single-sociedad tipo (e.g. `COMISION_BANCARIA`)
- **THEN** one movement is persisted with `requires_supervision: false`
- **AND** the Posición sub-tab includes its amount on the next render

#### Scenario: Supervised flow with cargar_con_supervision

- **GIVEN** the operator holds `cargar_con_supervision`
- **WHEN** the operator fills the cross-sociedad fields and confirms a `PRESTAMO_INTERCOMPANY`
- **THEN** two records are persisted, both with `requires_supervision: true, supervised_by: null, supervised_at: null, estado_de_supervision: 'pendiente_de_supervision'`
- **AND** both records share the same `evento_id`
- **AND** the Movimientos sub-tab displays both rows with a "Pendiente de supervisión" badge
- **AND** the Posición sub-tab does NOT include their amounts

## REMOVED Requirements

### Requirement: Movimientos MUST allow imputing Lado Cliente to a Cuenta de Cliente de Ardua for nostros and manual non-operative movements

**Reason:** The omnibus model declares that for movimientos sin cliente externo (categorías C, D, E), the contrapartida económica is a **formal cuenta contable** (Ingresos / Egresos / Patrimonio operativo / Intercompany / Puente FX), not a synthetic placeholder cliente. The `AS00000` "Cuenta de Cliente de Ardua" device was an implementation workaround that contradicts the conceptual model. With the new categoría system, the `Asignar Cliente` action is hidden via `show_when` for categorías C/D/E — there is no "imputable" Lado Cliente to fill on those records.

**Migration:**
- Mocks that previously imputed `cliente_id: 'AS00000'` on movimientos manuales no operativos SHALL be rewritten with `cliente_id: null`. The categoría of those records (derived from tipo) ensures the "Asignar Cliente" action does not surface, so `null` is the correct, final state.
- The `clp.clientes` catalog resolver SHALL stop including the synthetic `AS00000` entry in its results.
- Any spec scenario that exercises the AS00000 search flow is removed (this Requirement and its 2 scenarios).
- Capability `fin.disponibilidades.movimientos.imputar_cliente` retains its semantics — it gates the action; the action is just no longer surfaced for C/D/E records.
