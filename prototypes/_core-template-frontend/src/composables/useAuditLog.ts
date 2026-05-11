import { computed, type ComputedRef } from 'vue';
import type { AuditEntry } from '@/types/manifest';
import { useAuditLogStore } from '@/stores/auditLog';

// ════════════════════════════════════════════════════════════════════
// useAuditLog — typed wrapper around the audit-log Pinia store
// ────────────────────────────────────────────────────────────────────
// Per Requirement 16: every successful confirm appends one entry.
// Consumers read `entries` (read-only) or call `append`/`clear`.
// ════════════════════════════════════════════════════════════════════

export interface UseAuditLogApi {
  entries: ComputedRef<readonly AuditEntry[]>;
  append: (entry: AuditEntry) => void;
  clear: () => void;
}

export function useAuditLog(): UseAuditLogApi {
  const store = useAuditLogStore();
  return {
    entries: computed(() => store.entries as readonly AuditEntry[]),
    append: (entry) => store.append(entry),
    clear: () => store.clear(),
  };
}
