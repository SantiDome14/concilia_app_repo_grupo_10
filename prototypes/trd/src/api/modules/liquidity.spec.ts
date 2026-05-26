import { describe, it, expect } from 'vitest';
import {
  listLiquidityOperations,
  getLiquidityOperation,
  getLiquidityActivities,
  listLiquidityProviders,
} from './liquidity';
import { ApiError } from '@/types/api';

describe('listLiquidityOperations', () => {
  it('returns rows + pagination + summary in one envelope', async () => {
    const res = await listLiquidityOperations({ page: 1, pageSize: 10 });
    expect(res.data.length).toBe(10);
    expect(res.pagination.page).toBe(1);
    expect(res.summary).toMatchObject({
      total_operations: expect.any(Number),
      pending_count: expect.any(Number),
      received_count: expect.any(Number),
      total_usd: expect.any(String),
    });
  });

  it('providerId narrows to a single provider', async () => {
    const res = await listLiquidityOperations({
      providerId: 'prov_binance',
      page: 1,
      pageSize: 50,
    });
    for (const op of res.data) expect(op.provider_id).toBe('prov_binance');
  });

  it('status narrows correctly', async () => {
    const res = await listLiquidityOperations({
      status: 'PENDING',
      page: 1,
      pageSize: 50,
    });
    for (const op of res.data) expect(op.status).toBe('PENDING');
  });

  it('term narrows correctly', async () => {
    const res = await listLiquidityOperations({
      term: 'T+1',
      page: 1,
      pageSize: 50,
    });
    for (const op of res.data) expect(op.term).toBe('T+1');
  });

  it('summary excludes CANCELLED from USD totals', async () => {
    const res = await listLiquidityOperations({
      status: 'CANCELLED',
      page: 1,
      pageSize: 50,
    });
    // CANCELLED-only filter — usd_bought / usd_sold MUST be 0.
    expect(res.summary.usd_bought).toBe('0');
    expect(res.summary.usd_sold).toBe('0');
  });

  it('summary surfaces REQ-35 secondary currency when filter resolves to a single non-USD-quote pair', async () => {
    // Filter just on Bitso → all rows are USDC/ARS or USDT/ARS (mixed
    // pairs); no secondary because uniquePairs > 1. Instead constrain
    // to a provider with a single pair (Galicia is USD/ARS only — USD
    // quote currency yields NO secondary).
    const galicia = await listLiquidityOperations({
      providerId: 'prov_galicia',
      page: 1,
      pageSize: 50,
    });
    // Galicia has USD as quote currency for every op? No — actually
    // USD/ARS means base=USD, quote=ARS — so quote currency is ARS
    // (non-USD). REQ-35 should surface.
    expect(galicia.summary.secondary_currency).toBe('ARS');
    expect(galicia.summary.total_secondary).toBeDefined();
  });

  it('summary omits REQ-35 when multiple pairs are present', async () => {
    const all = await listLiquidityOperations({ page: 1, pageSize: 50 });
    // The full set spans USD/ARS, USDC/ARS, USDT/ARS — multiple pairs.
    expect(all.summary.secondary_currency).toBeUndefined();
  });
});

describe('getLiquidityOperation', () => {
  it('returns the operation for a known id', async () => {
    const op = await getLiquidityOperation('lq_001');
    expect(op.id).toBe('lq_001');
    expect(op.provider_id).toBe('prov_binance');
  });

  it('throws ApiError(isNotFound) on missing id', async () => {
    try {
      await getLiquidityOperation('does-not-exist');
      expect.fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).isNotFound).toBe(true);
    }
  });
});

describe('getLiquidityActivities', () => {
  it('returns the activities for a known operation', async () => {
    const acts = await getLiquidityActivities('lq_005');
    expect(acts.length).toBeGreaterThan(0);
  });

  it('returns an empty array when no activities exist', async () => {
    const acts = await getLiquidityActivities('lq_002');
    expect(Array.isArray(acts)).toBe(true);
    expect(acts.length).toBe(0);
  });
});

describe('listLiquidityProviders', () => {
  it('returns the four production providers', async () => {
    const providers = await listLiquidityProviders();
    expect(providers.length).toBe(4);
    const names = providers.map((p) => p.name);
    expect(names).toContain('Binance OTC');
    expect(names).toContain('Bitso');
    expect(names).toContain('BYMA');
    expect(names).toContain('Banco Galicia');
  });
});
