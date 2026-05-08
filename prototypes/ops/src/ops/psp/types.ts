// ════════════════════════════════════════════════════════════════════
// ops-psp — domain types
// ────────────────────────────────────────────────────────────────────
// Implements `ops-psp` capability. The Banco Sponsor abstraction is
// open-set per design.md Decision 2 (Coinag active today; BIND +
// Banco de Comercio in roadmap).
// ════════════════════════════════════════════════════════════════════

/** Closed enum of tab ids. URL `?tab=` query param uses these. */
export type PspTab = 'disponibilidad' | 'movimientos' | 'cuentas';

/** Open-set sponsor codes. Catalog lives in `sponsor-catalog.ts`. */
export type SponsorCode = string;

/** Catalog entry per banco sponsor. */
export interface BancoSponsor {
  code: SponsorCode;
  /** Display label (uppercase). */
  label: string;
  /** Whether the sponsor is integrated today (controls visibility). */
  active: boolean;
  /** Logo asset path (under /public). Optional during pre-integration. */
  logo?: string;
  /** Tag colour for badges/cards (semantic). */
  tone?: 'brand' | 'info' | 'warning' | 'success' | 'danger' | 'neutral';
}

/** Single sponsor's balance + reconciliation snapshot. */
export interface SponsorBalance {
  sponsor: SponsorCode;
  /** Current balance reported by the sponsor (string for precision). */
  balance: string;
  /** ISO 8601 timestamp of the last refresh. */
  checked_at: string;
  /** Currency code; today defaults to ARS for Coinag. */
  currency: string;
}

/** Reconciliation snapshot per sponsor. */
export interface ReconciliationMismatch {
  sponsor: SponsorCode;
  db_balance: string;
  api_balance: string;
  /** Signed difference: positive = surplus, negative = deficit. */
  difference: string;
  checked_at: string;
}

/** Top-level reconciliation response from `GET /balance-reconciliation`. */
export interface ReconciliationResponse {
  mismatches: ReconciliationMismatch[];
}

/** Coinag health status — closed enum. */
export type CoinagHealthStatus = 'healthy' | 'degraded' | 'down';

/** Health response from `GET /coinag/health`. */
export interface CoinagHealth {
  status: CoinagHealthStatus;
  message: string | null;
  /** ISO 8601 timestamp of the last check (set by the frontend). */
  checked_at: string;
}

/** Movement row in the Movimientos tab ledger. */
export interface PspMovement {
  id: string;
  /** ISO 8601 or backend display string. */
  date: string;
  type: string;
  status: string;
  amount: string;
  partner: string | null;
  client: string | null;
  counterparty: string | null;
  /** Sponsor that originated the movement (for the per-sponsor filter). */
  sponsor: SponsorCode | null;
}

/** Movement listing query params. */
export interface MovementsListParams {
  sponsor?: SponsorCode;
  type?: string;
  status?: string;
  origin?: string;
  search?: string;
  page: number;
  pageSize: number;
}

/** Movement listing envelope. */
export interface MovementsListResponse {
  data: PspMovement[];
  total: number;
}

/** Account row in the Cuentas tab. */
export interface PspAccount {
  id: string;
  account_number: string;
  /** Currency code (e.g. 'ARS', 'USD'). */
  currency: string;
  /** Current balance for the account. */
  balance: string;
  owner: string | null;
  /** Operational status (e.g. ACTIVE, PAUSED). */
  status: string;
  /** Sponsor providing the account (Coinag/BIND/...). */
  sponsor: SponsorCode | null;
  /** Optional Coinag-specific fields surfaced in the drawer. */
  cvu?: string;
  alias?: string;
}

/** Account listing query params. */
export interface AccountsListParams {
  sponsor?: SponsorCode;
  search?: string;
  page: number;
  pageSize: number;
}

/** Account listing envelope. */
export interface AccountsListResponse {
  data: PspAccount[];
  total: number;
}

/** Single SWIFT transaction row inside the Cuentas drill-down drawer. */
export interface SwiftTransaction {
  id: string;
  date: string;
  message_type: string;
  amount: string;
  currency: string;
  counterparty: string | null;
  status: string;
}

/** SWIFT transactions envelope per account. */
export interface SwiftTransactionsResponse {
  data: SwiftTransaction[];
  total: number;
}
