import axios from 'axios';
import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoints';
import { ApiError } from '@/types/api';
import type {
  AccountInstructionRequest,
  AccountInstructionResult,
  InstructionTemplate,
  Rail,
  TemplateAttribute,
  ValidationFieldError,
} from '@/ops/account-instructions/types';

// ════════════════════════════════════════════════════════════════════
// ops-account-instructions — API layer
// ────────────────────────────────────────────────────────────────────
// Implements Requirement 8 (POST /account-instruction with cancel via
// AbortController, validation_error mapping, cvu_already_exists code).
// Returns a discriminated `AccountInstructionResult` so the modal can
// pattern-match on success / inline validation / abort / cvu-conflict /
// generic failure without inspecting `ApiError` shape.
// ════════════════════════════════════════════════════════════════════

/** GET /instruction — catalog of templates. Shared cache with `ops-instructions`. */
export async function listInstructionTemplates(): Promise<InstructionTemplate[]> {
  const response = await apiClient.get<{ data?: InstructionTemplate[] } | InstructionTemplate[]>(
    ENDPOINTS.accountInstructions.templates,
  );
  const body = response.data;
  if (Array.isArray(body)) return body;
  return body?.data ?? [];
}

/** GET /instruction-attribute/instruction/:id — schema for a template. */
export async function getTemplateAttributes(
  templateId: string,
): Promise<TemplateAttribute[]> {
  const response = await apiClient.get<TemplateAttribute[]>(
    ENDPOINTS.accountInstructions.templateAttributes(templateId),
  );
  return response.data ?? [];
}

/** GET /rails — catalog of rails for the multi-select grid. */
export async function listRails(): Promise<Rail[]> {
  const response = await apiClient.get<{ rails?: Rail[] } | Rail[]>(
    ENDPOINTS.accountInstructions.rails,
  );
  const body = response.data;
  if (Array.isArray(body)) return body;
  return body?.rails ?? [];
}

/**
 * POST /account-instruction with optional cancel signal.
 *
 * Returns a discriminated `AccountInstructionResult`:
 *   - `ok`: 200/201 success.
 *   - `cvu-already-exists`: 409 with `error: 'cvu_already_exists'`.
 *   - `validation-error`: any 4xx with `error: 'validation_error'` and `errors[]`.
 *   - `aborted`: caller's `AbortController` cancelled.
 *   - `failed`: transport / generic 4xx / 5xx — message surfaced.
 */
export async function createAccountInstruction(
  payload: AccountInstructionRequest,
  signal?: AbortSignal,
): Promise<AccountInstructionResult> {
  try {
    await apiClient.post(ENDPOINTS.accountInstructions.create, payload, { signal });
    return { status: 'ok' };
  } catch (e) {
    if (axios.isCancel(e) || (e instanceof Error && e.name === 'CanceledError')) {
      return { status: 'aborted' };
    }
    if (e instanceof Error && e.name === 'AbortError') {
      return { status: 'aborted' };
    }
    if (e instanceof ApiError) {
      return classifyApiError(e);
    }
    const message = e instanceof Error ? e.message : 'Error al crear la instrucción de cuenta';
    return { status: 'failed', message };
  }
}

interface BackendErrorEnvelope {
  error?: string;
  errors?: ValidationFieldError[];
  message?: string;
}

function classifyApiError(e: ApiError): AccountInstructionResult {
  const details = e.details as BackendErrorEnvelope | undefined;
  if (e.status === 409 || details?.error === 'cvu_already_exists') {
    return { status: 'cvu-already-exists' };
  }
  if (
    details?.error === 'validation_error' &&
    Array.isArray(details.errors) &&
    details.errors.length > 0
  ) {
    return { status: 'validation-error', errors: details.errors };
  }
  if (Array.isArray(details?.errors) && details!.errors!.length > 0) {
    return { status: 'validation-error', errors: details!.errors! };
  }
  return { status: 'failed', message: e.message };
}
