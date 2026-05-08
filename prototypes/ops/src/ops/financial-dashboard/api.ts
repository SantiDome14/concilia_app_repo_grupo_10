import { apiClient } from '@/api/client';
import type {
  Movement,
  MovementDetails,
  MovementsListParams,
  MovementsListResponse,
  Quote,
  QuotesListParams,
  QuotesListResponse,
  ReceiptResponse,
} from './types';

// ════════════════════════════════════════════════════════════════════
// ops-financial-dashboard — API layer
// ────────────────────────────────────────────────────────────────────
// Wraps the legacy /movements, /quotes, /quote/:id, /receipt/:id
// endpoints behind the shared `apiClient`. Returns plain typed payloads;
// component-level error surfaces (Skeleton / EmptyState / retry banner /
// toast) live in the components themselves per Requirement 9.
//
// Both list endpoints tolerate the legacy `{movements/quotes, total}`
// envelope shape AND the newer `{data, total}` shape.
// ════════════════════════════════════════════════════════════════════

const ENDPOINTS = {
  movements: '/movements',
  movement: (id: string): string => `/movements/${id}`,
  quotes: '/quotes',
  receipt: (id: string): string => `/receipt/${id}`,
} as const;

/** GET /movements with filters + pagination (Requirement 3). */
export async function listMovements(
  params: MovementsListParams,
): Promise<MovementsListResponse> {
  const response = await apiClient.get<{
    data?: RawMovement[];
    movements?: RawMovement[];
    total?: number;
  }>(ENDPOINTS.movements, { params });
  const list =
    (Array.isArray(response.data?.data) && response.data.data) ||
    (Array.isArray(response.data?.movements) && response.data.movements) ||
    [];
  return {
    data: list.map(normaliseMovement),
    total: response.data?.total ?? list.length,
  };
}

/** GET /movements/:id — hydrates the MovementDetailsModal (Requirement 4 + 6c deep-link). */
export async function getMovement(id: string): Promise<MovementDetails> {
  const response = await apiClient.get<RawMovement>(ENDPOINTS.movement(id));
  return normaliseMovementDetails(response.data);
}

/** GET /receipt/:id — discriminated success/failure shape (Requirement 4). */
export async function getReceipt(id: string): Promise<ReceiptResponse> {
  try {
    const response = await apiClient.get<{ success?: boolean; url?: string; error?: string }>(
      ENDPOINTS.receipt(id),
    );
    if (response.data?.success && response.data.url) {
      return { success: true, url: response.data.url };
    }
    return { success: false, error: response.data?.error ?? 'unknown_error' };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'request_failed' };
  }
}

/** GET /quotes with filters + pagination (Requirement 5). */
export async function listQuotes(
  params: QuotesListParams,
): Promise<QuotesListResponse> {
  const response = await apiClient.get<{
    data?: RawQuote[];
    quotes?: RawQuote[];
    total?: number;
  }>(ENDPOINTS.quotes, { params });
  const list =
    (Array.isArray(response.data?.data) && response.data.data) ||
    (Array.isArray(response.data?.quotes) && response.data.quotes) ||
    [];
  return {
    data: list.map(normaliseQuote),
    total: response.data?.total ?? list.length,
  };
}

// ─── Internal normalisers ───────────────────────────────────────────

interface RawMovement {
  id?: string;
  date?: string;
  created_at?: string;
  updated_at?: string;
  type?: string;
  status?: string;
  amount?: string | number;
  currency?: string | { code?: string; name?: string };
  origin?: string | null;
  from?: string | null;
  destination?: string | null;
  to?: string | null;
  sponsor?: string | null;
  provider?: string | null;
  client?: string | { name?: string } | null;
  counterparty?: string | null;
  metadata?: Record<string, string | number | null | undefined>;
}

function pickCurrency(raw: RawMovement): string {
  const c = raw.currency;
  if (typeof c === 'string') return c.toUpperCase();
  if (c && typeof c === 'object') return String(c.code ?? c.name ?? '').toUpperCase();
  return '';
}

function pickClient(raw: RawMovement): string | null {
  if (typeof raw.client === 'string') return raw.client;
  if (raw.client && typeof raw.client === 'object' && 'name' in raw.client) {
    return raw.client.name ?? null;
  }
  return null;
}

function normaliseMovement(raw: RawMovement): Movement {
  return {
    id: String(raw.id ?? ''),
    date: String(raw.date ?? raw.created_at ?? ''),
    type: String(raw.type ?? ''),
    status: String(raw.status ?? ''),
    amount: String(raw.amount ?? '0'),
    currency: pickCurrency(raw),
    origin: raw.origin ?? raw.from ?? null,
    destination: raw.destination ?? raw.to ?? null,
    sponsor: raw.sponsor ?? raw.provider ?? null,
    client: pickClient(raw),
    counterparty: raw.counterparty ?? null,
  };
}

function normaliseMovementDetails(raw: RawMovement): MovementDetails {
  return {
    ...normaliseMovement(raw),
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    metadata: raw.metadata,
  };
}

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
  };
}
