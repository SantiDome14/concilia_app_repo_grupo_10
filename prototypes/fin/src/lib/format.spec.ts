import { describe, it, expect } from 'vitest';
import {
  formatCompact,
  formatCurrency,
  formatDate,
  nextSequentialId,
  truncate,
} from './format';

describe('format', () => {
  describe('formatCurrency', () => {
    it('formats a number with ARS grouping and 2 decimals', () => {
      expect(formatCurrency(1234.5)).toBe('1.234,50');
    });

    it('handles zero', () => {
      expect(formatCurrency(0)).toBe('0,00');
    });
  });

  describe('formatDate', () => {
    it('parses ISO date and formats as DD/MM/YYYY', () => {
      expect(formatDate('2026-04-21')).toBe('21/04/2026');
    });
  });

  describe('nextSequentialId', () => {
    it('returns R-001 when list is empty', () => {
      expect(nextSequentialId([])).toBe('R-001');
    });

    it('returns next sequential ID', () => {
      expect(nextSequentialId(['R-001', 'R-002', 'R-005'])).toBe('R-006');
    });

    it('respects custom prefix', () => {
      expect(nextSequentialId(['OP-001', 'OP-002'], 'OP')).toBe('OP-003');
    });
  });

  describe('truncate', () => {
    it('returns the same string when under limit', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    it('truncates and appends ellipsis when over limit', () => {
      expect(truncate('hello world', 8)).toBe('hello w…');
    });
  });

  describe('formatCompact', () => {
    it('formats billions with B suffix and 2 decimals', () => {
      expect(formatCompact(1_117_230_500)).toBe('1.12B');
    });

    it('formats millions with M suffix and 2 decimals', () => {
      expect(formatCompact(5_700_000)).toBe('5.70M');
    });

    it('formats thousands with K suffix and 2 decimals', () => {
      expect(formatCompact(270_000)).toBe('270.00K');
    });

    it('renders values under 1000 as plain integers', () => {
      expect(formatCompact(999)).toBe('999');
      expect(formatCompact(0)).toBe('0');
    });

    it('accepts pre-formatted display strings with dot thousands separators', () => {
      expect(formatCompact('1.017.930.500')).toBe('1.02B');
      expect(formatCompact('8.500.000')).toBe('8.50M');
    });

    it('returns the input verbatim when not a number', () => {
      expect(formatCompact('—')).toBe('—');
    });
  });
});
