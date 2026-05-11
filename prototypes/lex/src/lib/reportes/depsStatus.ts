// ════════════════════════════════════════════════════════════════════
// depsStatus — pure helper for the Reportes Catálogo dependency block
// ────────────────────────────────────────────────────────────────────
// Mirrors the prototype's `depsStatus(r)` (lines 5318-5330 of
// `_core-template-frontend.html`):
//   - returns `null` when the report has no `dependencies` entries
//   - `total` / `done` count the array
//   - `ready === (done === total)`
//   - `blocked` is true when at least one pending dep is within its
//     `sla_days_before` window relative to `r.next` (today is computed
//     from `now` ms so callers can override in tests)
// ════════════════════════════════════════════════════════════════════

import type { Report } from '@/types/genericos';

export interface DepsStatus {
  total: number;
  done: number;
  ready: boolean;
  blocked: boolean;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysUntil(iso: string, now: number): number {
  // Parse YYYY-MM-DD as a local-noon date so DST doesn't perturb the diff.
  const parts = iso.split('-').map(Number);
  const y = parts[0] ?? 0;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const target = new Date(y, m - 1, d).getTime();
  const today = new Date(new Date(now).getFullYear(),
    new Date(now).getMonth(),
    new Date(now).getDate()).getTime();
  return Math.round((target - today) / MS_PER_DAY);
}

/**
 * Computes the dependency-status of a Report. Returns `null` if the
 * report has no `dependencies` (no block to render). When `now` is
 * omitted, uses `Date.now()`.
 */
export function depsStatus(r: Report, now: number = Date.now()): DepsStatus | null {
  const deps = r.dependencies;
  if (!deps || deps.length === 0) return null;
  const total = deps.length;
  const done = deps.filter((d) => d.completed).length;
  const ready = done === total;
  let blocked = false;
  if (!ready && r.next) {
    const dRem = daysUntil(r.next, now);
    blocked = deps.some(
      (d) => !d.completed && dRem !== null && dRem <= d.sla_days_before,
    );
  }
  return { total, done, ready, blocked };
}
