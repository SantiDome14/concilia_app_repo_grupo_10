import type { DateRange, PersistedRange, StatementQuickFilterKey } from './types';
import { findChipKeyForRange, resolveQuickFilter } from './quick-filters';

// ════════════════════════════════════════════════════════════════════
// range-storage — helper for Requirement 4 (Decision 7b — localStorage
// persistence of the last-chosen range per operator).
//
// Two flavours of persisted range:
//   - `chip` — the operator picked a quick-filter chip; on the next
//     opening the chip re-activates and re-resolves relative to the
//     new "today" (Tuesday after Monday's "Últimos 30 días" produces
//     a freshly-shifted 30-day window).
//   - `literal` — the operator typed a custom range in the calendar;
//     stays literal even if today's chips would resolve to the same
//     dates (intent preservation).
//
// All localStorage interactions are wrapped in try/catch so a private
// browsing mode that throws on `setItem` doesn't break the modal.
// ════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'ops:statements:lastRange';

export interface LoadedRange {
  range: DateRange;
  chipKey: StatementQuickFilterKey | null;
}

/**
 * Persist the operator's last-chosen range. If `chipKey` is provided
 * (because they picked a chip), the storage records the chip key —
 * this re-resolves on next opening. Otherwise the literal range is
 * stored.
 */
export function saveRange(range: DateRange, chipKey: StatementQuickFilterKey | null): void {
  try {
    const payload: PersistedRange = chipKey
      ? { kind: 'chip', chipKey }
      : { kind: 'literal', from: toYmd(range.from), to: toYmd(range.to) };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Private mode / disabled storage: silent no-op.
  }
}

/**
 * Load the operator's last-chosen range.
 *
 * Returns `null` when there is no saved range, the saved record is
 * malformed, or storage is unavailable.
 *
 * `chip`-flavoured records re-resolve relative to `now` (so the chip's
 * semantic — "the last 30 days from today" — is preserved across days).
 * `literal`-flavoured records return the saved dates verbatim and
 * `chipKey: null` (the modal will NOT auto-activate a chip even if
 * today's `current-month` happens to match those literal dates — per
 * Requirement 4 scenario "Last-chosen custom range pre-populates as a
 * literal range, no chip active").
 */
export function loadRange(now: Date = new Date()): LoadedRange | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedRange;
    if (parsed.kind === 'chip') {
      const range = resolveQuickFilter(parsed.chipKey, now);
      // Defensive: if the saved chip key is no longer in our list (e.g.
      // a migration removed it), `findChipKeyForRange` returns null and
      // we treat it as a literal so the operator still gets dates back.
      const chipKey = findChipKeyForRange(range, now) ? parsed.chipKey : null;
      return { range, chipKey };
    }
    if (parsed.kind === 'literal') {
      const from = fromYmd(parsed.from);
      const to = fromYmd(parsed.to);
      if (!from || !to) return null;
      return { range: { from, to }, chipKey: null };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Internals ──────────────────────────────────────────────────────

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fromYmd(s: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!match) return null;
  const [, yStr, mStr, dStr] = match;
  return new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
}
