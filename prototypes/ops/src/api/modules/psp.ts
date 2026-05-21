import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoints';
import type {
  AccountsListParams,
  AccountsListResponse,
  CoinagHealth,
  MovementsListParams,
  MovementsListResponse,
  ReconciliationResponse,
  SponsorBalance,
  SwiftTransactionsResponse,
} from '@/ops/psp/types';

// ════════════════════════════════════════════════════════════════════
// ops-psp — API layer
// ────────────────────────────────────────────────────────────────────
// Wraps the legacy PSP backend endpoints behind the shared `apiClient`.
// Every function returns plain typed payloads; component-level error
// surfaces (Skeleton / EmptyState / retry banner / toast) live in the
// components themselves per Requirement 9.
//
// The Coinag health response is normalised to always include a
// `checked_at` timestamp so the indicator can render "stale" semantics
// even when the backend doesn't echo it back.
// ════════════════════════════════════════════════════════════════════

/**
 * GET /coinag/health — polled every 60 s by the page (Requirement 8).
 * Normalises status to one of the closed enum values; the backend may
 * return arbitrary strings, in which case we map to `degraded` as a
 * defensive default.
 */
export async function getCoinagHealth(): Promise<CoinagHealth> {
  try {
    const response = await apiClient.get<{ status?: string; message?: string | null }>(
      ENDPOINTS.psp.health,
    );
    const raw = response.data?.status?.toLowerCase() ?? '';
    let status: CoinagHealth['status'];
    if (raw === 'healthy' || raw === 'ok' || raw === 'up') status = 'healthy';
    else if (raw === 'down' || raw === 'unavailable' || raw === 'failed') status = 'down';
    else status = 'degraded';
    return {
      status,
      message: response.data?.message ?? null,
      checked_at: new Date().toISOString(),
    };
  } catch {
    return {
      status: 'down',
      message: 'No se pudo contactar al servicio de salud',
      checked_at: new Date().toISOString(),
    };
  }
}

/**
 * GET /balance-reconciliation — returns an envelope with per-sponsor
 * mismatches and balances.
 */
export async function getReconciliation(): Promise<ReconciliationResponse> {
  const response = await apiClient.get<ReconciliationResponse>(ENDPOINTS.psp.reconciliation);
  return {
    mismatches: response.data?.mismatches ?? [],
  };
}

/** Sponsor balances — sourced from the same reconciliation endpoint. */
export async function listSponsorBalances(): Promise<SponsorBalance[]> {
  const response = await apiClient.get<{
    balances?: SponsorBalance[];
    mismatches?: Array<{ sponsor: string; api_balance: string; checked_at: string }>;
  }>(ENDPOINTS.psp.reconciliation);
  if (response.data?.balances && response.data.balances.length > 0) {
    return response.data.balances;
  }
  return (response.data?.mismatches ?? []).map((m) => ({
    sponsor: m.sponsor,
    balance: m.api_balance,
    checked_at: m.checked_at,
    currency: 'ARS',
  }));
}

/** GET /movements with filters + pagination (Requirement 5). */
export async function listMovements(
  params: MovementsListParams,
): Promise<MovementsListResponse> {
  const response = await apiClient.get<{
    data?: PspMovementResponse[];
    total?: number;
    movements?: PspMovementResponse[];
  }>(ENDPOINTS.psp.movements, { params });
  const list =
    (Array.isArray(response.data?.data) && response.data.data) ||
    (Array.isArray(response.data?.movements) && response.data.movements) ||
    [];
  return {
    data: list.map(normaliseMovement),
    total: response.data?.total ?? list.length,
  };
}

/** GET /accounts with filters + pagination (Requirement 6). */
export async function listAccounts(
  params: AccountsListParams,
): Promise<AccountsListResponse> {
  const response = await apiClient.get<{
    data?: PspAccountResponse[];
    total?: number;
    accounts?: PspAccountResponse[];
  }>(ENDPOINTS.psp.accounts, { params });
  const list =
    (Array.isArray(response.data?.data) && response.data.data) ||
    (Array.isArray(response.data?.accounts) && response.data.accounts) ||
    [];
  return {
    data: list.map(normaliseAccount),
    total: response.data?.total ?? list.length,
  };
}

/**
 * GET /accounts/:id/swift-transactions — drawer drill-down per
 * Requirement 6.
 */
export async function listSwiftTransactionsForAccount(
  accountId: string,
): Promise<SwiftTransactionsResponse> {
  const response = await apiClient.get<{
    data?: unknown[];
    total?: number;
    transactions?: unknown[];
  }>(ENDPOINTS.psp.swiftTransactionsForAccount(accountId));
  const list =
    (Array.isArray(response.data?.data) && response.data.data) ||
    (Array.isArray(response.data?.transactions) && response.data.transactions) ||
    [];
  return {
    data: list as SwiftTransactionsResponse['data'],
    total: response.data?.total ?? list.length,
  };
}

// ─── Internal normalisers ───────────────────────────────────────────

interface PspMovementResponse {
  id?: string;
  date?: string;
  created_at?: string;
  type?: string;
  status?: string;
  amount?: string | number;
  partner?: string | null;
  client?: string | { name?: string } | null;
  counterparty?: string | null;
  sponsor?: string | null;
  provider?: string | null;
}

function normaliseMovement(raw: PspMovementResponse): MovementsListResponse['data'][number] {
  const clientName =
    typeof raw.client === 'string'
      ? raw.client
      : raw.client && typeof raw.client === 'object' && 'name' in raw.client
        ? (raw.client.name ?? null)
        : null;
  return {
    id: String(raw.id ?? ''),
    date: String(raw.date ?? raw.created_at ?? ''),
    type: String(raw.type ?? ''),
    status: String(raw.status ?? ''),
    amount: String(raw.amount ?? '0'),
    partner: raw.partner ?? null,
    client: clientName,
    counterparty: raw.counterparty ?? null,
    sponsor: raw.sponsor ?? raw.provider ?? null,
  };
}

interface PspAccountResponse {
  id?: string;
  account_number?: string;
  cbu?: string;
  cvu?: string;
  alias?: string;
  currency?: string | { code?: string; name?: string };
  balance?: string | number;
  owner?: string | null;
  holder?: string | null;
  status?: string;
  sponsor?: string | null;
  provider?: string | null;
}

function normaliseAccount(raw: PspAccountResponse): AccountsListResponse['data'][number] {
  const currencyValue =
    typeof raw.currency === 'string'
      ? raw.currency
      : raw.currency && typeof raw.currency === 'object'
        ? (raw.currency.code ?? raw.currency.name ?? '')
        : '';
  return {
    id: String(raw.id ?? ''),
    account_number: String(raw.account_number ?? raw.cvu ?? raw.cbu ?? ''),
    currency: String(currencyValue).toUpperCase(),
    balance: String(raw.balance ?? '0'),
    owner: raw.owner ?? raw.holder ?? null,
    status: String(raw.status ?? 'ACTIVE'),
    sponsor: raw.sponsor ?? raw.provider ?? null,
    cvu: raw.cvu,
    alias: raw.alias,
  };
}
