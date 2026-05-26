import { computed, type Ref } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import {
  getClient,
  getClientBalances,
  getClientLimits,
} from '@/api/modules/clients';

// ════════════════════════════════════════════════════════════════════
// useClient / useClientLimits / useClientBalances
// ────────────────────────────────────────────────────────────────────
// Three vue-query wrappers for the detail page's three sections. Each
// is guarded by `enabled` so they don't fire when `id` is empty
// (e.g. between route transitions).
// ════════════════════════════════════════════════════════════════════

export function useClient(id: Ref<string>) {
  return useQuery({
    queryKey: computed(() => ['clients', 'detail', id.value] as const),
    queryFn: () => getClient(id.value),
    enabled: computed(() => !!id.value),
    staleTime: 30_000,
    retry: (failureCount, err) => {
      // Don't retry on 404 — the detail page's empty-state handles it.
      if (err && typeof err === 'object' && 'isNotFound' in err && err.isNotFound) {
        return false;
      }
      return failureCount < 1;
    },
  });
}

export function useClientLimits(id: Ref<string>) {
  return useQuery({
    queryKey: computed(() => ['clients', 'limits', id.value] as const),
    queryFn: () => getClientLimits(id.value),
    enabled: computed(() => !!id.value),
    staleTime: 30_000,
  });
}

export function useClientBalances(id: Ref<string>) {
  return useQuery({
    queryKey: computed(() => ['clients', 'balances', id.value] as const),
    queryFn: () => getClientBalances(id.value),
    enabled: computed(() => !!id.value),
    staleTime: 30_000,
  });
}
