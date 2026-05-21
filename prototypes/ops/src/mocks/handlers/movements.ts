// ════════════════════════════════════════════════════════════════════
// MSW handlers — movements (ops-movimientos + ops-psp shared)
// ────────────────────────────────────────────────────────────────────
// Three endpoints from `ENDPOINTS.movimientos.*`:
//   GET /movements         — list (shared with PSP via `?sponsor=`)
//   GET /movements/:id     — detail (ops-movimientos detail modal)
//   GET /receipt/:id       — receipt URL (ops-movimientos download)
//
// PSP's `psp.listMovements` hits the SAME `/movements` path with the
// `sponsor` query param; the api modules each normalise the response
// to their own row shape. This handler returns the superset row shape
// from `seed/movements.ts` — fields the consumer doesn't reference are
// simply ignored.
// ════════════════════════════════════════════════════════════════════

import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import { ENDPOINTS } from '@/api/endpoints';
import { apiPath, randomDelayMs } from '../util';
import { movementsSeed } from '../seed/movements';

const LIST = apiPath(ENDPOINTS.movimientos.list);
const DETAIL = apiPath(ENDPOINTS.movimientos.detail(':id'));
const RECEIPT = apiPath(ENDPOINTS.movimientos.receipt(':id'));

export const movementsHandlers: HttpHandler[] = [
  // GET /movements?sponsor=&type=&status=&search=&page=&pageSize=
  http.get(LIST, async ({ request }) => {
    await delay(randomDelayMs());
    const url = new URL(request.url);
    const sponsor = url.searchParams.get('sponsor') ?? '';
    const type = url.searchParams.get('type') ?? '';
    const status = url.searchParams.get('status') ?? '';
    const search = url.searchParams.get('search')?.toLowerCase() ?? '';
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '25');

    const filtered = movementsSeed.filter((m) => {
      // `?sponsor=...` is the PSP-tab discriminator. Without it the
      // request comes from the OPS Movimientos page and we return every
      // record (sponsor-scoped + general).
      if (sponsor && m.sponsor !== sponsor) return false;
      if (type && m.type !== type) return false;
      if (status && m.status !== status) return false;
      if (search) {
        const haystack = [
          m.client,
          m.counterparty,
          m.origin,
          m.destination,
          m.type,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    const start = Math.max(0, (page - 1) * pageSize);
    const window = filtered.slice(start, start + pageSize);

    return HttpResponse.json({ data: window, total: filtered.length });
  }),

  // GET /movements/:id — detail surfaced by the ops-movimientos modal.
  http.get(DETAIL, async ({ params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const record = movementsSeed.find((m) => m.id === id);
    if (!record) {
      return HttpResponse.json(
        { message: 'Movement no encontrado', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      ...record,
      created_at: `${record.date}T08:00:00Z`,
      updated_at: `${record.date}T08:00:00Z`,
      metadata: record.metadata ?? {},
    });
  }),

  // GET /receipt/:id — stub URL so the receipt button works end-to-end.
  http.get(RECEIPT, async ({ params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const record = movementsSeed.find((m) => m.id === id);
    if (!record) {
      return HttpResponse.json({ success: false, error: 'not_found' }, { status: 404 });
    }
    return HttpResponse.json({
      success: true,
      url: `https://example.com/receipts/${id}.pdf`,
    });
  }),
];
