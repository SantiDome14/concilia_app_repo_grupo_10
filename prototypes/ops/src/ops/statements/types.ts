// ════════════════════════════════════════════════════════════════════
// ops-statements — domain types
// ────────────────────────────────────────────────────────────────────
// Implements `ops-statements` capability. The shape mirrors the
// legacy backend (`POST /statement` returning `{ success, status_code,
// url }`) and intentionally surfaces a discriminated `StatementResult`
// to the modal so the UI can render success / business-error / abort
// without inspecting `ApiError` shape directly.
// ════════════════════════════════════════════════════════════════════

import type { ClientId } from '@/ops/clients/types';

/** Closed enum for the 8 quick-filter chips per Requirement 4. */
export type StatementQuickFilterKey =
  | 'last-7-days'
  | 'last-15-days'
  | 'last-30-days'
  | 'current-month'
  | 'last-month'
  | 'last-3-months'
  | 'last-6-months'
  | 'current-year';

/** Public quick-filter shape exposed to the UI. */
export interface StatementQuickFilter {
  key: StatementQuickFilterKey;
  label: string;
}

/** Concrete date range produced by `resolveQuickFilter`. */
export interface DateRange {
  /** Inclusive start day (00:00:00 UTC). */
  from: Date;
  /** Inclusive end day (23:59:59 UTC after toApiPayload). */
  to: Date;
}

/** Body for `POST /statement`. */
export interface StatementRequest {
  client_id: ClientId;
  account_id: string;
  /** ISO 8601 with `T00:00:00Z` suffix per Requirement 5. */
  date_from: string;
  /** ISO 8601 with `T23:59:59Z` suffix per Requirement 5 (end day inclusive). */
  date_to: string;
}

/** Backend success envelope. */
export interface StatementSuccessResponse {
  success: true;
  status_code: number;
  url: string;
}

/** Backend failure envelope (business errors). */
export interface StatementFailureResponse {
  success: false;
  status_code?: number;
  error?: string;
  message?: string;
}

export type StatementResponse = StatementSuccessResponse | StatementFailureResponse;

/**
 * Discriminated result of `requestStatement`. The modal pattern-matches
 * to render success (open URL + toast), business failure (toast with
 * message, modal stays open), abort (cancel notice), or transport
 * failure (generic toast).
 */
export type StatementResult =
  | { status: 'ok'; url: string }
  | { status: 'business-error'; message: string }
  | { status: 'aborted' }
  | { status: 'failed'; message: string };

/**
 * Persisted shape for `localStorage` per Requirement 4 / Decision 7b.
 * Either the chip key (so the range re-resolves relative to today on
 * the next opening) OR a literal `{from,to}` (for custom ranges that
 * stay literal).
 */
export type PersistedRange =
  | { kind: 'chip'; chipKey: StatementQuickFilterKey }
  | { kind: 'literal'; from: string; to: string };
