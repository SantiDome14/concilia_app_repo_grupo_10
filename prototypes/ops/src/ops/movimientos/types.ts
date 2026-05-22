import type { SponsorCode } from '@/ops/psp/types';

// ════════════════════════════════════════════════════════════════════
// ops-movimientos — domain types
// ────────────────────────────────────────────────────────────────────
// Implements `ops-movimientos` capability. The `Movement` and
// `MovementDetails` types are intentionally permissive (any string +
// metadata bag) so the shared MovementDetailsModal works against any
// Movement-shaped record from any consumer (the /movimientos page here,
// future `ops-psp` Movimientos row click via cross-capability import).
// ════════════════════════════════════════════════════════════════════

/** Movement row in the ledger. */
export interface Movement {
  id: string;
  date: string; // ISO 8601 or backend display string
  type: string;
  status: string;
  amount: string;
  currency: string;
  /** Closed-set transport rail (`SWIFT`, `INTERNAL`, `PIX`, …). See `MOVEMENT_RAIL_OPTIONS`. */
  rail: string | null;
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
  rail?: string;
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
