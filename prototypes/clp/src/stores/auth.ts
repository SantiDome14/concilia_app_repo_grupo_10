import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { User } from '@/types/models';

// ════════════════════════════════════════════════════════════════════
// Auth store
// ────────────────────────────────────────────────────────────────────
// Thin Pinia wrapper around Auth0 state. Most code should consume via
// the `useAuth` composable, which exposes a higher-level API.
// ════════════════════════════════════════════════════════════════════

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const isAuthenticated = ref(false);
  const isLoading = ref(true);

  const capabilities = computed(() => user.value?.capabilities ?? []);

  function setUser(next: User | null): void {
    user.value = next;
    isAuthenticated.value = next !== null;
  }

  function setLoading(loading: boolean): void {
    isLoading.value = loading;
  }

  function reset(): void {
    user.value = null;
    isAuthenticated.value = false;
    isLoading.value = false;
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    capabilities,
    setUser,
    setLoading,
    reset,
  };
});
