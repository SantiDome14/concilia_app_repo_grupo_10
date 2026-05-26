import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { PaginatedResponse } from '@/types/api';
import type { Client, ClientBalance, ClientLimit } from '@/types/client';

// ════════════════════════════════════════════════════════════════════
// TRD — Clientes module API calls
// ────────────────────────────────────────────────────────────────────
// One typed function per endpoint. Non-2xx responses surface as
// `ApiError` via the shared axios response interceptor — see
// `core-api-layer` and `src/api/client.ts`.
// ════════════════════════════════════════════════════════════════════

export interface ListClientsParams {
  q?: string;
  page: number;
  pageSize: number;
}

export async function listClients(
  params: ListClientsParams,
): Promise<PaginatedResponse<Client>> {
  // Pass only the keys that have values — sending `q=` (empty) would
  // hit the handler with an empty filter and produce 0 results.
  const query: Record<string, string | number> = {
    page: params.page,
    pageSize: params.pageSize,
  };
  if (params.q && params.q.trim()) query.q = params.q.trim();

  const { data } = await apiClient.get<PaginatedResponse<Client>>(
    ENDPOINTS.clients.list,
    { params: query },
  );
  return data;
}

export async function getClient(id: string): Promise<Client> {
  const { data } = await apiClient.get<Client>(ENDPOINTS.clients.detail(id));
  return data;
}

export async function getClientLimits(id: string): Promise<ClientLimit[]> {
  const { data } = await apiClient.get<ClientLimit[]>(ENDPOINTS.clients.limits(id));
  return data;
}

export async function getClientBalances(id: string): Promise<ClientBalance[]> {
  const { data } = await apiClient.get<ClientBalance[]>(ENDPOINTS.clients.balances(id));
  return data;
}
