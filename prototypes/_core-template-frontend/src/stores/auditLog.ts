import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { AuditEntry } from '@/types/manifest';

// ════════════════════════════════════════════════════════════════════
// useAuditLogStore — in-memory audit trail
// ────────────────────────────────────────────────────────────────────
// Per Requirement 16: persists every successful manifest confirm
// (single, batch, composite, cta). v1 is in-memory; a future change
// MAY swap to a backend POST per core-api-layer.
// ════════════════════════════════════════════════════════════════════

export const useAuditLogStore = defineStore('auditLog', () => {
  const entries = ref<AuditEntry[]>([]);

  function append(entry: AuditEntry): void {
    entries.value.push(entry);
  }

  function clear(): void {
    entries.value = [];
  }

  function readAll(): AuditEntry[] {
    return [...entries.value];
  }

  return { entries, append, clear, readAll };
});
