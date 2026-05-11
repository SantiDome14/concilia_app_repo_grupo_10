// ════════════════════════════════════════════════════════════════════
// Capability evaluator — required_role_any_of only
// ────────────────────────────────────────────────────────────────────
// Decision 4: `required_role_all_of` is REMOVED from the schema.
// The validator surfaces it. The evaluator simply does not read it.
// ════════════════════════════════════════════════════════════════════

import type { Capabilities } from '@/types/manifest';

/** Evaluates a capability gate against a single role or a multi-role user. */
export function evalCapabilities(
  capabilities: Capabilities | undefined | null,
  role: string | string[] | null | undefined,
): boolean {
  if (capabilities === undefined || capabilities === null) return true;
  const list = capabilities.required_role_any_of;
  if (!Array.isArray(list)) return true;
  if (list.length === 0) return true;
  if (role === null || role === undefined) return false;
  if (Array.isArray(role)) {
    return role.some((r) => list.includes(r));
  }
  return list.includes(role);
}
