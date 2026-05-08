import type {
  DateRange,
  StatementQuickFilter,
  StatementQuickFilterKey,
} from './types';

// ════════════════════════════════════════════════════════════════════
// quick-filters — pure helper for the 8 canonical chips per
// Requirement 4 (Decision 5 — extract to a pure function so unit
// tests cover edge dates without mounting Vue).
// ════════════════════════════════════════════════════════════════════

/** Canonical 8-chip list in the contracted display order. */
export const QUICK_FILTERS: ReadonlyArray<StatementQuickFilter> = [
  { key: 'last-7-days', label: 'Últimos 7 días' },
  { key: 'last-15-days', label: 'Últimos 15 días' },
  { key: 'last-30-days', label: 'Últimos 30 días' },
  { key: 'current-month', label: 'Este mes' },
  { key: 'last-month', label: 'Mes anterior' },
  { key: 'last-3-months', label: 'Últimos 3 meses' },
  { key: 'last-6-months', label: 'Últimos 6 meses' },
  { key: 'current-year', label: 'Este año' },
];

/**
 * Resolve a quick-filter key to a concrete `{ from, to }` range
 * relative to the given reference date (defaults to "today" at the
 * call site).
 *
 * Both `from` and `to` are returned as plain `Date` objects pointing
 * to local-midnight. The API payload conversion (UTC suffixing) lives
 * in `api.ts::toApiPayload` so this helper is purely about date math.
 */
export function resolveQuickFilter(
  key: StatementQuickFilterKey,
  now: Date = new Date(),
): DateRange {
  // Normalise reference to local midnight so time-of-day doesn't leak
  // into the math.
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (key) {
    case 'last-7-days':
      return rollingDays(today, 7);
    case 'last-15-days':
      return rollingDays(today, 15);
    case 'last-30-days':
      return rollingDays(today, 30);
    case 'last-3-months':
      return rollingDays(today, 90);
    case 'last-6-months':
      return rollingDays(today, 180);
    case 'current-month': {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from, to: today };
    }
    case 'last-month': {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 0); // day 0 → last day of prev month
      return { from, to };
    }
    case 'current-year': {
      const from = new Date(today.getFullYear(), 0, 1);
      return { from, to: today };
    }
  }
}

/**
 * Inverse helper — given a concrete range and a reference date, return
 * the chipKey that would resolve to that exact range, or `null` if no
 * chip matches. Used on modal mount to re-activate a chip from the
 * persisted `chip` PersistedRange.
 */
export function findChipKeyForRange(
  range: DateRange,
  now: Date = new Date(),
): StatementQuickFilterKey | null {
  for (const chip of QUICK_FILTERS) {
    const resolved = resolveQuickFilter(chip.key, now);
    if (sameDay(resolved.from, range.from) && sameDay(resolved.to, range.to)) {
      return chip.key;
    }
  }
  return null;
}

// ─── Internals ──────────────────────────────────────────────────────

function rollingDays(today: Date, days: number): DateRange {
  const from = new Date(today);
  from.setDate(from.getDate() - (days - 1)); // inclusive of today, so −(days-1)
  return { from, to: today };
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
