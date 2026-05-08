// ════════════════════════════════════════════════════════════════════
// movimientos/catalog — closed Tipo + Estado catalogs
// ────────────────────────────────────────────────────────────────────
// Per `refine-ops-psp-tab-aware-header-and-multi-sponsor`, the Tipo
// and Estado filter dropdowns SHALL source their options from a closed
// catalog (NOT derived from the current page of results — the catalog
// is the source of truth so the operator sees every option even when
// the current page contains no rows of a given type).
//
// Both `/movimientos` (standalone page) and `/psp?tab=movimientos`
// (PSP tab) consume from this file. Adding a new type or status =
// one entry here; no other code changes.
//
// Display labels use spaces (e.g. `COLLECTOR IN`); on-the-wire values
// use snake_case (e.g. `COLLECTOR_IN`) to match the backend payload.
// ════════════════════════════════════════════════════════════════════

export interface CatalogOption {
  /** Backend value (sent on the request). */
  value: string;
  /** Human-readable label rendered in the dropdown. */
  label: string;
}

/**
 * Closed catalog of movement types. Display order is the dropdown
 * order; the alphabetical-style order below mirrors the operator
 * review on 2026-05-08.
 */
export const MOVEMENT_TYPE_OPTIONS: ReadonlyArray<CatalogOption> = [
  { value: 'COLLECTOR_IN', label: 'COLLECTOR IN' },
  { value: 'COLLECTOR_OUT', label: 'COLLECTOR OUT' },
  { value: 'DEPOSIT', label: 'DEPOSIT' },
  { value: 'FEE', label: 'FEE' },
  { value: 'FX_DEPOSIT', label: 'FX DEPOSIT' },
  { value: 'FX_WITHDRAWAL', label: 'FX WITHDRAWAL' },
  { value: 'INT_DEPOSIT', label: 'INT DEPOSIT' },
  { value: 'IN_WITHDRAWAL', label: 'IN WITHDRAWAL' },
  { value: 'WITHDRAWAL', label: 'WITHDRAWAL' },
];

/**
 * Closed catalog of movement statuses. Mirrors the canonical lifecycle
 * states reported by the backend.
 */
export const MOVEMENT_STATUS_OPTIONS: ReadonlyArray<CatalogOption> = [
  { value: 'COMPLETED', label: 'COMPLETED' },
  { value: 'PENDING', label: 'PENDING' },
  { value: 'FAILED', label: 'FAILED' },
];

/**
 * Open-set placeholder for the `Origen` filter pending backend
 * confirmation of the canonical list. Kept here for parity with the
 * other two catalogs.
 */
export const MOVEMENT_ORIGIN_OPTIONS: ReadonlyArray<CatalogOption> = [
  { value: 'MANUAL', label: 'MANUAL' },
  { value: 'SWIFT', label: 'SWIFT' },
  { value: 'AUTO', label: 'AUTO' },
];

/** Convenience: human-readable label for a type code. */
export function getMovementTypeLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return MOVEMENT_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/** Convenience: human-readable label for a status code. */
export function getMovementStatusLabel(value: string | null | undefined): string {
  if (!value) return '—';
  return MOVEMENT_STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
