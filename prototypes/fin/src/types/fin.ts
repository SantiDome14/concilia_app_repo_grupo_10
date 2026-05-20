// ════════════════════════════════════════════════════════════════════
// FIN domain types
// ────────────────────────────────────────────────────────────────────
// Two layers coexist here:
//
//   1. **Manifest record types** — the typed record shapes the action
//      manifests (`fin.disponibilidades.movimientos`, `fin.cotizaciones`,
//      `fin.disponibilidades.bancos_cuentas`) read and write through
//      the pure-logic engine in `src/lib/manifest/`. The engine resolves
//      dotted field paths against a NESTED `fin` namespace
//      (e.g. `fin.sociedad_id` → `record.fin.sociedad_id`).
//
//   2. **Disponibilidades view types** — display shapes the page
//      consumes for the Posición tree (`SociedadPos`, `CuentaPos`) and
//      the legacy Movimientos ledger display (`MovimientoLedger`). The
//      canonical record is `Movimiento`; display shapes are derivable
//      surfaces.
//
// Per REQ-50 (`add-fin-disponibilidades`):
//   - `Movimiento.origen` is now top-level with values `'OPS' | 'FIN'`.
//   - `Movimiento.requires_supervision`, `supervised_by`, `supervised_at`,
//     `estado_de_supervision` are top-level fields for manual loads.
//   - `RetiroCola` and the Cola sub-tab are eliminated; the queue
//     surfaces as the Sub-tab Movimientos with `enable_when` predicates.
// ════════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────────
// Shared primitives
// ────────────────────────────────────────────────────────────────────

export type CuentaIcon = 'bank' | 'wallet';

/** Currency code displayed next to balances (open string union). */
export type Moneda = 'ARS' | 'USD' | 'USDC' | 'USDT' | 'CAD' | 'EUR' | string;

/**
 * Movement type discriminator carried by every `movimiento` record. The 22
 * values are the closed contract of the matriz cerrada in the feature
 * `features/fin/fin-tesoreria-disponibilidades.md`. Any event that does not
 * fit one of these values indicates a missing tipo in the matriz, not a
 * manifest gap — adding a new tipo SHALL go through an OpenSpec change.
 *
 * Tipo registered by OPS (vostro flow + pending lifecycle + ajustes):
 *   DEPOSIT, WITHDRAWAL, FEE, REBATE, SWAP_OUT, SWAP_IN, SPREAD,
 *   SOLICITUD_RETIRO_PENDING, DEPOSITO_PENDIENTE, ASIGNACION_PENDIENTE,
 *   AJUSTE_CREDITO, AJUSTE_DEBITO.
 *
 * Tipo registered by FIN (nostros + manual non-operativos + intercompany):
 *   MOV_ENTRE_CUENTAS_PROPIAS, PRESTAMO_INTERCOMPANY, SWEEPING_CROSS_SOCIEDAD,
 *   COMISION_BANCARIA, INTERES_BANCARIO, PAGO_PROVEEDOR, PAGO_SALARIOS,
 *   APORTE_CAPITAL, AJUSTE_MANUAL.
 */
export type MovimientoTipo =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'FEE'
  | 'REBATE'
  | 'SWAP_OUT'
  | 'SWAP_IN'
  | 'SPREAD'
  | 'SOLICITUD_RETIRO_PENDING'
  | 'DEPOSITO_PENDIENTE'
  | 'ASIGNACION_PENDIENTE'
  | 'AJUSTE_CREDITO'
  | 'AJUSTE_DEBITO'
  | 'MOV_ENTRE_CUENTAS_PROPIAS'
  | 'PRESTAMO_INTERCOMPANY'
  | 'SWEEPING_CROSS_SOCIEDAD'
  | 'COMISION_BANCARIA'
  | 'INTERES_BANCARIO'
  | 'PAGO_PROVEEDOR'
  | 'PAGO_SALARIOS'
  | 'APORTE_CAPITAL'
  | 'AJUSTE_MANUAL';

/**
 * Categoría derivada del tipo según la dimensión (presencia de cliente ×
 * presencia de flujo físico) del feature.
 *   A — Con cliente + físico (DEPOSIT, WITHDRAWAL).
 *   B — Con cliente, sin físico (FEE, REBATE, SWAP_*, AJUSTE_CR/DB, ASIGNACION_PENDIENTE).
 *   C — Sin cliente + físico (interno): COMISION_BANCARIA, INTERES_BANCARIO,
 *       PAGO_PROVEEDOR, PAGO_SALARIOS, MOV_ENTRE_CUENTAS_PROPIAS, APORTE_CAPITAL.
 *   D — Sin cliente + físico (cross-sociedad): PRESTAMO_INTERCOMPANY,
 *       SWEEPING_CROSS_SOCIEDAD.
 *   E — Sin cliente, sin físico: SPREAD, AJUSTE_MANUAL.
 *   F — Cliente NO IDENTIFICADO: DEPOSITO_PENDIENTE.
 *
 * Derived from `tipo` via `categoriaOf()` in `@/lib/movimientos/categoria`.
 * Never stored on the record — see Decision 1 of the change's design.md.
 */
export type MovimientoCategoria = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

/**
 * Grupos contables del módulo Disponibilidades (no plan de cuentas formal —
 * eso llega con el Motor Contable en V2). Patrimonio operativo es la cuenta
 * técnica que captura aportes propios y residual operativo de Ardua; su
 * saldo de apertura en T0 = Capacidad Operativa inicial (`Bancos − Obligaciones
 * − Pendientes`). Subtipos formales (Capital social, Aportes irrevocables,
 * Reservas, Resultados Acumulados) se introducen en V2.
 */
export type GrupoContable =
  | 'disponibilidades'
  | 'obligaciones_clientes'
  | 'pendientes_asignacion'
  | 'puente_fx'
  | 'intercompany'
  | 'patrimonio_operativo'
  | 'ingresos'
  | 'egresos';

/**
 * Origin of a recorded movement — which app registered it.
 *   - `'OPS'` — events flowing from `core-ops-backend` (vostro: depósitos,
 *     retiros, fees, swaps, pendientes, ajustes, etc.).
 *   - `'FIN'` — events registered from FIN.Disponibilidades (nostros y
 *     no-operativos: comisiones bancarias, intereses, pagos a proveedores,
 *     salarios, intercompany, sweeping, aportes de capital, ajustes
 *     manuales). Sustituye los antiguos `'Manual'` y `'TRD'` —
 *     `'TRD'` no aplica al ledger de Disponibilidades.
 */
export type MovimientoOrigen = 'OPS' | 'FIN';

/** Display state of a movement in the Tesorería ledger view (display-only). */
export type MovimientoEstado = 'CONF' | 'COLA' | 'PEND';

/** Imputación lifecycle for a `movimiento`, written by the engine. */
export type ImputacionState = 'PEND' | 'PARC' | 'IMP';

/** Conciliación lifecycle (legacy — not in REQ-50 v1, retained for archived fields). */
export type ConciliacionState = 'PEND' | 'CONC' | 'DIFF';

/**
 * Supervision state for manual movements (REQ-50 §6.3). Orthogonal to
 * the operational state inherited from REQ-42.
 *   - `'no_aplica'` — origen is OPS or TRD; supervision is not relevant.
 *   - `'pendiente_de_supervision'` — manual load awaiting confirmation.
 *   - `'confirmado'` — confirmed by a supervisor (≠ creator). Impacts saldos.
 *   - `'rechazado'` — rejected by a supervisor. Never impacts saldos.
 */
export type EstadoDeSupervision =
  | 'no_aplica'
  | 'pendiente_de_supervision'
  | 'confirmado'
  | 'rechazado';

/** Documentación lifecycle for a `quote` (Cotizaciones kanban axis). */
export type FacturaState = 'pendiente' | 'facturada' | 'no-req';

/** Trading lifecycle of a quote (drives `show_when` predicates). */
export type QuoteStatus =
  | 'pending'
  | 'offered'
  | 'executed'
  | 'settled'
  | 'cancelled';

/** Estado of an account in the Bancos/Cuentas catalogue (REQ-42 §8.1). */
export type CuentaEstado = 'Activa' | 'Inactiva';

/** Tipo de estructura del catálogo (REQ-42 §8.1). */
export type EstructuraTipo =
  | 'Banco'
  | 'Banco digital'
  | 'ALyC'
  | 'Exchange'
  | 'Custodio'
  | 'PSP'
  | 'Proveedor';

/** Tipo de cuenta del catálogo (REQ-42 §8.1). */
export type CuentaTipo =
  | 'Wallet Pool'
  | 'CBU'
  | 'CVU'
  | 'Cuenta Corriente'
  | 'Exchange Account'
  | 'Custodia'
  | 'Comitente';

// ────────────────────────────────────────────────────────────────────
// Manifest record types
// ────────────────────────────────────────────────────────────────────

/**
 * FIN namespace nested inside a `movimiento` record. The manifest's
 * predicates and dialog field ids resolve against this object via
 * dot-paths (e.g. `fin.sociedad_id`, `fin.cliente_id`).
 *
 * The `imput`, `conc`, and `intercompany_*` fields are retained for
 * backwards-compatibility with the archived `migrate-fin-prototype`
 * change, but are NOT part of the REQ-50 v1 surface and are not
 * referenced by the new manifests `fin.disponibilidades.movimientos` or
 * `fin.disponibilidades.bancos_cuentas`.
 */
export interface MovimientoFin {
  imput?: ImputacionState | null;
  sociedad_id?: string | null;
  cuenta_id?: string | null;
  cliente_id?: string | null;
  /** Cuenta Operativa del Cliente (REQ-42 §6). */
  cuenta_operativa_cliente_id?: string | null;
  cliente_imputation_note?: string | null;
  /**
   * Counterparty account for movements that reference a second cuenta on the
   * same sociedad: `MOV_ENTRE_CUENTAS_PROPIAS`. Cross-sociedad events
   * (`PRESTAMO_INTERCOMPANY`, `SWEEPING_CROSS_SOCIEDAD`) do NOT use these
   * fields — they generate two distinct Movimiento records linked by
   * `evento_id` (one per sociedad), each carrying its own `fin.cuenta_id`.
   */
  cuenta_destino_id?: string | null;
  cuenta_origen_id?: string | null;
  // Legacy fields preserved for archived migration compatibility.
  proveedor_id?: string | null;
  partner_id?: string | null;
  banco_id?: string | null;
  cuenta_contable_id?: string | null;
  intercompany?: boolean | null;
  intercompany_counterparty_sociedad_id?: string | null;
  intercompany_note?: string | null;
  intercompany_at?: string | null;
  conc?: ConciliacionState | null;
  conc_note?: string | null;
  conc_at?: string | null;
}

/**
 * `movimiento` record consumed by the `fin.disponibilidades.movimientos`
 * manifest. Per REQ-50, five top-level fields drive the supervision
 * flow and the lens / origin discriminators:
 *   - `origen` — OPS / TRD / Manual (REQ-50 §5.1).
 *   - `requires_supervision`, `supervised_by`, `supervised_at`,
 *     `estado_de_supervision` — local supervision flags (REQ-50 §6).
 *   - `created_by` — the user that created the manual load, used by
 *     the `Confirmar carga manual` predicate (creator ≠ supervisor).
 *
 * Two namespaces are nested at runtime:
 *   - `ops.*` — read-only OPS-native data (rail, account, counterparty,
 *     partner, provider) preserved for traceability against the source.
 *   - `fin.*` — FIN-managed fields the imputation actions read and
 *     write through dot-paths (e.g. `fin.sociedad_id`, `fin.cliente_id`).
 */
export interface Movimiento {
  id: string;
  tipo: MovimientoTipo;
  fecha: string;
  /** Pre-formatted display amount carried from the source rail. */
  monto: string;
  moneda: Moneda;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  /** Origin of the movement — drives manifest predicates (REQ-50 §5.1). */
  origen: MovimientoOrigen;
  /** True when the movement is a manual load awaiting confirmation (REQ-50 §6.2). */
  requires_supervision: boolean;
  /** Supervisor user id, set on `Confirmar carga manual` (REQ-50 §6.2). */
  supervised_by: string | null;
  /** Supervision timestamp (ISO), set on `Confirmar carga manual` (REQ-50 §6.2). */
  supervised_at: string | null;
  /** Supervision state — orthogonal to `status` (REQ-50 §6.3). */
  estado_de_supervision: EstadoDeSupervision;
  /** Creator user id — used by the `created_by !== current_user` predicate. */
  created_by: string | null;
  /**
   * Asiento contable identifier. V1 modela el asiento a nivel grupo
   * contable (no plan de cuentas formal). Cross-sociedad events generate
   * two distinct Movimientos with two distinct `asiento_id`s sharing
   * `evento_id` (see Decision 2 of the omnibus alignment change).
   */
  asiento_id?: string | null;
  /**
   * Operative event correlation id. Two Movimientos belong to the same
   * operative event iff they share `evento_id`. Used for:
   *   - Cross-sociedad pairs (`PRESTAMO_INTERCOMPANY`, `SWEEPING_CROSS_SOCIEDAD`).
   *   - SWAP triples (`SWAP_OUT` + `SWAP_IN` + `SPREAD` from a single ejecución).
   *   - `DEPOSITO_PENDIENTE` followed by its `ASIGNACION_PENDIENTE`.
   */
  evento_id?: string | null;
  ops: MovimientoOps;
  fin: MovimientoFin;
}

/** OPS-native namespace nested inside a `movimiento` record. */
export interface MovimientoOps {
  rail: string;
  account: string;
  client: string | null;
  counterparty: string | null;
  partner: string | null;
  provider: string | null;
}

/**
 * FIN namespace nested inside a `quote` record. The manifest's
 * `documentacion` axis writes `fin.facturaState` and the timestamps.
 */
export interface QuoteFin {
  facturaState: FacturaState;
  factura?: string | null;
  factura_concepto?: string | null;
  fact_at?: string | null;
  no_factura_motivo?: string | null;
  recotizado_at?: string | null;
  nuevo_spread?: number | null;
  anulado_at?: string | null;
  anulacion_motivo?: string | null;
}

/**
 * `quote` record consumed by the `fin.cotizaciones` manifest.
 */
export interface Quote {
  id: string;
  status: QuoteStatus;
  cliente_id: string;
  cliente_nombre: string;
  par: string;
  monto: number;
  moneda: Moneda;
  spread_bps: number;
  fecha: string;
  fin: QuoteFin;
}

/**
 * `carga_manual_solicitud` payload created by the
 * `fin.disponibilidades.movimientos.cargar_*` action. Per REQ-50 §6.5,
 * the dialog accepts the fields below; on confirm, the engine creates
 * a `Movimiento` record with `requires_supervision` derived from the
 * creator's capability.
 */
export interface CargaManualSolicitud {
  sociedad_id: string;
  cuenta_id: string;
  tipo: MovimientoTipo;
  fecha: string;
  monto: number;
  moneda: Moneda;
  cuenta_destino_id: string | null;
  cliente_id: string | null;
  cuenta_operativa_cliente_id: string | null;
  motivo: string;
  referencia: string | null;
}

// ────────────────────────────────────────────────────────────────────
// Catalog records (shared by manifest dialogs)
// ────────────────────────────────────────────────────────────────────

export interface Sociedad {
  id: string;
  nombre: string;
  cuit: string;
  /** Display sub-line (e.g. "PSP · Argentina · ARS"). */
  sub: string;
}

export interface CuentaBancaria {
  id: string;
  sociedad_id: string;
  /** Bank / exchange / custodian (e.g. `BIND`, `COINAG`, `BITGO`). */
  banco: string;
  numero: string;
  moneda: Moneda;
  /** Full label including the bank prefix (`COINAG · ARS · Cta 10.045`).
   *  Consumed by the Detail modal and by lookups that don't pre-filter
   *  by estructura. */
  label: string;
  /** Short label without the bank prefix (`ARS · Cta 10.045`). Consumed
   *  by the cuenta dropdown when the user has already chosen an
   *  estructura — the bank is implicit. */
  label_short: string;
}

/**
 * `cuenta_banco` record consumed by the
 * `fin.disponibilidades.bancos_cuentas` manifest. Extends the canonical
 * `CuentaBancaria` with the REQ-50 §4 fields the FIN lens cares about:
 *   - `tipo_estructura` and `tipo_cuenta` per REQ-42 §8.1.
 *   - `estado` per REQ-42 (Activa / Inactiva).
 *   - `cuenta_contable` — the FIN-specific accounting metadata
 *     (REQ-50 §4.5). `null` means "Sin configurar".
 *   - `cuenta_padre_id` — parent account when the cuenta is a sub-account.
 */
export interface CuentaBanco extends CuentaBancaria {
  tipo_estructura: EstructuraTipo;
  tipo_cuenta: CuentaTipo;
  estado: CuentaEstado;
  /** Accounting metadata (free-form text in v1; future selector). `null` = Sin configurar. */
  cuenta_contable: string | null;
  cuenta_padre_id?: string | null;
}

/**
 * `estructura_banco` record — entries in the registry of Bancos /
 * Estructuras (Banco / Exchange / Custodio / etc.) consumed by the
 * Crear Estructura Secondary CTA and the `banco` lookup of the Crear
 * Cuenta dialog. Per REQ-50 + Decision 1 of
 * `extend-fin-disponibilidades-bancos-cuentas-crud`.
 */
export interface EstructuraBanco {
  id: string;
  nombre: string;
  tipo_estructura: EstructuraTipo;
}

/**
 * Cuenta Operativa del Cliente (REQ-42 §6). Internal accounting
 * construction representing the balance attributed to a client under
 * the Docket de Ardua Solutions Corp. The id format is
 * `<docket-digits><moneda><suffix>` (e.g. `005516EURC739`).
 *
 * The synthetic `AS00000` record (Cuenta de Cliente de Ardua) is the
 * placeholder for nostros and manual non-operative movements that need
 * symmetric bidirectional imputation without an external client
 * (REQ-50 §5.7).
 */
export interface CuentaOperativaCliente {
  id: string;
  cliente_id: string;
  moneda: Moneda;
  estado: CuentaEstado;
  /** Label shown in the typeahead's secondary line. */
  label: string;
}

// ────────────────────────────────────────────────────────────────────
// Disponibilidades — Posición tree shapes
// ────────────────────────────────────────────────────────────────────

/** Sociedad totals chip — one per currency held. */
export interface SociedadTotal {
  lbl: Moneda;
  val: string;
}

/**
 * Single account row inside a Sociedad. Under the omnibus accounting model
 * each Cuenta carries only its physical saldo in moneda nativa — the previous
 * `saldo_propio` / `saldo_cliente` segmentation is malformed (the question
 * "¿de qué cliente es la plata que está en esta cuenta?" is not answerable
 * per the closed conceptual model).
 *
 * Pre-formatted strings are display-ready values from the seed data. The
 * tree renders 4 columns Banco / Cuenta / Moneda / Saldo; `det` is an
 * optional sub-line shown under the cuenta number.
 */
export interface CuentaPos {
  icon: CuentaIcon;
  /** Account id from the catalogue (used by drill-down `cuenta_id`). */
  id: string;
  /** Bank / Estructura name (e.g., 'BIND', 'COINAG', 'BITGO'). */
  banco: string;
  /** Account number / wallet hash (e.g., 'Cta 4403443/1', '0xBG...A8C2'). */
  numero: string;
  /** Optional sub-line under the cuenta (e.g., 'CBU principal · pool de CVUs'). */
  det?: string;
  /** Pre-formatted physical balance in moneda nativa, no currency symbol. */
  saldo: string;
  moneda: Moneda;
}

export interface SociedadPos {
  id: string;
  name: string;
  /** Subtitle under the name (e.g. "PSP · Argentina · ARS"). */
  sub: string;
  open: boolean;
  /** Per-moneda total chips (one per moneda held by this sociedad). */
  totals: SociedadTotal[];
  cuentas: CuentaPos[];
}

/**
 * Pre-formatted display strings per moneda. The key is the Moneda code
 * (`'ARS' | 'USD' | 'USDC' | 'USDT' | 'EUR' | 'CAD' | ...`), the value is
 * the display string with thousands separators but no currency symbol
 * (the moneda code is rendered as a separate column in the KPI card body).
 */
export type PerMoneda = Partial<Record<Moneda, string>>;

/**
 * The 4 dimensions of the ecuación maestra:
 *   Σ Bancos = Σ Obligaciones + Σ Pendientes + Σ Capacidad Operativa
 * valid per moneda M, for each sociedad and the consolidated group. Each
 * dimension is rendered per-moneda — V1 does NOT apply cross-currency
 * conversions.
 */
export interface PosicionEcuacionMaestra {
  /** Σ Bancos — saldo físico real en cuentas activas, por moneda. */
  bancos: PerMoneda;
  /** Σ Obligaciones — total adeudado por Ardua a clientes, por moneda. */
  obligaciones: PerMoneda;
  /** Σ Pendientes — fondos ingresados sin identificar cliente, por moneda. */
  pendientes: PerMoneda;
  /** Capacidad Operativa — residual `Bancos − Obligaciones − Pendientes`, por moneda. */
  capacidadOperativa: PerMoneda;
}

/**
 * Generic Posición node — Sociedad or Cuenta — used by the tree
 * renderer. Each level exposes saldo total + Propio / Cliente
 * distribution (REQ-50 §3.2).
 */
export type PosicionNode =
  | ({ kind: 'sociedad' } & SociedadPos)
  | ({ kind: 'cuenta'; sociedad_id: string } & CuentaPos);

/**
 * Display shape for the legacy Movimientos ledger table (a flat view
 * over `Movimiento[]`). The new Movimientos sub-tab consumes
 * `Movimiento[]` directly through the manifest engine; this shape is
 * retained for unit tests that exercise the legacy display.
 */
export interface MovimientoLedger {
  id: string;
  fecha: string;
  tipo: MovimientoTipo;
  cuenta: string;
  monto: string;
  moneda: Moneda;
  origen: MovimientoOrigen;
  estado: MovimientoEstado;
}
