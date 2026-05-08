// ════════════════════════════════════════════════════════════════════
// Recompute registry — extensible derived-state map
// ────────────────────────────────────────────────────────────────────
// v1 ships the `imputacion` token by default. Adding a new token
// requires a new OpenSpec change (Decision 8); the registration API
// is exposed for module-specific extensions registered at boot.
// ════════════════════════════════════════════════════════════════════

import type { Manifest, RecomputeToken } from '@/types/manifest';
import { computeImputation } from './computeImputation';

export type RecomputeFn = (
  record: Record<string, unknown>,
  manifest: Manifest,
) => string;

const REGISTRY: Map<RecomputeToken, RecomputeFn> = new Map();

/** Registers a recompute function under a token. Last-writer-wins. */
export function registerRecompute(
  token: RecomputeToken,
  fn: RecomputeFn,
): void {
  REGISTRY.set(token, fn);
}

/**
 * Runs the registered recompute for `token`. Returns `undefined` when
 * no recompute is registered (caller decides whether to warn).
 */
export function runRecompute(
  token: RecomputeToken,
  record: Record<string, unknown>,
  manifest: Manifest,
): string | undefined {
  const fn = REGISTRY.get(token);
  if (fn === undefined) return undefined;
  return fn(record, manifest);
}

/** Lists all recompute tokens currently registered. */
export function getRegisteredTokens(): string[] {
  return Array.from(REGISTRY.keys());
}

// Default registration: imputacion is always available.
registerRecompute('imputacion', computeImputation);
