// ════════════════════════════════════════════════════════════════════
// Apply path — kanban-axis composite confirms
// ────────────────────────────────────────────────────────────────────
// Per Requirement 12:
//   - Apply each enabled action's update_fields then set_fields.
//   - Run ONE recompute per declared token at the end.
//   - Emit ONE audit entry with kind:"composite".
//   - The card's lane is determined by the recomputed state, NOT the
//     drop target (the kanban view re-reads the recomputed value).
//
// Pure engine: never mutates `record`. Accumulates a single patch object,
// runs each recompute against the projected `{...record, ...patch}` view,
// then dispatches the patch through `deps.dispatch.update`.
// ════════════════════════════════════════════════════════════════════

import type {
  Action,
  AuditEntryComposite,
  Manifest,
  RecomputeToken,
} from '@/types/manifest';
import { setField } from './dotPath';
import type { ApplyDeps } from './applyTypes';

export type ApplyCompositeInput = {
  manifestKey: string;
  manifest: Manifest;
  axisId: string;
  record: Record<string, unknown>;
  enabledActions: Action[];
  formValues: Record<string, unknown>;
  userId: string;
};

export type ApplyCompositeResult = {
  applied: Action[];
  /** Final patch dispatched for the record (changes + recompute results). */
  patch: Record<string, unknown>;
  /** Aggregate of declared changes (excludes recompute results). */
  changes: Record<string, unknown>;
};

export function applyComposite(
  input: ApplyCompositeInput,
  deps: ApplyDeps,
): ApplyCompositeResult {
  const {
    manifestKey,
    manifest,
    axisId,
    record,
    enabledActions,
    formValues,
    userId,
  } = input;

  const patch: Record<string, unknown> = {};
  const changes: Record<string, unknown> = {};
  const childActionIds: string[] = [];
  const recomputeTokens = new Set<RecomputeToken>();
  const auditOff: string[] = [];

  // Per-action: write update_fields then set_fields into the shared patch.
  // Aggregate recompute tokens; ONE recompute at the end.
  const now = Date.now();
  for (const action of enabledActions) {
    childActionIds.push(action.id);
    const oc = action.on_confirm ?? {};
    if (oc.audit === false) auditOff.push(action.id);

    if (Array.isArray(oc.update_fields)) {
      for (const path of oc.update_fields) {
        if (Object.prototype.hasOwnProperty.call(formValues, path)) {
          patch[path] = formValues[path];
          changes[path] = formValues[path];
        }
      }
    }
    if (oc.set_fields) {
      for (const [path, raw] of Object.entries(oc.set_fields)) {
        const v =
          raw === '$now' ? now : raw === '$current_user' ? userId : raw;
        patch[path] = v;
        changes[path] = v;
      }
    }
    if (Array.isArray(oc.recompute)) {
      for (const token of oc.recompute) recomputeTokens.add(token);
    }
  }

  // ONE recompute at the end (per Requirement 12), projected against the
  // already-accumulated patch so derived fields see the new state.
  const projected: Record<string, unknown> = { ...record };
  for (const [k, v] of Object.entries(patch)) {
    setField(projected, k, v);
  }
  for (const token of recomputeTokens) {
    const fn = deps.recompute(token);
    if (fn === undefined) {
      deps.devWarn('MANIFEST', `unknown recompute token: ${token}`);
      continue;
    }
    const next = fn(projected, manifest);
    patch[`_${token}_state`] = next;
  }

  // ONE audit entry. Skipped if EVERY child action declared audit:false.
  const everyOff =
    enabledActions.length > 0 && auditOff.length === enabledActions.length;
  if (!everyOff) {
    const recordId = typeof record.id === 'string' ? record.id : '';
    const entry: AuditEntryComposite = {
      kind: 'composite',
      timestamp: now,
      user_id: userId,
      action_id: `composite:${axisId}`,
      manifest_key: manifestKey,
      record_id: recordId,
      child_action_ids: childActionIds,
      axis_id: axisId,
      changes,
    };
    deps.auditAppend(entry);
  }

  // Toast — single composite-flavored message. Use the first action's
  // toast if present; otherwise a default with axis id. Subtitle reads
  // the recomputed state straight from the patch.
  const firstToast = enabledActions.find(
    (a) => typeof a.on_confirm?.toast === 'string',
  )?.on_confirm?.toast;
  const title = firstToast ?? 'Acciones aplicadas';
  const subtitleId = typeof record.id === 'string' ? record.id : '';
  const subtitleStateRaw = patch[`_${axisId}_state`];
  const subtitleState =
    typeof subtitleStateRaw === 'string' ? subtitleStateRaw : '';
  const subtitle = subtitleId
    ? subtitleState
      ? `${subtitleId} → ${subtitleState}`
      : subtitleId
    : '';
  deps.toast.success(title, subtitle);

  // Dispatch the patch for the record.
  const recordId = typeof record.id === 'string' ? record.id : '';
  if (recordId) deps.dispatch.update(recordId, patch);

  return { applied: enabledActions, patch, changes };
}
