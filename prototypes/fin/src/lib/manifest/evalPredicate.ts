// ════════════════════════════════════════════════════════════════════
// Predicate evaluator — the 8-form alphabet
// ────────────────────────────────────────────────────────────────────
// Multi-key predicate objects are AND-merged (Decision 3).
// Null/undefined predicates → true. Array predicates → AND of all.
// Unknown keys emit a dev warning and resolve to true (do-not-block).
// ════════════════════════════════════════════════════════════════════

import type { Predicate } from '@/types/manifest';
import { resolveField } from './dotPath';

const KNOWN_KEYS = new Set<string>([
  'record_concept_in',
  'record_concept_not_in',
  'field_is_null',
  'field_is_not_null',
  'field_equals',
  'field_in',
  'all',
  'any',
]);

/** True when running in production (suppresses dev warnings). */
function isProd(): boolean {
  // Both Node and Vite environments are tolerated.
  // process.env.NODE_ENV is set in tests; import.meta.env.PROD in Vite.
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
    return true;
  }
  return false;
}

/** Reads the record's type, falling back from `_record_type` to `tipo`. */
function readRecordType(record: Record<string, unknown>): unknown {
  if ('_record_type' in record && record._record_type !== undefined) {
    return record._record_type;
  }
  return record.tipo;
}

/** Predicate evaluator entry point. */
export function evalPredicate(
  predicate: Predicate | Predicate[] | null | undefined,
  record: Record<string, unknown>,
): boolean {
  if (predicate === null || predicate === undefined) return true;
  if (Array.isArray(predicate)) {
    return predicate.every((p) => evalPredicate(p, record));
  }
  return evalPredicateObject(predicate, record);
}

function evalPredicateObject(
  predicate: Predicate,
  record: Record<string, unknown>,
): boolean {
  // AND-merge across every key on the object. Unknown keys warn but
  // do not contribute (treated as `true` — do-not-block semantics).
  let result = true;
  for (const key of Object.keys(predicate)) {
    if (!KNOWN_KEYS.has(key)) {
      if (!isProd()) {
         
        console.warn('[PREDICATES] unknown key: ' + key);
      }
      continue;
    }
    if (!evalKey(key, predicate as Record<string, unknown>, record)) {
      result = false;
      // No early return — we still want to surface every unknown key.
    }
  }
  return result;
}

function evalKey(
  key: string,
  predicate: Record<string, unknown>,
  record: Record<string, unknown>,
): boolean {
  switch (key) {
    case 'record_concept_in': {
      const list = predicate[key] as unknown;
      const recordType = readRecordType(record);
      return Array.isArray(list) && list.includes(recordType);
    }
    case 'record_concept_not_in': {
      const list = predicate[key] as unknown;
      const recordType = readRecordType(record);
      return Array.isArray(list) && !list.includes(recordType);
    }
    case 'field_is_null': {
      const path = predicate[key] as unknown;
      if (typeof path !== 'string') return true;
      const v = resolveField(record, path);
      return v === null || v === undefined;
    }
    case 'field_is_not_null': {
      const path = predicate[key] as unknown;
      if (typeof path !== 'string') return true;
      const v = resolveField(record, path);
      return v !== null && v !== undefined;
    }
    case 'field_equals': {
      const spec = predicate[key] as { field?: unknown; value?: unknown };
      if (!spec || typeof spec.field !== 'string') return true;
      const v = resolveField(record, spec.field);
      return v === spec.value;
    }
    case 'field_in': {
      const spec = predicate[key] as {
        field?: unknown;
        values?: unknown;
      };
      if (!spec || typeof spec.field !== 'string') return true;
      if (!Array.isArray(spec.values)) return false;
      const v = resolveField(record, spec.field);
      return spec.values.includes(v);
    }
    case 'all': {
      const list = predicate[key] as unknown;
      if (!Array.isArray(list)) return true;
      return (list as Predicate[]).every((p) => evalPredicate(p, record));
    }
    case 'any': {
      const list = predicate[key] as unknown;
      if (!Array.isArray(list)) return false;
      return (list as Predicate[]).some((p) => evalPredicate(p, record));
    }
    default:
      return true;
  }
}
