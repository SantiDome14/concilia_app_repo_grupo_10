// ════════════════════════════════════════════════════════════════════
// TRD — Liquidity (Proveedores de Liquidez) domain types
// ────────────────────────────────────────────────────────────────────
// Blotter of buy/sell operations the Mesa executes with external
// brokers. Lifecycle is intentionally narrow (PENDING → RECEIVED, plus
// CANCELLED escape hatch — present in the legacy types but not
// surfaced via UI mutation in v1).
//
// Summary carries an optional `secondary_currency` block for REQ-35
// (Contravalor ARS) — when the active filter resolves to a single
// currency pair the backend returns the totals in the quote currency
// alongside the USD totals.
//
// Reference: discoveries/trd-proveedores-de-liquidez-discovery.md
// ════════════════════════════════════════════════════════════════════

export type LiquidityOperationType = 'BUY' | 'SELL';

export type LiquidityStatus = 'PENDING' | 'RECEIVED' | 'CANCELLED';

export type LiquidityTerm = 'T0' | 'T+1' | 'T+2';

export type LiquidityPeriod = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'all';

export interface LiquidityProvider {
  id: string;
  name: string;
}

export interface LiquidityOperation {
  id: string;
  provider_id: string;
  provider_name: string;
  operation_type: LiquidityOperationType;
  pair_id: string;
  base_currency_code: string;
  quote_currency_code: string;
  /** Decimal string to preserve precision. */
  origin_amount: string;
  exchange_rate: string;
  /** Decimal string to preserve precision. */
  destination_amount: string;
  term: LiquidityTerm;
  operation_date: string;
  settlement_date: string | null;
  ardua_company: string | null;
  notes: string | null;
  status: LiquidityStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Server-side aggregate summary returned alongside the paginated list.
 * `secondary_*` fields populate when the filter narrows to a single
 * pair AND the quote currency is non-USD (REQ-35).
 */
export interface LiquiditySummary {
  total_operations: number;
  pending_count: number;
  received_count: number;
  total_usd: string;
  usd_bought: string;
  usd_sold: string;
  secondary_currency?: string;
  total_secondary?: string;
  secondary_bought?: string;
  secondary_sold?: string;
}

export interface LiquidityActivity {
  id: string;
  at: string;
  actor_id: string;
  actor_name: string;
  kind: 'state_change' | 'field_update' | 'comment_added' | 'system';
  label: string;
  details?: Record<string, unknown>;
}

/**
 * Open-set catalog: legal entities Ardua trades from. Surfaces in the
 * future quote-create modal (deferred to `add-trd-proveedores-create`).
 * Per MIGRATION-NOTES §14, this is open-set from day one — the group
 * can change with corporate restructure.
 */
export const ARDUA_COMPANIES: { id: string; label: string }[] = [
  { id: 'circuit-pay',          label: 'Circuit Pay' },
  { id: 'haz-pagos',            label: 'Haz Pagos' },
  { id: 'ardua-solutions-corp', label: 'Ardua Solutions Corp' },
  { id: 'nerghis-srl',          label: 'Nerghis SRL' },
];
