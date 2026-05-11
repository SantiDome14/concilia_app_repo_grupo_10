import { format, parseISO } from 'date-fns';

// ════════════════════════════════════════════════════════════════════
// Formatters — currency, dates, IDs
// ────────────────────────────────────────────────────────────────────
// Pure functions, no Vue deps. Safe to import anywhere.
// ════════════════════════════════════════════════════════════════════

const ARS_FORMATTER = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const USD_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Formats a number as ARS (grouping + 2 decimals), no symbol prefix. */
export function formatCurrency(value: number): string {
  return ARS_FORMATTER.format(value);
}

/** Formats a number as USD with $ prefix. */
export function formatUSD(value: number): string {
  return USD_FORMATTER.format(value);
}

/** Formats an ISO date (YYYY-MM-DD) as DD/MM/YYYY. */
export function formatDate(iso: string): string {
  return format(parseISO(iso), 'dd/MM/yyyy');
}

/** Formats an ISO datetime as DD/MM/YYYY HH:mm. */
export function formatDateTime(iso: string): string {
  return format(parseISO(iso), 'dd/MM/yyyy HH:mm');
}

/**
 * Generates the next sequential ID given a list of existing IDs with format `PREFIX-NNN`.
 * Returns `PREFIX-001` when the list is empty.
 */
export function nextSequentialId(existingIds: string[], prefix = 'R'): string {
  const maxN = existingIds.reduce((max, id) => {
    const parts = id.split('-');
    const n = parts.length > 1 ? Number.parseInt(parts[1] ?? '0', 10) : 0;
    return Number.isNaN(n) ? max : Math.max(max, n);
  }, 0);
  return `${prefix}-${String(maxN + 1).padStart(3, '0')}`;
}

/** Truncates a string to `max` chars, appending an ellipsis when cut. */
export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
