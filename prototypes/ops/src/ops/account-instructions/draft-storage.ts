import type { ClientId } from '@/ops/clients/types';
import type { AccountInstructionDraft } from './types';

// ════════════════════════════════════════════════════════════════════
// draft-storage — helper for Requirement 9 (Decision 7e).
//
// Per-client localStorage persistence of the wizard draft. The shape
// captures the active step + every selection + form values so a
// refresh mid-flow restores the operator's state silently on the
// next opening for the same client.
//
// All localStorage interactions are wrapped in try/catch so a private
// browsing mode that throws on `setItem` doesn't break the modal.
// ════════════════════════════════════════════════════════════════════

const STORAGE_PREFIX = 'ops:account-instructions:draft:';

function key(clientId: ClientId): string {
  return `${STORAGE_PREFIX}${clientId}`;
}

/** Persist the wizard's draft state for a specific client. */
export function saveDraft(clientId: ClientId, draft: AccountInstructionDraft): void {
  try {
    window.localStorage.setItem(key(clientId), JSON.stringify(draft));
  } catch {
    // Private mode / quota: silent no-op.
  }
}

/**
 * Load the saved draft for a client, or `null` if none exists / record
 * is malformed / storage is unavailable.
 */
export function loadDraft(clientId: ClientId): AccountInstructionDraft | null {
  try {
    const raw = window.localStorage.getItem(key(clientId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AccountInstructionDraft;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !isValidStep(parsed.step) ||
      typeof parsed.formValues !== 'object' ||
      !Array.isArray(parsed.railIds)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Remove the saved draft for a client (called on successful submit). */
export function clearDraft(clientId: ClientId): void {
  try {
    window.localStorage.removeItem(key(clientId));
  } catch {
    // ignore
  }
}

function isValidStep(value: unknown): value is AccountInstructionDraft['step'] {
  return value === 'account-template' || value === 'values' || value === 'rails';
}
