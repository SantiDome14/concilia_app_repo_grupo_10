import { computed, type Ref } from 'vue';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/vue-query';
import {
  createQuoteAttachment,
  deleteQuoteAttachment,
  listQuoteAttachments,
  updateQuoteAttachment,
  type CreateAttachmentPayload,
  type UpdateAttachmentPayload,
} from '@/api/modules/quotes';
import type { QuoteAttachment } from '@/types/quote';

// ════════════════════════════════════════════════════════════════════
// useQuoteAttachments — list + 3 mutations
// ────────────────────────────────────────────────────────────────────
// Metadata-only flow per `add-trd-quote-attachments` v1: the actual
// file bytes are not uploaded. Switch to the canonical presigned-URL
// flow via `useFileUpload` when `extend-trd-quote-attachments-upload`
// lands.
// ════════════════════════════════════════════════════════════════════

function attachmentsKey(quoteId: string) {
  return ['quotes', 'attachments', quoteId] as const;
}

export function useQuoteAttachmentsList(quoteId: Ref<string>) {
  return useQuery({
    queryKey: computed(() => attachmentsKey(quoteId.value)),
    queryFn: () => listQuoteAttachments(quoteId.value),
    enabled: computed(() => !!quoteId.value),
    staleTime: 30_000,
  });
}

interface CreateArgs {
  quoteId: string;
  payload: CreateAttachmentPayload;
}

export function useCreateQuoteAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quoteId, payload }: CreateArgs) =>
      createQuoteAttachment(quoteId, payload),
    onSettled: (_data, _err, { quoteId }) => {
      void queryClient.invalidateQueries({ queryKey: attachmentsKey(quoteId) });
      void queryClient.invalidateQueries({
        queryKey: ['quotes', 'activities', quoteId],
      });
    },
  });
}

interface UpdateArgs {
  quoteId: string;
  attachmentId: string;
  patch: UpdateAttachmentPayload;
}

export function useUpdateQuoteAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quoteId, attachmentId, patch }: UpdateArgs) =>
      updateQuoteAttachment(quoteId, attachmentId, patch),
    onMutate: async ({ quoteId, attachmentId, patch }) => {
      const key = attachmentsKey(quoteId);
      await queryClient.cancelQueries({ queryKey: key });
      const snapshot = queryClient.getQueryData<QuoteAttachment[]>(key);
      if (snapshot) {
        queryClient.setQueryData<QuoteAttachment[]>(
          key,
          snapshot.map((a) =>
            a.id === attachmentId ? { ...a, ...patch } : a,
          ),
        );
      }
      return { key, snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) queryClient.setQueryData(ctx.key, ctx.snapshot);
    },
    onSettled: (_data, _err, { quoteId }) => {
      void queryClient.invalidateQueries({ queryKey: attachmentsKey(quoteId) });
    },
  });
}

interface DeleteArgs {
  quoteId: string;
  attachmentId: string;
}

export function useDeleteQuoteAttachment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ quoteId, attachmentId }: DeleteArgs) =>
      deleteQuoteAttachment(quoteId, attachmentId),
    onMutate: async ({ quoteId, attachmentId }) => {
      const key = attachmentsKey(quoteId);
      await queryClient.cancelQueries({ queryKey: key });
      const snapshot = queryClient.getQueryData<QuoteAttachment[]>(key);
      if (snapshot) {
        queryClient.setQueryData<QuoteAttachment[]>(
          key,
          snapshot.filter((a) => a.id !== attachmentId),
        );
      }
      return { key, snapshot };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) queryClient.setQueryData(ctx.key, ctx.snapshot);
    },
    onSettled: (_data, _err, { quoteId }) => {
      void queryClient.invalidateQueries({ queryKey: attachmentsKey(quoteId) });
      void queryClient.invalidateQueries({
        queryKey: ['quotes', 'activities', quoteId],
      });
    },
  });
}

export type { CreateAttachmentPayload, UpdateAttachmentPayload };
