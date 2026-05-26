import { computed, type Ref } from 'vue';
import { keepPreviousData, useQuery } from '@tanstack/vue-query';
import {
  getLiquidityActivities,
  getLiquidityOperation,
  listLiquidityOperations,
  listLiquidityProviders,
  type ListLiquidityParams,
} from '@/api/modules/liquidity';
import type { ApiError } from '@/types/api';

// ════════════════════════════════════════════════════════════════════
// useLiquidityList / useLiquidityOperation / useLiquidityActivities /
// useLiquidityProviders
// ────────────────────────────────────────────────────────────────────
// The list query owns BOTH the table rows AND the KPI cards' summary
// (the backend returns them in one response — see the discovery's
// REQ-1 §3 "Cards y tabla se recalculan juntos"). Pages destructure
// `data.data` and `data.summary` from the same query result.
//
// `useLiquidityProviders` caches for 5 minutes — providers change
// rarely and a stale list is acceptable.
// ════════════════════════════════════════════════════════════════════

export function useLiquidityList(filters: Ref<ListLiquidityParams>) {
  return useQuery({
    queryKey: computed(() => ['liquidity', 'list', filters.value] as const),
    queryFn: () => listLiquidityOperations(filters.value),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useLiquidityOperation(id: Ref<string>) {
  return useQuery({
    queryKey: computed(() => ['liquidity', 'detail', id.value] as const),
    queryFn: () => getLiquidityOperation(id.value),
    enabled: computed(() => !!id.value),
    staleTime: 30_000,
    retry: (failureCount, err) => {
      const apiErr = err as ApiError | null;
      if (apiErr && 'isNotFound' in apiErr && apiErr.isNotFound) return false;
      return failureCount < 1;
    },
  });
}

export function useLiquidityActivities(id: Ref<string>) {
  return useQuery({
    queryKey: computed(() => ['liquidity', 'activities', id.value] as const),
    queryFn: () => getLiquidityActivities(id.value),
    enabled: computed(() => !!id.value),
    staleTime: 30_000,
  });
}

export function useLiquidityProviders() {
  return useQuery({
    queryKey: ['liquidity', 'providers'] as const,
    queryFn: listLiquidityProviders,
    staleTime: 5 * 60_000,
  });
}
