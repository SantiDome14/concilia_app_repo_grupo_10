import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { PaginatedResponse } from '@/types/api';
import type {
  Quote,
  QuoteActivity,
  QuoteStatus,
  QuoteTab,
} from '@/types/quote';

// ════════════════════════════════════════════════════════════════════
// TRD — Quotes module API calls
// ────────────────────────────────────────────────────────────────────
// One typed function per endpoint. Non-2xx responses surface as
// `ApiError` via the shared axios response interceptor.
//
// `listQuotes` accepts the union of all filter dimensions consumed by
// the Quotes page (tab + status + clientId + date range + free-text
// q-OR-filter). The MSW handler implements the semantics; a real
// backend may not yet support every parameter — undeclared params
// SHALL be ignored, not rejected.
// ════════════════════════════════════════════════════════════════════

export interface ListQuotesParams {
  tab?: QuoteTab;
  status?: QuoteStatus | 'ALL';
  clientId?: string;
  /** ISO date (yyyy-mm-dd) — inclusive lower bound on created_at. */
  dateFrom?: string;
  /** ISO date (yyyy-mm-dd) — inclusive upper bound on created_at. */
  dateTo?: string;
  /** Free-text OR across client_name + ardua_docket + quote id. */
  q?: string;
  page: number;
  pageSize: number;
}

export async function listQuotes(
  params: ListQuotesParams,
): Promise<PaginatedResponse<Quote>> {
  const query: Record<string, string | number> = {
    page: params.page,
    pageSize: params.pageSize,
  };
  if (params.tab) query.tab = params.tab;
  if (params.status && params.status !== 'ALL') query.status = params.status;
  if (params.clientId) query.clientId = params.clientId;
  if (params.dateFrom) query.dateFrom = params.dateFrom;
  if (params.dateTo) query.dateTo = params.dateTo;
  if (params.q && params.q.trim()) query.q = params.q.trim();

  const { data } = await apiClient.get<PaginatedResponse<Quote>>(
    ENDPOINTS.quotes.list,
    { params: query },
  );
  return data;
}

export async function getQuote(id: string): Promise<Quote> {
  const { data } = await apiClient.get<Quote>(ENDPOINTS.quotes.detail(id));
  return data;
}

export async function getQuoteActivities(id: string): Promise<QuoteActivity[]> {
  const { data } = await apiClient.get<QuoteActivity[]>(
    ENDPOINTS.quotes.activities(id),
  );
  return data;
}
