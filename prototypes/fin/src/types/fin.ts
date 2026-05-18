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
//   - `Movimiento.origen` is now top-level with values `'OPS' | 'TRD' | 'Manual'`.
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

/** Movement type discriminator carried by every `movimiento` record. */
export type MovimientoTipo =
  | 'COLLECTOR_IN'
  | 'COLLECTOR_OUT'
  | 'WITHDRAWAL'
  | 'DEPOSIT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'SWAP_IN'
  | 'SWAP_OUT'
  | 'FEE'
  | 'TAX'
  | 'REBATE'
  | 'ADDITION';

/**
 * Origin of a recorded movement (REQ-50 §5.1).
 *   - `'OPS'` — events from `core-ops-backend` (vostro movements).
 *   - `'TRD'` — events from `core-trd-backend` (roadmap; not v1.0).
 *   - `'Manual'` — manual loads from FIN.Disponibilidades.
 */
export type MovimientoOrigen = 'OPS' | 'TRD' | 'Manual';

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
  /** Transfer flow — reference to the destination account (TRANSFER_OUT). */
  cuenta_destino_id?: string | null;
  /** Transfer flow — reference to the origin account (TRANSFER_IN). */
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

/** Single account row inside a Sociedad. Numeric fields are
 *  pre-formatted strings (display-ready values straight from the
 *  seed data). */
export interface CuentaPos {
  icon: CuentaIcon;
  /** Account id from the catalogue (used by drill-down `cuenta_id`). */
  id: string;
  name: string;
  /** Detail line under the name (e.g. CBU, wallet hash). */
  det: string;
  /** Pre-formatted balance, no currency symbol. */
  saldo: string;
  /** Saldo Propio (the part of the saldo attributable to Ardua's own funds). */
  saldo_propio: string;
  /** Saldo Cliente (the part attributable to client funds via Cuentas Operativas). */
  saldo_cliente: string;
  moneda: Moneda;
}

export interface SociedadPos {
  id: string;
  name: string;
  /** Subtitle under the name (e.g. "PSP · Argentina · ARS"). */
  sub: string;
  open: boolean;
  totals: SociedadTotal[];
  /** Aggregate saldo propio of every cuenta in this sociedad. */
  total_propio: string;
  /** Aggregate saldo cliente of every cuenta in this sociedad. */
  total_cliente: string;
  cuentas: CuentaPos[];
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
