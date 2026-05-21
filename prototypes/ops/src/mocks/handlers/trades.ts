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
];
