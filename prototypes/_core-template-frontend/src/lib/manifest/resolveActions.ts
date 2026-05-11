// ════════════════════════════════════════════════════════════════════
// Action resolver — runs the four-gate sequential evaluation
// ────────────────────────────────────────────────────────────────────
// Order: show_when → prerequisites → enable_when → capabilities.
// First failure wins the disabled-state metadata; capability failure
// always overrides any custom `disable_tag` with "Permiso".
// ════════════════════════════════════════════════════════════════════

import type {
  Action,
  Manifest,
  Prerequisite,
  ResolvedAction,
} from '@/types/manifest';
import { evalCapabilities } from './evalCapabilities';
import { evalPredicate } from './evalPredicate';
import { resolveField } from './dotPath';

const DEFAULT_TAG_PREREQ = 'Prerequisito';
const DEFAULT_TAG_STATE = 'Estado';
const TAG_CAPABILITY = 'Permiso';
const DEFAULT_REASON_STATE = 'Acción no disponible para este registro';
const REASON_CAPABILITY = 'Tu rol actual no permite esta acción';

function checkPrerequisite(
  pr: Prerequisite,
  record: Record<string, unknown>,
): boolean {
  const v = resolveField(record, pr.field);
  if (pr.value === undefined) {
    return v !== null && v !== undefined;
  }
  return v === pr.value;
}

function resolveSingleAction(
  action: Action,
  record: Record<string, unknown>,
  role: string | string[] | null | undefined,
): ResolvedAction | null {
  // Gate 1 — show_when. Drop entirely when false.
  if (action.show_when && !evalPredicate(action.show_when, record)) {
    return null;
  }

  const resolved: ResolvedAction = {
    action,
    visible: true,
    enabled: true,
    reason: null,
    tag: null,
    blocking_prereq: null,
  };

  // Gate 2 — prerequisites (declaration order; first failure wins).
  for (const pr of action.prerequisites ?? []) {
    if (!checkPrerequisite(pr, record)) {
      resolved.enabled = false;
      resolved.reason = pr.message;
      resolved.tag = action.disable_tag ?? DEFAULT_TAG_PREREQ;
      resolved.blocking_prereq = pr;
      break;
    }
  }

  // Gate 3 — enable_when (only if still enabled).
  if (
    resolved.enabled &&
    action.enable_when &&
    !evalPredicate(action.enable_when, record)
  ) {
    resolved.enabled = false;
    resolved.reason = action.disable_reason ?? DEFAULT_REASON_STATE;
    resolved.tag = action.disable_tag ?? DEFAULT_TAG_STATE;
  }

  // Gate 4 — capabilities (only if still enabled). Always overrides tag.
  if (resolved.enabled && !evalCapabilities(action.capabilities, role)) {
    resolved.enabled = false;
    resolved.reason = REASON_CAPABILITY;
    resolved.tag = TAG_CAPABILITY;
  }

  return resolved;
}

/**
 * Resolves every action in a manifest against a record + role,
 * filtering out any whose `show_when` fails. Order matches the
 * manifest's declaration order.
 */
export function resolveActions(
  record: Record<string, unknown>,
  manifest: Manifest,
  role: string | string[] | null | undefined,
): ResolvedAction[] {
  const out: ResolvedAction[] = [];
  for (const action of manifest.actions ?? []) {
    const resolved = resolveSingleAction(action, record, role);
    if (resolved !== null) out.push(resolved);
  }
  return out;
}
