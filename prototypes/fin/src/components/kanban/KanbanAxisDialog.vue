<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { cn } from '@/lib/cn';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { KanbanAxis } from '@/types/kanban';

// ════════════════════════════════════════════════════════════════════
// <KanbanAxisDialog> — axis picker for multi-axis kanban modules
// ────────────────────────────────────────────────────────────────────
// Renders one selectable card per declared axis. The chosen axis_id
// is emitted via `select`; persistence (sessionStorage) is owned by
// the page that hosts the dialog so the component stays pure UI.
//
// The dialog auto-pre-selects `activeAxisId` when present so the user
// re-opening via "Cambiar eje" lands on their current choice.
// ════════════════════════════════════════════════════════════════════

interface Props {
  open: boolean;
  axes: Record<string, KanbanAxis>;
  activeAxisId: string | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  select: [axisId: string];
}>();

const selectedAxisId = ref<string | null>(props.activeAxisId);

// Re-sync the local selection whenever the dialog re-opens or the
// active axis changes from outside.
watch(
  () => [props.open, props.activeAxisId] as const,
  ([open, activeId]) => {
    if (open) {
      selectedAxisId.value = activeId;
    }
  },
);

const axisEntries = computed(() =>
  Object.entries(props.axes).map(([key, axis]) => ({ key, axis })),
);

function selectAxis(axisId: string): void {
  selectedAxisId.value = axisId;
}

function handleConfirm(): void {
  if (!selectedAxisId.value) return;
  emit('select', selectedAxisId.value);
  emit('update:open', false);
}

function handleCancel(): void {
  emit('update:open', false);
}

function handleOpenChange(value: boolean): void {
  emit('update:open', value);
}

const confirmDisabled = computed(() => selectedAxisId.value === null);
</script>

<template>
  <Dialog :open="props.open" @update:open="handleOpenChange">
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>Elegí el eje del Tablero</DialogTitle>
        <DialogDescription>
          Cada eje agrupa los registros por una máquina de estados distinta.
        </DialogDescription>
      </DialogHeader>

      <ul class="flex flex-col gap-2" role="radiogroup" aria-label="Ejes disponibles">
        <li v-for="entry in axisEntries" :key="entry.key">
          <button
            type="button"
            role="radio"
            :aria-checked="selectedAxisId === entry.axis.axis_id"
            :data-axis-id="entry.axis.axis_id"
            :data-testid="`kanban-axis-card-${entry.axis.axis_id}`"
            :class="
              cn(
                'flex w-full flex-col gap-1 rounded-lg border border-b-1 bg-card-2 p-3 text-left transition-colors hover:border-b-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                selectedAxisId === entry.axis.axis_id ? 'border-brand ring-2 ring-brand' : '',
              )
            "
            @click="selectAxis(entry.axis.axis_id)"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-sm font-semibold text-t-1">{{ entry.axis.label }}</span>
              <span
                v-if="entry.axis.read_only"
                class="rounded bg-card px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-t-3"
                data-testid="kanban-axis-readonly-chip"
              >
                sólo lectura
              </span>
            </div>
            <p v-if="entry.axis.description" class="text-xs text-t-3">
              {{ entry.axis.description }}
            </p>
          </button>
        </li>
      </ul>

      <DialogFooter>
        <button
          type="button"
          class="rounded border border-b-1 px-3 py-1.5 text-sm text-t-2 hover:bg-card-2"
          data-testid="kanban-axis-cancel"
          @click="handleCancel"
        >
          Cancelar
        </button>
        <button
          type="button"
          :disabled="confirmDisabled"
          class="rounded bg-brand px-3 py-1.5 text-sm font-semibold text-bg disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="kanban-axis-confirm"
          @click="handleConfirm"
        >
          Confirmar
        </button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
