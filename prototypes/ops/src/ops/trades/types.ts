// ════════════════════════════════════════════════════════════════════
// ops-cotizaciones — domain types
// ────────────────────────────────────────────────────────────────────
// Implements `ops-cotizaciones` capability. Quotes ledger is read-only
// in v1; quote action modals (Pay / DirectSwap / Unsupported) defer
// to `extend-ops-cotizaciones-quote-actions`.
// ════════════════════════════════════════════════════════════════════

/** Period filter values consumed by both the filter UI and the page-level filtering predicate. */
export type QuotesPeriod = 'todo' | 'dia' | 'semana' | 'mes';

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
  /**
   * Settlement-leg confirmation checks recorded by OPS. The lado-origen
   * leg is the side where funds enter Ardua's perimeter (external
   * transfer received OR internal debit from a client's Ardua account);
   * the lado-destino leg is the opposite. Both default to `false` until
   * the operator runs the confirmar_origen / confirmar_destino manifest
   * actions. These flags are NOT rendered as columns in the list — they
   * surface in the QuoteDetailsModal and as the two drag-droppable
   * kanban axes.
   */
  leg_origen_confirmed?: boolean;
  leg_destino_confirmed?: boolean;
}

/** Hydrated detail payload for QuoteDetailsModal (`GET /quotes/:id`). */
export interface QuoteDetails extends Quote {
  /** Operator-attached notes from prior actions (origen_note / destino_note). */
  origen_note?: string | null;
  destino_note?: string | null;
  /** Free-form metadata bag rendered as a list at the bottom of the modal. */
  metadata?: Record<string, string | number | null | undefined>;
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
