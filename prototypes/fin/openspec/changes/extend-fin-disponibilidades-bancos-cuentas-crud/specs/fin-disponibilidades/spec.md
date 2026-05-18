## MODIFIED Requirements

### Requirement: Bancos / Cuentas MUST expose Crear nueva Cuenta as the Main CTA

When the Bancos / Cuentas sub-tab is active, the Main CTA in the L1 header SHALL be "Crear nueva Cuenta" (`variant: 'primary'`), gated by capability `fin.disponibilidades.bancos_cuentas.crear`. The CTA SHALL open the catalogue creation dialog with the FIN lens.

The dialog SHALL expose the following fields:
- `sociedad_id` — `lookup` against `framework.sociedades` (required).
- `banco` — `lookup` against `fin.estructuras_bancos` (required; the operator picks from the existing Estructuras registry). If no Estructura exists yet, the operator MUST use the Secondary CTA "Crear nuevo Banco/Estructura" first.
- `tipo_estructura` — `select` (REQ-42 §8.1 values: Banco / Banco digital / ALyC / Exchange / Custodio / PSP / Proveedor; required).
- `tipo_cuenta` — `select` (REQ-42 §8.1 values: Wallet Pool / CBU / CVU / Cuenta Corriente / Exchange Account / Custodia / Comitente; required).
- `moneda` — `select` (ARS / USD / USDT / USDC / EUR / CAD / BTC; required).
- `numero` — `text` (account number or address; required).
- `cuenta_contable` — `text` (optional; can be configured later via the "Configurar cuenta contable" row action).

On confirm, the page-registered creator SHALL build a `CuentaBanco` record (auto-generated id `cu-${sociedad_id}-${slugify(banco)}-${seq}`, `estado: 'Activa'`, `cuenta_contable: null` if not provided) and dispatch `disponibilidadesCatalog.addCuenta(record)`. The new cuenta SHALL appear in the Bancos / Cuentas table on the next render without a page reload.

The dialog is independent of any future OPS catalogue creation dialog (Decision 2 of `add-fin-disponibilidades` design.md). The FIN dialog persists into the FIN-local Pinia store in v1; backend integration is a follow-up.

#### Scenario: CTA is rendered with capability and variant primary

- **GIVEN** the operator holds `bancos_cuentas.crear` (or `'*'`)
- **AND** the active sub-tab is `Bancos-Cuentas`
- **WHEN** the L1 header renders
- **THEN** the Main CTA "Crear nueva Cuenta" is visible
- **AND** its `<Button>` is mounted with `variant="primary"` (per `core-actions-manifest`)

#### Scenario: Dialog opens with REQ-42 fields including Estructura lookup

- **GIVEN** the operator clicks "Crear nueva Cuenta"
- **WHEN** the dialog opens
- **THEN** the form exposes `sociedad_id` (lookup), `banco` (lookup against `fin.estructuras_bancos`), `tipo_estructura` (select), `tipo_cuenta` (select), `moneda` (select), `numero` (text), `cuenta_contable` (text, optional)
- **AND** the `banco` lookup is populated with the Estructuras from the catalogue store

#### Scenario: Confirm creates the cuenta in the FIN catalogue store

- **GIVEN** the operator fills `sociedad_id: 'hp'`, `banco: 'BIND'`, `tipo_estructura: 'Banco'`, `tipo_cuenta: 'Cuenta Corriente'`, `moneda: 'ARS'`, `numero: '4403443/5'`
- **WHEN** the operator confirms
- **THEN** the page's registered creator builds a new `CuentaBanco` record with an auto-generated id (e.g. `cu-hp-bind-99`)
- **AND** `disponibilidadesCatalog.addCuenta(record)` is invoked
- **AND** the new cuenta appears in the Bancos / Cuentas table on the next render
- **AND** the new cuenta is selectable in the subsequent `Cargar movimiento manual` dialog's Cuenta dropdown when the operator picks `hp` as Sociedad

## ADDED Requirements

### Requirement: Bancos / Cuentas MUST expose a Secondary CTA "Crear nuevo Banco/Estructura"

When the Bancos / Cuentas sub-tab is active, a Secondary CTA SHALL render alongside the Main CTA in the L1 header. Label: "Crear nuevo Banco/Estructura". `variant: 'secondary'`. Gated by capability `fin.disponibilidades.bancos_cuentas.crear` (same as Crear nueva Cuenta — the same role authoriza both catálogo operations).

The CTA SHALL open a dialog with two fields:
- `nombre` — `text` (required; e.g. "Lemon Cash", "Banco Itaú").
- `tipo_estructura` — `select` (REQ-42 §8.1 values; required).

On confirm, the page's registered creator SHALL build an `EstructuraBanco` record (auto-generated id `est-${slugify(nombre)}-${seq}`) and dispatch `disponibilidadesCatalog.addEstructura(record)`. The new Estructura SHALL appear immediately in the `banco` lookup of the subsequent "Crear nueva Cuenta" dialog.

The Secondary CTA is positioned visually subordinate to the Main CTA. Both CTAs render inline (the total count is 2, well below the cap of 3).

#### Scenario: CTA renders with variant secondary

- **GIVEN** the operator holds `bancos_cuentas.crear`
- **AND** the active sub-tab is `Bancos-Cuentas`
- **WHEN** the L1 header renders
- **THEN** the Secondary CTA "Crear nuevo Banco/Estructura" is visible alongside the primary "Crear nueva Cuenta"
- **AND** its `<Button>` is mounted with `variant="secondary"` (less prominent appearance)

#### Scenario: Confirm creates the Estructura in the FIN catalogue store

- **GIVEN** the operator opens the dialog and fills `nombre: 'Lemon Cash'`, `tipo_estructura: 'Banco digital'`
- **WHEN** the operator confirms
- **THEN** the page's registered creator builds an `EstructuraBanco` record with auto-generated id (e.g. `est-lemon-cash-1`)
- **AND** `disponibilidadesCatalog.addEstructura(record)` is invoked
- **AND** the new Estructura immediately appears in the `banco` lookup of the next "Crear nueva Cuenta" dialog

#### Scenario: Creating an Estructura without sociedades does not block

- **GIVEN** the operator creates a brand-new Estructura ("Lemon Cash")
- **WHEN** the operator subsequently opens "Crear nueva Cuenta" and selects any Sociedad (e.g. `hp`)
- **THEN** the `banco` lookup includes "Lemon Cash" regardless of whether any other Cuenta has been opened in that Estructura

### Requirement: Cargar movimiento manual dialog MUST resolve every cascading lookup against a registered catalogue

The dialog opened by the "Cargar movimiento manual" Main CTA SHALL have every lookup field bound to a catalogue registered in `plugins/catalogs.ts`. The required registrations are:
- `framework.sociedades` (already registered).
- `fin.bancos_cuentas` — NEW. Returns the cuentas of the chosen sociedad. Reads from the `disponibilidadesCatalog` Pinia store so newly-created cuentas appear immediately.
- `clp.clientes` (already registered).
- `fin.cuentas_operativas_cliente` — NEW. Returns the Cuentas Operativas of the chosen cliente in the chosen moneda. Reads from the `CUENTAS_OPERATIVAS_CLIENTE` mock.

When any field's catalogue is NOT registered, the dropdown SHALL render the empty state ("Sin resultados") and the operator SHALL NOT be able to confirm — the form's required-fields validator blocks submission until every required lookup resolves.

#### Scenario: Sociedad → Cuenta cascade resolves both dropdowns

- **GIVEN** the operator opens "Cargar movimiento manual"
- **AND** picks `sociedad_id: 'hp'` (Haz Pagos)
- **WHEN** the `cuenta_id` lookup opens
- **THEN** it lists every cuenta of Haz Pagos from `disponibilidadesCatalog.cuentas` (filtered by `sociedad_id === 'hp'`)
- **AND** the operator can pick a cuenta to satisfy the required field

#### Scenario: Cliente dropdown resolves to the full client catalogue

- **GIVEN** the operator opens "Cargar movimiento manual"
- **WHEN** the operator opens the `cliente_id` lookup
- **THEN** it lists every active client from `CLIENTES` (including the synthetic `AS00000` for Cuenta de Cliente de Ardua)

#### Scenario: Creating a cuenta mid-flow updates the carga manual dropdown

- **GIVEN** the operator was on "Cargar movimiento manual" but had no compatible cuenta for the chosen sociedad
- **WHEN** the operator cancels the carga, opens "Crear nueva Cuenta" via the Bancos / Cuentas sub-tab, confirms a new cuenta, and re-opens "Cargar movimiento manual"
- **THEN** the new cuenta is visible in the `cuenta_id` lookup
- **AND** the carga manual flow can proceed end-to-end
