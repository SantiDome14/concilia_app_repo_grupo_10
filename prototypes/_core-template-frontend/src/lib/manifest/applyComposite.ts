// ════════════════════════════════════════════════════════════════════
// Apply path — kanban-axis composite confirms
// ────────────────────────────────────────────────────────────────────
// Per Requirement 12:
//   - Apply each enabled action's update_fields then set_fields.
//   - Run ONE recompute per declared token at the end.
//   - Emit ONE audit entry with kind:"composite".
//   - The card's lane is determined by the recomputed state, NOT the
//     drop target (the kanban view re-reads the recomputed value).
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

  const changes: Record<string, unknown> = {};
  const childActionIds: string[] = [];
  const recomputeTokens = new Set<RecomputeToken>();
  const auditOff: string[] = [];

  // Per-action: write update_fields then set_fields. Aggregate recompute
  // tokens; ONE recompute at the end.
  const now = Date.now();
  for (const action of enabledActions) {
    childActionIds.push(action.id);
    const oc = action.on_confirm ?? {};
    if (oc.audit === false) auditOff.push(action.id);

    if (Array.isArray(oc.update_fields)) {
      for (const path of oc.update_fields) {
        if (Object.prototype.hasOwnProperty.call(formValues, path)) {
          setField(record, path, formValues[path]);
          changes[path] = formValues[path];
        }
      }
    }
    if (oc.set_fields) {
      for (const [path, raw] of Object.entries(oc.set_fields)) {
        const v =
          raw === '$now' ? now : raw === '$current_user' ? userId : raw;
        setField(record, path, v);
        changes[path] = v;
      }
    }
    if (Array.isArray(oc.recompute)) {
      for (const token of oc.recompute) recomputeTokens.add(token);
    }
  }

  // ONE recompute at the end (per Requirement 12).
  for (const token of recomputeTokens) {
    const fn = deps.recompute(token);
    if (fn === undefined) {
      deps.devWarn('MANIFEST', `unknown recompute token: ${token}`);
      continue;
    }
    const next = fn(record, manifest);
    record[`_${token}_state`] = next;
  }

  // ONE audit entry. Skipped if EVERY child action declared audit:false
  // (composite's audit toggle is implicit — the union of child intents).
  const everyOff =
    enabledActions.length > 0 && auditOff.length === enabledActions.length;
  if (!everyOff) {
    const recordId = typeof record.id === 'string' ? record.id : '';
    const entry: AuditEntryComposite = {
      kind: 'composite',
      timestamp: now,
      user_id: userId,
      action_id: `composite:${axisId}`,
      record_id: recordId,
      child_action_ids: childActionIds,
      axis_id: axisId,
      changes,
    };
    deps.auditAppend({
      ...entry,
      manifest_key: manifestKey,
    } as unknown as AuditEntryComposite);
  }

  // Toast — single composite-flavored message. Use the first action's
  // toast if present; otherwise a default with axis id.
  const firstToast = enabledActions.find(
    (a) => typeof a.on_confirm?.toast === 'string',
  )?.on_confirm?.toast;
  const title = firstToast ?? 'Acciones aplicadas';
  const subtitleId = typeof record.id === 'string' ? record.id : '';
  const subtitleState =
    typeof record[`_${axisId}_state`] === 'string'
      ? (record[`_${axisId}_state`] as string)
      : '';
  const subtitle = subtitleId
    ? subtitleState
      ? `${subtitleId} → ${subtitleState}`
      : subtitleId
    : '';
  deps.toast.success(title, subtitle);

  deps.afterMutation();

  return { applied: enabledActions, changes };
}
