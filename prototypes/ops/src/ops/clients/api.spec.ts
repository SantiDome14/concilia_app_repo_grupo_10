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
import {
  listClients,
  getClient,
  listCurrencies,
  signUpClient,
  validateCvu,
  whitelistAccount,
  getConfirmationLetter,
} from './api';
import type { ClientWithAccounts, ValidatedCvuAccount } from './types';

const get = apiClient.get as Mock;
const post = apiClient.post as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listClients', () => {
  it('forwards filter + pagination params and returns the envelope', async () => {
    const payload = { clients: [], total: 0 };
    get.mockResolvedValueOnce({ data: payload });

    const result = await listClients({ page: 1, pageSize: 25, name: 'Acme', docket: 'A1' });

    expect(get).toHaveBeenCalledWith('/clients', {
      params: { page: 1, pageSize: 25, name: 'Acme', docket: 'A1' },
    });
    expect(result).toEqual(payload);
  });
});

describe('getClient', () => {
  it('GETs /clients/:id and returns the hydrated client', async () => {
    const client: ClientWithAccounts = {
      id: 'c-1',
      name: 'Acme',
      email: null,
      tax_number: null,
      docket: null,
      is_active: true,
      metadata: { status: 'ACTIVE' },
      accounts: [],
      movements: [],
    };
    get.mockResolvedValueOnce({ data: client });

    const result = await getClient('c-1');

    expect(get).toHaveBeenCalledWith('/clients/c-1');
    expect(result).toEqual(client);
  });
});

describe('listCurrencies', () => {
  it('returns currencies from the response payload', async () => {
    get.mockResolvedValueOnce({
      data: { currencies: [{ id: 'ars-id', code: 'ARS', name: 'Pesos argentinos' }] },
    });

    const result = await listCurrencies();

    expect(result).toEqual([{ id: 'ars-id', code: 'ARS', name: 'Pesos argentinos' }]);
  });

  it('falls back to an empty array when the payload omits currencies', async () => {
    get.mockResolvedValueOnce({ data: {} });
    const result = await listCurrencies();
    expect(result).toEqual([]);
  });
});

describe('signUpClient', () => {
  it('POSTs /sign-up with the external_client_id', async () => {
    post.mockResolvedValueOnce({ data: undefined });
    await signUpClient({ external_client_id: 'ext-42' });
    expect(post).toHaveBeenCalledWith('/sign-up', { external_client_id: 'ext-42' });
  });

  it('lets ApiError propagate so the caller can react to step-up cancellation', async () => {
    post.mockRejectedValueOnce(new ApiError('Forbidden', 403, 'FORBIDDEN'));
    await expect(signUpClient({ external_client_id: 'ext-42' })).rejects.toBeInstanceOf(ApiError);
  });
});

describe('validateCvu', () => {
  it('GETs /coinag/account/:cvu encoding the CVU param', async () => {
    const payload: ValidatedCvuAccount = {
      account_type: 'CA',
      account: '0007012345',
      alias: 'mi.alias',
      cuit: '20-12345678-9',
      holder: 'Acme',
      holders: ['Acme'],
      bank_id: '007',
      active: true,
    };
    get.mockResolvedValueOnce({ data: payload });

    const result = await validateCvu('0070123456789012345678');

    expect(get).toHaveBeenCalledWith('/coinag/account/0070123456789012345678');
    expect(result).toEqual(payload);
  });
});

describe('whitelistAccount — discriminated result shape', () => {
  const body = {
    name: 'Acme',
    tax_number: '20-12345678-9',
    account_number: '00700001',
    currency_id: 'ars-id',
  };

  it('returns { status: "ok" } on 200', async () => {
    post.mockResolvedValueOnce({ data: undefined });
    const result = await whitelistAccount('c-1', body);
    expect(result).toEqual({ status: 'ok' });
    expect(post).toHaveBeenCalledWith('/clients/c-1/whitelist-account', body);
  });

  it('classifies "already_whitelisted" backend errors', async () => {
    post.mockRejectedValueOnce(new Error('already_whitelisted'));
    const result = await whitelistAccount('c-1', body);
    expect(result).toEqual({ status: 'already_whitelisted' });
  });

  it('classifies the legacy typo "exist_interal_route" as exist_internal_route', async () => {
    post.mockRejectedValueOnce(new Error('exist_interal_route'));
    const result = await whitelistAccount('c-1', body);
    expect(result).toEqual({ status: 'exist_internal_route' });
  });

  it('classifies "exist_internal_route" (canonical spelling)', async () => {
    post.mockRejectedValueOnce(new Error('exist_internal_route'));
    const result = await whitelistAccount('c-1', body);
    expect(result).toEqual({ status: 'exist_internal_route' });
  });

  it('falls through to status: failed with the ApiError message', async () => {
    post.mockRejectedValueOnce(new ApiError('PSP timeout', 504, 'TIMEOUT'));
    const result = await whitelistAccount('c-1', body);
    expect(result).toEqual({ status: 'failed', message: 'PSP timeout' });
  });

  it('falls through to a generic message when the error is not a recognised shape', async () => {
    post.mockRejectedValueOnce({ unexpected: true });
    const result = await whitelistAccount('c-1', body);
    expect(result).toEqual({ status: 'failed', message: 'Error al habilitar la cuenta' });
  });
});

describe('getConfirmationLetter', () => {
  it('GETs the canonical endpoint with the rail param', async () => {
    get.mockResolvedValueOnce({ data: { success: true, url: 'https://example/letter.pdf' } });
    const result = await getConfirmationLetter('inst-7', 'SWIFT');
    expect(get).toHaveBeenCalledWith('/account-instruction/inst-7/confirmation-letter', {
      params: { rail: 'SWIFT' },
    });
    expect(result).toEqual({ success: true, url: 'https://example/letter.pdf' });
  });

  it('returns success: false on backend error envelope', async () => {
    get.mockResolvedValueOnce({ data: { success: false, error: 'rate_limited' } });
    const result = await getConfirmationLetter('inst-7', 'WIRE');
    expect(result).toEqual({ success: false, error: 'rate_limited' });
  });

  it('returns success: false on transport failure', async () => {
    get.mockRejectedValueOnce(new Error('network down'));
    const result = await getConfirmationLetter('inst-7', 'SWIFT');
    expect(result).toEqual({ success: false, error: 'network down' });
  });
});
