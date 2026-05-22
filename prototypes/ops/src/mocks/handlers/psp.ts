// ════════════════════════════════════════════════════════════════════
// MSW handlers — PSP (Custodia · ops-psp capability)
// ────────────────────────────────────────────────────────────────────
// Four endpoints from `ENDPOINTS.psp.*`:
//   GET /coinag/health                           — Coinag uptime indicator
//   GET /balance-reconciliation                  — per-sponsor deltas + balances
//   GET /accounts                                — CVU sub-accounts (tab Accounts)
//   GET /accounts/:id/swift-transactions         — drill-down drawer
//
// Note: `ENDPOINTS.psp.movements` shares the `/movements` path with
// `ENDPOINTS.movimientos.list` and is served by `handlers/movements.ts`.
// ════════════════════════════════════════════════════════════════════

import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import { ENDPOINTS } from '@/api/endpoints';
import { apiPath, randomDelayMs } from '../util';
import {
  accountsSeed,
  mismatchesSeed,
  sponsorBalancesSeed,
  swiftByAccountSeed,
} from '../seed/psp';

const HEALTH = apiPath(ENDPOINTS.psp.health);
const RECONCILIATION = apiPath(ENDPOINTS.psp.reconciliation);
const ACCOUNTS = apiPath(ENDPOINTS.psp.accounts);
const SWIFT = apiPath(ENDPOINTS.psp.swiftTransactionsForAccount(':accountId'));

export const pspHandlers: HttpHandler[] = [
  // GET /coinag/health — polled every 60 s; the api module normalises
  // the status into the closed enum and stamps `checked_at` client-side.
  http.get(HEALTH, async () => {
    await delay(randomDelayMs());
    return HttpResponse.json({ status: 'healthy', message: null });
  }),

  // GET /balance-reconciliation — used by both `getReconciliation`
  // (returns the `mismatches` envelope) and `listSponsorBalances`
  // (reads either `balances` or derives from `mismatches`). Returning
  // both keeps the api module's fallback path covered.
  http.get(RECONCILIATION, async () => {
    await delay(randomDelayMs());
    return HttpResponse.json({
      balances: sponsorBalancesSeed,
      mismatches: mismatchesSeed,
    });
  }),

  // GET /accounts?sponsor=&search=&currency=&status=&accountType=&page=&pageSize=
  http.get(ACCOUNTS, async ({ request }) => {
    await delay(randomDelayMs());
    const url = new URL(request.url);
    const sponsor = url.searchParams.get('sponsor') ?? '';
    const search = url.searchParams.get('search')?.toLowerCase() ?? '';
    const currency = url.searchParams.get('currency') ?? '';
    const status = url.searchParams.get('status') ?? '';
    const accountType = url.searchParams.get('accountType') ?? '';
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '25');

    const filtered = accountsSeed.filter((a) => {
      if (sponsor && a.sponsor !== sponsor) return false;
      if (currency && a.currency.toUpperCase() !== currency.toUpperCase()) return false;
      if (status && a.status.toUpperCase() !== status.toUpperCase()) return false;
      if (accountType === 'CBU' && a.parent_cbu_id) return false;
      if (accountType === 'CVU' && !a.parent_cbu_id) return false;
      if (search) {
        const haystack = [a.owner, a.account_number, a.cvu, a.alias]
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

  // POST /accounts — creates a new CVU sub-account in place. Used by
  // the Crear Cuenta module CTA on the PSP page; mutates the seed so
  // the next list-refetch surfaces the new row.
  http.post(ACCOUNTS, async ({ request }) => {
    await delay(randomDelayMs());
    const body = (await request.json()) as Record<string, unknown>;
    const id =
      typeof body.id === 'string' && body.id.length > 0
        ? body.id
        : `psp-acc-${Date.now()}`;
    const accountNumber =
      typeof body.account_number === 'string' && body.account_number.length > 0
        ? body.account_number
        : id;
    const record = {
      id,
      account_number: accountNumber,
      currency: typeof body.currency === 'string' ? body.currency : 'ARS',
      balance: typeof body.balance === 'string' ? body.balance : '0',
      owner: typeof body.owner === 'string' ? body.owner : null,
      status: typeof body.status === 'string' ? body.status : 'ACTIVE',
      sponsor: typeof body.sponsor === 'string' ? body.sponsor : null,
      cvu: typeof body.cvu === 'string' ? body.cvu : accountNumber,
      alias: typeof body.alias === 'string' ? body.alias : undefined,
      parent_cbu_id:
        typeof body.parent_cbu_id === 'string' ? body.parent_cbu_id : null,
    };
    accountsSeed.unshift(record);
    return HttpResponse.json(record, { status: 201 });
  }),

  // GET /accounts/:id/swift-transactions — drawer drill-down. Empty
  // arrays for accounts without history are intentional (the api module
  // surfaces an EmptyState in that case).
  http.get(SWIFT, async ({ params }) => {
    await delay(randomDelayMs());
    const accountId = String(params.accountId);
    const rows = swiftByAccountSeed[accountId] ?? [];
    return HttpResponse.json({ data: rows, total: rows.length });
  }),
];
