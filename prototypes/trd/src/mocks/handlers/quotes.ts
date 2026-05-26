// ════════════════════════════════════════════════════════════════════
// MSW handlers — TRD / Quotes
// ────────────────────────────────────────────────────────────────────
// Fulfils ENDPOINTS.quotes.{list, detail, activities}. Implements the
// union of filters consumed by the Quotes page:
//   - `tab` = 'activos' | 'historial' (Activos surfaces PENDING + ACCEPTED;
//     Historial surfaces every status).
//   - `status` narrows further within the tab.
//   - `clientId` exact match.
//   - `dateFrom` / `dateTo` ISO-date inclusive bounds on created_at.
//   - `q` free-text OR over client_name + ardua_docket + quote id.
//
// Tab semantics:
//   activos    → ACTIVE_QUOTE_STATUSES = ['PENDING', 'ACCEPTED']
//   historial  → all statuses (so historical browse can include
//                cancelled / completed alongside any current).
// ════════════════════════════════════════════════════════════════════

import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import { ENDPOINTS } from '@/api/endpoints';
import { randomDelayMs } from '../util';
import type { PaginatedResponse } from '@/types/api';
import { ACTIVE_QUOTE_STATUSES, type Quote, type QuoteActivity, type QuoteStatus } from '@/types/quote';
import { quoteActivitiesSeed, quotesSeed } from '../seed/quotes';

const LIST = `*${ENDPOINTS.quotes.list}`;
const DETAIL = `*${ENDPOINTS.quotes.detail(':id')}`;
const UPDATE = `*${ENDPOINTS.quotes.update(':id')}`;
const ACTIVITIES = `*${ENDPOINTS.quotes.activities(':id')}`;

let activityIdCounter = 9000;
function nextActivityId(): string {
  activityIdCounter += 1;
  return `qa_gen_${activityIdCounter}`;
}

interface UpdateBody {
  notes?: string | null;
  liquidate_date?: string | null;
  status?: QuoteStatus;
}

function appendActivity(quoteId: string, event: Omit<QuoteActivity, 'id' | 'at'>): void {
  if (!quoteActivitiesSeed[quoteId]) quoteActivitiesSeed[quoteId] = [];
  quoteActivitiesSeed[quoteId].push({
    id: nextActivityId(),
    at: new Date().toISOString(),
    ...event,
  });
}

function notFound(id: string) {
  return HttpResponse.json(
    {
      message: `Quote "${id}" not found`,
      code: 'QUOTE_NOT_FOUND',
      details: { id },
    },
    { status: 404 },
  );
}

export const quoteHandlers: HttpHandler[] = [
  http.get(LIST, async ({ request }) => {
    await delay(randomDelayMs());

    const url = new URL(request.url);
    const tab = url.searchParams.get('tab');
    const status = url.searchParams.get('status') as QuoteStatus | null;
    const clientId = url.searchParams.get('clientId');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const page = Math.max(
      1,
      Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1,
    );
    const pageSize = Math.max(
      1,
      Number.parseInt(url.searchParams.get('pageSize') ?? '25', 10) || 25,
    );

    let filtered = quotesSeed.slice();

    if (tab === 'activos') {
      filtered = filtered.filter((qu) =>
        ACTIVE_QUOTE_STATUSES.includes(qu.status),
      );
    }
    if (status) {
      filtered = filtered.filter((qu) => qu.status === status);
    }
    if (clientId) {
      filtered = filtered.filter((qu) => qu.client_id === clientId);
    }
    if (dateFrom) {
      filtered = filtered.filter((qu) => qu.created_at.slice(0, 10) >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter((qu) => qu.created_at.slice(0, 10) <= dateTo);
    }
    if (q) {
      filtered = filtered.filter((qu) => {
        const name = qu.client_name.toLowerCase();
        const docket = (qu.ardua_docket ?? '').toLowerCase();
        const id = qu.id.toLowerCase();
        return name.includes(q) || docket.includes(q) || id.includes(q);
      });
    }

    // DESC by created_at.
    filtered.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    const body: PaginatedResponse<Quote> = {
      data,
      pagination: { page, pageSize, total, totalPages },
    };
    return HttpResponse.json(body);
  }),

  http.get(DETAIL, async ({ params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const quote = quotesSeed.find((qu) => qu.id === id);
    return quote ? HttpResponse.json(quote) : notFound(id);
  }),

  http.patch(UPDATE, async ({ request, params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const idx = quotesSeed.findIndex((qu) => qu.id === id);
    if (idx === -1) return notFound(id);

    const patch = (await request.json()) as UpdateBody;
    const before = quotesSeed[idx];
    const next: Quote = {
      ...before,
      ...(patch.notes !== undefined && { notes: patch.notes }),
      ...(patch.liquidate_date !== undefined && {
        liquidate_date: patch.liquidate_date,
      }),
      ...(patch.status !== undefined && { status: patch.status }),
    };
    quotesSeed[idx] = next;

    // Append activity events for visible transitions.
    if (patch.status && patch.status !== before.status) {
      appendActivity(id, {
        actor_id: 'u_juan',
        actor_name: 'Juan Pérez',
        kind: 'state_change',
        label:
          patch.status === 'CANCELLED'
            ? 'Cotización cancelada'
            : `Cambio de estado: ${before.status} → ${patch.status}`,
      });
    }
    if (
      patch.notes !== undefined &&
      patch.notes !== before.notes
    ) {
      appendActivity(id, {
        actor_id: 'u_juan',
        actor_name: 'Juan Pérez',
        kind: 'field_update',
        label: 'Notas actualizadas',
      });
    }
    if (
      patch.liquidate_date !== undefined &&
      patch.liquidate_date !== before.liquidate_date
    ) {
      appendActivity(id, {
        actor_id: 'u_juan',
        actor_name: 'Juan Pérez',
        kind: 'field_update',
        label: 'Fecha de liquidación actualizada',
      });
    }

    return HttpResponse.json(next);
  }),

  http.get(ACTIVITIES, async ({ params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    if (!quotesSeed.some((qu) => qu.id === id)) return notFound(id);
    const activities = quoteActivitiesSeed[id] ?? [];
    return HttpResponse.json(activities);
  }),
];
