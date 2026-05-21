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
import { listQuotes } from '@/api/modules/trades';

const get = apiClient.get as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listQuotes', () => {
  it('normalises a quote row to the canonical shape with uppercased currency codes', async () => {
    get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'q-1',
            client_id: 'c-1',
            client_name: 'Acme',
            origin_currency: 'usd',
            destination_currency: 'ars',
            operation: 'buy',
            term: 'T+1',
            origin_amount: 1000,
            destination_amount: 500000,
            exchange_rate: 500.0,
            status: 'ACCEPTED',
            created_at: '2026-05-08T12:00:00Z',
          },
        ],
        total: 1,
      },
    });
    const result = await listQuotes({ page: 1, pageSize: 25 });
    expect(result.data[0]).toEqual({
      id: 'q-1',
      client_id: 'c-1',
      client_name: 'Acme',
      origin_currency: 'USD',
      destination_currency: 'ARS',
      operation: 'BUY',
      term: 'T+1',
      origin_amount: '1000',
      destination_amount: '500000',
      exchange_rate: '500',
      status: 'ACCEPTED',
      created_at: '2026-05-08T12:00:00Z',
    });
  });

  it('tolerates the legacy {quotes, total} envelope shape', async () => {
    get.mockResolvedValueOnce({ data: { quotes: [{ id: 'q-1' }], total: 1 } });
    const result = await listQuotes({ page: 1, pageSize: 25 });
    expect(result.data[0]?.id).toBe('q-1');
  });

  it('forwards ?status=ACCEPTED for the active view filter', async () => {
    get.mockResolvedValueOnce({ data: { data: [], total: 0 } });
    await listQuotes({ page: 1, pageSize: 25, status: 'ACCEPTED', operation: 'BUY' });
    expect(get).toHaveBeenCalledWith('/quotes', {
      params: { page: 1, pageSize: 25, status: 'ACCEPTED', operation: 'BUY' },
    });
  });
});
