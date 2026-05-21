import { apiClient } from '../client';
import { ENDPOINTS } from '../endpoints';
import { ApiError } from '@/types/api';
import type { PaginatedResponse } from '@/types/api';
import type {
  Instruction,
  InstructionAttribute,
  InstructionFormData,
  InstructionId,
  InstructionWithAttributes,
  InstructionsListParams,
  SaveResult,
} from '@/ops/instructions/types';

// ════════════════════════════════════════════════════════════════════
// ops-instructions — API layer
// ────────────────────────────────────────────────────────────────────
// Implements `ops-instructions` Requirements 5 (form), 6 (two-phase
// save), 8 (delete). The shared `apiClient` from `core-api-layer`
// carries the bearer token via setAccessTokenGetter.
// ════════════════════════════════════════════════════════════════════

/** GET /instruction with filters + pagination. */
export async function listInstructions(
  params: InstructionsListParams,
): Promise<PaginatedResponse<Instruction>> {
  const response = await apiClient.get<PaginatedResponse<Instruction>>(
    ENDPOINTS.instructions.list,
    { params },
  );
  return response.data;
}

/** GET /instruction/:id with attributes hydrated via a parallel fetch. */
export async function getInstruction(
  id: InstructionId,
): Promise<InstructionWithAttributes> {
  const [instruction, attributes] = await Promise.all([
    apiClient.get<Instruction>(ENDPOINTS.instructions.detail(id)).then((r) => r.data),
    apiClient
      .get<InstructionAttribute[]>(ENDPOINTS.instructions.attributes(id))
      .then((r) => r.data ?? []),
  ]);
  return { ...instruction, attributes };
}

/** Map form-shape attributes → backend-shape attributes for save. */
function toBackendAttributes(
  formAttributes: InstructionFormData['attributes'],
  instructionId: InstructionId,
): Omit<InstructionAttribute, 'id'>[] {
  return formAttributes.map((row, idx) => ({
    instruction_id: instructionId,
    key: row.key,
    value: row.value,
    index_order: row.index ?? idx,
  }));
}

/** Phase A — POST /instruction. Returns the newly-created instruction record. */
export async function createInstructionRecord(
  data: Omit<InstructionFormData, 'attributes'>,
): Promise<Instruction> {
  const response = await apiClient.post<Instruction>(ENDPOINTS.instructions.list, {
    name: data.name,
    currency_id: data.currency_id,
    description: data.description || null,
  });
  return response.data;
}

/** Phase B — POST /instruction-attribute/save-all for an existing instruction. */
export async function saveInstructionAttributes(
  instructionId: InstructionId,
  attributes: InstructionFormData['attributes'],
): Promise<InstructionAttribute[]> {
  const payload = toBackendAttributes(attributes, instructionId);
  const response = await apiClient.post<InstructionAttribute[]>(
    ENDPOINTS.instructions.saveAttributes,
    {
      instruction_id: instructionId,
      attributes: payload,
    },
  );
  return response.data ?? [];
}

/**
 * Two-phase create orchestrator.
 *
 * Phase A creates the instruction. On 4xx/5xx, returns `phase-a-failed`
 * with the message + optional field hint extracted from the ApiError.
 *
 * Phase B saves the attributes for the newly-created id. On failure,
 * returns `phase-b-failed` with the captured `instructionId` so the
 * retry banner can re-issue phase B alone (see Requirement 6).
 */
export async function createInstructionWithAttributes(
  data: InstructionFormData,
): Promise<SaveResult> {
  let created: Instruction;
  try {
    created = await createInstructionRecord(data);
  } catch (e) {
    return {
      status: 'phase-a-failed',
      error: extractPhaseAError(e),
    };
  }

  if (data.attributes.length === 0) {
    return { status: 'ok', instruction: { ...created, attributes: [] } };
  }
  try {
    const persisted = await saveInstructionAttributes(created.id, data.attributes);
    return { status: 'ok', instruction: { ...created, attributes: persisted } };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error al guardar atributos';
    return {
      status: 'phase-b-failed',
      instructionId: created.id,
      error: { message },
    };
  }
}

/** Retry helper for phase B alone (used by the persistent retry banner). */
export async function retrySaveAttributes(
  instructionId: InstructionId,
  attributes: InstructionFormData['attributes'],
): Promise<{ status: 'ok' } | { status: 'failed'; message: string }> {
  try {
    await saveInstructionAttributes(instructionId, attributes);
    return { status: 'ok' };
  } catch (e) {
    return {
      status: 'failed',
      message: e instanceof Error ? e.message : 'No se pudo guardar atributos',
    };
  }
}

/** Update orchestrator — same two-phase shape as create. */
export async function updateInstructionWithAttributes(
  id: InstructionId,
  data: InstructionFormData,
): Promise<SaveResult> {
  let updated: Instruction;
  try {
    const response = await apiClient.put<Instruction>(ENDPOINTS.instructions.detail(id), {
      name: data.name,
      currency_id: data.currency_id,
      description: data.description || null,
    });
    updated = response.data;
  } catch (e) {
    return { status: 'phase-a-failed', error: extractPhaseAError(e) };
  }

  try {
    const persisted = await saveInstructionAttributes(id, data.attributes);
    return { status: 'ok', instruction: { ...updated, attributes: persisted } };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Error al guardar atributos';
    return { status: 'phase-b-failed', instructionId: id, error: { message } };
  }
}

/** DELETE /instruction/:id. Returns void on success; throws ApiError otherwise. */
export async function deleteInstruction(id: InstructionId): Promise<void> {
  await apiClient.delete(ENDPOINTS.instructions.detail(id));
}

// ─── Internal helpers ───────────────────────────────────────────────

interface ValidationDetail {
  field?: string;
  message?: string;
}

function extractPhaseAError(
  e: unknown,
): { message: string; field?: keyof InstructionFormData } {
  if (e instanceof ApiError) {
    const detail = e.details as ValidationDetail | undefined;
    if (detail && typeof detail === 'object' && typeof detail.field === 'string') {
      const field = detail.field;
      if (field === 'name' || field === 'currency_id' || field === 'description') {
        return { message: detail.message ?? e.message, field };
      }
    }
    return { message: e.message };
  }
  return { message: e instanceof Error ? e.message : 'Error al crear la instrucción' };
}
