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

/**
 * Build an MSW URL pattern that anchors on the API base path (`/api`).
 *
 * The conventional `*${path}` pattern (recommended by the template's
 * CLAUDE.md for env-agnosticism) collides with Vite dev-server module
 * requests when an endpoint segment matches a feature-folder name —
 * e.g. `*\/clients\/:id` would otherwise match
 * `/src/ops/clients/WhitelistAccountModal.vue` with `:id =
 * 'WhitelistAccountModal.vue'`, hand the request to the clients DETAIL
 * handler, fail to find the record, and return a spurious 404.
 *
 * Anchoring on `/api` (the prefix the live backend uses, mirrored by
 * `VITE_API_BASE_URL=http://localhost:3000/api`) prevents the collision:
 * Vite dev-server URLs carry `/src/...` paths with no `/api` segment,
 * so they bypass every handler cleanly.
 *
 * If the live backend is ever rehosted under a different prefix, update
 * this helper in one place — every handler that consumes it follows.
 */
export function apiPath(endpoint: string): string {
  return `*/api${endpoint}`;
}
