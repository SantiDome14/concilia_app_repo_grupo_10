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

  // GET /accounts?sponsor=&search=&page=&pageSize=
  http.get(ACCOUNTS, async ({ request }) => {
    await delay(randomDelayMs());
    const url = new URL(request.url);
    const sponsor = url.searchParams.get('sponsor') ?? '';
    const search = url.searchParams.get('search')?.toLowerCase() ?? '';
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '25');

    const filtered = accountsSeed.filter((a) => {
      if (sponsor && a.sponsor !== sponsor) return false;
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
