import { describe, it, expect } from 'vitest';
import {
  SPONSOR_CATALOG,
  activeSponsors,
  getSponsorByCode,
  getSponsorLabel,
  isActiveSponsor,
} from './sponsor-catalog';

describe('SPONSOR_CATALOG — open-set abstraction', () => {
  it('lists COINAG, BIND, and BANCO_DE_COMERCIO as active per refine-ops-psp-tab-aware-header-and-multi-sponsor', () => {
    const codes = SPONSOR_CATALOG.map((s) => s.code);
    expect(codes).toContain('COINAG');
    expect(codes).toContain('BIND');
    expect(codes).toContain('BANCO_DE_COMERCIO');

    expect(SPONSOR_CATALOG.find((s) => s.code === 'COINAG')?.active).toBe(true);
    expect(SPONSOR_CATALOG.find((s) => s.code === 'BIND')?.active).toBe(true);
    expect(SPONSOR_CATALOG.find((s) => s.code === 'BANCO_DE_COMERCIO')?.active).toBe(true);
  });
});

describe('activeSponsors', () => {
  it('returns every catalog entry in display order', () => {
    const codes = activeSponsors().map((s) => s.code);
    expect(codes).toEqual(['COINAG', 'BIND', 'BANCO_DE_COMERCIO']);
  });
});

describe('getSponsorByCode', () => {
  it('returns the matching catalog entry', () => {
    expect(getSponsorByCode('COINAG')?.label).toBe('COINAG');
    expect(getSponsorByCode('BIND')?.label).toBe('BIND');
  });

  it('returns null for unknown codes', () => {
    expect(getSponsorByCode('XXX')).toBe(null);
  });
});

describe('getSponsorLabel', () => {
  it('returns the canonical label for a known code', () => {
    expect(getSponsorLabel('COINAG')).toBe('COINAG');
    expect(getSponsorLabel('BANCO_DE_COMERCIO')).toBe('Banco de Comercio');
  });

  it('falls back to the code itself for unknown sponsors', () => {
    expect(getSponsorLabel('XXX')).toBe('XXX');
  });

  it('renders em-dash for null/undefined input', () => {
    expect(getSponsorLabel(null)).toBe('—');
    expect(getSponsorLabel(undefined)).toBe('—');
  });
});

describe('isActiveSponsor', () => {
  it('returns true for every active sponsor in the catalog', () => {
    expect(isActiveSponsor('COINAG')).toBe(true);
    expect(isActiveSponsor('BIND')).toBe(true);
    expect(isActiveSponsor('BANCO_DE_COMERCIO')).toBe(true);
  });

  it('returns false for unknown / null inputs', () => {
    expect(isActiveSponsor('XXX')).toBe(false);
    expect(isActiveSponsor(null)).toBe(false);
    expect(isActiveSponsor(undefined)).toBe(false);
  });
});
