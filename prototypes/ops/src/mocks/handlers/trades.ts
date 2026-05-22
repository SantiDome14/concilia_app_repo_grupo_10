// ════════════════════════════════════════════════════════════════════
// MSW handlers — trades (ops-cotizaciones / Trades user-facing rename)
// ────────────────────────────────────────────────────────────────────
// Single endpoint:
//   GET /quotes — list with optional filters + pagination. The Trades
//                 page passes `status=ACCEPTED` for the Active tab and
//                 omits it for Historic; the page's `operation` /
//                 `pair` chips translate into request params.
//
// The api module tolerates `{ data, total }` or `{ quotes, total }`;
// this handler emits the modern `{ data, total }` envelope.
// ════════════════════════════════════════════════════════════════════

import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import { ENDPOINTS } from '@/api/endpoints';
import { apiPath, randomDelayMs } from '../util';
import { tradesSeed } from '../seed/trades';

const QUOTES = apiPath(ENDPOINTS.trades.quotes);
const QUOTE_DETAIL = apiPath(ENDPOINTS.trades.detail(':id'));
const QUOTE_UPDATE = apiPath(ENDPOINTS.trades.update(':id'));

export const tradeHandlers: HttpHandler[] = [
  http.get(QUOTES, async ({ request }) => {
    await delay(randomDelayMs());
    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? '';
    const operation = url.searchParams.get('operation') ?? '';
    const pair = url.searchParams.get('pair') ?? '';
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '25');

    const filtered = tradesSeed.filter((q) => {
      if (status && q.status !== status) return false;
      if (operation && q.operation !== operation) return false;
      if (pair) {
        // Pair filter is interpreted as `ORIGIN/DESTINATION` (uppercase).
        const expected = pair.toUpperCase();
        const actual = `${q.origin_currency}/${q.destination_currency}`.toUpperCase();
        if (expected !== actual) return false;
      }
      return true;
    });

    // Newest first so the Active tab shows the latest accepted quote at
    // the top — the same order the QA instance uses.
    const sorted = [...filtered].sort((a, b) =>
      a.created_at < b.created_at ? 1 : -1,
    );

    const start = Math.max(0, (page - 1) * pageSize);
    const window = sorted.slice(start, start + pageSize);

    return HttpResponse.json({ data: window, total: filtered.length });
  }),

  // GET /quotes/:id — hydrated detail for QuoteDetailsModal.
  http.get(QUOTE_DETAIL, async ({ params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const record = tradesSeed.find((q) => q.id === id);
    if (!record) {
      return HttpResponse.json(
        { message: 'Quote no encontrado', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }
    return HttpResponse.json(record);
  }),

  // PATCH /quotes/:id — applies a partial update in place. Mutates
  // the seed so the next list-refetch shows the updated row.
  //
  // Derivation rule (operator review 2026-05-22): when BOTH leg
  // confirmations land on `true` AND the quote is still ACCEPTED, the
  // backend auto-transitions `status` to COMPLETED. OPS owns this
  // derivation — there is no manual Liquidar action; the COMPLETED
  // column on the estado_operativo kanban populates automatically
  // once both legs are confirmed.
  http.patch(QUOTE_UPDATE, async ({ params, request }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const idx = tradesSeed.findIndex((q) => q.id === id);
    if (idx === -1) {
      return HttpResponse.json(
        { message: 'Quote no encontrado', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }
    const patch = (await request.json()) as Partial<typeof tradesSeed[number]>;
    const merged = { ...tradesSeed[idx], ...patch };
    if (
      merged.leg_origen_confirmed === true &&
      merged.leg_destino_confirmed === true &&
      merged.status === 'ACCEPTED'
    ) {
      merged.status = 'COMPLETED';
    }
    tradesSeed[idx] = merged;
    return HttpResponse.json(merged);
  }),
];
