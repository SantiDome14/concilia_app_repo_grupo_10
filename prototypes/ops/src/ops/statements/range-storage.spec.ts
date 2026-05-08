import { describe, it, expect, beforeEach } from 'vitest';
import { saveRange, loadRange } from './range-storage';

const TODAY = new Date(2026, 4, 8); // 2026-05-08

beforeEach(() => {
  window.localStorage.clear();
});

describe('saveRange + loadRange — chip flavour', () => {
  it('persists a chip key and re-resolves it relative to today on load', () => {
    saveRange({ from: new Date(2026, 4, 2), to: new Date(2026, 4, 8) }, 'last-7-days');
    const loaded = loadRange(TODAY);
    expect(loaded?.chipKey).toBe('last-7-days');
    expect(loaded?.range.from.getDate()).toBe(2);
    expect(loaded?.range.from.getMonth()).toBe(4);
    expect(loaded?.range.to.getDate()).toBe(8);
  });

  it('re-resolves the chip relative to the new today (not the date when saved)', () => {
    // Save on Monday 2026-05-08 (chip Últimos 7 días = May 2 → May 8).
    saveRange({ from: new Date(2026, 4, 2), to: new Date(2026, 4, 8) }, 'last-7-days');
    // Load on Tuesday 2026-05-12 (chip Últimos 7 días = May 6 → May 12).
    const tuesday = new Date(2026, 4, 12);
    const loaded = loadRange(tuesday);
    expect(loaded?.chipKey).toBe('last-7-days');
    expect(loaded?.range.from.getDate()).toBe(6);
    expect(loaded?.range.to.getDate()).toBe(12);
  });
});

describe('saveRange + loadRange — literal flavour', () => {
  it('persists a literal range when no chipKey is provided', () => {
    saveRange({ from: new Date(2026, 3, 1), to: new Date(2026, 3, 15) }, null);
    const loaded = loadRange(TODAY);
    expect(loaded?.chipKey).toBe(null);
    expect(loaded?.range.from.getMonth()).toBe(3);
    expect(loaded?.range.from.getDate()).toBe(1);
    expect(loaded?.range.to.getDate()).toBe(15);
  });

  it('does NOT auto-activate a chip when a literal range happens to match one', () => {
    // On 2026-05-08, last-month resolves to 2026-04-01 → 2026-04-30.
    // Save those EXACT dates as literal — load should keep chipKey null
    // (per the Requirement 4 scenario "Last-chosen custom range
    //  pre-populates as a literal range, no chip active").
    saveRange({ from: new Date(2026, 3, 1), to: new Date(2026, 3, 30) }, null);
    const loaded = loadRange(TODAY);
    expect(loaded?.chipKey).toBe(null);
  });
});

describe('loadRange — defensive cases', () => {
  it('returns null when nothing is saved', () => {
    expect(loadRange(TODAY)).toBe(null);
  });

  it('returns null when the saved record is malformed', () => {
    window.localStorage.setItem('ops:statements:lastRange', '{not valid json');
    expect(loadRange(TODAY)).toBe(null);
  });

  it('returns null when the literal record has invalid date strings', () => {
    window.localStorage.setItem(
      'ops:statements:lastRange',
      JSON.stringify({ kind: 'literal', from: 'not-a-date', to: 'also-not' }),
    );
    expect(loadRange(TODAY)).toBe(null);
  });
});
