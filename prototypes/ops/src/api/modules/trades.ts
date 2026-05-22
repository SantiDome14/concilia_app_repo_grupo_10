import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoints';
import type {
  Quote,
  QuoteDetails,
  QuotesListParams,
  QuotesListResponse,
} from '@/ops/trades/types';

// ════════════════════════════════════════════════════════════════════
// ops-cotizaciones — API layer
// ────────────────────────────────────────────────────────────────────
// Wraps the legacy /quotes endpoint behind the shared `apiClient`.
// The list endpoint tolerates the legacy `{quotes, total}` envelope
// shape AND the newer `{data, total}` shape.
// ════════════════════════════════════════════════════════════════════

/** GET /quotes with filters + pagination. */
export async function listQuotes(
  params: QuotesListParams,
): Promise<QuotesListResponse> {
  const response = await apiClient.get<{
    data?: RawQuote[];
    quotes?: RawQuote[];
    total?: number;
  }>(ENDPOINTS.trades.quotes, { params });
  const list =
    (Array.isArray(response.data?.data) && response.data.data) ||
    (Array.isArray(response.data?.quotes) && response.data.quotes) ||
    [];
  return {
    data: list.map(normaliseQuote),
    total: response.data?.total ?? list.length,
  };
}

/** PATCH /quotes/:id — partial update (used by the manifest engine for status changes). */
export async function updateQuote(
  id: string,
  patch: Record<string, unknown>,
): Promise<Quote> {
  const response = await apiClient.patch<RawQuote>(
    ENDPOINTS.trades.update(id),
    patch,
  );
  return normaliseQuote(response.data);
}

/** GET /quotes/:id — hydrated detail surfaced by QuoteDetailsModal. */
export async function getQuote(id: string): Promise<QuoteDetails> {
  const response = await apiClient.get<RawQuote>(ENDPOINTS.trades.detail(id));
  return {
    ...normaliseQuote(response.data),
    origen_note: response.data?.origen_note ?? null,
    destino_note: response.data?.destino_note ?? null,
    metadata: response.data?.metadata,
  };
}

// ─── Internal normaliser ────────────────────────────────────────────

interface RawQuote {
  id?: string;
  client_id?: string;
  client_name?: string | null;
  origin_currency?: string;
  destination_currency?: string;
  operation?: string;
  term?: string | null;
  origin_amount?: string | number;
  destination_amount?: string | number;
  exchange_rate?: string | number;
  status?: string;
  created_at?: string;
  leg_origen_confirmed?: boolean | null;
  leg_destino_confirmed?: boolean | null;
  origen_note?: string | null;
  destino_note?: string | null;
  metadata?: Record<string, string | number | null | undefined>;
}

function normaliseQuote(raw: RawQuote): Quote {
  return {
    id: String(raw.id ?? ''),
    client_id: String(raw.client_id ?? ''),
    client_name: raw.client_name ?? null,
    origin_currency: String(raw.origin_currency ?? '').toUpperCase(),
    destination_currency: String(raw.destination_currency ?? '').toUpperCase(),
    operation: String(raw.operation ?? '').toUpperCase(),
    term: raw.term ?? null,
    origin_amount: String(raw.origin_amount ?? '0'),
    destination_amount: String(raw.destination_amount ?? '0'),
    exchange_rate: String(raw.exchange_rate ?? '0'),
    status: String(raw.status ?? ''),
    created_at: String(raw.created_at ?? ''),
    leg_origen_confirmed: Boolean(raw.leg_origen_confirmed),
    leg_destino_confirmed: Boolean(raw.leg_destino_confirmed),
  };
}
