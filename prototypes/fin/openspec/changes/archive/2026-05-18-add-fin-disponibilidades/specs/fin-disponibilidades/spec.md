## ADDED Requirements

### Requirement: Disponibilidades MUST be a Type B page with three sub-tabs in fixed order

The Disponibilidades page SHALL be implemented as a Type B page (per `core-module-types`) with exactly three sub-tabs rendered via `<Segmenter>`, in the fixed order **Posición / Bancos-Cuentas / Movimientos**. The page SHALL be accessible at the route path `/disponibilidades` and the Sidebar entry "Disponibilidades" under the "Tesorería" block SHALL navigate to it. Default active sub-tab at module load SHALL be **Posición**.

#### Scenario: Page mounts with three sub-tabs in canonical order

- **GIVEN** the operator navigates to `/disponibilidades`
- **WHEN** the Disponibilidades page mounts
- **THEN** the `<Segmenter>` exposes three options in the order `[Posición, Bancos-Cuentas, Movimientos]`
- **AND** the option `Posición` is the active sub-tab
- **AND** the page header reads "Disponibilidades"

#### Scenario: Sidebar entry under Tesorería block links to /disponibilidades

- **GIVEN** the Sidebar is rendered
- **WHEN** the operator inspects the "Tesorería" block
- **THEN** the entry labelled "Disponibilidades" with the `Wallet` icon has `to = '/disponibilidades'`
- **AND** clicking it navigates to the Disponibilidades page with active sub-tab `Posición`

#### Scenario: URL-driven sub-tab activation

- **GIVEN** the operator navigates to `/disponibilidades?tab=movimientos`
- **WHEN** the page mounts
- **THEN** the active sub-tab is `Movimientos`
- **AND** the `Posición` and `Bancos-Cuentas` sub-tabs are inactive
- **AND** the Main CTA reflects the Movimientos context (per the Main CTA contextual Requirement below)

### Requirement: Main CTA in the page header MUST be contextual per active sub-tab

The Main CTA rendered in the L1 header SHALL change based on the active sub-tab. Three contextual CTAs SHALL be declared via `module_ctas[]` on the three sub-tabs' manifests, each guarded by `show_when` against the active sub-tab. The configuration MUST be:

| Sub-tab active | Main CTA label | Capability required |
| --- | --- | --- |
| Posición | "Cargar movimiento manual" | `fin.disponibilidades.movimientos.cargar_directo` OR `fin.disponibilidades.movimientos.cargar_con_supervision` |
| Bancos / Cuentas | "Crear nueva Cuenta" | `fin.disponibilidades.bancos_cuentas.crear` |
| Movimientos | "Cargar movimiento manual" | Same as Posición |

The "Cargar movimiento manual" CTA SHALL open the carga manual dialog (per the carga manual Requirement below). The "Crear nueva Cuenta" CTA SHALL open the catalogue creation dialog with the FIN lens.

#### Scenario: Main CTA on Posición

- **GIVEN** the operator is on Disponibilidades with active sub-tab `Posición`
- **WHEN** the page header renders
- **THEN** the Main CTA label is "Cargar movimiento manual"
- **AND** clicking it opens the carga manual dialog

#### Scenario: Main CTA switches when sub-tab changes

- **GIVEN** the operator is on `Posición` with Main CTA "Cargar movimiento manual"
- **WHEN** the operator clicks the `Bancos-Cuentas` sub-tab
- **THEN** the active sub-tab becomes `Bancos-Cuentas`
- **AND** the Main CTA label updates to "Crear nueva Cuenta"

#### Scenario: Main CTA on Movimientos matches Posición

- **GIVEN** the operator switches from `Bancos-Cuentas` to `Movimientos`
- **WHEN** the page re-renders
- **THEN** the Main CTA label reverts to "Cargar movimiento manual"
- **AND** clicking it opens the same carga manual dialog as on Posición

#### Scenario: Main CTA is hidden when the operator lacks the required capability

- **GIVEN** the operator lacks `bancos_cuentas.crear`
- **WHEN** the active sub-tab is `Bancos-Cuentas`
- **THEN** the "Crear nueva Cuenta" CTA is NOT rendered in the L1 header
- **AND** no other CTA fills its place

### Requirement: Posición sub-tab MUST render a hierarchical tree Sociedad → Cuenta with consolidated saldos

The Posición sub-tab SHALL render a tree where each top-level node is a Sociedad and its children are the active Cuentas of that Sociedad. Each node (both Sociedad and Cuenta) SHALL expose:

- Total saldo aggregated (with USD-equivalent conversion).
- Saldo Propio.
- Saldo Cliente.
- A visual Propio/Cliente distribution.

The aggregation SHALL respect the Propio/Cliente segmentation as an attribute of saldo per physical Cuenta (the per-client granularity lives upstream in the Cuentas Operativas del Cliente model of REQ-42). Inactive Cuentas (`status === 'Inactiva'`) SHALL NOT appear in Posición.

The L2 KPI strip on the Posición sub-tab SHALL expose: Posición consolidada (USD equivalent), Total Propio, Total Cliente, Sociedades activas count, Cuentas activas count.

#### Scenario: Tree renders with Sociedad nodes and Cuenta children

- **GIVEN** the mock data exposes 4 sociedades and 8 active cuentas distributed across them
- **WHEN** the Posición sub-tab renders
- **THEN** the tree has 4 top-level nodes (one per Sociedad)
- **AND** clicking a Sociedad expands it to reveal its Cuenta children

#### Scenario: Inactive cuentas are excluded

- **GIVEN** a Cuenta has `status: 'Inactiva'` in the catalogue
- **WHEN** the Posición sub-tab renders
- **THEN** that Cuenta is NOT in the tree
- **AND** the Sociedad node's total saldo excludes that Cuenta's saldo

#### Scenario: KPIs reflect aggregated balances

- **GIVEN** the consolidated Propio across all sociedades is `1_234_000 USD`-equivalent and Cliente is `876_000 USD`-equivalent
- **WHEN** the L2 KPI strip renders
- **THEN** the cards display: Posición consolidada `2_110_000 USD`, Total Propio `1_234_000 USD`, Total Cliente `876_000 USD`, Sociedades activas, Cuentas activas

### Requirement: Posición MUST exclude movements pending supervision from saldo aggregation

A movement whose `requires_supervision === true` AND `supervised_at === null` SHALL NOT contribute to the saldo of any Cuenta in Posición. The rule applies regardless of the movement's operational state.

Once the movement is confirmed (`supervised_at !== null`), its amount SHALL be included in the next render of Posición without requiring a page reload.

#### Scenario: Pending supervision excluded

- **GIVEN** Cuenta `C1` has 5 confirmed deposits totalling 100 USD and 1 movement with `requires_supervision: true, supervised_at: null` of 50 USD
- **WHEN** the Posición sub-tab renders the row for `C1`
- **THEN** the displayed saldo for `C1` is `100 USD`, NOT `150 USD`

#### Scenario: Confirmed manual load is included

- **GIVEN** the same Cuenta `C1` and the supervisor confirms the pending 50 USD movement
- **WHEN** the page re-renders
- **THEN** the displayed saldo for `C1` is now `150 USD`

#### Scenario: Rejected manual load is excluded permanently

- **GIVEN** the supervisor rejects the pending 50 USD movement (state `rechazado`)
- **WHEN** the Posición sub-tab re-renders
- **THEN** the saldo for `C1` remains `100 USD`
- **AND** the rejected movement does NOT contribute to any future render

### Requirement: Posición MUST support drill-down to Movimientos with cuenta_id filter

Clicking a Cuenta node in the Posición tree SHALL navigate to the Movimientos sub-tab with the `cuenta_id` filter pre-applied to that Cuenta's id and the period filter set to "todo el período". The navigation SHALL happen via `route.query` change (NOT a full route change), so the keyed `<RouterView>` (per `core-layout`) does NOT remount Disponibilidades.

The Movimientos sub-tab SHALL render only the movements whose Lado Ardua resolves to that `cuenta_id`. The operator MAY clear the filter via the Movimientos sub-tab's filter row.

#### Scenario: Click on Cuenta navigates to Movimientos with filter

- **GIVEN** Cuenta `C1` is visible in the Posición tree of Sociedad `S1`
- **WHEN** the operator clicks the row for `C1`
- **THEN** the active sub-tab becomes `Movimientos`
- **AND** `route.query.tab === 'movimientos'` and `route.query.cuenta_id === '<C1.id>'`
- **AND** the Movimientos table renders only the movements whose `fin.cuenta_id === '<C1.id>'`

#### Scenario: Drill-down preserves the parent page

- **GIVEN** the operator drills down from Posición to Movimientos
- **WHEN** the `route.query` updates
- **THEN** `route.name` remains `'disponibilidades'`
- **AND** per the keyed RouterView Requirement of `core-layout`, the Disponibilidades component is NOT remounted

#### Scenario: Clearing the drill-down filter restores the full ledger view

- **GIVEN** the operator drilled down to `cuenta_id = '<C1.id>'`
- **WHEN** the operator clears the `cuenta_id` filter in the Movimientos filter row
- **THEN** `route.query.cuenta_id` is removed
- **AND** the Movimientos table renders the full ledger

### Requirement: Bancos / Cuentas sub-tab MUST list the catalogue with FIN-specific columns and filters

The Bancos / Cuentas sub-tab SHALL list the same catalogue of cuentas as REQ-42 §8.1, with the columns inherited from REQ-42 plus one FIN-specific column **Cuenta contable**. The Cuenta contable column SHALL render either the configured accounting metadata or a "Sin configurar" badge in the warning / ámbar tone.

The sub-tab SHALL expose the filters inherited from REQ-42 (Sociedad, Tipo de estructura, Tipo de cuenta, Moneda, Estado) plus one FIN-specific filter **Configuración contable** with two values (`Configurada` / `Sin configurar`).

The L2 KPI strip SHALL expose: Estructuras totales, Cuentas totales activas, Cuentas con configuración contable, Cuentas sin configuración contable.

#### Scenario: Columns include REQ-42 inheritance plus Cuenta contable

- **GIVEN** the operator is on the Bancos-Cuentas sub-tab
- **WHEN** the table renders the catalogue
- **THEN** the columns include Sociedad, Banco/Estructura, Tipo, Tipo de cuenta, Moneda, Nro./Address, Cuenta padre, Estado, AND Cuenta contable

#### Scenario: Sin configurar badge renders in warning tone

- **GIVEN** a Cuenta `C2` has no accounting metadata configured
- **WHEN** the table row for `C2` renders
- **THEN** the Cuenta contable cell displays a "Sin configurar" badge in the `bg-warning-bg text-warning` tone (or equivalent token)

#### Scenario: Configuración contable filter works

- **GIVEN** the operator opens the "Configuración contable" filter and selects `Sin configurar`
- **WHEN** the filter is applied
- **THEN** the table shows only cuentas where the Cuenta contable metadata is empty
- **AND** the active-filter count above the table reflects the applied filter

### Requirement: Bancos / Cuentas MUST expose Configurar cuenta contable action per row

Each row of the Bancos / Cuentas table SHALL expose a `⋯` kebab menu via `<ManifestActionsMenu :manifest-key="fin.disponibilidades.bancos_cuentas">`. The menu SHALL contain the action **Configurar cuenta contable**, gated by capability `fin.disponibilidades.bancos_cuentas.configurar_contable`.

The action's dialog SHALL include a single field "Etiqueta o metadata contable" (text input, optional) with a hint indicating that the value will be validated against the plan de cuentas operativo when it exists. On confirm, the metadata SHALL be persisted on the cuenta record without validation in v1.

#### Scenario: Action is visible when capability is granted

- **GIVEN** the operator holds `fin.disponibilidades.bancos_cuentas.configurar_contable`
- **WHEN** the operator opens the kebab menu of any row
- **THEN** the entry "Configurar cuenta contable" is enabled

#### Scenario: Action is hidden when capability is missing

- **GIVEN** the operator does NOT hold the capability and does not hold `'*'`
- **WHEN** the kebab menu is opened
- **THEN** the "Configurar cuenta contable" entry is NOT present

#### Scenario: Confirm persists the metadata

- **GIVEN** the operator opens the dialog and enters "Banco Local · Pesos · Cta. Corriente Esc. 1"
- **WHEN** the operator confirms
- **THEN** the cuenta record's `cuenta_contable` field is set to that string
- **AND** the row's Cuenta contable cell re-renders with the configured value (no longer "Sin configurar")
- **AND** a toast confirms "Configuración contable guardada"

### Requirement: Bancos / Cuentas MUST expose Crear nueva Cuenta as the Main CTA

When the Bancos / Cuentas sub-tab is active, the Main CTA in the L1 header SHALL be "Crear nueva Cuenta", gated by capability `fin.disponibilidades.bancos_cuentas.crear`. The CTA SHALL open the catalogue creation dialog with the FIN lens (exposes the REQ-42 §8.1 fields plus an optional Cuenta contable field).

The dialog SHALL be independent of any future OPS catalogue creation dialog (Decision 2). The FIN dialog persists into a fin-local catalogue mock in v1; backend integration is a follow-up.

#### Scenario: CTA is rendered with capability

- **GIVEN** the operator holds `bancos_cuentas.crear` (or `'*'`)
- **AND** the active sub-tab is `Bancos-Cuentas`
- **WHEN** the L1 header renders
- **THEN** the Main CTA "Crear nueva Cuenta" is visible

#### Scenario: Dialog opens with REQ-42 fields

- **GIVEN** the operator clicks "Crear nueva Cuenta"
- **WHEN** the dialog opens
- **THEN** the form exposes Sociedad, Banco/Estructura, Tipo de estructura, Tipo de cuenta, Moneda, Nro./Address, Cuenta padre, Estado, AND an optional Cuenta contable field

#### Scenario: Confirm creates the cuenta in the FIN catalogue

- **GIVEN** the operator fills in all required fields
- **WHEN** the operator confirms
- **THEN** the new cuenta appears in the Bancos-Cuentas table on next render
- **AND** the Posición tree includes the new cuenta if it is active and its sociedad has activity

### Requirement: Movimientos sub-tab MUST list the global ledger with three views and reconfigurable axes

The Movimientos sub-tab SHALL render the global ledger of FIN, including movements originating from OPS, TRD, and Manual sources, with no filter pre-applied by origin. The L2 KPI strip SHALL expose: Movimientos del día, Volumen ingresado (USD eq.), Volumen egresado (USD eq.), Pendientes de imputación, Pendientes de supervisión.

The sub-tab SHALL expose three views via `<ViewToggle>`: **Lista** (default), **Tarjetas**, **Tablero**. The Tablero view SHALL be state-driven by an axis selector that allows switching between six axes:

| Axis | Values |
| --- | --- |
| Estado operativo (default) | Pending / Processing / Completed |
| Estado de imputación Lado Ardua | Sin asignar / Asignado |
| Estado de imputación Lado Cliente | Sin asignar / Asignado |
| Estado de supervisión | Pendiente de supervisión / Confirmado / Rechazado (no_aplica hidden) |
| Tipo de movimiento | DEPOSIT / WITHDRAWAL / FEE / SWAP_OUT / ... |
| Sociedad | One column per active Sociedad |

#### Scenario: Three views via ViewToggle

- **GIVEN** the Movimientos sub-tab is active
- **WHEN** the L1 header renders
- **THEN** the `<ViewToggle>` exposes three options: Lista (default), Tarjetas, Tablero

#### Scenario: Axis switcher on Tablero

- **GIVEN** the operator selects the Tablero view
- **WHEN** the Tablero renders
- **THEN** the axis selector exposes six axes with `Estado operativo` selected by default

#### Scenario: Columns reflect the active axis

- **GIVEN** the active axis is `Estado de imputación Lado Cliente`
- **WHEN** the Tablero renders
- **THEN** the columns are `Sin asignar` and `Asignado`
- **AND** each card lands in the column matching its `lado_cliente_asignado` boolean

### Requirement: Movimientos drag-drop on the Tablero MUST invoke the manifest action for the transition, with ClosureModal on terminal states

When the operator drags a movement card between columns of the Tablero, the manifest engine SHALL resolve the corresponding action declared in `fin.disponibilidades.movimientos.actions.ts` for the (axis, target_state) tuple. If the action's `transition` declares a terminal state (e.g. `rechazado`), `<ClosureModal>` SHALL open with a justification text field (required, minimum 10 characters).

If no action matches the (axis, target_state) tuple, the drop SHALL be rejected with a toast "Transición no permitida" and the card SHALL return to its origin column.

#### Scenario: Drop on a non-terminal state invokes the action without ClosureModal

- **GIVEN** the active axis is `Estado de imputación Lado Ardua`
- **WHEN** the operator drags a movement card from `Sin asignar` to `Asignado`
- **THEN** the action "Asignar Banco y Cuenta" is invoked
- **AND** its dialog opens with the cascading Sociedad / Banco-Estructura / Cuenta selectors
- **AND** ClosureModal does NOT open

#### Scenario: Drop on a terminal state opens ClosureModal

- **GIVEN** the active axis is `Estado de supervisión`
- **WHEN** the operator drags a movement card to `Rechazado`
- **THEN** ClosureModal opens with the title "Rechazar carga manual"
- **AND** the justification text input is required
- **AND** the operator cannot confirm until the input has ≥ 10 chars

#### Scenario: Drop on an unsupported transition is rejected

- **GIVEN** the active axis is `Estado operativo`
- **AND** a movement is in `Completed`
- **WHEN** the operator drags it to `Pending`
- **THEN** the drop is rejected (no backwards transitions on operational state)
- **AND** a toast displays "Transición no permitida"
- **AND** the card returns to the `Completed` column

### Requirement: Movimientos MUST expose six contextual row-level actions per REQ-50 §5.7

Each row of the Movimientos table SHALL expose a `⋯` kebab menu via `<ManifestActionsMenu :manifest-key="fin.disponibilidades.movimientos">` with up to six actions, each gated by its `enable_when` predicate:

| Action | Capability | `enable_when` |
| --- | --- | --- |
| Asignar Banco y Cuenta | `imputar_ardua` | `lado_ardua_asignado === false` AND (movimiento es nostro OR manual no operativo) |
| Editar Banco y Cuenta | `imputar_ardua` | `lado_ardua_asignado === true` AND idem |
| Asignar Cliente | `imputar_cliente` | `lado_cliente_asignado === false` AND idem |
| Editar Cliente | `imputar_cliente` | `lado_cliente_asignado === true` AND idem |
| Confirmar carga manual | `supervisar_carga` | `requires_supervision === true` AND `supervised_by === null` AND `created_by !== current_user` |
| Rechazar carga manual | `supervisar_carga` | Idem `Confirmar carga manual` |

The 4 dropped legacy actions (Asignar Proveedor, Asignar Partner, Asignar Banco/Exchange for TAX, Imputar a Cuenta Contable V2, Marcar Intercompany, Marcar con Diferencias, Marcar Conciliado) of the pre-REQ-50 `fin.movimientos.actions.ts` SHALL NOT appear in the new manifest (per Decision 4 of design.md).

#### Scenario: Imputación actions are disabled on vostro movements

- **GIVEN** a movement has `origen: 'OPS'` AND `tipo: 'DEPOSIT'` (a vostro)
- **WHEN** the operator opens the kebab menu
- **THEN** the actions "Asignar Banco y Cuenta" and "Asignar Cliente" appear disabled
- **AND** their disable_reason reads "Imputado desde OPS"

#### Scenario: Confirmar carga manual is hidden for the creator

- **GIVEN** a movement was created by user `U1` with `requires_supervision: true, supervised_by: null`
- **WHEN** user `U1` opens the kebab menu of that movement
- **THEN** the "Confirmar carga manual" entry is NOT present (predicate `created_by !== current_user` fails)

#### Scenario: Confirmar carga manual is enabled for a different user with capability

- **GIVEN** the same movement and user `U2` (≠ `U1`) holds `supervisar_carga`
- **WHEN** user `U2` opens the kebab menu
- **THEN** "Confirmar carga manual" is enabled
- **AND** clicking it confirms the movement (sets `supervised_by: U2`, `supervised_at: <now>`, `estado_de_supervision: 'confirmado'`)
- **AND** the Posición sub-tab includes the movement's amount in subsequent saldo aggregations

### Requirement: Movimientos MUST allow imputing Lado Cliente to a Cuenta de Cliente de Ardua for nostros and manual non-operative movements

When the operator imputes the Lado Cliente of a nostro or manual non-operative movement, the typeahead "Cliente" SHALL include the special "Cuenta de Cliente de Ardua" record (e.g. `AS00000`) in the search results. Selecting it SHALL allow the operator to maintain symmetric bidirectional imputation even when no external client is involved.

The Cuenta de Cliente de Ardua SHALL be marked visually in the search results as a synthetic record (a badge or tag indicating it is internal).

#### Scenario: AS00000 is searchable

- **GIVEN** the operator opens "Asignar Cliente" on a manual `FEE` movement
- **WHEN** the operator types `AS` in the typeahead
- **THEN** the result list includes the synthetic client `AS00000` with a "Cuenta interna" badge
- **AND** standard client results matching `AS` also appear

#### Scenario: Imputing to AS00000 closes Lado Cliente

- **GIVEN** the operator selects `AS00000` and a compatible Cuenta Operativa
- **WHEN** the operator confirms
- **THEN** `lado_cliente_asignado === true`
- **AND** the row's Cliente column displays "Cuenta de Cliente de Ardua"

### Requirement: Carga manual dialog MUST validate required fields and route to direct-or-supervised flow per creator capability

The "Cargar movimiento manual" CTA SHALL open a dialog that validates required fields: Sociedad, Banco / Estructura (filtered by Sociedad), Cuenta (filtered by Banco/Estructura and compatible moneda), Tipo de movimiento, Fecha, Monto, Moneda (filtered by the selected Cuenta), Motivo (text ≥ 10 characters). Lado Cliente is optional at creation; Cuenta destino is required only for `TRANSFER_OUT/IN` and `SWAP_OUT/IN` types.

On confirm:

- If the creator holds `fin.disponibilidades.movimientos.cargar_directo`, the movement SHALL be persisted with `requires_supervision: false`, impact saldos immediately, and the Posición sub-tab SHALL include its amount on next render.
- If the creator holds `fin.disponibilidades.movimientos.cargar_con_supervision`, the movement SHALL be persisted with `requires_supervision: true`, displayed with the "Pendiente de supervisión" badge in the Movimientos sub-tab, and SHALL NOT impact saldos until confirmed (per the Posición exclusion Requirement).

#### Scenario: Required-field validation blocks submission

- **GIVEN** the operator leaves "Motivo" empty
- **WHEN** the operator clicks "Enviar"
- **THEN** the dialog displays an inline error under "Motivo" reading "Motivo es obligatorio (≥ 10 caracteres)"
- **AND** the submit button is disabled

#### Scenario: Direct flow with cargar_directo

- **GIVEN** the operator holds `cargar_directo` (NOT `cargar_con_supervision`)
- **WHEN** the operator fills all required fields and confirms
- **THEN** the movement is persisted with `requires_supervision: false`
- **AND** the Posición sub-tab includes its amount on the next render
- **AND** a success toast confirms "Movimiento cargado"

#### Scenario: Supervised flow with cargar_con_supervision

- **GIVEN** the operator holds `cargar_con_supervision` (NOT `cargar_directo`)
- **WHEN** the operator fills all required fields and confirms
- **THEN** the movement is persisted with `requires_supervision: true, supervised_by: null, supervised_at: null, estado_de_supervision: 'pendiente_de_supervision'`
- **AND** the Movimientos sub-tab displays the row with a "Pendiente de supervisión" badge
- **AND** the Posición sub-tab does NOT include its amount

#### Scenario: Inline backend errors map to specific fields

- **GIVEN** the operator submits the dialog
- **AND** the (mocked) backend returns `errors: [{ field: 'sociedad_id', message: 'Sociedad inactiva' }]`
- **WHEN** the dialog receives the response
- **THEN** the inline error under "Sociedad" reads "Sociedad inactiva"
- **AND** NO toast list of errors is shown

### Requirement: Rechazar carga manual MUST require a justification closure ≥ 10 characters and the rejected movement MUST never impact saldos

When the operator invokes "Rechazar carga manual" on a movement in `pendiente_de_supervision`, `<ClosureModal>` SHALL open with a required justification text field. The operator MUST NOT be able to confirm with fewer than 10 characters in the justification.

On confirm:

- The movement's `estado_de_supervision` becomes `'rechazado'`.
- The justification is persisted as an audit log entry.
- The movement remains visible in the Movimientos sub-tab with a "Rechazado" badge.
- The movement's amount NEVER contributes to any Posición saldo in any future render.

#### Scenario: Justification < 10 chars blocks confirmation

- **GIVEN** the operator opens the Rechazar ClosureModal
- **AND** types "Mal" (3 chars)
- **WHEN** inspect the confirm button
- **THEN** the confirm button is disabled
- **AND** an inline hint reads "Justificación obligatoria (≥ 10 caracteres)"

#### Scenario: Rejected movement does not impact Posición

- **GIVEN** a movement in `pendiente_de_supervision` with amount 1_000 USD on Cuenta `C1`
- **WHEN** the supervisor rejects it with a 50-char justification
- **THEN** the movement state is `rechazado`
- **AND** `C1`'s saldo in Posición remains unchanged on next render

### Requirement: The eight capabilities of fin-disponibilidades MUST be declared and evaluated by the manifest engine

The following eight capability strings SHALL be declared in the dev seed (`plugins/auth0.ts` DEV_FALLBACK_CAPABILITIES) and evaluated by `useCapabilities` per the wildcard rule (`'*'` grants all):

| Capability | Permits |
| --- | --- |
| `fin.disponibilidades.ver` | Access the Disponibilidades module |
| `fin.disponibilidades.bancos_cuentas.crear` | "Crear nueva Cuenta" Main CTA on Bancos / Cuentas |
| `fin.disponibilidades.bancos_cuentas.configurar_contable` | "Configurar cuenta contable" row-level action |
| `fin.disponibilidades.movimientos.imputar_ardua` | "Asignar / Editar Banco y Cuenta" actions |
| `fin.disponibilidades.movimientos.imputar_cliente` | "Asignar / Editar Cliente" actions |
| `fin.disponibilidades.movimientos.cargar_directo` | Create manual movements with `requires_supervision: false` |
| `fin.disponibilidades.movimientos.cargar_con_supervision` | Create manual movements with `requires_supervision: true` |
| `fin.disponibilidades.movimientos.supervisar_carga` | "Confirmar / Rechazar carga manual" actions |

The manifest engine SHALL gate visibility (`show_when`) and enablement (`enable_when`) of every CTA and per-row action against these capability strings.

#### Scenario: Wildcard grants all eight in dev

- **GIVEN** the dev seed grants the operator the `'*'` capability
- **WHEN** any predicate of the form `can('fin.disponibilidades.*')` is evaluated
- **THEN** every gated CTA and action is visible and enabled

#### Scenario: Lacking imputar_ardua disables Asignar Banco y Cuenta

- **GIVEN** the operator's capabilities exclude `'*'` and `'fin.disponibilidades.movimientos.imputar_ardua'`
- **WHEN** the kebab menu of any movement opens
- **THEN** the entries "Asignar Banco y Cuenta" and "Editar Banco y Cuenta" are NOT visible

#### Scenario: Lacking ver hides the module entirely

- **GIVEN** the route guard composes `meta.capabilities = ['fin.disponibilidades.ver']`
- **AND** the operator does NOT hold `'*'` or `'fin.disponibilidades.ver'`
- **WHEN** the operator attempts to navigate to `/disponibilidades`
- **THEN** the route guard rejects the navigation
- **AND** the operator is redirected per `core-auth`'s capability-rejection flow

### Requirement: The Disponibilidades module MUST persist last-active sub-tab, axis, and filters in localStorage and reflect state in route.query

The Disponibilidades module SHALL persist three pieces of UI state to `localStorage`:

| Key | Value |
| --- | --- |
| `fin.disponibilidades.lastSubTab` | One of `'posicion' \| 'bancos_cuentas' \| 'movimientos'` |
| `fin.disponibilidades.movimientos.lastKanbanAxis` | One of the six axis ids |
| `fin.disponibilidades.movimientos.lastFilters` | Object with the current filter values |

On module mount, the persisted state SHALL be restored. Each piece of state SHALL also be reflected in `route.query` so deep links share the specific view.

URL query keys: `tab` (sub-tab), `axis` (Kanban axis), filter keys per filter.

#### Scenario: lastSubTab restored on next session

- **GIVEN** the operator switched to `Bancos-Cuentas` and closed the tab
- **WHEN** the operator returns to `/disponibilidades` (no query params)
- **THEN** the active sub-tab is `Bancos-Cuentas`
- **AND** `route.query.tab` is set to `'bancos_cuentas'`

#### Scenario: URL query overrides localStorage

- **GIVEN** localStorage `lastSubTab: 'movimientos'`
- **WHEN** the operator opens `/disponibilidades?tab=posicion`
- **THEN** the active sub-tab is `Posición` (URL wins)
- **AND** localStorage is updated to `'posicion'`

#### Scenario: Bookmarkable deep link

- **GIVEN** the operator copies the URL `/disponibilidades?tab=movimientos&axis=fin.imput_ardua&estado_operativo=Pending`
- **WHEN** another operator opens the URL
- **THEN** the Movimientos sub-tab is active
- **AND** the Tablero view is selected with axis `Estado de imputación Lado Ardua`
- **AND** the Estado operativo filter is set to `Pending`
