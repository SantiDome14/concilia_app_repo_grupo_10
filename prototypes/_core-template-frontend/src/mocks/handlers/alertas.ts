// ════════════════════════════════════════════════════════════════════
// MSW handlers — alertas
// ════════════════════════════════════════════════════════════════════

import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import { ENDPOINTS } from '@/api/endpoints';
import { randomDelayMs } from '../util';
import type { Alerta } from '@/types/genericos';
import { alertasSeed } from '../seed/alertas';

const LIST = `*${ENDPOINTS.alertas.list}`;
const ITEM = `*${ENDPOINTS.alertas.detail(':id')}`;
const UPDATE = `*${ENDPOINTS.alertas.update(':id')}`;

function notFound(id: string) {
  return HttpResponse.json(
    { message: `Alerta "${id}" not found`, code: 'NOT_FOUND', details: { id } },
    { status: 404 },
  );
}

export const alertaHandlers: HttpHandler[] = [
  http.get(LIST, async () => {
    await delay(randomDelayMs());
    return HttpResponse.json(alertasSeed);
  }),

  http.get(ITEM, async ({ params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const record = alertasSeed.find((a) => a.id === id);
    return record ? HttpResponse.json(record) : notFound(id);
  }),

  http.patch(UPDATE, async ({ request, params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const existing = alertasSeed.find((a) => a.id === id);
    if (!existing) return notFound(id);

    const patch = (await request.json()) as Partial<Alerta>;
    const updated: Alerta = { ...existing, ...patch, id };
    alertasSeed[alertasSeed.indexOf(existing)] = updated;
    return HttpResponse.json(updated);
  }),
];
