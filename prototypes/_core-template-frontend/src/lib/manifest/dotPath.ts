// ════════════════════════════════════════════════════════════════════
// Dot-path helpers — read/write nested record fields by string path
// ────────────────────────────────────────────────────────────────────
// Used by predicate evaluation, dialog field reads, and on_confirm
// writes. Pure, no Vue deps.
// ════════════════════════════════════════════════════════════════════

/** True when the value is a plain object container we can walk into. */
function isWalkable(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Resolves a dot-separated path against a record. Returns `undefined`
 * when any intermediate segment is missing, null, or not walkable.
 */
export function resolveField<T = unknown>(
  obj: unknown,
  path: string,
): T | undefined {
  if (!path) return undefined;
  const segments = path.split('.');
  let current: unknown = obj;
  for (const segment of segments) {
    if (!isWalkable(current)) return undefined;
    current = current[segment];
    if (current === null || current === undefined) {
      // Terminal: a null/undefined intermediate stops the walk and
      // the final-segment lookup returns the same value.
      const isLast = segment === segments[segments.length - 1];
      return isLast ? (current as T | undefined) : undefined;
    }
  }
  return current as T;
}

/**
 * Sets a value at a dot-separated path, mutating `obj` in place.
 * Creates intermediate `Record<string, unknown>` containers as needed.
 * Throws when an intermediate segment exists as a non-object truthy value.
 */
export function setField(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  if (!path) {
    throw new Error('setField: path must be a non-empty string');
  }
  const segments = path.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i] as string;
    const next = current[segment];
    if (next === undefined || next === null) {
      const fresh: Record<string, unknown> = {};
      current[segment] = fresh;
      current = fresh;
    } else if (isWalkable(next)) {
      current = next;
    } else {
      throw new Error(
        `setField: cannot descend into non-object intermediate at "${segments
          .slice(0, i + 1)
          .join('.')}" (value type: ${typeof next})`,
      );
    }
  }
  const last = segments[segments.length - 1] as string;
  current[last] = value;
}
