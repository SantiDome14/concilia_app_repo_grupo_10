<script setup lang="ts">
import { ref } from 'vue';
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
import { useDeleteQuoteAttachment } from '@/composables/useQuoteAttachments';
import type { QuoteAttachment } from '@/types/quote';

const props = defineProps<{
  open: boolean;
  quoteId: string;
  attachment: QuoteAttachment | null;
}>();
const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const mutation = useDeleteQuoteAttachment();
const inFlight = ref(false);

async function confirm(): Promise<void> {
  if (!props.attachment) return;
  inFlight.value = true;
  try {
    await mutation.mutateAsync({
      quoteId: props.quoteId,
      attachmentId: props.attachment.id,
    });
    toast.success('Adjunto eliminado');
    emit('update:open', false);
  } catch (err) {
    toast.error('No se pudo eliminar el adjunto');
    console.error('[quotes] delete attachment error', err);
  } finally {
    inFlight.value = false;
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v: boolean) => emit('update:open', v)">
    <DialogContent class="max-w-[420px]" data-testid="delete-attachment-modal">
      <DialogHeader>
        <DialogTitle class="text-danger">Eliminar adjunto</DialogTitle>
        <DialogDescription>
          Vas a eliminar
          <span v-if="attachment" class="font-mono text-t-2">{{ attachment.filename }}</span>
          de la cotización. Esta acción no se puede deshacer.
        </DialogDescription>
      </DialogHeader>

      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          :disabled="inFlight"
          @click="emit('update:open', false)"
        >
          Volver
        </Button>
        <Button
          type="button"
          variant="danger"
          :disabled="inFlight"
          data-testid="delete-attachment-confirm"
          @click="confirm"
        >
          {{ inFlight ? 'Eliminando...' : 'Eliminar' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
