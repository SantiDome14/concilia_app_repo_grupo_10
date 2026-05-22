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
const CREATE = apiPath(ENDPOINTS.movimientos.create);
const UPDATE = apiPath(ENDPOINTS.movimientos.update(':id'));
const RECEIPT = apiPath(ENDPOINTS.movimientos.receipt(':id'));

export const movementsHandlers: HttpHandler[] = [
  // GET /movements?sponsor=&type=&status=&search=&page=&pageSize=
  http.get(LIST, async ({ request }) => {
    await delay(randomDelayMs());
    const url = new URL(request.url);
    const sponsor = url.searchParams.get('sponsor') ?? '';
    const type = url.searchParams.get('type') ?? '';
    const status = url.searchParams.get('status') ?? '';
    const rail = url.searchParams.get('rail') ?? '';
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
      if (rail && m.rail !== rail) return false;
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

  // POST /movements — creates a new movement (currently used for ajustes
  // created from a source record via the manifest action).
  http.post(CREATE, async ({ request }) => {
    await delay(randomDelayMs());
    const body = (await request.json()) as Record<string, unknown>;
    const id =
      typeof body.id === 'string' && body.id.length > 0
        ? body.id
        : `mov-aj-${Date.now()}`;
    const today = new Date().toISOString().slice(0, 10);
    const record = {
      id,
      date: typeof body.date === 'string' ? body.date : today,
      type: typeof body.type === 'string' ? body.type : 'AJUSTE_DEBITO',
      status: typeof body.status === 'string' ? body.status : 'COMPLETED',
      amount: typeof body.amount === 'string' ? body.amount : '0',
      currency: typeof body.currency === 'string' ? body.currency : 'ARS',
      rail: typeof body.rail === 'string' ? body.rail : 'INTERNAL',
      origin: typeof body.origin === 'string' ? body.origin : null,
      destination: typeof body.destination === 'string' ? body.destination : null,
      partner: typeof body.partner === 'string' ? body.partner : null,
      sponsor: typeof body.sponsor === 'string' ? body.sponsor : null,
      client: typeof body.client === 'string' ? body.client : null,
      client_tax_number:
        typeof body.client_tax_number === 'string' ? body.client_tax_number : null,
      counterparty:
        typeof body.counterparty === 'string' ? body.counterparty : null,
      counterparty_tax_number:
        typeof body.counterparty_tax_number === 'string'
          ? body.counterparty_tax_number
          : null,
      metadata:
        body.metadata && typeof body.metadata === 'object'
          ? (body.metadata as Record<string, string>)
          : undefined,
    };
    movementsSeed.unshift(record);
    return HttpResponse.json(
      { ...record, created_at: `${record.date}T08:00:00Z` },
      { status: 201 },
    );
  }),

  // PATCH /movements/:id — applies a partial update to the seed in place.
  http.patch(UPDATE, async ({ params, request }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const idx = movementsSeed.findIndex((m) => m.id === id);
    if (idx === -1) {
      return HttpResponse.json(
        { message: 'Movement no encontrado', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }
    const patch = (await request.json()) as Record<string, unknown>;
    const merged = { ...movementsSeed[idx], ...patch };
    movementsSeed[idx] = merged;
    return HttpResponse.json({
      ...merged,
      updated_at: new Date().toISOString(),
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
