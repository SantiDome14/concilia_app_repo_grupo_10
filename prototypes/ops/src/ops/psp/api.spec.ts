import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from '@/api/client';
import {
  getCoinagHealth,
  getReconciliation,
  listAccounts,
  listMovements,
  listSponsorBalances,
  listSwiftTransactionsForAccount,
} from './api';

const get = apiClient.get as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getCoinagHealth — status normalisation', () => {
  it.each([
    [{ status: 'healthy' }, 'healthy'],
    [{ status: 'OK' }, 'healthy'],
    [{ status: 'up' }, 'healthy'],
    [{ status: 'degraded' }, 'degraded'],
    [{ status: 'flaky' }, 'degraded'],
    [{ status: 'down' }, 'down'],
    [{ status: 'unavailable' }, 'down'],
    [{ status: 'failed' }, 'down'],
  ])('maps %j to %s', async (payload, expected) => {
    get.mockResolvedValueOnce({ data: payload });
    const result = await getCoinagHealth();
    expect(result.status).toBe(expected);
    expect(result.checked_at).toBeTruthy();
  });

  it('returns down with a defensive message on transport failure', async () => {
    get.mockRejectedValueOnce(new Error('network'));
    const result = await getCoinagHealth();
    expect(result.status).toBe('down');
    expect(result.message).toContain('No se pudo contactar');
  });

  it('preserves the backend message when present', async () => {
    get.mockResolvedValueOnce({ data: { status: 'degraded', message: 'High latency' } });
    const result = await getCoinagHealth();
    expect(result.message).toBe('High latency');
  });
});

describe('getReconciliation', () => {
  it('returns the mismatches array', async () => {
    const mismatches = [
      {
        sponsor: 'COINAG',
        db_balance: '100.00',
        api_balance: '95.00',
        difference: '-5.00',
        checked_at: '2026-05-08T12:00:00Z',
      },
    ];
    get.mockResolvedValueOnce({ data: { mismatches } });
    expect(await getReconciliation()).toEqual({ mismatches });
  });

  it('falls back to empty array when payload is missing', async () => {
    get.mockResolvedValueOnce({ data: {} });
    expect(await getReconciliation()).toEqual({ mismatches: [] });
  });
});

describe('listSponsorBalances', () => {
  it('returns the explicit balances array when present', async () => {
    const balances = [
      { sponsor: 'COINAG', balance: '500.00', checked_at: '2026-05-08T12:00:00Z', currency: 'ARS' },
    ];
    get.mockResolvedValueOnce({ data: { balances } });
    expect(await listSponsorBalances()).toEqual(balances);
  });

  it('derives balances from mismatches when balances array is absent', async () => {
    get.mockResolvedValueOnce({
      data: {
        mismatches: [
          {
            sponsor: 'COINAG',
            api_balance: '95.00',
            checked_at: '2026-05-08T12:00:00Z',
          },
        ],
      },
    });
    const result = await listSponsorBalances();
    expect(result).toEqual([
      {
        sponsor: 'COINAG',
        balance: '95.00',
        checked_at: '2026-05-08T12:00:00Z',
        currency: 'ARS',
      },
    ]);
  });

  it('returns empty array when nothing is reported', async () => {
    get.mockResolvedValueOnce({ data: {} });
    expect(await listSponsorBalances()).toEqual([]);
  });
});

describe('listMovements', () => {
  it('forwards filter + pagination params', async () => {
    get.mockResolvedValueOnce({ data: { data: [], total: 0 } });
    await listMovements({ page: 2, pageSize: 25, sponsor: 'COINAG', search: 'acme' });
    expect(get).toHaveBeenCalledWith('/movements', {
      params: { page: 2, pageSize: 25, sponsor: 'COINAG', search: 'acme' },
    });
  });

  it('normalises a movement payload to the canonical shape', async () => {
    get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'm-1',
            created_at: '2026-05-08',
            type: 'DEPOSIT',
            status: 'COMPLETED',
            amount: 1000,
            client: { name: 'ACME' },
            counterparty: 'BBVA',
            provider: 'COINAG',
          },
        ],
        total: 1,
      },
    });
    const result = await listMovements({ page: 1, pageSize: 25 });
    expect(result.data[0]).toEqual({
      id: 'm-1',
      date: '2026-05-08',
      type: 'DEPOSIT',
      status: 'COMPLETED',
      amount: '1000',
      partner: null,
      client: 'ACME',
      counterparty: 'BBVA',
      sponsor: 'COINAG',
    });
    expect(result.total).toBe(1);
  });

  it('tolerates the legacy {movements, total} envelope shape', async () => {
    get.mockResolvedValueOnce({
      data: { movements: [{ id: 'm-1' }], total: 1 },
    });
    const result = await listMovements({ page: 1, pageSize: 25 });
    expect(result.data[0]?.id).toBe('m-1');
  });
});

describe('listAccounts', () => {
  it('normalises currency object payload to a string code', async () => {
    get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'a-1',
            account_number: '0070',
            currency: { code: 'usd', name: 'Dólares' },
            balance: '500',
            holder: 'ACME',
            status: 'ACTIVE',
            provider: 'COINAG',
          },
        ],
        total: 1,
      },
    });
    const result = await listAccounts({ page: 1, pageSize: 25 });
    expect(result.data[0]?.currency).toBe('USD');
    expect(result.data[0]?.owner).toBe('ACME');
    expect(result.data[0]?.sponsor).toBe('COINAG');
  });

  it('tolerates the legacy {accounts, total} envelope shape', async () => {
    get.mockResolvedValueOnce({
      data: { accounts: [{ id: 'a-1' }], total: 1 },
    });
    const result = await listAccounts({ page: 1, pageSize: 25 });
    expect(result.data[0]?.id).toBe('a-1');
  });
});

describe('listSwiftTransactionsForAccount', () => {
  it('GETs the canonical endpoint and unwraps {data, total}', async () => {
    const tx = [
      {
        id: 't-1',
        date: '2026-05-08',
        message_type: 'pacs.008',
        amount: '1000',
        currency: 'USD',
        counterparty: 'BBVA',
        status: 'SETTLED',
      },
    ];
    get.mockResolvedValueOnce({ data: { data: tx, total: 1 } });
    const result = await listSwiftTransactionsForAccount('a-1');
    expect(get).toHaveBeenCalledWith('/accounts/a-1/swift-transactions');
    expect(result).toEqual({ data: tx, total: 1 });
  });

  it('tolerates the legacy {transactions} envelope shape', async () => {
    get.mockResolvedValueOnce({ data: { transactions: [{ id: 't-1' }] } });
    const result = await listSwiftTransactionsForAccount('a-1');
    expect(result.data).toEqual([{ id: 't-1' }]);
  });
});
