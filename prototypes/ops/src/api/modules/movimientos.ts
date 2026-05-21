import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoints';
import type {
  Movement,
  MovementDetails,
  MovementsListParams,
  MovementsListResponse,
  ReceiptResponse,
} from '@/ops/movimientos/types';

// ════════════════════════════════════════════════════════════════════
// ops-movimientos — API layer
// ────────────────────────────────────────────────────────────────────
// Wraps the legacy /movements, /movements/:id, /receipt/:id endpoints
// behind the shared `apiClient`. Returns plain typed payloads;
// component-level error surfaces (Skeleton / EmptyState / retry banner /
// toast) live in the components themselves.
//
// The list endpoint tolerates the legacy `{movements, total}` envelope
// shape AND the newer `{data, total}` shape.
// ════════════════════════════════════════════════════════════════════

/** GET /movements with filters + pagination. */
export async function listMovements(
  params: MovementsListParams,
): Promise<MovementsListResponse> {
  const response = await apiClient.get<{
    data?: RawMovement[];
    movements?: RawMovement[];
    total?: number;
  }>(ENDPOINTS.movimientos.list, { params });
  const list =
    (Array.isArray(response.data?.data) && response.data.data) ||
    (Array.isArray(response.data?.movements) && response.data.movements) ||
    [];
  return {
    data: list.map(normaliseMovement),
    total: response.data?.total ?? list.length,
  };
}

/** GET /movements/:id — hydrates the MovementDetailsModal (deep-link + row click). */
export async function getMovement(id: string): Promise<MovementDetails> {
  const response = await apiClient.get<RawMovement>(ENDPOINTS.movimientos.detail(id));
  return normaliseMovementDetails(response.data);
}

/** GET /receipt/:id — discriminated success/failure shape. */
export async function getReceipt(id: string): Promise<ReceiptResponse> {
  try {
    const response = await apiClient.get<{ success?: boolean; url?: string; error?: string }>(
      ENDPOINTS.movimientos.receipt(id),
    );
    if (response.data?.success && response.data.url) {
      return { success: true, url: response.data.url };
    }
    return { success: false, error: response.data?.error ?? 'unknown_error' };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'request_failed' };
  }
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
