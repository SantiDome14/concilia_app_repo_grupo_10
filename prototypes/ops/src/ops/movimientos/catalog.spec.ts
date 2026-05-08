import { describe, it, expect } from 'vitest';
import {
  MOVEMENT_TYPE_OPTIONS,
  MOVEMENT_STATUS_OPTIONS,
  MOVEMENT_ORIGIN_OPTIONS,
  getMovementTypeLabel,
  getMovementStatusLabel,
} from './catalog';

describe('MOVEMENT_TYPE_OPTIONS', () => {
  it('exposes the closed list of 9 movement types per refine-ops-psp-tab-aware-header-and-multi-sponsor', () => {
    expect(MOVEMENT_TYPE_OPTIONS.map((o) => o.value)).toEqual([
      'COLLECTOR_IN',
      'COLLECTOR_OUT',
      'DEPOSIT',
      'FEE',
      'FX_DEPOSIT',
      'FX_WITHDRAWAL',
      'INT_DEPOSIT',
      'IN_WITHDRAWAL',
      'WITHDRAWAL',
    ]);
  });

  it('uses space-separated labels for display', () => {
    expect(MOVEMENT_TYPE_OPTIONS.find((o) => o.value === 'COLLECTOR_IN')?.label).toBe(
      'COLLECTOR IN',
    );
    expect(MOVEMENT_TYPE_OPTIONS.find((o) => o.value === 'FX_DEPOSIT')?.label).toBe(
      'FX DEPOSIT',
    );
  });
});

describe('MOVEMENT_STATUS_OPTIONS', () => {
  it('exposes the closed list of 3 statuses', () => {
    expect(MOVEMENT_STATUS_OPTIONS.map((o) => o.value)).toEqual([
      'COMPLETED',
      'PENDING',
      'FAILED',
    ]);
  });
});

describe('MOVEMENT_ORIGIN_OPTIONS', () => {
  it('exposes the open-set placeholder list (pending backend confirmation)', () => {
    expect(MOVEMENT_ORIGIN_OPTIONS.map((o) => o.value)).toEqual(['MANUAL', 'SWIFT', 'AUTO']);
  });
});

describe('getMovementTypeLabel', () => {
  it('returns the canonical label for a known code', () => {
    expect(getMovementTypeLabel('COLLECTOR_IN')).toBe('COLLECTOR IN');
    expect(getMovementTypeLabel('WITHDRAWAL')).toBe('WITHDRAWAL');
  });

  it('falls back to the code itself for unknown types', () => {
    expect(getMovementTypeLabel('XXX')).toBe('XXX');
  });

  it('renders em-dash for null/undefined input', () => {
    expect(getMovementTypeLabel(null)).toBe('—');
    expect(getMovementTypeLabel(undefined)).toBe('—');
  });
});

describe('getMovementStatusLabel', () => {
  it('returns the canonical label for a known code', () => {
    expect(getMovementStatusLabel('COMPLETED')).toBe('COMPLETED');
  });

  it('falls back to the code itself for unknown statuses', () => {
    expect(getMovementStatusLabel('UNKNOWN')).toBe('UNKNOWN');
  });
});
