import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import {
  createPriceAlert,
  deletePriceAlert,
  listPriceAlerts,
  updatePriceAlert,
} from '@/api/modules/priceAlerts';
import type {
  CreatePriceAlertPayload,
  PriceAlert,
  UpdatePriceAlertPayload,
} from '@/types/priceAlert';

// ════════════════════════════════════════════════════════════════════
// usePriceAlerts — list query + 3 mutations (create / update / delete)
// ────────────────────────────────────────────────────────────────────
// First TRD module with mutations. Follows the canonical pattern from
// CLAUDE.md: useMutation with optimistic update in `onMutate`,
// rollback in `onError`, invalidate in `onSettled`. The page consumes
// `query.data` directly — never holds a local mirror.
// ════════════════════════════════════════════════════════════════════

const LIST_KEY = ['priceAlerts', 'list'] as const;

export function usePriceAlertsList() {
  return useQuery({
    queryKey: LIST_KEY,
    queryFn: listPriceAlerts,
    staleTime: 30_000,
  });
}

export function useCreatePriceAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPriceAlert,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

interface UpdatePriceAlertArgs {
  id: string;
  patch: UpdatePriceAlertPayload;
}

export function useUpdatePriceAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: UpdatePriceAlertArgs) =>
      updatePriceAlert(id, patch),

    onMutate: async ({ id, patch }) => {
      // Cancel + snapshot + optimistic patch.
      await queryClient.cancelQueries({ queryKey: LIST_KEY });
      const snapshot = queryClient.getQueryData<PriceAlert[]>(LIST_KEY);
      if (snapshot) {
        queryClient.setQueryData<PriceAlert[]>(
          LIST_KEY,
          snapshot.map((a) =>
            a.id === id
              ? { ...a, ...patch, updated_at: new Date().toISOString() }
              : a,
          ),
        );
      }
      return { snapshot };
    },

    onError: (_err, _vars, ctx) => {
      // Rollback.
      if (ctx?.snapshot) queryClient.setQueryData(LIST_KEY, ctx.snapshot);
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

export function useDeletePriceAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePriceAlert(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: LIST_KEY });
      const snapshot = queryClient.getQueryData<PriceAlert[]>(LIST_KEY);
      if (snapshot) {
        queryClient.setQueryData<PriceAlert[]>(
          LIST_KEY,
          snapshot.filter((a) => a.id !== id),
        );
      }
      return { snapshot };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) queryClient.setQueryData(LIST_KEY, ctx.snapshot);
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: LIST_KEY });
    },
  });
}

// Convenience re-exports for ergonomic page imports.
export type { CreatePriceAlertPayload, UpdatePriceAlertPayload };
