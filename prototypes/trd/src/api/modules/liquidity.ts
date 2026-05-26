import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoints';
import type {
  LiquidityActivity,
  LiquidityOperation,
  LiquidityPeriod,
  LiquidityProvider,
  LiquidityStatus,
  LiquiditySummary,
  LiquidityTerm,
} from '@/types/liquidity';

// ════════════════════════════════════════════════════════════════════
// TRD — Liquidity (Proveedores de Liquidez) module API calls
// ────────────────────────────────────────────────────────────────────
// The list endpoint returns a non-standard envelope that pairs the
// paginated `data` with a server-computed `summary` block — the cards
// at the top of the Proveedores page are NOT computed client-side
// (server-side recomputation per the discovery's REQ-1 §3 ensures the
// totals always agree with the active filter set).
// ════════════════════════════════════════════════════════════════════

export interface ListLiquidityParams {
  providerId?: string;
  status?: LiquidityStatus | 'ALL';
  term?: LiquidityTerm | 'ALL';
  period?: LiquidityPeriod;
  /** ISO date (yyyy-mm-dd) — inclusive lower bound on operation_date. */
  dateFrom?: string;
  /** ISO date (yyyy-mm-dd) — inclusive upper bound on operation_date. */
  dateTo?: string;
  page: number;
  pageSize: number;
}

export interface ListLiquidityResponse {
  data: LiquidityOperation[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
  summary: LiquiditySummary;
}

export async function listLiquidityOperations(
  params: ListLiquidityParams,
): Promise<ListLiquidityResponse> {
  const query: Record<string, string | number> = {
    page: params.page,
    pageSize: params.pageSize,
  };
  if (params.providerId) query.providerId = params.providerId;
  if (params.status && params.status !== 'ALL') query.status = params.status;
  if (params.term && params.term !== 'ALL') query.term = params.term;
  if (params.period && params.period !== 'all') query.period = params.period;
  if (params.dateFrom) query.dateFrom = params.dateFrom;
  if (params.dateTo) query.dateTo = params.dateTo;

  const { data } = await apiClient.get<ListLiquidityResponse>(
    ENDPOINTS.liquidity.list,
    { params: query },
  );
  return data;
}

export async function getLiquidityOperation(id: string): Promise<LiquidityOperation> {
  const { data } = await apiClient.get<LiquidityOperation>(
    ENDPOINTS.liquidity.detail(id),
  );
  return data;
}

export async function getLiquidityActivities(id: string): Promise<LiquidityActivity[]> {
  const { data } = await apiClient.get<LiquidityActivity[]>(
    ENDPOINTS.liquidity.activities(id),
  );
  return data;
}

export async function listLiquidityProviders(): Promise<LiquidityProvider[]> {
  const { data } = await apiClient.get<LiquidityProvider[]>(
    ENDPOINTS.liquidity.providers,
  );
  return data;
}
