import { computed, type Ref } from 'vue';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/vue-query';
import {
  cancelQuote,
  createCCCQuote,
  createQuote,
  getQuote,
  getQuoteActivities,
  listQuotes,
  updateQuote,
  type CreateCCCQuotePayload,
  type CreateQuotePayload,
  type ListQuotesParams,
  type UpdateQuotePayload,
} from '@/api/modules/quotes';
import type { ApiError } from '@/types/api';
import type { PaginatedResponse } from '@/types/api';
import type { Quote } from '@/types/quote';

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

// ─── Mutations ────────────────────────────────────────────────────
// Both mutations apply optimistic updates to the detail-cache entry
// (`['quotes', 'detail', id]`) AND patch matching rows inside the
// paginated list caches (`['quotes', 'list', ...]`). The page
// reads through the cache, so optimistic patches reflect in the
// list immediately without a refetch round-trip.

function patchListsOptimistically(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string,
  apply: (q: Quote) => Quote,
): { listSnapshots: [readonly unknown[], PaginatedResponse<Quote> | undefined][] } {
  const listSnapshots = queryClient.getQueriesData<PaginatedResponse<Quote>>({
    queryKey: ['quotes', 'list'],
  });
  for (const [key, data] of listSnapshots) {
    if (!data) continue;
    queryClient.setQueryData<PaginatedResponse<Quote>>(key, {
      ...data,
      data: data.data.map((q) => (q.id === id ? apply(q) : q)),
    });
  }
  return { listSnapshots };
}

interface UpdateQuoteArgs {
  id: string;
  patch: UpdateQuotePayload;
}

export function useUpdateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: UpdateQuoteArgs) => updateQuote(id, patch),

    onMutate: async ({ id, patch }) => {
      const detailKey = ['quotes', 'detail', id] as const;
      await queryClient.cancelQueries({ queryKey: detailKey });
      await queryClient.cancelQueries({ queryKey: ['quotes', 'list'] });

      const detailSnapshot = queryClient.getQueryData<Quote>(detailKey);
      const apply = (q: Quote): Quote => ({
        ...q,
        ...(patch.notes !== undefined && { notes: patch.notes }),
        ...(patch.liquidate_date !== undefined && {
          liquidate_date: patch.liquidate_date,
        }),
        ...(patch.status !== undefined && { status: patch.status }),
      });

      if (detailSnapshot) {
        queryClient.setQueryData<Quote>(detailKey, apply(detailSnapshot));
      }
      const { listSnapshots } = patchListsOptimistically(queryClient, id, apply);

      return { detailKey, detailSnapshot, listSnapshots };
    },

    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      if (ctx.detailSnapshot) {
        queryClient.setQueryData(ctx.detailKey, ctx.detailSnapshot);
      }
      for (const [key, data] of ctx.listSnapshots) {
        queryClient.setQueryData(key, data);
      }
    },

    onSettled: (_data, _err, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['quotes', 'detail', id] });
      void queryClient.invalidateQueries({ queryKey: ['quotes', 'list'] });
      void queryClient.invalidateQueries({
        queryKey: ['quotes', 'activities', id],
      });
    },
  });
}

export function useCancelQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelQuote(id),

    onMutate: async (id) => {
      const detailKey = ['quotes', 'detail', id] as const;
      await queryClient.cancelQueries({ queryKey: detailKey });
      await queryClient.cancelQueries({ queryKey: ['quotes', 'list'] });

      const detailSnapshot = queryClient.getQueryData<Quote>(detailKey);
      const apply = (q: Quote): Quote => ({ ...q, status: 'CANCELLED' });

      if (detailSnapshot) {
        queryClient.setQueryData<Quote>(detailKey, apply(detailSnapshot));
      }
      const { listSnapshots } = patchListsOptimistically(queryClient, id, apply);

      return { detailKey, detailSnapshot, listSnapshots };
    },

    onError: (_err, _id, ctx) => {
      if (!ctx) return;
      if (ctx.detailSnapshot) {
        queryClient.setQueryData(ctx.detailKey, ctx.detailSnapshot);
      }
      for (const [key, data] of ctx.listSnapshots) {
        queryClient.setQueryData(key, data);
      }
    },

    onSettled: (_data, _err, id) => {
      void queryClient.invalidateQueries({ queryKey: ['quotes', 'detail', id] });
      void queryClient.invalidateQueries({ queryKey: ['quotes', 'list'] });
      void queryClient.invalidateQueries({
        queryKey: ['quotes', 'activities', id],
      });
    },
  });
}

export function useCreateQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createQuote,
    onSettled: () => {
      // Invalidate every paginated list; the created quote enters
      // PENDING so the Activos tab and the Historial tab both refetch.
      void queryClient.invalidateQueries({ queryKey: ['quotes', 'list'] });
    },
  });
}

export function useCreateCCCQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCCCQuote,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['quotes', 'list'] });
    },
  });
}

export type { CreateCCCQuotePayload, CreateQuotePayload, UpdateQuotePayload };
