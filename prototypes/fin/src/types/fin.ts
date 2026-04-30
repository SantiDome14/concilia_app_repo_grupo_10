// ════════════════════════════════════════════════════════════════════
// FIN domain types
// ────────────────────────────────────────────────────────────────────
// Two layers coexist here:
//
//   1. **Manifest record types** — the typed record shapes the action
//      manifests (`fin.operaciones.movimientos`, `fin.cotizaciones`,
//      `fin.tesoreria.cola_asignacion`) read and write through the
//      pure-logic engine in `src/lib/manifest/`. The engine resolves
//      dotted field paths against a NESTED `fin` namespace
//      (e.g. `fin.sociedad_id` → `record.fin.sociedad_id`).
//
//   2. **Disponibilidades view types** — pre-formatted display shapes
//      (`MovimientoLedger`, `RetiroEnCola`, `SociedadPos`) used by the
//      Tesorería page's posición / movimientos / cola tabs. These
//      mirror the legacy `prototypes/fin-old/fin-prototype.html`
//      `POS_TREE` / `TES_MOVS` / `COLA` datasets and ship pre-formatted
//      strings (e.g. `monto: "+ 18.500.000"`); apps SHALL replace them
//      with real backend contracts during integration.
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

/** Origin of a recorded movement (operations vs. manual flow). */
export type MovimientoOrigen = 'OPS' | 'MAN' | 'MANOK';

/** Display state of a movement in the Tesorería ledger view. */
export type MovimientoEstado = 'CONF' | 'COLA' | 'PEND';

/** Imputación lifecycle for a `movimiento`, written by the engine. */
export type ImputacionState = 'PEND' | 'PARC' | 'IMP';

/** Conciliación lifecycle for a `movimiento`. */
export type ConciliacionState = 'PEND' | 'CONC' | 'DIFF';

/** Documentación lifecycle for a `quote` (Cotizaciones kanban axis). */
export type FacturaState = 'pendiente' | 'facturada' | 'no-req';

/** Trading lifecycle of a quote (drives `show_when` predicates). */
export type QuoteStatus =
  | 'pending'
  | 'offered'
  | 'executed'
  | 'settled'
  | 'cancelled';

// ────────────────────────────────────────────────────────────────────
// Manifest record types
// ────────────────────────────────────────────────────────────────────

/**
 * FIN namespace nested inside a `movimiento` record. The manifest's
 * predicates and dialog field ids resolve against this object via
 * dot-paths (e.g. `fin.sociedad_id`, `fin.intercompany_at`).
 */
export interface MovimientoFin {
  imput?: ImputacionState | null;
  sociedad_id?: string | null;
  cuenta_id?: string | null;
  cliente_id?: string | null;
  cliente_imputation_note?: string | null;
  proveedor_id?: string | null;
  partner_id?: string | null;
  banco_id?: string | null;
  cuenta_contable_id?: string | null;
  /** Transfer flow — reference to the destination account (TRANSFER_OUT). */
  cuenta_destino_id?: string | null;
  /** Transfer flow — reference to the origin account (TRANSFER_IN). */
  cuenta_origen_id?: string | null;
  intercompany?: boolean | null;
  intercompany_counterparty_sociedad_id?: string | null;
  intercompany_note?: string | null;
  /** ISO timestamp set by the engine on `set_fields: { fin.intercompany_at: $now }`. */
  intercompany_at?: string | null;
  conc?: ConciliacionState | null;
  conc_note?: string | null;
  conc_at?: string | null;
}

/**
 * `movimiento` record consumed by the `fin.movimientos` manifest. The
 * manifest engine reads `tipo` as the canonical record-type
 * discriminator (see `readRecordType` in
 * `src/lib/manifest/evalPredicate.ts`), so this field MUST stay named
 * `tipo` for predicates like `record_type_in: ['DEPOSIT']` to resolve.
 *
 * Two namespaces are nested at runtime:
 *   - `ops.*` — read-only OPS-native data (rail, account, counterparty,
 *     partner, provider) preserved for traceability against the source
 *     module.
 *   - `fin.*` — FIN-managed fields the imputation actions read and
 *     write through dot-paths (e.g. `fin.sociedad_id`, `fin.conc`).
 *
 * `status` is the OPS operational flag (`COMPLETED` / `PENDING` /
 * `FAILED`) — predicates may read it but FIN does not own it.
 */
export interface Movimiento {
  id: string;
  tipo: MovimientoTipo;
  fecha: string;
  /** Pre-formatted display amount carried from the source rail. */
  monto: string;
  moneda: Moneda;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
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
 * `quote` record consumed by the `fin.cotizaciones` manifest. The
 * trading-side `status` discriminates which actions are available.
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
 * `retiro_cola` record consumed by the `fin.tesoreria.cola_asignacion`
 * manifest. `cuenta_id === null` keeps the row in the queue; assigning
 * an account moves it out of the queue and into the ledger.
 */
export interface RetiroCola {
  id: string;
  fecha: string;
  cliente: string;
  cliente_id: string;
  monto: number;
  moneda: Moneda;
  /** ISO timestamp the row entered the queue (drives the time-in-queue chip). */
  enqueued_at: string;
  cuenta_id: string | null;
  asignacion_note: string | null;
}

/**
 * `carga_manual_solicitud` payload created by the `fin.tesoreria`
 * module CTA "Cargar movimiento manual". Routed to the Inbox for
 * dual-approval (loader ≠ approver).
 */
export interface CargaManualSolicitud {
  sociedad_id: string;
  cuenta_id: string;
  tipo: MovimientoTipo;
  fecha: string;
  monto: number;
  moneda: Moneda;
  contraparte: string | null;
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

// ────────────────────────────────────────────────────────────────────
// Disponibilidades — display shapes (Tesorería page)
// ────────────────────────────────────────────────────────────────────

/** Single account row inside a Sociedad. Numeric fields are
 *  pre-formatted strings (the prototype renders display-ready values
 *  straight from the seed data). */
export interface CuentaPos {
  icon: CuentaIcon;
  name: string;
  /** Detail line under the name (e.g. CBU, wallet hash). */
  det: string;
  /** Pre-formatted balance, no currency symbol. */
  saldo: string;
  /** Debit accumulated. */
  dr: string;
  /** Credit accumulated. */
  cr: string;
  /** Net position. */
  neta: string;
  moneda: Moneda;
}

/** Sociedad totals chip — one per currency held. */
export interface SociedadTotal {
  lbl: Moneda;
  val: string;
}

export interface SociedadPos {
  id: string;
  name: string;
  /** Subtitle under the name (e.g. "PSP · Argentina · ARS"). */
  sub: string;
  open: boolean;
  totals: SociedadTotal[];
  cuentas: CuentaPos[];
}

export interface MovimientoLedger {
  id: string;
  /** Display string already formatted (date + time). */
  fecha: string;
  tipo: MovimientoTipo;
  cuenta: string;
  /** Pre-formatted amount with sign (e.g. "+ 18.500.000"). */
  monto: string;
  moneda: Moneda;
  origen: MovimientoOrigen;
  estado: MovimientoEstado;
}

/**
 * Pre-existing display shape for the legacy `COLA` mock dataset in
 * `src/mocks/fin/disponibilidades.ts`. New code MUST consume the
 * canonical `RetiroCola` record above; this alias keeps the legacy
 * mock seed compiling without forcing a same-PR rewrite.
 */
export interface RetiroEnCola {
  id: string;
  fecha: string;
  cliente: string;
  /** Pre-formatted display amount. */
  monto: string;
  moneda: Moneda;
  /** Time-in-queue display string (e.g. "4 hs 22 min"). */
  tiempo: string;
  cuenta_id: string | null;
  asignacion_note: string | null;
}
