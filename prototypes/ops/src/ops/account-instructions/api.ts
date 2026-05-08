import axios from 'axios';
import { apiClient } from '@/api/client';
import { ApiError } from '@/types/api';
import type {
  AccountInstructionRequest,
  AccountInstructionResult,
  InstructionTemplate,
  Rail,
  TemplateAttribute,
  ValidationFieldError,
} from './types';

// ════════════════════════════════════════════════════════════════════
// ops-account-instructions — API layer
// ────────────────────────────────────────────────────────────────────
// Implements Requirement 8 (POST /account-instruction with cancel via
// AbortController, validation_error mapping, cvu_already_exists code).
// Returns a discriminated `AccountInstructionResult` so the modal can
// pattern-match on success / inline validation / abort / cvu-conflict /
// generic failure without inspecting `ApiError` shape.
// ════════════════════════════════════════════════════════════════════

const ENDPOINTS = {
  templates: '/instruction',
  templateAttributes: (templateId: string): string =>
    `/instruction-attribute/instruction/${templateId}`,
  rails: '/rails',
  create: '/account-instruction',
} as const;

/** GET /instruction — catalog of templates. Shared cache with `ops-instructions`. */
export async function listInstructionTemplates(): Promise<InstructionTemplate[]> {
  const response = await apiClient.get<{ data?: InstructionTemplate[] } | InstructionTemplate[]>(
    ENDPOINTS.templates,
  );
  // Backend may return either the bare array (legacy) or { data: [...] } (newer envelope).
  const body = response.data;
  if (Array.isArray(body)) return body;
  return body?.data ?? [];
}

/** GET /instruction-attribute/instruction/:id — schema for a template. */
export async function getTemplateAttributes(
  templateId: string,
): Promise<TemplateAttribute[]> {
  const response = await apiClient.get<TemplateAttribute[]>(
    ENDPOINTS.templateAttributes(templateId),
  );
  return response.data ?? [];
}

/** GET /rails — catalog of rails for the multi-select grid. */
export async function listRails(): Promise<Rail[]> {
  const response = await apiClient.get<{ rails?: Rail[] } | Rail[]>(ENDPOINTS.rails);
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
    await apiClient.post(ENDPOINTS.create, payload, { signal });
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
  // 1. cvu_already_exists takes precedence (Requirement 8 scenario).
  if (e.status === 409 || details?.error === 'cvu_already_exists') {
    return { status: 'cvu-already-exists' };
  }
  // 2. validation_error with structured errors[] → inline mapping.
  if (
    details?.error === 'validation_error' &&
    Array.isArray(details.errors) &&
    details.errors.length > 0
  ) {
    return { status: 'validation-error', errors: details.errors };
  }
  // 3. Bare errors[] (some endpoints return that without the discriminator).
  if (Array.isArray(details?.errors) && details!.errors!.length > 0) {
    return { status: 'validation-error', errors: details!.errors! };
  }
  // 4. Generic — surface the message we have.
  return { status: 'failed', message: e.message };
}
