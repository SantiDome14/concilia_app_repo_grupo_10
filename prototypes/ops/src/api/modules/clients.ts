import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoints';
import { ApiError } from '@/types/api';
import type {
  Client,
  ClientId,
  ClientWithAccounts,
  ClientsListParams,
  ClientsListResponse,
  ConfirmationLetterResponse,
  CurrencyEntry,
  SignUpRequest,
  ValidatedCvuAccount,
  WhitelistRequest,
} from '@/ops/clients/types';

// ════════════════════════════════════════════════════════════════════
// ops-clients — API layer
// ────────────────────────────────────────────────────────────────────
// Implements `ops-clients` Requirements 1 (list), 4 (signup),
// 6 (detail), 7 (letter), 8 (whitelist). The shared `apiClient` from
// `core-api-layer` carries the bearer token via setAccessTokenGetter.
//
// Whitelist endpoints live on the PSP backend (`/coinag/account/:cvu`,
// `/clients/:id/whitelist-account`). Today the shared client points at
// the OPS API; routing PSP calls through a second baseURL is owned by
// the future `core-psp-api-layer` extension.
// ════════════════════════════════════════════════════════════════════

/** GET /clients with filters + pagination (Requirement 1 + 3). */
export async function listClients(
  params: ClientsListParams,
): Promise<ClientsListResponse> {
  const response = await apiClient.get<ClientsListResponse>(ENDPOINTS.clients.list, {
    params,
  });
  return response.data;
}

/** GET /clients/:id with accounts + movements hydrated (Requirement 6). */
export async function getClient(id: ClientId): Promise<ClientWithAccounts> {
  const response = await apiClient.get<ClientWithAccounts>(ENDPOINTS.clients.detail(id));
  return response.data;
}

/** Partial update for client governance flags. Today the slim payload only
 * supports the Activar / Desactivar manifest action; future additions live
 * here so the page-side dispatcher stays one call away. */
export async function patchClient(
  id: ClientId,
  body: { is_active?: boolean },
): Promise<Client> {
  const response = await apiClient.patch<Client>(ENDPOINTS.clients.update(id), body);
  return response.data;
}

/** GET /currencies — sourced once per page mount and used by the whitelist modal. */
export async function listCurrencies(): Promise<CurrencyEntry[]> {
  const response = await apiClient.get<{ currencies?: CurrencyEntry[] }>(
    ENDPOINTS.clients.currencies,
  );
  return response.data.currencies ?? [];
}

/**
 * POST /sign-up — invites a client to onboard the portal.
 *
 * MUST be wrapped in `useStepUp().withStepUp(...)` at the call site
 * per Requirement 4.
 */
export async function signUpClient(body: SignUpRequest): Promise<void> {
  await apiClient.post(ENDPOINTS.clients.signUp, body);
}

/** GET /coinag/account/:cvu — PSP CVU/CBU validation (Whitelist step 1). */
export async function validateCvu(cvu: string): Promise<ValidatedCvuAccount> {
  const response = await apiClient.get<ValidatedCvuAccount>(
    ENDPOINTS.clients.validateCvu(cvu),
  );
  return response.data;
}

/** Result envelope for `whitelistAccount` — surfaces localised errors per Requirement 8. */
export type WhitelistResult =
  | { status: 'ok' }
  | { status: 'already_whitelisted' }
  | { status: 'exist_internal_route' }
  | { status: 'failed'; message: string };

/**
 * POST /clients/:id/whitelist-account — Whitelist step 2 (confirm).
 *
 * Returns a discriminated `WhitelistResult` instead of throwing so the
 * modal can render the canonical inline error per Requirement 8 without
 * inspecting `ApiError` shape directly.
 */
export async function whitelistAccount(
  clientId: ClientId,
  body: WhitelistRequest,
): Promise<WhitelistResult> {
  try {
    await apiClient.post(ENDPOINTS.clients.whitelistAccount(clientId), body);
    return { status: 'ok' };
  } catch (e) {
    return classifyWhitelistError(e);
  }
}

function classifyWhitelistError(e: unknown): WhitelistResult {
  const raw = e instanceof Error ? e.message : '';
  const message = raw.toLowerCase();
  if (message.includes('already_whitelisted')) {
    return { status: 'already_whitelisted' };
  }
  if (message.includes('exist_internal_route') || message.includes('exist_interal_route')) {
    // Note: legacy backend has a typo (`interal`); accept both spellings.
    return { status: 'exist_internal_route' };
  }
  if (e instanceof ApiError) {
    return { status: 'failed', message: e.message };
  }
  return { status: 'failed', message: raw || 'Error al habilitar la cuenta' };
}

/**
 * GET /account-instruction/:id/confirmation-letter?rail=... (Requirement 9).
 *
 * Returns the discriminated response from the backend; the caller is
 * responsible for opening `url` in a new tab on success.
 */
export async function getConfirmationLetter(
  instructionId: string,
  rail: string,
): Promise<ConfirmationLetterResponse> {
  try {
    const response = await apiClient.get<ConfirmationLetterResponse>(
      ENDPOINTS.clients.confirmationLetter(instructionId),
      { params: { rail } },
    );
    return response.data;
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'request_failed' };
  }
}
