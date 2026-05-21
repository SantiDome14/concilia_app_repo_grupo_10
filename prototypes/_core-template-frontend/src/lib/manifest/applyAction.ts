// ════════════════════════════════════════════════════════════════════
// Apply path — single & batch single-action confirms
// ────────────────────────────────────────────────────────────────────
// Pure, framework-agnostic. The Vue composable owns reactivity and
// passes in concrete deps (audit append, toast, dispatch, recompute).
//
// The engine NEVER mutates `records`. For each record it computes a
// patch (update_fields + set_fields + recompute results), then calls
// `deps.dispatch.update(recordId, patch)`. The page's `useMutation`
// implementation owns optimistic update + rollback + refetch.
//
// Order (per Requirement 11):
//   validate required fields → compute patch (update_fields, set_fields,
//   recompute against projected record) → emit audit (unless audit:false)
//   → fire toast → dispatch every patch → return.
// ════════════════════════════════════════════════════════════════════

import type {
  Action,
  AuditEntryBatch,
  AuditEntrySingle,
  Manifest,
  OnConfirm,
} from '@/types/manifest';
import { setField } from './dotPath';
import type { ApplyDeps } from './applyTypes';

export type ApplyActionInput = {
  action: Action;
  manifestKey: string;
  manifest: Manifest;
  records: Record<string, unknown>[];
  formValues: Record<string, unknown>;
  isBatch: boolean;
  userId: string;
};

export type ApplyActionPatch = {
  recordId: string;
  patch: Record<string, unknown>;
};

export type ApplyActionResult = {
  /** Per-record patches that were dispatched, in input order. */
  patches: ApplyActionPatch[];
  /** Aggregate of declared changes (used for audit and tests). */
  changes: Record<string, unknown>;
};

/**
 * Walks compute-patch → recompute → audit → toast → dispatch in canonical
 * order. Does NOT mutate the records — patches are dispatched and the
 * page's mutation implementation persists them.
 */
export function applyAction(
  input: ApplyActionInput,
  deps: ApplyDeps,
): ApplyActionResult {
  const { action, manifestKey, manifest, records, formValues, isBatch, userId } =
    input;

  const onConfirm: OnConfirm = action.on_confirm ?? {};
  const changes = computeChanges(onConfirm, formValues, userId);

  const patches: ApplyActionPatch[] = [];

  for (const record of records) {
    const patch: Record<string, unknown> = {};

    // 1. update_fields → cherry-pick declared formValues.
    if (Array.isArray(onConfirm.update_fields)) {
      for (const path of onConfirm.update_fields) {
        if (Object.prototype.hasOwnProperty.call(formValues, path)) {
          patch[path] = formValues[path];
        }
      }
    }

    // 2. set_fields → literal writes; '$now' + '$current_user' magic.
    if (onConfirm.set_fields) {
      const now = Date.now();
      for (const [path, raw] of Object.entries(onConfirm.set_fields)) {
        patch[path] =
          raw === '$now' ? now : raw === '$current_user' ? userId : raw;
      }
    }

    // 3. recompute → projected = {...record, ...patch} so derived fields
    // see the new state before the dispatcher applies it.
    if (Array.isArray(onConfirm.recompute)) {
      const projected: Record<string, unknown> = { ...record };
      for (const [path, value] of Object.entries(patch)) {
        setField(projected, path, value);
      }
      for (const token of onConfirm.recompute) {
        const fn = deps.recompute(token);
        if (fn === undefined) {
          deps.devWarn('MANIFEST', `unknown recompute token: ${token}`);
          continue;
        }
        const next = fn(projected, manifest);
        patch[`_${token}_state`] = next;
      }
    }

    const recordId = typeof record.id === 'string' ? record.id : '';
    patches.push({ recordId, patch });
  }

  // 4. audit (unless audit:false). Single batch entry vs single entry.
  if (onConfirm.audit !== false && records.length > 0) {
    const ts = Date.now();
    if (isBatch) {
      const ids = records
        .map((r) => (typeof r.id === 'string' ? r.id : null))
        .filter((id): id is string => id !== null);
      const entry: AuditEntryBatch = {
        kind: 'batch',
        timestamp: ts,
        user_id: userId,
        action_id: action.id,
        manifest_key: manifestKey,
        record_ids: ids,
        changes,
      };
      deps.auditAppend(entry);
    } else {
      const first = records[0];
      const recordId = typeof first?.id === 'string' ? first.id : '';
      const entry: AuditEntrySingle = {
        kind: 'single',
        timestamp: ts,
        user_id: userId,
        action_id: action.id,
        manifest_key: manifestKey,
        record_id: recordId,
        changes,
      };
      deps.auditAppend(entry);
    }
  }

  // 5. toast.
  if (onConfirm.toast) {
    const subtitle = isBatch
      ? `${records.length} registros actualizados`
      : buildSingleSubtitle(records[0]);
    deps.toast.success(onConfirm.toast, subtitle);
  }

  // 6. dispatch every patch.
  for (const { recordId, patch } of patches) {
    if (recordId) deps.dispatch.update(recordId, patch);
  }

  return { patches, changes };
}

function computeChanges(
  onConfirm: OnConfirm,
  formValues: Record<string, unknown>,
  userId: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (Array.isArray(onConfirm.update_fields)) {
    for (const path of onConfirm.update_fields) {
      if (Object.prototype.hasOwnProperty.call(formValues, path)) {
        out[path] = formValues[path];
      }
    }
  }
  if (onConfirm.set_fields) {
    const now = Date.now();
    for (const [path, raw] of Object.entries(onConfirm.set_fields)) {
      out[path] = raw === '$now' ? now : raw === '$current_user' ? userId : raw;
    }
  }
  return out;
}

function buildSingleSubtitle(record: Record<string, unknown> | undefined): string {
  if (!record) return '';
  const id = typeof record.id === 'string' ? record.id : '';
  const display =
    typeof record.nombre === 'string'
      ? record.nombre
      : typeof record.label === 'string'
        ? record.label
        : '';
  if (id && display) return `${id} — ${display}`;
  return id || display;
}
