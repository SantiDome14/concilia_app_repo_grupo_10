<script setup lang="ts">
import { computed, ref, toRef } from 'vue';
import {
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/feedback/EmptyState.vue';
import Skeleton from '@/components/feedback/Skeleton.vue';
import { useQuoteAttachmentsList } from '@/composables/useQuoteAttachments';
import type { QuoteAttachment } from '@/types/quote';
import AddAttachmentDialog from './AddAttachmentDialog.vue';
import EditAttachmentDialog from './EditAttachmentDialog.vue';
import DeleteAttachmentConfirm from './DeleteAttachmentConfirm.vue';

// ════════════════════════════════════════════════════════════════════
// <QuoteAttachmentsSection> — list + manage attachments inside drawer
// ────────────────────────────────────────────────────────────────────
// Renders inside the QuoteDrawer's default slot, after the summary
// and before the timeline. Each attachment row shows filename + size
// + comment + uploaded_by/at + edit/delete actions.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  quoteId: string;
  /** When false, hides the add/edit/delete CTAs (terminal-state quotes). */
  canMutate: boolean;
}>();

const id = toRef(props, 'quoteId');
const query = useQuoteAttachmentsList(id);
const attachments = computed(() => query.data.value ?? []);

const addOpen = ref(false);
const editTarget = ref<QuoteAttachment | null>(null);
const editOpen = ref(false);
const deleteTarget = ref<QuoteAttachment | null>(null);
const deleteOpen = ref(false);

function openEdit(att: QuoteAttachment): void {
  editTarget.value = att;
  editOpen.value = true;
}
function openDelete(att: QuoteAttachment): void {
  deleteTarget.value = att;
  deleteOpen.value = true;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-AR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function iconFor(mime: string) {
  if (mime.startsWith('image/')) return ImageIcon;
  return FileText;
}
</script>

<template>
  <section class="flex flex-col gap-3" data-testid="quote-attachments-section">
    <header class="flex items-center justify-between">
      <h3 class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-t-3">
        <Paperclip class="h-3.5 w-3.5" />
        Adjuntos
        <span class="font-normal text-t-4">({{ attachments.length }})</span>
      </h3>
      <Button
        v-if="canMutate"
        variant="ghost"
        size="sm"
        data-testid="add-attachment-trigger"
        @click="addOpen = true"
      >
        <Plus class="mr-1 h-3.5 w-3.5" />
        Adjuntar
      </Button>
    </header>

    <div v-if="query.isLoading.value" class="space-y-2" data-testid="quote-attachments-skeleton">
      <Skeleton class="h-10 w-full" />
      <Skeleton class="h-10 w-full" />
    </div>

    <div
      v-else-if="query.isError.value"
      class="flex items-center gap-3 rounded-md border border-danger/30 bg-danger-bg p-3"
      data-testid="quote-attachments-error"
    >
      <AlertCircle class="h-4 w-4 flex-shrink-0 text-danger" />
      <div class="flex-1 text-xs text-t-2">No se pudieron cargar los adjuntos.</div>
      <Button variant="secondary" size="sm" @click="query.refetch()">Reintentar</Button>
    </div>

    <EmptyState
      v-else-if="attachments.length === 0"
      title="Sin adjuntos"
      description="Aún no se cargó ningún documento o comprobante para esta cotización."
      :icon="Paperclip"
      data-testid="quote-attachments-empty"
    />

    <ul v-else class="flex flex-col gap-2" data-testid="quote-attachments-list">
      <li
        v-for="att in attachments"
        :key="att.id"
        class="flex items-start gap-3 rounded-md border border-b-2 bg-card p-3"
        :data-testid="`attachment-${att.id}`"
      >
        <component :is="iconFor(att.mime)" class="mt-0.5 h-5 w-5 flex-shrink-0 text-t-3" />
        <div class="flex flex-1 flex-col gap-1 overflow-hidden">
          <div class="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span class="truncate text-[13px] font-semibold text-t-2">{{ att.filename }}</span>
            <span class="font-mono text-xs text-t-4">{{ formatBytes(att.size) }}</span>
          </div>
          <p v-if="att.comment" class="text-xs text-t-3">{{ att.comment }}</p>
          <div class="text-[11px] text-t-4">
            {{ att.uploaded_by }} · {{ formatDate(att.uploaded_at) }}
          </div>
        </div>
        <div v-if="canMutate" class="flex flex-shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            :data-testid="`attachment-${att.id}-edit`"
            title="Editar comentario"
            @click="openEdit(att)"
          >
            <Pencil class="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class="text-danger hover:text-danger"
            :data-testid="`attachment-${att.id}-delete`"
            title="Eliminar adjunto"
            @click="openDelete(att)"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </Button>
        </div>
      </li>
    </ul>

    <AddAttachmentDialog
      :open="addOpen"
      :quote-id="quoteId"
      @update:open="(v: boolean) => (addOpen = v)"
    />
    <EditAttachmentDialog
      :open="editOpen"
      :quote-id="quoteId"
      :attachment="editTarget"
      @update:open="(v: boolean) => (editOpen = v)"
    />
    <DeleteAttachmentConfirm
      :open="deleteOpen"
      :quote-id="quoteId"
      :attachment="deleteTarget"
      @update:open="(v: boolean) => (deleteOpen = v)"
    />
  </section>
</template>
