// ════════════════════════════════════════════════════════════════════
// Catalog registry — lookup-field data sources
// ────────────────────────────────────────────────────────────────────
// Apps register one resolver per catalog id at boot; the dialog's
// lookup field calls `resolveCatalog(id, filter)` at dropdown-open time.
// When `catalog_filter` resolves to null/undefined/'', the caller
// MUST render an empty state (per Requirement 10) — this layer simply
// returns `[]` to make the contract trivial to honor.
// ════════════════════════════════════════════════════════════════════

import type { CatalogFilter, DialogFieldLookup } from '@/types/manifest';
import { resolveField } from './dotPath';

export type CatalogEntry = { value: string; label: string };

export type CatalogResolver = (
  filter?: unknown,
) => CatalogEntry[] | Promise<CatalogEntry[]>;

const REGISTRY: Map<string, CatalogResolver> = new Map();

/** Registers a catalog resolver under `id`. Last-writer-wins. */
export function registerCatalog(id: string, resolver: CatalogResolver): void {
  REGISTRY.set(id, resolver);
}

/** Removes a catalog resolver. Returns `true` when something was removed. */
export function unregisterCatalog(id: string): boolean {
  return REGISTRY.delete(id);
}

/** Returns the registered resolver for `id`, or `undefined`. */
export function getCatalog(id: string): CatalogResolver | undefined {
  return REGISTRY.get(id);
}

/** Lists all registered catalog ids. */
export function listCatalogs(): string[] {
  return Array.from(REGISTRY.keys());
}

/**
 * Sentinel returned by `resolveCatalogFilter` when the field declares
 * NO `catalog_filter`. Distinct from `null` (which means "filter
 * declared but antecedent missing") so the dropdown caller can render
 * the full catalog without falling into the empty-state path.
 */
export const UNFILTERED_CATALOG_FILTER = Symbol('UNFILTERED_CATALOG_FILTER');

/**
 * Resolves a catalog by id.
 *   - When `filter === UNFILTERED_CATALOG_FILTER` → invoke the resolver
 *     with no argument (the resolver returns the full catalog).
 *   - When `filter` is `null` / `undefined` / `''` → return `[]` so the
 *     caller renders the "antecedent missing" empty state.
 *   - Otherwise → invoke the resolver with the filter value verbatim.
 */
export function resolveCatalog(
  id: string,
  filter?: unknown,
): CatalogEntry[] | Promise<CatalogEntry[]> {
  if (filter === UNFILTERED_CATALOG_FILTER) {
    const resolver = REGISTRY.get(id);
    if (resolver === undefined) return [];
    return resolver();
  }
  if (filter === null || filter === undefined || filter === '') {
    return [];
  }
  const resolver = REGISTRY.get(id);
  if (resolver === undefined) return [];
  return resolver(filter);
}

/**
 * Resolves a `catalog_filter` against the live dialog state. Returns:
 *   - `UNFILTERED_CATALOG_FILTER` when the field declares NO
 *     `catalog_filter` (the dropdown should render the entire catalog).
 *   - `null` when a filter IS declared but the antecedent value is
 *     missing — the dropdown caller MUST render the empty state.
 *   - Otherwise the resolved filter value.
 *
 * Resolution rules (per Requirement 10):
 *   - `from_record: "<dot-path>"` → `resolveField(record, path)`
 *   - `from_form: "<fieldId>"`    → `formValues[fieldId]`
 *   - `value: <literal>`          → the literal verbatim
 */
export function resolveCatalogFilter(
  field: DialogFieldLookup,
  state: {
    record?: Record<string, unknown> | undefined;
    formValues: Record<string, unknown>;
  },
): unknown {
  const cf = field.catalog_filter;
  if (!cf) return UNFILTERED_CATALOG_FILTER;
  if (isFromRecord(cf)) {
    if (!state.record) return null;
    const v = resolveField(state.record, cf.from_record);
    return normalizeFilterValue(v);
  }
  if (isFromForm(cf)) {
    const v = state.formValues[cf.from_form];
    return normalizeFilterValue(v);
  }
  if (isLiteralValue(cf)) {
    return normalizeFilterValue(cf.value);
  }
  return null;
}

/** Internal — clears the registry; only for tests. */
export function _clearCatalogRegistry(): void {
  REGISTRY.clear();
}

function isFromRecord(
  cf: CatalogFilter,
): cf is Extract<CatalogFilter, { from_record: string }> {
  return typeof (cf as { from_record?: unknown }).from_record === 'string';
}

function isFromForm(
  cf: CatalogFilter,
): cf is Extract<CatalogFilter, { from_form: string }> {
  return typeof (cf as { from_form?: unknown }).from_form === 'string';
}

function isLiteralValue(
  cf: CatalogFilter,
): cf is Extract<CatalogFilter, { value: unknown }> {
  return 'value' in (cf as Record<string, unknown>);
}

function normalizeFilterValue(v: unknown): unknown {
  if (v === undefined || v === null || v === '') return null;
  return v;
}
