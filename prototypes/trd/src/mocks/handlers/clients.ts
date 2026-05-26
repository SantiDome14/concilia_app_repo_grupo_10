// ════════════════════════════════════════════════════════════════════
// MSW handlers — TRD / Clientes
// ────────────────────────────────────────────────────────────────────
// Fulfils ENDPOINTS.clients.{list, detail, limits, balances}.
//
// Query semantics for `?q=`:
//   - Case-insensitive substring match.
//   - Matches `name` OR `ardua_docket` (single backend filter, not the
//     legacy two-parallel-queries quirk).
//   - Empty / omitted `q` returns the full paginated list.
//
// Fault injection: when the limits endpoint is called with
// `?fault=on` the handler responds 500. Used by component tests
// to exercise the inline retry banner without monkey-patching.
// ════════════════════════════════════════════════════════════════════

import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import { ENDPOINTS } from '@/api/endpoints';
import { randomDelayMs } from '../util';
import type { PaginatedResponse } from '@/types/api';
import type { Client } from '@/types/client';
import {
  clientBalancesSeed,
  clientLimitsSeed,
  clientsSeed,
} from '../seed/clients';

const LIST = `*${ENDPOINTS.clients.list}`;
const DETAIL = `*${ENDPOINTS.clients.detail(':id')}`;
const LIMITS = `*${ENDPOINTS.clients.limits(':id')}`;
const BALANCES = `*${ENDPOINTS.clients.balances(':id')}`;

function notFound(id: string) {
  return HttpResponse.json(
    {
      message: `Client "${id}" not found`,
      code: 'CLIENT_NOT_FOUND',
      details: { id },
    },
    { status: 404 },
  );
}

function serverError(message: string) {
  return HttpResponse.json(
    { message, code: 'INTERNAL_ERROR' },
    { status: 500 },
  );
}

export const clientHandlers: HttpHandler[] = [
  http.get(LIST, async ({ request }) => {
    await delay(randomDelayMs());

    const url = new URL(request.url);
    const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
    const page = Math.max(
      1,
      Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1,
    );
    const pageSize = Math.max(
      1,
      Number.parseInt(url.searchParams.get('pageSize') ?? '25', 10) || 25,
    );

    // Apply `q` OR-filter across name + ardua_docket.
    const filtered = q
      ? clientsSeed.filter((c) => {
          const name = c.name.toLowerCase();
          const docket = (c.ardua_docket ?? '').toLowerCase();
          return name.includes(q) || docket.includes(q);
        })
      : clientsSeed;

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const data = filtered
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(start, start + pageSize);

    const body: PaginatedResponse<Client> = {
      data,
      pagination: { page, pageSize, total, totalPages },
    };
    return HttpResponse.json(body);
  }),

  http.get(DETAIL, async ({ params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const client = clientsSeed.find((c) => c.id === id);
    return client ? HttpResponse.json(client) : notFound(id);
  }),

  http.get(LIMITS, async ({ params, request }) => {
    await delay(randomDelayMs());
    const id = String(params.id);

    // Fault injection — used by component tests to exercise the
    // inline retry banner. See `core-error-handling`.
    const url = new URL(request.url);
    if (url.searchParams.get('fault') === 'on') {
      return serverError('Simulated 500 — limits fault injection');
    }

    // A missing client returns 404; a known client with no limits
    // returns `[]` so the EmptyState branch is exercised.
    if (!clientsSeed.some((c) => c.id === id)) return notFound(id);
    const limits = clientLimitsSeed[id] ?? [];
    return HttpResponse.json(limits);
  }),

  http.get(BALANCES, async ({ params, request }) => {
    await delay(randomDelayMs());
    const id = String(params.id);

    const url = new URL(request.url);
    if (url.searchParams.get('fault') === 'on') {
      return serverError('Simulated 500 — balances fault injection');
    }

    if (!clientsSeed.some((c) => c.id === id)) return notFound(id);
    const balances = clientBalancesSeed[id] ?? [];
    return HttpResponse.json(balances);
  }),
];
