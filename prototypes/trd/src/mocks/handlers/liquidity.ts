// ════════════════════════════════════════════════════════════════════
// MSW handlers — TRD / Liquidity (Proveedores)
// ────────────────────────────────────────────────────────────────────
// The list endpoint computes the server-side summary alongside the
// paginated rows (REQ-1 §3 — Cards y tabla se recalculan juntos —
// el backend devuelve summary filtrado). The summary aggregates only
// over operations that are not CANCELLED — cancelled operations
// count in the row total but do NOT contribute to USD totals / bought
// / sold.
//
// REQ-35 (Contravalor ARS): when the filtered set resolves to a
// single pair AND that pair's quote currency is non-USD, the summary
// surfaces secondary_currency + total/bought/sold figures in the
// quote currency.
// ════════════════════════════════════════════════════════════════════

import { delay, http, HttpResponse, type HttpHandler } from 'msw';
import { ENDPOINTS } from '@/api/endpoints';
import { randomDelayMs } from '../util';
import type {
  LiquidityOperation,
  LiquidityStatus,
  LiquiditySummary,
  LiquidityTerm,
} from '@/types/liquidity';
import {
  liquidityActivitiesSeed,
  liquidityOperationsSeed,
  liquidityProvidersSeed,
} from '../seed/liquidity';

const LIST = `*${ENDPOINTS.liquidity.list}`;
const DETAIL = `*${ENDPOINTS.liquidity.detail(':id')}`;
const ACTIVITIES = `*${ENDPOINTS.liquidity.activities(':id')}`;
const PROVIDERS = `*${ENDPOINTS.liquidity.providers}`;

function notFound(id: string) {
  return HttpResponse.json(
    {
      message: `Liquidity operation "${id}" not found`,
      code: 'LIQUIDITY_OP_NOT_FOUND',
      details: { id },
    },
    { status: 404 },
  );
}

function periodToDateRange(
  period: string | null,
  today = new Date(),
): { from: string; to: string } | null {
  if (!period || period === 'all') return null;
  const to = today.toISOString().slice(0, 10);
  const d = new Date(today);
  switch (period) {
    case 'weekly':
      d.setDate(d.getDate() - 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() - 1);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() - 3);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() - 1);
      break;
    default:
      return null;
  }
  return { from: d.toISOString().slice(0, 10), to };
}

function computeSummary(ops: LiquidityOperation[]): LiquiditySummary {
  // The summary excludes CANCELLED from the USD totals (they didn't
  // settle and shouldn't contribute to Exposición).
  const settled = ops.filter((op) => op.status !== 'CANCELLED');
  const pending = ops.filter((op) => op.status === 'PENDING').length;
  const received = ops.filter((op) => op.status === 'RECEIVED').length;

  // Naïve USD conversion — the seed already stores amounts in their
  // native currency; for USD/USDC/USDT we treat origin_amount as the
  // USD equivalent (the legacy seed treats these stable pairs as 1:1
  // for summary purposes — production would invoke a rate table).
  let usdBought = 0;
  let usdSold = 0;
  for (const op of settled) {
    const usd = Number(op.origin_amount);
    if (!Number.isFinite(usd)) continue;
    if (op.operation_type === 'BUY') usdBought += usd;
    else usdSold += usd;
  }

  const summary: LiquiditySummary = {
    total_operations: ops.length,
    pending_count: pending,
    received_count: received,
    total_usd: String(usdBought + usdSold),
    usd_bought: String(usdBought),
    usd_sold: String(usdSold),
  };

  // REQ-35: when the filter resolves to a single non-USD-quote pair,
  // surface the contravalor.
  const uniquePairs = new Set(settled.map((op) => op.pair_id));
  const quoteCurrencies = new Set(settled.map((op) => op.quote_currency_code));
  if (uniquePairs.size === 1 && quoteCurrencies.size === 1) {
    const quote = settled[0]?.quote_currency_code;
    if (quote && quote !== 'USD') {
      let secBought = 0;
      let secSold = 0;
      for (const op of settled) {
        const dest = Number(op.destination_amount);
        if (!Number.isFinite(dest)) continue;
        if (op.operation_type === 'BUY') secBought += dest;
        else secSold += dest;
      }
      summary.secondary_currency = quote;
      summary.total_secondary = String(secBought + secSold);
      summary.secondary_bought = String(secBought);
      summary.secondary_sold = String(secSold);
    }
  }

  return summary;
}

export const liquidityHandlers: HttpHandler[] = [
  http.get(LIST, async ({ request }) => {
    await delay(randomDelayMs());

    const url = new URL(request.url);
    const providerId = url.searchParams.get('providerId');
    const status = url.searchParams.get('status') as LiquidityStatus | null;
    const term = url.searchParams.get('term') as LiquidityTerm | null;
    const period = url.searchParams.get('period');
    const dateFrom = url.searchParams.get('dateFrom');
    const dateTo = url.searchParams.get('dateTo');
    const page = Math.max(
      1,
      Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1,
    );
    const pageSize = Math.max(
      1,
      Number.parseInt(url.searchParams.get('pageSize') ?? '25', 10) || 25,
    );

    let filtered = liquidityOperationsSeed.slice();
    if (providerId) filtered = filtered.filter((op) => op.provider_id === providerId);
    if (status) filtered = filtered.filter((op) => op.status === status);
    if (term) filtered = filtered.filter((op) => op.term === term);

    // Period overrides explicit dateFrom/dateTo when both are supplied;
    // page UI guarantees they don't conflict (period and explicit dates
    // are mutually exclusive surfaces).
    const range = periodToDateRange(period);
    const effectiveFrom = range?.from ?? dateFrom;
    const effectiveTo = range?.to ?? dateTo;
    if (effectiveFrom) {
      filtered = filtered.filter((op) => op.operation_date >= effectiveFrom);
    }
    if (effectiveTo) {
      filtered = filtered.filter((op) => op.operation_date <= effectiveTo);
    }

    // DESC by operation_date, then by created_at.
    filtered.sort((a, b) => {
      if (a.operation_date !== b.operation_date) {
        return a.operation_date < b.operation_date ? 1 : -1;
      }
      return a.created_at < b.created_at ? 1 : -1;
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const start = (page - 1) * pageSize;
    const data = filtered.slice(start, start + pageSize);

    return HttpResponse.json({
      data,
      pagination: { page, pageSize, total, totalPages },
      summary: computeSummary(filtered),
    });
  }),

  http.get(DETAIL, async ({ params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    const op = liquidityOperationsSeed.find((o) => o.id === id);
    return op ? HttpResponse.json(op) : notFound(id);
  }),

  http.get(ACTIVITIES, async ({ params }) => {
    await delay(randomDelayMs());
    const id = String(params.id);
    if (!liquidityOperationsSeed.some((o) => o.id === id)) return notFound(id);
    const acts = liquidityActivitiesSeed[id] ?? [];
    return HttpResponse.json(acts);
  }),

  http.get(PROVIDERS, async () => {
    await delay(randomDelayMs());
    return HttpResponse.json(liquidityProvidersSeed);
  }),
];
