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
  listInstructions,
  getInstruction,
  createInstructionWithAttributes,
  updateInstructionWithAttributes,
  retrySaveAttributes,
  deleteInstruction,
} from '@/api/modules/instructions';
import type { Instruction, InstructionAttribute, InstructionFormData } from './types';

const get = apiClient.get as Mock;
const post = apiClient.post as Mock;
const put = apiClient.put as Mock;
const del = apiClient.delete as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

function makeInstruction(overrides: Partial<Instruction> = {}): Instruction {
  return {
    id: 'inst-1',
    name: 'Default',
    provider: null,
    currency_id: 'ARS',
    description: null,
    status: 'ACTIVE',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    attributes_count: 0,
    ...overrides,
  };
}

function makeFormData(overrides: Partial<InstructionFormData> = {}): InstructionFormData {
  return {
    name: 'Pago a proveedor X',
    provider: '',
    currency_id: 'ARS',
    description: 'instructivo',
    status: 'DRAFT',
    attributes: [
      { key: 'banco', value: 'BBVA', index: 0 },
      { key: 'cbu', value: '123', index: 1 },
    ],
    ...overrides,
  };
}

describe('listInstructions', () => {
  it('forwards filter + pagination params and returns the paginated payload', async () => {
    const payload = {
      data: [makeInstruction()],
      pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
    };
    get.mockResolvedValueOnce({ data: payload });

    const result = await listInstructions({
      page: 1,
      pageSize: 25,
      name: 'Pago',
      currency_id: 'ARS',
    });

    expect(get).toHaveBeenCalledWith('/instruction', {
      params: { page: 1, pageSize: 25, name: 'Pago', currency_id: 'ARS' },
    });
    expect(result).toEqual(payload);
  });
});

describe('getInstruction', () => {
  it('parallel-fetches the record and its attributes', async () => {
    const inst = makeInstruction({ id: 'i-7', attributes_count: 2 });
    const attrs: InstructionAttribute[] = [
      { id: 'a1', instruction_id: 'i-7', key: 'k1', value: 'v1', index_order: 0 },
      { id: 'a2', instruction_id: 'i-7', key: 'k2', value: 'v2', index_order: 1 },
    ];
    get.mockImplementation((url: string) => {
      if (url === '/instruction/i-7') return Promise.resolve({ data: inst });
      if (url === '/instruction-attribute/instruction/i-7')
        return Promise.resolve({ data: attrs });
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });

    const result = await getInstruction('i-7');

    expect(get).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ ...inst, attributes: attrs });
  });

  it('treats a missing attributes payload as an empty array', async () => {
    const inst = makeInstruction({ id: 'i-8' });
    get.mockImplementation((url: string) => {
      if (url === '/instruction/i-8') return Promise.resolve({ data: inst });
      if (url === '/instruction-attribute/instruction/i-8')
        return Promise.resolve({ data: null });
      return Promise.reject(new Error(`unexpected GET ${url}`));
    });

    const result = await getInstruction('i-8');
    expect(result.attributes).toEqual([]);
  });
});

describe('createInstructionWithAttributes — two-phase orchestrator', () => {
  it('runs phase A then phase B and returns ok with the persisted attributes', async () => {
    const created = makeInstruction({ id: 'new-1', attributes_count: 2 });
    const persisted: InstructionAttribute[] = [
      { id: 'a1', instruction_id: 'new-1', key: 'banco', value: 'BBVA', index_order: 0 },
      { id: 'a2', instruction_id: 'new-1', key: 'cbu', value: '123', index_order: 1 },
    ];
    post.mockImplementation((url: string) => {
      if (url === '/instruction') return Promise.resolve({ data: created });
      if (url === '/instruction-attribute/save-all')
        return Promise.resolve({ data: persisted });
      return Promise.reject(new Error(`unexpected POST ${url}`));
    });

    const result = await createInstructionWithAttributes(makeFormData());

    expect(post).toHaveBeenNthCalledWith(1, '/instruction', {
      name: 'Pago a proveedor X',
      provider: null,
      currency_id: 'ARS',
      description: 'instructivo',
      status: 'DRAFT',
    });
    expect(post).toHaveBeenNthCalledWith(2, '/instruction-attribute/save-all', {
      instruction_id: 'new-1',
      attributes: [
        { instruction_id: 'new-1', key: 'banco', value: 'BBVA', index_order: 0 },
        { instruction_id: 'new-1', key: 'cbu', value: '123', index_order: 1 },
      ],
    });
    expect(result).toEqual({
      status: 'ok',
      instruction: { ...created, attributes: persisted },
    });
  });

  it('returns phase-a-failed and surfaces field hints from ApiError details', async () => {
    post.mockRejectedValueOnce(
      new ApiError('Nombre duplicado', 409, 'CONFLICT', {
        field: 'name',
        message: 'Ya existe una instrucción con ese nombre',
      }),
    );

    const result = await createInstructionWithAttributes(makeFormData());

    expect(post).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      status: 'phase-a-failed',
      error: {
        message: 'Ya existe una instrucción con ese nombre',
        field: 'name',
      },
    });
  });

  it('returns phase-b-failed with the new instruction id when phase B throws', async () => {
    const created = makeInstruction({ id: 'orphan-1' });
    post.mockImplementation((url: string) => {
      if (url === '/instruction') return Promise.resolve({ data: created });
      return Promise.reject(new Error('500 in phase B'));
    });

    const result = await createInstructionWithAttributes(makeFormData());

    expect(result).toEqual({
      status: 'phase-b-failed',
      instructionId: 'orphan-1',
      error: { message: '500 in phase B' },
    });
  });

  it('skips phase B entirely when there are no attributes', async () => {
    const created = makeInstruction({ id: 'empty-1', attributes_count: 0 });
    post.mockResolvedValueOnce({ data: created });

    const result = await createInstructionWithAttributes(makeFormData({ attributes: [] }));

    expect(post).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      status: 'ok',
      instruction: { ...created, attributes: [] },
    });
  });

  it('falls back to a generic message when phase A throws a non-ApiError', async () => {
    post.mockRejectedValueOnce(new Error('network down'));

    const result = await createInstructionWithAttributes(makeFormData());

    expect(result).toEqual({
      status: 'phase-a-failed',
      error: { message: 'network down' },
    });
  });
});

describe('updateInstructionWithAttributes', () => {
  it('runs PUT then save-all and returns ok', async () => {
    const updated = makeInstruction({ id: 'u-1', name: 'Renamed' });
    const persisted: InstructionAttribute[] = [
      { id: 'a1', instruction_id: 'u-1', key: 'k', value: 'v', index_order: 0 },
    ];
    put.mockResolvedValueOnce({ data: updated });
    post.mockResolvedValueOnce({ data: persisted });

    const result = await updateInstructionWithAttributes(
      'u-1',
      makeFormData({ name: 'Renamed', attributes: [{ key: 'k', value: 'v', index: 0 }] }),
    );

    expect(put).toHaveBeenCalledWith('/instruction/u-1', {
      name: 'Renamed',
      provider: null,
      currency_id: 'ARS',
      description: 'instructivo',
      status: 'DRAFT',
    });
    expect(post).toHaveBeenCalledWith('/instruction-attribute/save-all', {
      instruction_id: 'u-1',
      attributes: [{ instruction_id: 'u-1', key: 'k', value: 'v', index_order: 0 }],
    });
    expect(result).toEqual({
      status: 'ok',
      instruction: { ...updated, attributes: persisted },
    });
  });

  it('returns phase-b-failed with the original id when save-all throws', async () => {
    const updated = makeInstruction({ id: 'u-2' });
    put.mockResolvedValueOnce({ data: updated });
    post.mockRejectedValueOnce(new Error('boom'));

    const result = await updateInstructionWithAttributes('u-2', makeFormData());

    expect(result).toEqual({
      status: 'phase-b-failed',
      instructionId: 'u-2',
      error: { message: 'boom' },
    });
  });
});

describe('retrySaveAttributes', () => {
  it('returns ok on success', async () => {
    post.mockResolvedValueOnce({ data: [] });
    const result = await retrySaveAttributes('i-1', [{ key: 'k', value: 'v', index: 0 }]);
    expect(result).toEqual({ status: 'ok' });
  });

  it('returns failed with the captured message on error', async () => {
    post.mockRejectedValueOnce(new Error('still down'));
    const result = await retrySaveAttributes('i-1', [{ key: 'k', value: 'v', index: 0 }]);
    expect(result).toEqual({ status: 'failed', message: 'still down' });
  });
});

describe('deleteInstruction', () => {
  it('issues DELETE on the canonical detail endpoint', async () => {
    del.mockResolvedValueOnce({ data: undefined });
    await deleteInstruction('i-9');
    expect(del).toHaveBeenCalledWith('/instruction/i-9');
  });

  it('lets ApiError propagate so the caller can react', async () => {
    del.mockRejectedValueOnce(new ApiError('Not found', 404, 'NOT_FOUND'));
    await expect(deleteInstruction('i-bad')).rejects.toBeInstanceOf(ApiError);
  });
});
