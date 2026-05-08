import type { SponsorCode } from '@/ops/psp/types';

// ════════════════════════════════════════════════════════════════════
// ops-financial-dashboard — domain types
// ────────────────────────────────────────────────────────────────────
// Implements `ops-financial-dashboard` capability. The `Movement` and
// `MovementDetails` types are intentionally permissive (any string +
// metadata bag) so the shared MovementDetailsModal works against any
// Movement-shaped record from any consumer (Activity tab here, future
// `ops-psp` Movimientos row click).
// ════════════════════════════════════════════════════════════════════

/** Closed enum of dashboard tabs. */
export type DashboardTab = 'activity' | 'quotes';

/** Closed enum of Quotes sub-toggle views. */
export type QuotesView = 'active' | 'historic';

/** Movement row in the Activity ledger. */
export interface Movement {
  id: string;
  date: string; // ISO 8601 or backend display string
  type: string;
  status: string;
  amount: string;
  currency: string;
  origin: string | null;
  destination: string | null;
  sponsor: SponsorCode | null;
  client: string | null;
  counterparty: string | null;
}

/**
 * Hydrated Movement payload returned by `GET /movements/:id` for the
 * MovementDetailsModal. Extends the listing row with optional
 * timestamps + an open metadata bag.
 */
export interface MovementDetails extends Movement {
  created_at?: string;
  updated_at?: string;
  /** Backend-defined arbitrary fields displayed in the modal as a list. */
  metadata?: Record<string, string | number | null | undefined>;
}

/** Listing query params. */
export interface MovementsListParams {
  sponsor?: SponsorCode;
  type?: string;
  status?: string;
  origin?: string;
  search?: string;
  page: number;
  pageSize: number;
}

/** Listing envelope. */
export interface MovementsListResponse {
  data: Movement[];
  total: number;
}

/** Receipt download response from `GET /receipt/:id`. */
export type ReceiptResponse =
  | { success: true; url: string }
  | { success: false; error?: string };

/** Quote row in the Quotes ledger. */
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
