// ════════════════════════════════════════════════════════════════════
// TRD — Quote domain types
// ────────────────────────────────────────────────────────────────────
// The OTC Quote entity used by the Mesa de Dinero / Quotes module.
//
// Lifecycle (legacy parity, §15 Decision H resolved):
//   PENDING → ACCEPTED → COMPLETED · CANCELLED
//
// The discovery (trd-discovery.md §5.1) lists a PAID step between
// ACCEPTED and COMPLETED, but the legacy `core-trd-frontend` never
// implemented it (verified in core-trd-frontend/src/types/quote.ts:109).
// For v1 we ship legacy parity. PAID is a future refinement that lands
// as `extend-trd-quote-paid-step` if/when the backend exposes the
// transition.
//
// Term codes (T0 / T+1 / T+2) are hardcoded in the legacy — kept as a
// closed union here, will be moved to an open-set catalog
// (`src/trd/quotes/term-catalog.ts`) when `add-trd-quote-create`
// lands (it needs the business-day calc helpers per term).
// ════════════════════════════════════════════════════════════════════

export type QuoteOperation = 'BUY' | 'SELL';

export type QuoteStatus = 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED';

export type QuoteTerm = 'T0' | 'T+1' | 'T+2';

/** The active / historical split that the tabs in the Quotes page use. */
export type QuoteTab = 'activos' | 'historial';

/**
 * Active statuses (the Activos tab). The Historial tab shows the union
 * of all statuses.
 */
export const ACTIVE_QUOTE_STATUSES: QuoteStatus[] = ['PENDING', 'ACCEPTED'];

export interface Quote {
  id: string;
  client_id: string;
  client_name: string;
  ardua_docket: string | null;
  operation: QuoteOperation;
  origin_currency: string;
  origin_amount: string;
  destination_currency: string;
  destination_amount: string;
  exchange_rate: string;
  term: QuoteTerm;
  status: QuoteStatus;
  /** ISO-8601 string (UTC). */
  created_at: string;
  /** ISO-8601 string (UTC). */
  liquidate_date: string | null;
  notes: string | null;
  /** CCC grouping — non-null when the quote is part of a 3-leg CCC. */
  ccc_group_id: string | null;
}

/**
 * Attachment metadata persisted on a quote. v1 is metadata-only —
 * the prototype does NOT store the actual file bytes; the real upload
 * via `useFileUpload` + presigned URLs lands as
 * `extend-trd-quote-attachments-upload`.
 */
export interface QuoteAttachment {
  id: string;
  filename: string;
  /** Bytes. */
  size: number;
  /** MIME type best-effort from the picker. */
  mime: string;
  /** Optional operator comment describing the attachment. */
  comment: string | null;
  uploaded_at: string;
  uploaded_by: string;
}

/**
 * One row of the quote's activity log (`GET /quotes/:id/activities`).
 * Maps 1:1 onto the cross-cutting `TimelineEvent` shape used by the
 * shared `<Drawer>` / `<Timeline>` components; the API module performs
 * the mapping at the boundary so the page consumes `TimelineEvent[]`
 * directly.
 */
export interface QuoteActivity {
  id: string;
  /** ISO-8601 string (UTC). */
  at: string;
  actor_id: string;
  actor_name: string;
  kind: 'state_change' | 'field_update' | 'comment_added' | 'system';
  label: string;
  details?: Record<string, unknown>;
}
