<script setup lang="ts">
import { ref, watch } from 'vue';
import { Paperclip, Upload } from 'lucide-vue-next';
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
import { useCreateQuoteAttachment } from '@/composables/useQuoteAttachments';

// ════════════════════════════════════════════════════════════════════
// <AddAttachmentDialog> — Add metadata-only attachment to a Quote
// ────────────────────────────────────────────────────────────────────
// v1 is metadata-only: we read filename / size / mime from the chosen
// File but do NOT upload the bytes. The full presigned-URL flow via
// `useFileUpload` lands in a follow-up.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{ open: boolean; quoteId: string }>();
const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const file = ref<File | null>(null);
const comment = ref('');
const inFlight = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const mutation = useCreateQuoteAttachment();

function reset(): void {
  file.value = null;
  comment.value = '';
  if (fileInput.value) fileInput.value.value = '';
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) reset();
  },
);

function onFileChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  file.value = target.files?.[0] ?? null;
}

async function submit(): Promise<void> {
  if (!file.value) return;
  inFlight.value = true;
  try {
    await mutation.mutateAsync({
      quoteId: props.quoteId,
      payload: {
        filename: file.value.name,
        size: file.value.size,
        mime: file.value.type || 'application/octet-stream',
        comment: comment.value.trim() || null,
      },
    });
    toast.success('Adjunto agregado');
    emit('update:open', false);
  } catch (err) {
    toast.error('No se pudo adjuntar el archivo');
    console.error('[quotes] add attachment error', err);
  } finally {
    inFlight.value = false;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
</script>

<template>
  <Dialog :open="open" @update:open="(v: boolean) => emit('update:open', v)">
    <DialogContent class="max-w-[460px]" data-testid="add-attachment-modal">
      <DialogHeader>
        <DialogTitle>Adjuntar archivo</DialogTitle>
        <DialogDescription>
          Carga un documento, captura o comprobante asociado a la cotización.
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4 pt-2">
        <div class="flex flex-col gap-1.5">
          <Label
            class="text-[10px] font-bold uppercase tracking-wider text-t-3"
          >
            Archivo <span class="text-danger">*</span>
          </Label>
          <label
            class="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-dashed border-b-3 bg-card px-3 py-3 text-[13px] text-t-3 transition-colors hover:bg-card-2"
            data-testid="add-attachment-picker"
          >
            <span class="flex items-center gap-2 truncate">
              <Paperclip v-if="!file" class="h-4 w-4 text-t-4" />
              <Upload v-else class="h-4 w-4 text-success" />
              <span class="truncate">
                {{ file ? file.name : 'Elegí un archivo desde tu equipo' }}
              </span>
            </span>
            <span v-if="file" class="font-mono text-xs text-t-4">
              {{ formatBytes(file.size) }}
            </span>
            <input
              ref="fileInput"
              type="file"
              class="hidden"
              data-testid="add-attachment-file-input"
              @change="onFileChange"
            />
          </label>
        </div>

        <div class="flex flex-col gap-1.5">
          <Label
            for="att-comment"
            class="text-[10px] font-bold uppercase tracking-wider text-t-3"
          >
            Comentario (opcional)
          </Label>
          <textarea
            id="att-comment"
            v-model="comment"
            rows="3"
            maxlength="500"
            class="rounded-md border border-b-2 bg-card px-3 py-2 text-[13px] text-t-2 outline-none focus:border-b-3"
            placeholder="Detalle interno sobre el adjunto..."
            data-testid="add-attachment-comment"
          />
        </div>
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
          :disabled="!file || inFlight"
          data-testid="add-attachment-submit"
          @click="submit"
        >
          {{ inFlight ? 'Adjuntando...' : 'Adjuntar' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
