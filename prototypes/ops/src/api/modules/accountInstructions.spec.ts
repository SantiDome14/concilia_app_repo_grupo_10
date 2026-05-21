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
  listInstructionTemplates,
  getTemplateAttributes,
  listRails,
  createAccountInstruction,
} from '@/api/modules/accountInstructions';

const get = apiClient.get as Mock;
const post = apiClient.post as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listInstructionTemplates', () => {
  it('returns the bare-array shape', async () => {
    const arr = [{ id: 't1', name: 'SWIFT' }];
    get.mockResolvedValueOnce({ data: arr });
    expect(await listInstructionTemplates()).toEqual(arr);
  });

  it('unwraps the {data: [...]} envelope shape', async () => {
    const arr = [{ id: 't1', name: 'SWIFT' }];
    get.mockResolvedValueOnce({ data: { data: arr } });
    expect(await listInstructionTemplates()).toEqual(arr);
  });

  it('falls back to empty array when payload is empty', async () => {
    get.mockResolvedValueOnce({ data: { data: undefined } });
    expect(await listInstructionTemplates()).toEqual([]);
  });
});

describe('getTemplateAttributes', () => {
  it('GETs the canonical endpoint', async () => {
    const attrs = [{ key: 'beneficiary_bank' }];
    get.mockResolvedValueOnce({ data: attrs });
    expect(await getTemplateAttributes('tpl-7')).toEqual(attrs);
    expect(get).toHaveBeenCalledWith('/instruction-attribute/instruction/tpl-7');
  });

  it('returns empty array when payload is null', async () => {
    get.mockResolvedValueOnce({ data: null });
    expect(await getTemplateAttributes('tpl-7')).toEqual([]);
  });
});

describe('listRails', () => {
  it('unwraps the {rails: [...]} envelope shape', async () => {
    get.mockResolvedValueOnce({ data: { rails: [{ id: 'r1', name: 'SWIFT' }] } });
    expect(await listRails()).toEqual([{ id: 'r1', name: 'SWIFT' }]);
  });

  it('returns the bare-array shape', async () => {
    get.mockResolvedValueOnce({ data: [{ id: 'r1', name: 'SWIFT' }] });
    expect(await listRails()).toEqual([{ id: 'r1', name: 'SWIFT' }]);
  });
});

describe('createAccountInstruction — discriminated result shape', () => {
  const payload = {
    instruction_id: 'tpl-7',
    account_id: 'acc-1',
    metadata: { beneficiary_bank: 'BBVA' },
    rail_ids: ['SWIFT'],
  };

  it('returns ok on 200/201 success', async () => {
    post.mockResolvedValueOnce({ data: { id: 'ai-1' } });
    expect(await createAccountInstruction(payload)).toEqual({ status: 'ok' });
    expect(post).toHaveBeenCalledWith('/account-instruction', payload, { signal: undefined });
  });

  it('classifies cvu_already_exists by ApiError details.error', async () => {
    const err = new ApiError('Conflict', 409, 'CONFLICT', { error: 'cvu_already_exists' });
    post.mockRejectedValueOnce(err);
    expect(await createAccountInstruction(payload)).toEqual({
      status: 'cvu-already-exists',
    });
  });

  it('classifies status 409 even when no error code is present', async () => {
    const err = new ApiError('Conflict', 409, 'CONFLICT');
    post.mockRejectedValueOnce(err);
    expect(await createAccountInstruction(payload)).toEqual({
      status: 'cvu-already-exists',
    });
  });

  it('maps validation_error envelopes to validation-error result', async () => {
    const errs = [
      { field: 'reference_code', message: 'Required' },
      { field: 'iban', message: 'Invalid format' },
    ];
    const err = new ApiError('Bad Request', 422, 'VALIDATION', {
      error: 'validation_error',
      errors: errs,
    });
    post.mockRejectedValueOnce(err);
    expect(await createAccountInstruction(payload)).toEqual({
      status: 'validation-error',
      errors: errs,
    });
  });

  it('falls back to bare errors[] envelope (no discriminator)', async () => {
    const errs = [{ field: 'iban', message: 'Bad' }];
    const err = new ApiError('Bad Request', 422, 'VALIDATION', { errors: errs });
    post.mockRejectedValueOnce(err);
    expect(await createAccountInstruction(payload)).toEqual({
      status: 'validation-error',
      errors: errs,
    });
  });

  it('returns aborted on AbortController cancel', async () => {
    const e = new Error('canceled');
    e.name = 'CanceledError';
    post.mockRejectedValueOnce(e);
    expect(await createAccountInstruction(payload)).toEqual({ status: 'aborted' });
  });

  it('returns failed with the ApiError message for generic 5xx', async () => {
    post.mockRejectedValueOnce(new ApiError('Service Unavailable', 503, 'UNAVAILABLE'));
    expect(await createAccountInstruction(payload)).toEqual({
      status: 'failed',
      message: 'Service Unavailable',
    });
  });

  it('returns failed with a fallback message on unknown error shapes', async () => {
    post.mockRejectedValueOnce({ unexpected: true });
    expect(await createAccountInstruction(payload)).toEqual({
      status: 'failed',
      message: 'Error al crear la instrucción de cuenta',
    });
  });

  it('forwards the AbortSignal to apiClient.post', async () => {
    const controller = new AbortController();
    post.mockResolvedValueOnce({ data: { id: 'ai-1' } });
    await createAccountInstruction(payload, controller.signal);
    expect(post).toHaveBeenCalledWith('/account-instruction', payload, {
      signal: controller.signal,
    });
  });
});
