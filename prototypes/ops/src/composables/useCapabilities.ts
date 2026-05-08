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
//
// Wildcard convention: a user holding the literal capability `'*'`
// passes EVERY `can()` / `canAny()` / `canAll()` check. This is the
// dev-fallback shortcut used when no Auth0 tenant is configured — it
// keeps the gate semantics intact (the seed still goes through the
// composable) while letting the prototype be exercised end-to-end
// without listing every fine-grained capability string in the seed.
// In production, `'*'` is never granted by the IdP — real users only
// see the explicit capabilities the IdP claim provides.
// ════════════════════════════════════════════════════════════════════

const WILDCARD = '*';

export function useCapabilities() {
  const store = useAuthStore();

  const all = computed(() => store.capabilities);

  /** True if the user has the given capability (or the wildcard `*`). */
  function can(capability: string): boolean {
    if (store.capabilities.includes(WILDCARD)) return true;
    return store.capabilities.includes(capability);
  }

  /** True if the user has at least one of the given capabilities (or the wildcard `*`). */
  function canAny(capabilities: string[]): boolean {
    if (store.capabilities.includes(WILDCARD)) return true;
    return capabilities.some((c) => store.capabilities.includes(c));
  }

  /** True if the user has all of the given capabilities (or the wildcard `*`). */
  function canAll(capabilities: string[]): boolean {
    if (store.capabilities.includes(WILDCARD)) return true;
    return capabilities.every((c) => store.capabilities.includes(c));
  }

  return { all, can, canAny, canAll };
}
