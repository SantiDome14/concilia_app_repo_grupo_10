// ════════════════════════════════════════════════════════════════════
// MSW handlers — TRD / Price Alerts
// ────────────────────────────────────────────────────────────────────
// CRUD against the in-memory `priceAlertsSeed`. Mutations modify the
// seed array so the optimistic-update + refetch flow in the page is
// observable end-to-end. Reset between tests via `resetPriceAlertsSeed`.
// ════════════════════════════════════════════════════════════════════

import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import { ENDPOINTS } from '@/api/endpoints';
import { randomDelayMs } from '../util';
import type {
  CreatePriceAlertPayload,
  PriceAlert,
  UpdatePriceAlertPayload,
} from '@/types/priceAlert';
import { nextPriceAlertId, priceAlertsSeed } from '../seed/priceAlerts';

const LIST = `*${ENDPOINTS.priceAlerts.list}`;
const ITEM = `*${ENDPOINTS.priceAlerts.detail(':id')}`;
const CREATE = `*${ENDPOINTS.priceAlerts.create}`;
const UPDATE = `*${ENDPOINTS.priceAlerts.update(':id')}`;
const DELETE = `*${ENDPOINTS.priceAlerts.delete(':id')}`;

function notFound(id: string) {
  return HttpResponse.json(
    {
      message: `Price alert "${id}" not found`,
      code: 'PRICE_ALERT_NOT_FOUND',
      details: { id },
    },
    { status: 404 },
  );
}

function nowIso(): string {
  return new Date().toISOString();
}

export const priceAlertHandlers: HttpHandler[] = [
  http.get(LIST, async () => {
    await delay(randomDelayMs());
    // Sort: active first (newest first within each group).
    const sorted = priceAlertsSeed.slice().sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return a.created_at < b.created_at ? 1 : -1;
    });
    return HttpResponse.json(sorted);
  }),

  http.get(ITEM, async ({ params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const alert = priceAlertsSeed.find((a) => a.id === id);
    return alert ? HttpResponse.json(alert) : notFound(id);
  }),

  http.post(CREATE, async ({ request }) => {
    await delay(randomDelayMs());
    const payload = (await request.json()) as CreatePriceAlertPayload;
    const alert: PriceAlert = {
      id: nextPriceAlertId(),
      name: payload.name,
      side: payload.side,
      cost_price: payload.cost_price,
      limit_price: payload.limit_price,
      volume: payload.volume,
      active: true,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    priceAlertsSeed.push(alert);
    return HttpResponse.json(alert, { status: 201 });
  }),

  http.patch(UPDATE, async ({ request, params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const idx = priceAlertsSeed.findIndex((a) => a.id === id);
    if (idx === -1) return notFound(id);
    const patch = (await request.json()) as UpdatePriceAlertPayload;
    const updated: PriceAlert = {
      ...priceAlertsSeed[idx],
      ...patch,
      id,
      updated_at: nowIso(),
    };
    priceAlertsSeed[idx] = updated;
    return HttpResponse.json(updated);
  }),

  http.delete(DELETE, async ({ params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const idx = priceAlertsSeed.findIndex((a) => a.id === id);
    if (idx === -1) return notFound(id);
    priceAlertsSeed.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
