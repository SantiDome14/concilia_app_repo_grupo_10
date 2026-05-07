// ════════════════════════════════════════════════════════════════════
// FIN domain types — Disponibilidades (Tesorería)
// ────────────────────────────────────────────────────────────────────
// Mirrors the data shapes of the legacy fin-prototype.html `POS_TREE`,
// `TES_MOVS`, and `COLA` datasets. Apps SHALL extend or replace these
// with their backend contract; the shapes below are the prototyping
// surface.
// ════════════════════════════════════════════════════════════════════

export type CuentaIcon = 'bank' | 'wallet';

/** Currency code displayed next to balances (open string union). */
export type Moneda = 'ARS' | 'USD' | 'USDC' | 'USDT' | 'CAD' | 'EUR' | string;

/** Single account row inside a Sociedad. Numeric fields are pre-formatted strings
 *  (the prototype renders display-ready values straight from the seed data). */
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

// ────────────────────────────────────────────────────────────────────
// Ledger movements (Tab "Movimientos")
// ────────────────────────────────────────────────────────────────────

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
  | 'ADDITION'
  | string;

export type MovimientoOrigen = 'OPS' | 'MAN' | 'MANOK';

export type MovimientoEstado = 'CONF' | 'COLA' | 'PEND';

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

// ────────────────────────────────────────────────────────────────────
// Cola de Asignación (Tab "Cola de Asignación")
// ────────────────────────────────────────────────────────────────────

export interface RetiroEnCola {
  id: string;
  fecha: string;
  cliente: string;
  monto: string;
  moneda: Moneda;
  /** Time-in-queue display string (e.g. "4 hs 22 min"). */
  tiempo: string;
  /** Once an account is assigned the row leaves the queue. */
  cuenta_id: string | null;
  asignacion_note: string | null;
}
