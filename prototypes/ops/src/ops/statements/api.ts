import axios from 'axios';
import { apiClient } from '@/api/client';
import type {
  DateRange,
  StatementRequest,
  StatementResponse,
  StatementResult,
} from './types';

// ════════════════════════════════════════════════════════════════════
// ops-statements — API layer
// ────────────────────────────────────────────────────────────────────
// Implements Requirement 5 (POST /statement with cancel-during-flight
// per Decision 7d). Returns a discriminated `StatementResult` so the
// modal can render success / business-error / abort / failed without
// inspecting `ApiError` shape directly.
// ════════════════════════════════════════════════════════════════════

const ENDPOINT = '/statement';

/**
 * Build the API payload from a `(clientId, accountId, range)` triple.
 *
 * Per Requirement 5:
 *   - `date_from` ends with `T00:00:00Z` (start of day, UTC)
 *   - `date_to`   ends with `T23:59:59Z` (end of day INCLUSIVE, UTC)
 *
 * Exposed for unit testing — the modal calls `requestStatement(...)`
 * which calls this internally.
 */
export function toApiPayload(
  clientId: string,
  accountId: string,
  range: DateRange,
): StatementRequest {
  return {
    client_id: clientId,
    account_id: accountId,
    date_from: `${formatYmd(range.from)}T00:00:00Z`,
    date_to: `${formatYmd(range.to)}T23:59:59Z`,
  };
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Issue `POST /statement` with optional cancel signal.
 *
 * Returns a discriminated `StatementResult`:
 *   - `ok`: a usable URL came back
 *   - `business-error`: backend returned `success: false` (e.g.
 *     "Sin movimientos en el rango")
 *   - `aborted`: the caller's `AbortController` cancelled the request
 *   - `failed`: transport / 4xx / 5xx — generic message surfaced
 */
export async function requestStatement(
  payload: StatementRequest,
  signal?: AbortSignal,
): Promise<StatementResult> {
  try {
    const response = await apiClient.post<StatementResponse>(ENDPOINT, payload, {
      signal,
    });
    const body = response.data;
    if (body.success && body.url) {
      return { status: 'ok', url: body.url };
    }
    // success: false OR success: true but no URL (defensive — backend bug)
    const message =
      (body.success === false &&
        (body.error || body.message || 'Error al generar el statement')) ||
      'Error al generar el statement';
    return { status: 'business-error', message };
  } catch (e) {
    if (axios.isCancel(e) || (e instanceof Error && e.name === 'CanceledError')) {
      return { status: 'aborted' };
    }
    if (e instanceof Error && e.name === 'AbortError') {
      return { status: 'aborted' };
    }
    const message =
      e instanceof Error ? e.message : 'Error al generar el statement';
    return { status: 'failed', message };
  }
}
