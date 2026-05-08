<script setup lang="ts">
import { computed, ref } from 'vue';
import { Upload, AlertTriangle } from 'lucide-vue-next';
import { useFileUpload, type UseFileUploadApi } from '@/composables/useFileUpload';
import { _validateClientSide } from '@/composables/useFileUpload';
import { ApiError } from '@/types/api';
import type { UseFileUploadOptions } from '@/types/file-upload';
import { cn } from '@/lib/cn';

// ════════════════════════════════════════════════════════════════════
// Dropzone — canonical drag-drop file input
// ────────────────────────────────────────────────────────────────────
// Two modes:
//  • Eager upload — `:options` is provided. The component instantiates
//    `useFileUpload(options)` internally and calls `start()` on drop.
//    Exposes the composable api via `slot props` for FileUploadProgress.
//  • Form mode — `:options` omitted. The component only captures Files
//    and emits them via `update:modelValue`. The form decides when to
//    upload (e.g. on submit).
//
// Visual states: idle / hover / dragging / rejected / focused / disabled.
// All colors resolve through `core-theming` tokens.
// ════════════════════════════════════════════════════════════════════

interface Props {
  /** When true, the picker accepts multiple files. */
  multiple?: boolean;
  /** MIME types whitelist (e.g. `['application/pdf', 'image/*']`). */
  accept?: string[];
  /** Max byte size per file. */
  maxSize?: number;
  /** Max files (only meaningful when `multiple`). */
  maxFiles?: number;
  /** When set, the component switches to eager-upload mode. */
  options?: UseFileUploadOptions;
  /** Form-mode v-model — `File | null` when single, `File[]` when multiple. */
  modelValue?: File | File[] | null;
  /** Disable interaction (drop + click + keyboard). */
  disabled?: boolean;
  /** Override the default ARIA label. */
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  multiple: false,
  accept: undefined,
  maxSize: undefined,
  maxFiles: undefined,
  options: undefined,
  modelValue: null,
  disabled: false,
  ariaLabel: 'Arrastrá archivos aquí o hacé click para seleccionar',
});

const emit = defineEmits<{
  'update:modelValue': [value: File | File[] | null];
  rejected: [errors: { file: File; reason: string }[]];
}>();

const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const isRejecting = ref(false);
const lastErrors = ref<{ file: File; reason: string }[]>([]);

// ── Eager-upload mode bootstrap ──────────────────────────────────────
const eagerUpload = computed<UseFileUploadApi | null>(() =>
  props.options ? useFileUpload(props.options) : null,
);
defineExpose({ eagerUpload });

// ── Validation (single source of truth: useFileUpload's helper) ──────

function validateBatch(
  rawFiles: File[],
): { accepted: File[]; rejected: { file: File; reason: string }[] } {
  const accepted: File[] = [];
  const rejected: { file: File; reason: string }[] = [];
  const cap = props.multiple ? props.maxFiles : 1;
  for (const file of rawFiles) {
    try {
      _validateClientSide(file, {
        presignEndpoint: '',
        confirmEndpoint: '',
        accept: props.accept,
        maxSize: props.maxSize,
      });
      accepted.push(file);
    } catch (e) {
      const reason = e instanceof ApiError ? e.message : String(e);
      rejected.push({ file, reason });
    }
  }
  if (cap !== undefined && accepted.length > cap) {
    const over = accepted.splice(cap);
    for (const file of over) {
      rejected.push({ file, reason: `Excede ${cap} archivos` });
    }
  }
  return { accepted, rejected };
}

// ── Drag handlers ────────────────────────────────────────────────────

function onDragEnter(event: DragEvent): void {
  if (props.disabled) return;
  event.preventDefault();
  // Inspect the dragged item against `accept` (best-effort — on dragover
  // the browser only exposes types, not full File objects).
  const types = Array.from(event.dataTransfer?.items ?? []).map((it) => it.type);
  const acceptList = props.accept;
  if (acceptList && acceptList.length > 0 && types.length > 0) {
    const allMatch = types.every((t) =>
      acceptList.some((p) => (p.endsWith('/*') ? t.startsWith(p.slice(0, -1)) : t === p)),
    );
    isRejecting.value = !allMatch;
  } else {
    isRejecting.value = false;
  }
  isDragging.value = true;
}

function onDragOver(event: DragEvent): void {
  if (props.disabled) return;
  event.preventDefault();
}

function onDragLeave(event: DragEvent): void {
  if (props.disabled) return;
  // Only reset state when the drag truly leaves the dropzone (not when
  // crossing into a child element).
  const target = event.currentTarget as HTMLElement;
  const related = event.relatedTarget as Node | null;
  if (related && target.contains(related)) return;
  isDragging.value = false;
  isRejecting.value = false;
}

function onDrop(event: DragEvent): void {
  if (props.disabled) return;
  event.preventDefault();
  isDragging.value = false;
  isRejecting.value = false;

  const dropped = Array.from(event.dataTransfer?.files ?? []);
  handleFiles(dropped);
}

function handleFiles(rawFiles: File[]): void {
  if (rawFiles.length === 0) return;
  const { accepted, rejected } = validateBatch(rawFiles);
  lastErrors.value = rejected;
  if (rejected.length > 0) emit('rejected', rejected);

  if (accepted.length === 0) return;

  if (eagerUpload.value) {
    void eagerUpload.value.start(accepted);
    return;
  }

  // Form mode — emit File / File[].
  if (props.multiple) {
    const existing = Array.isArray(props.modelValue) ? props.modelValue : [];
    emit('update:modelValue', [...existing, ...accepted]);
  } else {
    emit('update:modelValue', accepted[0] ?? null);
  }
}

// ── Click + keyboard fallback ────────────────────────────────────────

function openPicker(): void {
  if (props.disabled) return;
  fileInputRef.value?.click();
}

function onKeydown(event: KeyboardEvent): void {
  if (props.disabled) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openPicker();
  }
}

function onPickerChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  const picked = Array.from(input.files ?? []);
  handleFiles(picked);
  // Reset so the same file can be re-picked.
  input.value = '';
}

// ── Computed visual class ────────────────────────────────────────────

const stateClass = computed(() => {
  if (props.disabled) return 'opacity-50 cursor-not-allowed';
  if (isRejecting.value) return 'border-danger bg-danger/5';
  if (isDragging.value) return 'border-info bg-info/5';
  return 'border-b-3 hover:border-info';
});

const acceptAttr = computed(() => (props.accept ?? []).join(','));
</script>

<template>
  <div class="space-y-2">
    <div
      role="button"
      tabindex="0"
      :aria-label="props.ariaLabel"
      :aria-disabled="props.disabled || undefined"
      :class="
        cn(
          'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed bg-card-2 p-8 outline-none transition-colors',
          'focus-visible:border-info focus-visible:ring-2 focus-visible:ring-info/30',
          stateClass,
        )
      "
      @click="openPicker"
      @keydown="onKeydown"
      @dragenter="onDragEnter"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <component
        :is="isRejecting ? AlertTriangle : Upload"
        :class="cn('h-7 w-7', isRejecting ? 'text-danger' : 'text-t-3')"
      />
      <div class="text-sm font-medium text-t-2">
        {{ props.ariaLabel }}
      </div>
      <div v-if="props.accept || props.maxSize" class="text-xs text-t-4">
        <span v-if="props.accept">{{ props.accept.join(', ') }}</span>
        <span v-if="props.accept && props.maxSize"> · </span>
        <span v-if="props.maxSize">≤ {{ Math.round(props.maxSize / 1024 / 1024) }} MB</span>
      </div>
      <input
        ref="fileInputRef"
        type="file"
        :multiple="props.multiple"
        :accept="acceptAttr"
        :disabled="props.disabled"
        class="sr-only"
        @change="onPickerChange"
      />
    </div>

    <ul
      v-if="lastErrors.length > 0"
      class="space-y-1 text-xs text-danger"
      role="alert"
    >
      <li v-for="(err, i) in lastErrors" :key="i">
        {{ err.file.name }} — {{ err.reason }}
      </li>
    </ul>
  </div>
</template>
