import { describe, it, expect } from 'vitest';
import {
  listClients,
  getClient,
  getClientLimits,
  getClientBalances,
} from './clients';
import { ApiError } from '@/types/api';

// ════════════════════════════════════════════════════════════════════
// clients API module — integration via MSW handlers
// ────────────────────────────────────────────────────────────────────
// Exercises the real HTTP path through the MSW node server (see
// tests/setup.ts). No vi.mock of apiClient — the wire format is part
// of the contract.
// ════════════════════════════════════════════════════════════════════

describe('listClients', () => {
  it('returns the paginated envelope with default page size', async () => {
    const res = await listClients({ page: 1, pageSize: 10 });
    expect(res.pagination.page).toBe(1);
    expect(res.pagination.pageSize).toBe(10);
    expect(res.data.length).toBe(10);
    expect(res.pagination.total).toBeGreaterThanOrEqual(30);
  });

  it('honours pageSize 25 (canonical default)', async () => {
    const res = await listClients({ page: 1, pageSize: 25 });
    expect(res.data.length).toBe(25);
  });

  it('honours pageSize 100 and returns < pageSize on the last page', async () => {
    const res = await listClients({ page: 1, pageSize: 100 });
    expect(res.data.length).toBe(res.pagination.total);
    expect(res.pagination.totalPages).toBe(1);
  });

  it('filters by q across name (case-insensitive)', async () => {
    const res = await listClients({ q: 'acme', page: 1, pageSize: 50 });
    expect(res.data.length).toBeGreaterThanOrEqual(1);
    // At least one match is ACME S.A.
    expect(res.data.some((c) => c.name === 'ACME S.A.')).toBe(true);
  });

  it('filters by q across ardua_docket', async () => {
    // "Tequila Co." has ardua_docket containing "ACME" — verifies the
    // OR semantics across name + ardua_docket.
    const res = await listClients({ q: 'acme', page: 1, pageSize: 50 });
    expect(res.data.some((c) => c.name === 'Tequila Co.')).toBe(true);
  });

  it('returns empty data when q matches nothing', async () => {
    const res = await listClients({ q: 'zzzzzz-no-match', page: 1, pageSize: 25 });
    expect(res.data.length).toBe(0);
    expect(res.pagination.total).toBe(0);
  });

  it('omits q from the query when empty (full list)', async () => {
    const withEmpty = await listClients({ q: '', page: 1, pageSize: 25 });
    const withoutQ = await listClients({ page: 1, pageSize: 25 });
    expect(withEmpty.pagination.total).toBe(withoutQ.pagination.total);
  });
});

describe('getClient', () => {
  it('returns the client for a known id', async () => {
    const client = await getClient('cl_001');
    expect(client.id).toBe('cl_001');
    expect(client.name).toBe('ACME S.A.');
  });

  it('throws ApiError with isNotFound on a missing id', async () => {
    await expect(getClient('does-not-exist')).rejects.toBeInstanceOf(ApiError);
    try {
      await getClient('does-not-exist');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).isNotFound).toBe(true);
    }
  });
});

describe('getClientLimits', () => {
  it('returns the limits array for a client with limits', async () => {
    const limits = await getClientLimits('cl_001');
    expect(Array.isArray(limits)).toBe(true);
    expect(limits.length).toBeGreaterThan(0);
    expect(limits[0]).toMatchObject({
      entidad: expect.any(String),
      moneda: expect.any(String),
      limite: expect.any(String),
      disponible: expect.any(String),
      usado: expect.any(String),
    });
  });

  it('returns an empty array for a client with no limits', async () => {
    // cl_007 has no entry in initialLimits.
    const limits = await getClientLimits('cl_007');
    expect(Array.isArray(limits)).toBe(true);
    expect(limits.length).toBe(0);
  });

  it('throws ApiError with isNotFound for a missing client', async () => {
    try {
      await getClientLimits('does-not-exist');
      expect.fail('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).isNotFound).toBe(true);
    }
  });
});

describe('getClientBalances', () => {
  it('returns the balances array for a client with balances', async () => {
    const balances = await getClientBalances('cl_001');
    expect(balances.length).toBeGreaterThan(0);
    expect(balances[0]).toMatchObject({
      moneda: expect.any(String),
      balance: expect.any(String),
      updated_at: expect.any(String),
    });
  });

  it('returns an empty array for a client with no balances', async () => {
    const balances = await getClientBalances('cl_004');
    expect(balances.length).toBe(0);
  });
});
