<script setup lang="ts">
import { ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useUpdateQuoteAttachment } from '@/composables/useQuoteAttachments';
import type { QuoteAttachment } from '@/types/quote';

// ════════════════════════════════════════════════════════════════════
// <EditAttachmentDialog> — edit only the comment field
// ────────────────────────────────────────────────────────────────────
// The legacy PATCH endpoint also exposes filename, but the desk's
// real-world use was almost always "fix the comment". v1 ships
// comment-only; filename rename lands in
// `extend-trd-quote-attachments-rename` if requested.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  open: boolean;
  quoteId: string;
  attachment: QuoteAttachment | null;
}>();
const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const comment = ref('');
const inFlight = ref(false);

const mutation = useUpdateQuoteAttachment();

watch(
  () => [props.open, props.attachment?.id],
  ([isOpen]) => {
    if (isOpen && props.attachment) {
      comment.value = props.attachment.comment ?? '';
    }
    if (!isOpen) comment.value = '';
  },
  { immediate: true },
);

async function submit(): Promise<void> {
  if (!props.attachment) return;
  inFlight.value = true;
  try {
    await mutation.mutateAsync({
      quoteId: props.quoteId,
      attachmentId: props.attachment.id,
      patch: {
        comment: comment.value.trim() || null,
      },
    });
    toast.success('Comentario actualizado');
    emit('update:open', false);
  } catch (err) {
    toast.error('No se pudo actualizar el comentario');
    console.error('[quotes] edit attachment error', err);
  } finally {
    inFlight.value = false;
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v: boolean) => emit('update:open', v)">
    <DialogContent class="max-w-[440px]" data-testid="edit-attachment-modal">
      <DialogHeader>
        <DialogTitle>Editar adjunto</DialogTitle>
        <DialogDescription v-if="attachment">
          <span class="font-mono text-t-2">{{ attachment.filename }}</span>
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-1.5 pt-2">
        <Label
          for="att-edit-comment"
          class="text-[10px] font-bold uppercase tracking-wider text-t-3"
        >
          Comentario
        </Label>
        <textarea
          id="att-edit-comment"
          v-model="comment"
          rows="3"
          maxlength="500"
          class="rounded-md border border-b-2 bg-card px-3 py-2 text-[13px] text-t-2 outline-none focus:border-b-3"
          placeholder="Detalle interno sobre el adjunto..."
          data-testid="edit-attachment-comment"
        />
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          :disabled="inFlight"
          @click="emit('update:open', false)"
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="primary"
          :disabled="inFlight"
          data-testid="edit-attachment-submit"
          @click="submit"
        >
          {{ inFlight ? 'Guardando...' : 'Guardar' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
