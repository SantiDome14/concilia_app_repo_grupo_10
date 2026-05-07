import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';

// ════════════════════════════════════════════════════════════════════
// useCapabilities — RBAC helper
// ────────────────────────────────────────────────────────────────────
// Core pattern for action menus and conditional UI. Aligns with the
// `core-actions-menu` capability spec: the enablement of an action
// depends on TWO rules:
//   1. User capabilities (this composable)
//   2. Intrinsic record characteristics (domain-specific, per feature)
// ════════════════════════════════════════════════════════════════════

export function useCapabilities() {
  const store = useAuthStore();

  const all = computed(() => store.capabilities);

  /** True if the user has the given capability. */
  function can(capability: string): boolean {
    return store.capabilities.includes(capability);
  }

  /** True if the user has at least one of the given capabilities. */
  function canAny(capabilities: string[]): boolean {
    return capabilities.some((c) => store.capabilities.includes(c));
  }

  /** True if the user has all of the given capabilities. */
  function canAll(capabilities: string[]): boolean {
    return capabilities.every((c) => store.capabilities.includes(c));
  }

  return { all, can, canAny, canAll };
}
