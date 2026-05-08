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
  getMovement,
  getReceipt,
  listMovements,
  listQuotes,
} from './api';

const get = apiClient.get as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listMovements', () => {
  it('forwards filter + pagination params', async () => {
    get.mockResolvedValueOnce({ data: { data: [], total: 0 } });
    await listMovements({ page: 2, pageSize: 25, sponsor: 'COINAG', search: 'acme' });
    expect(get).toHaveBeenCalledWith('/movements', {
      params: { page: 2, pageSize: 25, sponsor: 'COINAG', search: 'acme' },
    });
  });

  it('normalises a movement row to the canonical shape', async () => {
    get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'm-1',
            created_at: '2026-05-08',
            type: 'DEPOSIT',
            status: 'COMPLETED',
            amount: 1500,
            currency: { code: 'usd', name: 'Dólares' },
            from: 'Acme Corp',
            to: 'Coinag CVU',
            client: { name: 'Acme' },
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
      amount: '1500',
      currency: 'USD',
      origin: 'Acme Corp',
      destination: 'Coinag CVU',
      sponsor: 'COINAG',
      client: 'Acme',
      counterparty: 'BBVA',
    });
    expect(result.total).toBe(1);
  });

  it('tolerates the legacy {movements, total} envelope shape', async () => {
    get.mockResolvedValueOnce({ data: { movements: [{ id: 'm-1' }], total: 1 } });
    const result = await listMovements({ page: 1, pageSize: 25 });
    expect(result.data[0]?.id).toBe('m-1');
  });
});

describe('getMovement', () => {
  it('GETs /movements/:id and returns hydrated details with metadata', async () => {
    const raw = {
      id: 'm-1',
      created_at: '2026-05-08T12:00:00Z',
      updated_at: '2026-05-08T13:00:00Z',
      type: 'WITHDRAWAL',
      status: 'PENDING',
      amount: '2500.50',
      currency: 'EUR',
      metadata: { swift_ref: 'ABC123', batch: 'B-77' },
    };
    get.mockResolvedValueOnce({ data: raw });
    const result = await getMovement('m-1');
    expect(get).toHaveBeenCalledWith('/movements/m-1');
    expect(result.id).toBe('m-1');
    expect(result.created_at).toBe('2026-05-08T12:00:00Z');
    expect(result.updated_at).toBe('2026-05-08T13:00:00Z');
    expect(result.metadata).toEqual({ swift_ref: 'ABC123', batch: 'B-77' });
  });
});

describe('getReceipt', () => {
  it('returns success with the URL on canonical success envelope', async () => {
    get.mockResolvedValueOnce({ data: { success: true, url: 'https://files/r.pdf' } });
    const result = await getReceipt('m-1');
    expect(get).toHaveBeenCalledWith('/receipt/m-1');
    expect(result).toEqual({ success: true, url: 'https://files/r.pdf' });
  });

  it('returns success: false when the envelope reports a failure', async () => {
    get.mockResolvedValueOnce({ data: { success: false, error: 'rate_limited' } });
    const result = await getReceipt('m-1');
    expect(result).toEqual({ success: false, error: 'rate_limited' });
  });

  it('returns success: false on transport failure', async () => {
    get.mockRejectedValueOnce(new Error('network down'));
    const result = await getReceipt('m-1');
    expect(result).toEqual({ success: false, error: 'network down' });
  });

  it('returns success: false when payload is missing the URL', async () => {
    get.mockResolvedValueOnce({ data: { success: true } });
    const result = await getReceipt('m-1');
    expect(result.success).toBe(false);
  });
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
