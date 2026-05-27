import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoints';
import type { PaginatedResponse } from '@/types/api';
import type {
  Quote,
  QuoteActivity,
  QuoteAttachment,
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

export interface CreateQuotePayload {
  client_id: string;
  operation: 'BUY' | 'SELL';
  origin_currency: string;
  origin_amount: string;
  destination_currency: string;
  destination_amount: string;
  exchange_rate: string;
  term: 'T0' | 'T+1' | 'T+2';
  notes?: string | null;
  liquidate_date?: string | null;
}

export async function createQuote(payload: CreateQuotePayload): Promise<Quote> {
  const { data } = await apiClient.post<Quote>(
    ENDPOINTS.quotes.create,
    payload,
  );
  return data;
}

export interface UpdateQuotePayload {
  notes?: string | null;
  /** ISO-8601 string or `null` to clear. */
  liquidate_date?: string | null;
  /** Status transitions allowed via this endpoint: ACCEPTED, CANCELLED, COMPLETED. */
  status?: 'ACCEPTED' | 'CANCELLED' | 'COMPLETED';
}

export async function updateQuote(
  id: string,
  payload: UpdateQuotePayload,
): Promise<Quote> {
  const { data } = await apiClient.patch<Quote>(
    ENDPOINTS.quotes.update(id),
    payload,
  );
  return data;
}

export async function cancelQuote(id: string): Promise<Quote> {
  return updateQuote(id, { status: 'CANCELLED' });
}

// ─── Attachments ────────────────────────────────────────────────
// v1 is metadata-only. The full presigned-URL upload flow lands as
// `extend-trd-quote-attachments-upload`.

export interface CreateAttachmentPayload {
  filename: string;
  size: number;
  mime: string;
  comment?: string | null;
}

export interface UpdateAttachmentPayload {
  comment?: string | null;
}

export async function listQuoteAttachments(
  quoteId: string,
): Promise<QuoteAttachment[]> {
  const { data } = await apiClient.get<QuoteAttachment[]>(
    ENDPOINTS.quotes.attachments.list(quoteId),
  );
  return data;
}

export async function createQuoteAttachment(
  quoteId: string,
  payload: CreateAttachmentPayload,
): Promise<QuoteAttachment> {
  const { data } = await apiClient.post<QuoteAttachment>(
    ENDPOINTS.quotes.attachments.create(quoteId),
    payload,
  );
  return data;
}

export async function updateQuoteAttachment(
  quoteId: string,
  attachmentId: string,
  payload: UpdateAttachmentPayload,
): Promise<QuoteAttachment> {
  const { data } = await apiClient.patch<QuoteAttachment>(
    ENDPOINTS.quotes.attachments.update(quoteId, attachmentId),
    payload,
  );
  return data;
}

export async function deleteQuoteAttachment(
  quoteId: string,
  attachmentId: string,
): Promise<void> {
  await apiClient.delete(ENDPOINTS.quotes.attachments.delete(quoteId, attachmentId));
}
