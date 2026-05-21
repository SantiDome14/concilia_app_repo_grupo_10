// ════════════════════════════════════════════════════════════════════
// MSW handler utilities
// ────────────────────────────────────────────────────────────────────
// Centralized helpers shared across every handler module. Keeping these
// in one file lets us swap behavior (e.g. zero out delays in tests) in
// a single edit instead of touching every handler.
// ════════════════════════════════════════════════════════════════════

const IS_TEST =
  typeof import.meta.env !== 'undefined' &&
  (import.meta.env.MODE === 'test' || import.meta.env.VITEST === 'true');

/**
 * Random 100-300 ms latency to keep loading-state UX honest in dev.
 * Returns 0 in the test environment so vue-query queries resolve in a
 * single microtask flush — tests don't have to advance timers manually.
 */
export function randomDelayMs(): number {
  if (IS_TEST) return 0;
  return Math.floor(100 + Math.random() * 200);
}
