// ════════════════════════════════════════════════════════════════════
// Imputation computer — derives kanban-axis state from required fields
// ────────────────────────────────────────────────────────────────────
// Walks the required-fields list (per record-type with `*` fallback,
// then global), counts non-empty values, returns one of three states
// from the imputacion kanban axis (PENDIENTE | EN_PROCESO | IMPUTADO).
// ════════════════════════════════════════════════════════════════════

import type { Manifest } from '@/types/manifest';
import { resolveField } from './dotPath';

const DEFAULT_STATES: readonly [string, string, string] = [
  'pendiente',
  'en_proceso',
  'imputado',
];

function readRecordType(record: Record<string, unknown>): string | undefined {
  if (
    typeof record._record_type === 'string' &&
    record._record_type.length > 0
  ) {
    return record._record_type;
  }
  if (typeof record.tipo === 'string' && record.tipo.length > 0) {
    return record.tipo;
  }
  return undefined;
}

function findImputationAxisStates(
  manifest: Manifest,
): readonly [string, string, string] {
  const axis = manifest.kanban_axes?.find(
    (a) => a.dimension === 'imputacion',
  );
  const states = axis?.states;
  if (
    Array.isArray(states) &&
    states.length >= 3 &&
    typeof states[0] === 'string' &&
    typeof states[1] === 'string' &&
    typeof states[2] === 'string'
  ) {
    return [states[0], states[1], states[2]];
  }
  return DEFAULT_STATES;
}

function resolveRequired(
  record: Record<string, unknown>,
  manifest: Manifest,
): string[] {
  const byType = manifest.required_by_type;
  const t = readRecordType(record);
  if (byType && t !== undefined && Array.isArray(byType[t])) {
    return byType[t] ?? [];
  }
  if (byType && Array.isArray(byType['*'])) {
    return byType['*'] ?? [];
  }
  if (Array.isArray(manifest.required_imputations)) {
    return manifest.required_imputations;
  }
  return [];
}

function isFilled(value: unknown): boolean {
  return value !== null && value !== undefined && value !== '' && value !== false;
}

/**
 * Returns the imputation state (one of `axis.states[0..2]`) for a record.
 * Empty `required` list → fully imputed (states[2]).
 */
export function computeImputation(
  record: Record<string, unknown>,
  manifest: Manifest,
): string {
  const states = findImputationAxisStates(manifest);
  const required = resolveRequired(record, manifest);
  if (required.length === 0) {
    return states[2];
  }
  let filled = 0;
  for (const path of required) {
    const v = resolveField(record, path);
    if (isFilled(v)) filled += 1;
  }
  if (filled === 0) return states[0];
  if (filled === required.length) return states[2];
  return states[1];
}
