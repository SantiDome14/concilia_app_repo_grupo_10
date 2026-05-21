// ════════════════════════════════════════════════════════════════════
// MSW handlers — solicitudes (Inbox)
// ════════════════════════════════════════════════════════════════════

import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import { ENDPOINTS } from '@/api/endpoints';
import { randomDelayMs } from '../util';
import type { Solicitud } from '@/types/genericos';
import { solicitudesSeed } from '../seed/solicitudes';

const LIST = `*${ENDPOINTS.solicitudes.list}`;
const ITEM = `*${ENDPOINTS.solicitudes.detail(':id')}`;
const CREATE = `*${ENDPOINTS.solicitudes.create}`;
const UPDATE = `*${ENDPOINTS.solicitudes.update(':id')}`;

function notFound(id: string) {
  return HttpResponse.json(
    { message: `Solicitud "${id}" not found`, code: 'NOT_FOUND', details: { id } },
    { status: 404 },
  );
}

export const solicitudHandlers: HttpHandler[] = [
  http.get(LIST, async () => {
    await delay(randomDelayMs());
    return HttpResponse.json(solicitudesSeed);
  }),

  http.get(ITEM, async ({ params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const record = solicitudesSeed.find((s) => s.id === id);
    return record ? HttpResponse.json(record) : notFound(id);
  }),

  http.post(CREATE, async ({ request }) => {
    await delay(randomDelayMs());
    const payload = (await request.json()) as Solicitud;
    solicitudesSeed.unshift(payload);
    return HttpResponse.json(payload, { status: 201 });
  }),

  http.patch(UPDATE, async ({ request, params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const existing = solicitudesSeed.find((s) => s.id === id);
    if (!existing) return notFound(id);

    const patch = (await request.json()) as Partial<Solicitud>;
    const updated: Solicitud = { ...existing, ...patch, id };
    const index = solicitudesSeed.indexOf(existing);
    solicitudesSeed[index] = updated;
    return HttpResponse.json(updated);
  }),
];
