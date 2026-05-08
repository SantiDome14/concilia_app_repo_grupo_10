// ════════════════════════════════════════════════════════════════════
// Apply path — single & batch single-action confirms
// ────────────────────────────────────────────────────────────────────
// Pure, framework-agnostic. The Vue composable owns reactivity and
// passes in concrete deps (audit append, toast, recompute lookup, etc).
//
// Order (per Requirement 11):
//   validate required fields → write update_fields → write set_fields
//   → run recompute → emit audit (unless audit:false) → fire toast
//   → run afterMutation → return.
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

export type ApplyActionResult = {
  applied: Record<string, unknown>[];
  changes: Record<string, unknown>;
};

/**
 * Walks update_fields → set_fields → recompute → audit → toast →
 * afterMutation in canonical order. Mutates the records in place.
 */
export function applyAction(
  input: ApplyActionInput,
  deps: ApplyDeps,
): ApplyActionResult {
  const { action, manifestKey, manifest, records, formValues, isBatch, userId } =
    input;

  const onConfirm: OnConfirm = action.on_confirm ?? {};
  const changes = computeChanges(onConfirm, formValues);

  // 1. update_fields → cherry-pick declared formValues into each record.
  for (const record of records) {
    if (Array.isArray(onConfirm.update_fields)) {
      for (const path of onConfirm.update_fields) {
        if (Object.prototype.hasOwnProperty.call(formValues, path)) {
          setField(record, path, formValues[path]);
        }
      }
    }
    // 2. set_fields → literal writes; '$now' magic.
    if (onConfirm.set_fields) {
      const now = Date.now();
      for (const [path, raw] of Object.entries(onConfirm.set_fields)) {
        const value = raw === '$now' ? now : raw;
        setField(record, path, value);
      }
    }
    // 3. recompute → resolved per-record (the engine does NOT special-case
    // batch — every record gets every recompute, terminal-state included).
    if (Array.isArray(onConfirm.recompute)) {
      for (const token of onConfirm.recompute) {
        const fn = deps.recompute(token);
        if (fn === undefined) {
          deps.devWarn('MANIFEST', `unknown recompute token: ${token}`);
          continue;
        }
        const next = fn(record, manifest);
        // The convention: imputacion writes into `_imputacion_state`. For
        // unknown tokens we skip (already devWarn'd). For known tokens we
        // store under `_${token}_state`, mirroring the prototype.
        record[`_${token}_state`] = next;
      }
    }
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
        record_ids: ids,
        changes,
      };
      // We attach manifest_key as an extra field on the entry payload —
      // the AuditEntry type accepts the discriminated shape; we widen by
      // spreading into the append call.
      deps.auditAppend({ ...entry, manifest_key: manifestKey } as unknown as AuditEntryBatch);
    } else {
      const first = records[0];
      const recordId = typeof first?.id === 'string' ? first.id : '';
      const entry: AuditEntrySingle = {
        kind: 'single',
        timestamp: ts,
        user_id: userId,
        action_id: action.id,
        record_id: recordId,
        changes,
      };
      deps.auditAppend({ ...entry, manifest_key: manifestKey } as unknown as AuditEntrySingle);
    }
  }

  // 5. toast.
  if (onConfirm.toast) {
    const subtitle = isBatch
      ? `${records.length} registros actualizados`
      : buildSingleSubtitle(records[0]);
    deps.toast.success(onConfirm.toast, subtitle);
  }

  // 6. afterMutation hook.
  deps.afterMutation();

  return { applied: records, changes };
}

function computeChanges(
  onConfirm: OnConfirm,
  formValues: Record<string, unknown>,
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
      out[path] = raw === '$now' ? now : raw;
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
