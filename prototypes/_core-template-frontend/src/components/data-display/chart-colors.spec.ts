import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveSeriesColor } from './chart-colors';

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('resolveSeriesColor — auto-assignment from chart-N tokens', () => {
  it('returns var(--chart-N) by index when no colors are provided', () => {
    expect(resolveSeriesColor(undefined, 0)).toBe('var(--chart-1)');
    expect(resolveSeriesColor(undefined, 1)).toBe('var(--chart-2)');
    expect(resolveSeriesColor(undefined, 7)).toBe('var(--chart-8)');
  });

  it('cycles past --chart-8 with a console warning', () => {
    const result = resolveSeriesColor(undefined, 9);
    expect(result).toBe('var(--chart-2)'); // 9 mod 8 = 1 → chart-2
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('resolveSeriesColor — explicit colors prop', () => {
  it('resolves semantic aliases against the semantic palette', () => {
    expect(resolveSeriesColor(['success'], 0)).toBe('var(--success)');
    expect(resolveSeriesColor(['danger'], 0)).toBe('var(--danger)');
    expect(resolveSeriesColor(['neutral'], 0)).toBe('var(--t-3)');
  });

  it('passes through var(--*) refs unchanged', () => {
    expect(resolveSeriesColor(['var(--brand)'], 0)).toBe('var(--brand)');
  });

  it('warns once when a hardcoded hex value is provided', () => {
    const result = resolveSeriesColor(['#1B1B64'], 0);
    expect(result).toBe('#1B1B64'); // pass-through
    expect(console.warn).toHaveBeenCalled();
  });

  it('falls back to chart-N when an entry is missing', () => {
    expect(resolveSeriesColor(['success'], 1)).toBe('var(--chart-2)');
  });
});
