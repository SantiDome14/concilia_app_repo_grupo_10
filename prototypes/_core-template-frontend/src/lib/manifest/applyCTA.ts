// ════════════════════════════════════════════════════════════════════
// Apply path — module CTA confirms
// ────────────────────────────────────────────────────────────────────
// Per Requirement 14:
//   - When `creates_record_concept` is declared, the engine MUST look up
//     a registered creator. Missing creator → throw ManifestError.
//   - On success, append an audit entry with kind:"cta".
// ════════════════════════════════════════════════════════════════════

import {
  ManifestError,
  type AuditEntryCTA,
  type ModuleCTA,
} from '@/types/manifest';
import { setField } from './dotPath';
import type { ApplyDeps } from './applyTypes';

export type CTACreatorFn = (
  cta: ModuleCTA,
  formValues: Record<string, unknown>,
) => Record<string, unknown>;

export type ApplyCTAInput = {
  cta: ModuleCTA;
  manifestKey: string;
  formValues: Record<string, unknown>;
  creator: CTACreatorFn | null;
  userId: string;
};

export type ApplyCTAResult = {
  created: Record<string, unknown> | null;
};

/**
 * Runs the CTA path. When `cta.creates_record_concept` is declared and the
 * creator is null, throws `ManifestError` (caller catches → toasts the
 * "factory no registrada" error and keeps the dialog open).
 */
export function applyCTA(input: ApplyCTAInput, deps: ApplyDeps): ApplyCTAResult {
  const { cta, manifestKey, formValues, creator, userId } = input;

  let created: Record<string, unknown> | null = null;

  if (cta.creates_record_concept) {
    if (creator === null) {
      throw new ManifestError(`no creator registered for ${manifestKey}`);
    }
    created = creator(cta, formValues);

    // Apply on_confirm.set_fields / update_fields to the new record.
    const oc = cta.on_confirm ?? {};
    if (Array.isArray(oc.update_fields)) {
      for (const path of oc.update_fields) {
        if (Object.prototype.hasOwnProperty.call(formValues, path)) {
          setField(created, path, formValues[path]);
        }
      }
    }
    if (oc.set_fields) {
      const now = Date.now();
      for (const [path, raw] of Object.entries(oc.set_fields)) {
        setField(
          created,
          path,
          raw === '$now' ? now : raw === '$current_user' ? userId : raw,
        );
      }
    }
  }

  // Audit (unless the CTA opts out).
  const oc = cta.on_confirm ?? {};
  if (oc.audit !== false) {
    const recordId =
      created !== null && typeof created.id === 'string' ? created.id : undefined;
    const entry: AuditEntryCTA = {
      kind: 'cta',
      timestamp: Date.now(),
      user_id: userId,
      action_id: cta.id,
      manifest_key: manifestKey,
      record_id: recordId,
      created_record_type: cta.creates_record_concept ?? null,
      is_module_cta: true,
      changes: { ...formValues },
    };
    deps.auditAppend(entry);
  }

  // Toast.
  if (oc.toast) {
    const subtitle =
      created !== null && typeof created.id === 'string' ? created.id : '';
    deps.toast.success(oc.toast, subtitle);
  }

  deps.afterMutation();

  return { created };
}
