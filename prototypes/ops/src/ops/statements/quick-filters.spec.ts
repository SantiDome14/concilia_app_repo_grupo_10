import { describe, it, expect } from 'vitest';
import {
  QUICK_FILTERS,
  resolveQuickFilter,
  findChipKeyForRange,
} from './quick-filters';

// All scenarios pin "today" so the math is deterministic.
const TODAY = new Date(2026, 4, 8); // 2026-05-08 (Friday)

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

describe('QUICK_FILTERS — display order', () => {
  it('exposes the 8 chips in the contracted order', () => {
    expect(QUICK_FILTERS.map((f) => f.key)).toEqual([
      'last-7-days',
      'last-15-days',
      'last-30-days',
      'current-month',
      'last-month',
      'last-3-months',
      'last-6-months',
      'current-year',
    ]);
  });

  it('uses the canonical Spanish labels', () => {
    expect(QUICK_FILTERS.map((f) => f.label)).toEqual([
      'Últimos 7 días',
      'Últimos 15 días',
      'Últimos 30 días',
      'Este mes',
      'Mes anterior',
      'Últimos 3 meses',
      'Últimos 6 meses',
      'Este año',
    ]);
  });
});

describe('resolveQuickFilter — rolling-day chips', () => {
  it('Últimos 7 días resolves to a 7-day inclusive window ending today', () => {
    const r = resolveQuickFilter('last-7-days', TODAY);
    expect(ymd(r.from)).toBe('2026-05-02');
    expect(ymd(r.to)).toBe('2026-05-08');
  });

  it('Últimos 15 días resolves to a 15-day inclusive window', () => {
    const r = resolveQuickFilter('last-15-days', TODAY);
    expect(ymd(r.from)).toBe('2026-04-24');
    expect(ymd(r.to)).toBe('2026-05-08');
  });

  it('Últimos 30 días resolves to a 30-day inclusive window', () => {
    const r = resolveQuickFilter('last-30-days', TODAY);
    expect(ymd(r.from)).toBe('2026-04-09');
    expect(ymd(r.to)).toBe('2026-05-08');
  });

  it('Últimos 3 meses uses 90 days (not calendar months)', () => {
    const r = resolveQuickFilter('last-3-months', TODAY);
    expect(ymd(r.from)).toBe('2026-02-08');
    expect(ymd(r.to)).toBe('2026-05-08');
  });

  it('Últimos 6 meses uses 180 days (not calendar months)', () => {
    const r = resolveQuickFilter('last-6-months', TODAY);
    expect(ymd(r.from)).toBe('2025-11-10');
    expect(ymd(r.to)).toBe('2026-05-08');
  });
});

describe('resolveQuickFilter — calendar-aware chips', () => {
  it('Este mes resolves to first-of-month → today', () => {
    const r = resolveQuickFilter('current-month', TODAY);
    expect(ymd(r.from)).toBe('2026-05-01');
    expect(ymd(r.to)).toBe('2026-05-08');
  });

  it('Mes anterior resolves to first-of-previous-month → last-of-previous-month', () => {
    const r = resolveQuickFilter('last-month', TODAY);
    expect(ymd(r.from)).toBe('2026-04-01');
    expect(ymd(r.to)).toBe('2026-04-30'); // April has 30 days, NOT 31
  });

  it('Mes anterior handles February correctly (28 vs 29 day months)', () => {
    const inMarch2025 = new Date(2025, 2, 15); // 2025-03-15, non-leap year
    const r = resolveQuickFilter('last-month', inMarch2025);
    expect(ymd(r.from)).toBe('2025-02-01');
    expect(ymd(r.to)).toBe('2025-02-28');
  });

  it('Mes anterior handles February correctly in a leap year', () => {
    const inMarch2024 = new Date(2024, 2, 15); // 2024-03-15, leap year
    const r = resolveQuickFilter('last-month', inMarch2024);
    expect(ymd(r.from)).toBe('2024-02-01');
    expect(ymd(r.to)).toBe('2024-02-29');
  });

  it('Mes anterior crosses the year boundary correctly', () => {
    const inJan = new Date(2026, 0, 15); // 2026-01-15
    const r = resolveQuickFilter('last-month', inJan);
    expect(ymd(r.from)).toBe('2025-12-01');
    expect(ymd(r.to)).toBe('2025-12-31');
  });

  it('Este año resolves to first-of-january → today', () => {
    const r = resolveQuickFilter('current-year', TODAY);
    expect(ymd(r.from)).toBe('2026-01-01');
    expect(ymd(r.to)).toBe('2026-05-08');
  });
});

describe('findChipKeyForRange — inverse lookup', () => {
  it('returns the chipKey when the range exactly matches one chip', () => {
    const r = resolveQuickFilter('last-7-days', TODAY);
    expect(findChipKeyForRange(r, TODAY)).toBe('last-7-days');
  });

  it('returns null when the range does not match any chip', () => {
    const r = { from: new Date(2026, 4, 4), to: new Date(2026, 4, 8) }; // 5-day window — no chip
    expect(findChipKeyForRange(r, TODAY)).toBe(null);
  });

  it('disambiguates between Mes anterior and a literal range with the same dates', () => {
    // On 2026-05-08, Mes anterior = 2026-04-01 → 2026-04-30. A literal
    // range with those exact dates SHOULD round-trip back to Mes anterior.
    const literal = { from: new Date(2026, 3, 1), to: new Date(2026, 3, 30) };
    expect(findChipKeyForRange(literal, TODAY)).toBe('last-month');
  });
});
