// ════════════════════════════════════════════════════════════════════
// ops-cotizaciones — domain types
// ────────────────────────────────────────────────────────────────────
// Implements `ops-cotizaciones` capability. Quotes ledger is read-only
// in v1; quote action modals (Pay / DirectSwap / Unsupported) defer
// to `extend-ops-cotizaciones-quote-actions`.
// ════════════════════════════════════════════════════════════════════

/** Closed enum of sub-toggle views. */
export type QuotesView = 'active' | 'historic';

/** Quote row in the ledger. */
export interface Quote {
  id: string;
  client_id: string;
  client_name: string | null;
  origin_currency: string;
  destination_currency: string;
  /** BUY / SELL. */
  operation: string;
  /** Term (e.g. T+0, T+1) — may be null on legacy data. */
  term: string | null;
  origin_amount: string;
  destination_amount: string;
  exchange_rate: string;
  status: string;
  /** ISO 8601 timestamp. */
  created_at: string;
}

/** Listing query params for Quotes. */
export interface QuotesListParams {
  /** Empty string ↔ no filter; the API treats `''` as wildcard. */
  client_id?: string;
  operation?: string;
  /** Currency-pair filter applied client-side OR forwarded as backend param. */
  pair?: string;
  /** Maps to the legacy `?status=ACCEPTED` for active view; absent for historic. */
  status?: string;
  page: number;
  pageSize: number;
}

/** Listing envelope for Quotes. */
export interface QuotesListResponse {
  data: Quote[];
  total: number;
}
