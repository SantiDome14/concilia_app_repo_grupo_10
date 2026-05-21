// ════════════════════════════════════════════════════════════════════
// MSW handlers — examples
// ────────────────────────────────────────────────────────────────────
// CRUD handlers that fulfil the contract declared in
// `@/api/endpoints` → `ENDPOINTS.example.*`. They mutate the in-memory
// `examplesSeed` array, so a full CRUD round-trip is observable from
// the UI for the lifetime of a tab.
//
// URL patterns use a leading `*` to match any host/base-URL prefix:
// the dev server, the QA host, and the production host all share the
// same path suffix, so the handler stays env-agnostic.
//
// Latency: every handler waits a random 100-300 ms before responding,
// which keeps loading-state UX honest even in mock mode.
// ════════════════════════════════════════════════════════════════════

import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import { ENDPOINTS } from '@/api/endpoints';
import { randomDelayMs } from '../util';
import type { PaginatedResponse } from '@/types/api';
import type { ExampleRecord } from '@/types/models';
import { examplesSeed } from '../seed/examples';

const LIST = `*${ENDPOINTS.example.list}`;
const ITEM = `*${ENDPOINTS.example.detail(':id')}`;
const CREATE = `*${ENDPOINTS.example.create}`;
const UPDATE = `*${ENDPOINTS.example.update(':id')}`;
const DELETE = `*${ENDPOINTS.example.delete(':id')}`;

function notFound(id: string) {
  return HttpResponse.json(
    {
      message: `Example "${id}" not found`,
      code: 'NOT_FOUND',
      details: { id },
    },
    { status: 404 },
  );
}

function nextId(): string {
  // ex_001-style suffix derived from the highest existing numeric tail.
  const highest = examplesSeed.reduce((max, record) => {
    const tail = Number.parseInt(record.id.split('_')[1] ?? '0', 10);
    return Number.isFinite(tail) && tail > max ? tail : max;
  }, 0);
  return `ex_${String(highest + 1).padStart(3, '0')}`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export const exampleHandlers: HttpHandler[] = [
  http.get(LIST, async ({ request }) => {
    await delay(randomDelayMs());

    const url = new URL(request.url);
    const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10));
    const pageSize = Math.max(
      1,
      Number.parseInt(url.searchParams.get('pageSize') ?? '50', 10),
    );

    const total = examplesSeed.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const data = examplesSeed.slice(start, start + pageSize);

    const body: PaginatedResponse<ExampleRecord> = {
      data,
      pagination: { page, pageSize, total, totalPages },
    };
    return HttpResponse.json(body);
  }),

  http.get(ITEM, async ({ params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const record = examplesSeed.find((r) => r.id === id);
    return record ? HttpResponse.json(record) : notFound(id);
  }),

  http.post(CREATE, async ({ request }) => {
    await delay(randomDelayMs());
    const payload = (await request.json()) as Omit<ExampleRecord, 'id' | 'date'>;
    const record: ExampleRecord = {
      ...payload,
      id: nextId(),
      date: todayIso(),
    };
    examplesSeed.push(record);
    return HttpResponse.json(record, { status: 201 });
  }),

  http.patch(UPDATE, async ({ request, params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const index = examplesSeed.findIndex((r) => r.id === id);
    if (index === -1) return notFound(id);

    const patch = (await request.json()) as Partial<Omit<ExampleRecord, 'id'>>;
    const updated: ExampleRecord = { ...examplesSeed[index], ...patch, id };
    examplesSeed[index] = updated;
    return HttpResponse.json(updated);
  }),

  http.delete(DELETE, async ({ params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const index = examplesSeed.findIndex((r) => r.id === id);
    if (index === -1) return notFound(id);

    examplesSeed.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
