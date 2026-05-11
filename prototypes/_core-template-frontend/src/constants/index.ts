// ════════════════════════════════════════════════════════════════════
// App-wide constants
// ────────────────────────────────────────────────────────────────────
// Non-env values that don't change per environment.
// ════════════════════════════════════════════════════════════════════

/** Default page size for paginated tables. */
export const DEFAULT_PAGE_SIZE = 10;

/** Allowed page size options in table footer. */
export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50] as const;

/** Toast durations (ms). */
export const TOAST_DURATION = {
  SHORT: 2_500,
  DEFAULT: 4_500,
  LONG: 8_000,
} as const;

/** Query client defaults (overridable per query). */
export const QUERY_DEFAULTS = {
  STALE_TIME_MS: 30_000,
  RETRY: 1,
} as const;
