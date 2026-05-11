<script setup lang="ts">
import { computed } from 'vue';
import { CloudUpload, X, RotateCw, CheckCircle2, AlertCircle, Ban } from 'lucide-vue-next';
import type { Component } from 'vue';
import type { UploadFile, UploadState } from '@/types/file-upload';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/feedback/EmptyState.vue';

// ════════════════════════════════════════════════════════════════════
// FileUploadProgress — display-only list view of an upload batch
// ────────────────────────────────────────────────────────────────────
// Pure display: every action button is a dispatcher into the parent's
// composable instance. The composable owns the state machine; this
// component never mutates `file.state` directly.
// ════════════════════════════════════════════════════════════════════

interface Props {
  files: UploadFile[];
  emptyMessage?: string;
}

const props = withDefaults(defineProps<Props>(), {
  emptyMessage: 'Aún no hay archivos en cola',
});

const emit = defineEmits<{
  retry: [fileId: string];
  cancel: [fileId: string];
}>();

type BadgeVariant = 'info' | 'success' | 'warning' | 'danger' | 'neutral';

interface BadgeMeta {
  label: string;
  variant: BadgeVariant;
  icon: Component;
}

const stateMeta: Record<UploadState, BadgeMeta> = {
  idle: { label: 'En cola', variant: 'neutral', icon: CloudUpload },
  requesting: { label: 'Solicitando', variant: 'info', icon: CloudUpload },
  uploading: { label: 'Subiendo', variant: 'info', icon: CloudUpload },
  completed: { label: 'Completado', variant: 'success', icon: CheckCircle2 },
  error: { label: 'Error', variant: 'danger', icon: AlertCircle },
  cancelled: { label: 'Cancelado', variant: 'neutral', icon: Ban },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function showProgressBar(state: UploadState): boolean {
  return state === 'requesting' || state === 'uploading';
}

function showRetry(state: UploadState): boolean {
  return state === 'error';
}

function showCancel(state: UploadState): boolean {
  return state === 'requesting' || state === 'uploading';
}

const isEmpty = computed(() => props.files.length === 0);
</script>

<template>
  <div class="space-y-2">
    <EmptyState
      v-if="isEmpty"
      :title="props.emptyMessage"
      :icon="CloudUpload"
    />

    <ul v-else class="space-y-2" role="list">
      <li
        v-for="file in props.files"
        :key="file.id"
        class="flex flex-col gap-2 rounded-md border border-b-2 bg-card p-3"
      >
        <div class="flex items-center gap-3">
          <slot name="preview" :file="file">
            <component :is="stateMeta[file.state].icon" class="h-5 w-5 shrink-0 text-t-3" />
          </slot>

          <div class="min-w-0 flex-1">
            <div class="truncate text-sm font-medium text-t-1" :title="file.filename">
              {{ file.filename }}
            </div>
            <div class="text-xs text-t-4">
              {{ formatSize(file.sizeBytes) }}
              <span v-if="file.state === 'error' && file.lastError">
                — {{ file.lastError.message }}
              </span>
            </div>
          </div>

          <Badge :variant="stateMeta[file.state].variant" class="shrink-0">
            {{ stateMeta[file.state].label }}
          </Badge>

          <div class="flex shrink-0 items-center gap-1">
            <slot name="actions" :file="file" />
            <Button
              v-if="showRetry(file.state)"
              size="sm"
              variant="ghost"
              :aria-label="`Reintentar ${file.filename}`"
              @click="emit('retry', file.id)"
            >
              <RotateCw class="h-4 w-4" />
            </Button>
            <Button
              v-if="showCancel(file.state)"
              size="sm"
              variant="ghost"
              :aria-label="`Cancelar ${file.filename}`"
              @click="emit('cancel', file.id)"
            >
              <X class="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div
          v-if="showProgressBar(file.state)"
          class="h-1.5 overflow-hidden rounded-full bg-card-2"
          role="progressbar"
          :aria-valuenow="file.percent"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div
            class="h-full bg-info transition-[width] duration-200"
            :style="{ width: `${file.percent}%` }"
          />
        </div>
      </li>
    </ul>
  </div>
</template>
