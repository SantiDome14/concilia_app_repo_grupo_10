// ════════════════════════════════════════════════════════════════════
// ops-banks-accounts — domain types
// ────────────────────────────────────────────────────────────────────
// Master catalog of Sociedad → Estructura → Cuenta. Implements the
// `ops-banks-accounts` capability. Accounting metadata is owned by the
// upcoming `fin` app, which consumes this register; OPS keeps the
// operational shape only.
// ════════════════════════════════════════════════════════════════════

/** Type of institution where Ardua holds an account. */
export type EstructuraTipo =
  | 'Banco'
  | 'Banco digital'
  | 'ALyC'
  | 'Exchange'
  | 'Custodio'
  | 'PSP'
  | 'Proveedor';

/** Operational nature of an account, independent of structure. */
export type CuentaTipo =
  | 'Cuenta Corriente'
  | 'CVU'
  | 'Wallet Pool'
  | 'Custodia'
  | 'Exchange Account'
  | 'Comitente';

/** Currencies supported by the catalog (v1 fixed set per design Decision 9). */
export type Moneda = 'ARS' | 'USD' | 'USDC' | 'USDT' | 'BTC';

/** Soft-delete status applied to every catalog entity. */
export type EstadoCatalogo = 'Activa' | 'Inactiva';

/** Legal entity that owns one or more accounts. */
export interface Sociedad {
  id: string;
  name: string;
  status: EstadoCatalogo;
}

/** Institution (bank, exchange, ALyC, etc.) where Ardua holds accounts. */
export interface Estructura {
  id: string;
  name: string;
  tipo: EstructuraTipo;
  status: EstadoCatalogo;
}

/** Single account at an Estructura, owned by a Sociedad. */
export interface Cuenta {
  id: string;
  sociedadId: string;
  estructuraId: string;
  moneda: Moneda;
  tipoCuenta: CuentaTipo;
  nro: string;
  /** Optional self-FK: PSP ARS CVUs nest under the institution's master CBU. */
  padreCuentaId?: string | null;
  status: EstadoCatalogo;
}

/**
 * Denormalised row shape consumed by the page. One row per Cuenta with
 * its Sociedad / Estructura inline so the table can render badges and
 * labels without N+1 lookups.
 */
export interface BankAccountRecord {
  id: string;
  sociedad: string;
  estructura: string;
  estructuraTipo: EstructuraTipo;
  tipoCuenta: CuentaTipo;
  moneda: Moneda;
  nro: string;
  /** Pre-resolved label of the parent account (e.g. "CBU Haz Pagos · Coinag"). */
  cuentaPadreLabel?: string | null;
  /** Reference to the parent Cuenta's id, used by the Edit modal to prefill the parent select. */
  padreCuentaId?: string | null;
  status: EstadoCatalogo;
}

/** Body for `POST /api/banks-accounts/structures`. */
export interface CreateStructurePayload {
  name: string;
  tipo: EstructuraTipo;
}

/** Body for `POST /api/banks-accounts`. */
export interface CreateAccountPayload {
  sociedadId: string;
  estructuraId: string;
  tipoCuenta: CuentaTipo;
  moneda: Moneda;
  nro: string;
  padreCuentaId?: string | null;
}

/** Body for `PATCH /api/banks-accounts/:id` (Edit-Account flow). */
export interface UpdateAccountPayload {
  tipoCuenta: CuentaTipo;
  moneda: Moneda;
  nro: string;
  padreCuentaId?: string | null;
  status: EstadoCatalogo;
}

/**
 * Sensible default `CuentaTipo` derived from the Estructura's `tipo`.
 * Operators can override in the form, but this preselects the 90 %
 * common case. See design Decision 2.
 */
export function defaultCuentaTipoFor(tipo: EstructuraTipo): CuentaTipo {
  switch (tipo) {
    case 'Banco':
    case 'Banco digital':
      return 'Cuenta Corriente';
    case 'Exchange':
      return 'Exchange Account';
    case 'ALyC':
      return 'Comitente';
    case 'Custodio':
      return 'Custodia';
    case 'PSP':
      return 'CVU';
    case 'Proveedor':
      return 'Wallet Pool';
  }
}
