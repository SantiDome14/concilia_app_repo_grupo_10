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
import { ApiError } from '@/types/api';
import { requestStatement, toApiPayload } from './api';

const post = apiClient.post as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('toApiPayload', () => {
  it('builds the canonical ISO 8601 UTC payload with the inclusive end suffix', () => {
    const range = { from: new Date(2026, 4, 1), to: new Date(2026, 4, 8) };
    const payload = toApiPayload('client-1', 'acc-1', range);
    expect(payload).toEqual({
      client_id: 'client-1',
      account_id: 'acc-1',
      date_from: '2026-05-01T00:00:00Z',
      date_to: '2026-05-08T23:59:59Z',
    });
  });

  it('zero-pads single-digit months and days', () => {
    const range = { from: new Date(2026, 0, 1), to: new Date(2026, 0, 9) };
    const payload = toApiPayload('c', 'a', range);
    expect(payload.date_from).toBe('2026-01-01T00:00:00Z');
    expect(payload.date_to).toBe('2026-01-09T23:59:59Z');
  });
});

describe('requestStatement — discriminated result shape', () => {
  const payload = {
    client_id: 'c-1',
    account_id: 'a-1',
    date_from: '2026-05-01T00:00:00Z',
    date_to: '2026-05-08T23:59:59Z',
  };

  it('returns ok with the URL when backend responds success: true', async () => {
    post.mockResolvedValueOnce({
      data: { success: true, status_code: 201, url: 'https://files/x.pdf' },
    });
    const result = await requestStatement(payload);
    expect(result).toEqual({ status: 'ok', url: 'https://files/x.pdf' });
    expect(post).toHaveBeenCalledWith('/statement', payload, { signal: undefined });
  });

  it('returns business-error with the backend message when success: false', async () => {
    post.mockResolvedValueOnce({
      data: { success: false, error: 'Sin movimientos en el rango seleccionado' },
    });
    const result = await requestStatement(payload);
    expect(result).toEqual({
      status: 'business-error',
      message: 'Sin movimientos en el rango seleccionado',
    });
  });

  it('returns business-error with a fallback message when success: false has no message', async () => {
    post.mockResolvedValueOnce({ data: { success: false } });
    const result = await requestStatement(payload);
    expect(result).toEqual({
      status: 'business-error',
      message: 'Error al generar el statement',
    });
  });

  it('returns business-error when success: true but URL is missing (defensive)', async () => {
    post.mockResolvedValueOnce({ data: { success: true, status_code: 201 } });
    const result = await requestStatement(payload);
    expect(result.status).toBe('business-error');
  });

  it('returns aborted when the request is cancelled via AbortController', async () => {
    const controller = new AbortController();
    // Simulate axios cancel: rejected with a CanceledError-like object.
    const cancelError = new Error('canceled');
    cancelError.name = 'CanceledError';
    post.mockRejectedValueOnce(cancelError);
    controller.abort();
    const result = await requestStatement(payload, controller.signal);
    expect(result).toEqual({ status: 'aborted' });
  });

  it('returns aborted when a native AbortError is thrown', async () => {
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    post.mockRejectedValueOnce(abortErr);
    const result = await requestStatement(payload);
    expect(result).toEqual({ status: 'aborted' });
  });

  it('returns failed with the ApiError message on transport / 5xx errors', async () => {
    post.mockRejectedValueOnce(new ApiError('Service Unavailable', 503, 'UNAVAILABLE'));
    const result = await requestStatement(payload);
    expect(result).toEqual({ status: 'failed', message: 'Service Unavailable' });
  });

  it('returns failed with the canonical fallback when the error is unknown shape', async () => {
    post.mockRejectedValueOnce({ unexpected: true });
    const result = await requestStatement(payload);
    expect(result).toEqual({ status: 'failed', message: 'Error al generar el statement' });
  });

  it('forwards the AbortSignal to apiClient.post', async () => {
    const controller = new AbortController();
    post.mockResolvedValueOnce({ data: { success: true, status_code: 201, url: 'x' } });
    await requestStatement(payload, controller.signal);
    expect(post).toHaveBeenCalledWith('/statement', payload, { signal: controller.signal });
  });
});
