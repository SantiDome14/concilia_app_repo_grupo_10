// ════════════════════════════════════════════════════════════════════
// TRD — Cliente domain types
// ────────────────────────────────────────────────────────────────────
// The Cliente entity used by the Catálogos / Clientes module and
// consumed cross-capability by Quotes (limits + balances are surfaced
// inside the quote-create form too).
//
// Contract reference: prototypes/trd/openspec/changes/add-trd-clients/
// specs/trd-clients/spec.md
// ════════════════════════════════════════════════════════════════════

/** Core Cliente entity surfaced in the master list and detail page. */
export interface Client {
  id: string;
  name: string;
  /** Ardua's internal docket number. */
  ardua_docket: string | null;
  /** Circuit Pay docket number (some clients are not in Circuit). */
  circuit_docket: string | null;
  is_active: boolean;
}

/**
 * Per-entity / per-currency limit for a client.
 *
 * `entidad` is the legal entity (e.g. "Haz Pagos", "Circuit Pay") the
 * client transacts with; `limite`/`disponible`/`usado` are decimal
 * strings to preserve precision across the wire.
 */
export interface ClientLimit {
  id: string;
  entidad: string;
  moneda: string;
  limite: string;
  disponible: string;
  usado: string;
}

/** Per-currency balance for a client. `updated_at` is an ISO-8601 string. */
export interface ClientBalance {
  moneda: string;
  balance: string;
  updated_at: string;
}

/**
 * Display helper: returns `—` (em-dash) for `null` / `undefined` /
 * empty values; otherwise stringifies the value. Used by both the
 * master list cells and the detail Información card.
 */
export function displayValueOrDash(value: unknown): string {
  if (value === null || value === undefined) return '—';
  const str = String(value).trim();
  return str === '' ? '—' : str;
}
