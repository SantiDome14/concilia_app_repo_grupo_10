import { computed, type Ref } from 'vue';
import { keepPreviousData, useQuery } from '@tanstack/vue-query';
import {
  getQuote,
  getQuoteActivities,
  listQuotes,
  type ListQuotesParams,
} from '@/api/modules/quotes';
import type { ApiError } from '@/types/api';

// ════════════════════════════════════════════════════════════════════
// useQuotesList / useQuote / useQuoteActivities
// ────────────────────────────────────────────────────────────────────
// vue-query wrappers for the Quotes module. `useQuotesList` uses
// `keepPreviousData` to avoid flicker when paginating or switching
// tabs. `useQuote` bails on 404 (the drawer renders its own
// "Quote not found" surface).
// ════════════════════════════════════════════════════════════════════

export function useQuotesList(filters: Ref<ListQuotesParams>) {
  return useQuery({
    queryKey: computed(() => ['quotes', 'list', filters.value] as const),
    queryFn: () => listQuotes(filters.value),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useQuote(id: Ref<string>) {
  return useQuery({
    queryKey: computed(() => ['quotes', 'detail', id.value] as const),
    queryFn: () => getQuote(id.value),
    enabled: computed(() => !!id.value),
    staleTime: 30_000,
    retry: (failureCount, err) => {
      const apiErr = err as ApiError | null;
      if (apiErr && 'isNotFound' in apiErr && apiErr.isNotFound) return false;
      return failureCount < 1;
    },
  });
}

export function useQuoteActivities(id: Ref<string>) {
  return useQuery({
    queryKey: computed(() => ['quotes', 'activities', id.value] as const),
    queryFn: () => getQuoteActivities(id.value),
    enabled: computed(() => !!id.value),
    staleTime: 30_000,
  });
}
