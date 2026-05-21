// ════════════════════════════════════════════════════════════════════
// MSW handlers — clients (ops-clients capability)
// ────────────────────────────────────────────────────────────────────
// Wraps the seven `ops-clients` endpoints declared in `ENDPOINTS.clients`
// (plus `/currencies`). Mutations apply to the in-memory seed so
// optimistic-update UX is observable in the dev shell. A full reload
// resets the seed.
// ════════════════════════════════════════════════════════════════════

import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import { ENDPOINTS } from '@/api/endpoints';
import { apiPath, randomDelayMs } from '../util';
import { clientsSeed, currenciesSeed } from '../seed/clients';
import type { Client } from '@/ops/clients/types';

// MSW URL patterns. The leading `*` matches any baseURL, so the handler
// fires regardless of whether the caller hit `/clients` or
// `https://api.example.com/clients`.
const LIST = apiPath(ENDPOINTS.clients.list);
const DETAIL = apiPath(ENDPOINTS.clients.detail(':id'));
const SIGN_UP = apiPath(ENDPOINTS.clients.signUp);
const WHITELIST = apiPath(ENDPOINTS.clients.whitelistAccount(':id'));
const VALIDATE_CVU = apiPath(ENDPOINTS.clients.validateCvu(':cvu'));
const CURRENCIES = apiPath(ENDPOINTS.clients.currencies);
const CONFIRMATION_LETTER = apiPath(ENDPOINTS.clients.confirmationLetter(':id'));

/** Project a full record down to the slim list row shape. */
function projectListRow(c: (typeof clientsSeed)[number]): Client {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    tax_number: c.tax_number,
    docket: c.docket,
    is_active: c.is_active,
    external_client_id: c.external_client_id,
    metadata: c.metadata,
  };
}

export const clientHandlers: HttpHandler[] = [
  // GET /clients?name=&docket=&page=&pageSize=
  http.get(LIST, async ({ request }) => {
    await delay(randomDelayMs());
    const url = new URL(request.url);
    const name = url.searchParams.get('name')?.toLowerCase() ?? '';
    const docket = url.searchParams.get('docket')?.toLowerCase() ?? '';
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '25');

    const filtered = clientsSeed.filter((c) => {
      if (name && !(c.name ?? '').toLowerCase().includes(name)) return false;
      if (docket && !(c.docket ?? '').toLowerCase().includes(docket)) return false;
      return true;
    });

    const start = Math.max(0, (page - 1) * pageSize);
    const window = filtered.slice(start, start + pageSize);

    return HttpResponse.json({
      clients: window.map(projectListRow),
      total: filtered.length,
    });
  }),

  // GET /clients/:id
  http.get(DETAIL, async ({ params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const found = clientsSeed.find((c) => c.id === id);
    if (!found) {
      return HttpResponse.json(
        { message: 'Cliente no encontrado', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }
    return HttpResponse.json(found);
  }),

  // GET /currencies
  http.get(CURRENCIES, async () => {
    await delay(randomDelayMs());
    return HttpResponse.json({ currencies: currenciesSeed });
  }),

  // POST /sign-up — invite portal user. Stamps metadata.status=PENDING
  // on the matching client so the next list refetch reflects the change.
  http.post(SIGN_UP, async ({ request }) => {
    await delay(randomDelayMs());
    const body = (await request.json()) as { external_client_id?: string };
    const ext = body?.external_client_id;
    if (!ext) {
      return HttpResponse.json(
        { message: 'external_client_id requerido', code: 'VALIDATION' },
        { status: 400 },
      );
    }
    const client = clientsSeed.find((c) => c.external_client_id === ext);
    if (!client) {
      return HttpResponse.json(
        { message: 'Cliente no encontrado', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }
    client.metadata = { status: 'PENDING' };
    return HttpResponse.json({ ok: true });
  }),

  // GET /coinag/account/:cvu — PSP CVU/CBU validation stub.
  http.get(VALIDATE_CVU, async ({ params }) => {
    await delay(randomDelayMs());
    const cvu = String(params.cvu);
    if (cvu === 'invalid') {
      return HttpResponse.json(
        { message: 'CVU inválido', code: 'CVU_INVALID' },
        { status: 404 },
      );
    }
    return HttpResponse.json({
      account_type: 'CVU',
      account: cvu,
      alias: `mock.alias.${cvu.slice(-4)}`,
      cuit: '20416466506',
      holder: 'Titular Mock',
      holders: ['Titular Mock'],
      bank_id: 'BIND',
      active: true,
    });
  }),

  // POST /clients/:id/whitelist-account
  http.post(WHITELIST, async ({ request, params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const client = clientsSeed.find((c) => c.id === id);
    if (!client) {
      return HttpResponse.json(
        { message: 'Cliente no encontrado', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }
    const body = (await request.json()) as {
      account_number?: string;
    };
    const acctNumber = body?.account_number ?? '';
    // Surface the canonical localised conflicts the modal expects so the
    // discriminated `WhitelistResult` is exercisable end-to-end.
    if (acctNumber.endsWith('00')) {
      return HttpResponse.json(
        { message: 'already_whitelisted' },
        { status: 409 },
      );
    }
    if (acctNumber.endsWith('99')) {
      return HttpResponse.json(
        { message: 'exist_internal_route' },
        { status: 409 },
      );
    }
    return HttpResponse.json({ ok: true });
  }),

  // GET /account-instruction/:id/confirmation-letter?rail=
  http.get(CONFIRMATION_LETTER, async ({ params, request }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const rail = new URL(request.url).searchParams.get('rail') ?? 'CVU';
    return HttpResponse.json({
      success: true,
      url: `https://example.com/letters/${id}-${rail.toLowerCase()}.pdf`,
    });
  }),
];
