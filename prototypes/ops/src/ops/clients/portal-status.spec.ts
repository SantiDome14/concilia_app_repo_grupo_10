import { describe, it, expect } from 'vitest';
import { derivePortalStatus } from './portal-status';
import type { Client } from './types';

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: 'c-1',
    name: 'Test',
    email: 'test@example.com',
    tax_number: '20-12345678-9',
    docket: 'A1',
    is_active: true,
    metadata: { status: '' },
    ...overrides,
  };
}

describe('derivePortalStatus', () => {
  it('returns active+success for metadata.status === "ACTIVE"', () => {
    const result = derivePortalStatus(makeClient({ metadata: { status: 'ACTIVE' } }));
    expect(result).toEqual({
      key: 'active',
      label: 'Cuenta Validada',
      tone: 'success',
    });
  });

  it('returns pending+warning for metadata.status === "PENDING"', () => {
    const result = derivePortalStatus(makeClient({ metadata: { status: 'PENDING' } }));
    expect(result).toEqual({
      key: 'pending',
      label: 'Pendiente de Validación',
      tone: 'warning',
    });
  });

  it('returns not-created+danger when metadata is null', () => {
    const result = derivePortalStatus(makeClient({ metadata: null }));
    expect(result).toEqual({
      key: 'not-created',
      label: 'Cuenta no Creada',
      tone: 'danger',
    });
  });

  it('returns not-created+danger when metadata.status is empty string', () => {
    const result = derivePortalStatus(makeClient({ metadata: { status: '' } }));
    expect(result.key).toBe('not-created');
    expect(result.tone).toBe('danger');
  });

  it('returns not-created+danger when metadata is undefined', () => {
    const result = derivePortalStatus(makeClient({ metadata: undefined }));
    expect(result.key).toBe('not-created');
  });

  it('returns not-created+danger for unrecognised statuses (defensive default)', () => {
    const result = derivePortalStatus(
      makeClient({
        // @ts-expect-error — testing an unsupported status string
        metadata: { status: 'BLOCKED' },
      }),
    );
    expect(result.key).toBe('not-created');
    expect(result.tone).toBe('danger');
  });
});
