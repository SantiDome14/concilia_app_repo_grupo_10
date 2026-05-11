<script setup lang="ts">
import { computed, ref } from 'vue';
import { cn } from '@/lib/cn';
import type { KanbanRecord, KanbanState } from '@/types/kanban';
import { kanbanSort } from '@/lib/kanban/transitions';

// ════════════════════════════════════════════════════════════════════
// <KanbanColumn> — single state column for <KanbanBoard>
// ────────────────────────────────────────────────────────────────────
// Responsibilities:
//   - render header (column_label || label) + count chip
//   - sort records via kanbanSort (severity-first, recency tiebreak)
//   - host the drop target wiring; visual feedback is driven by the
//     parent which calls `setDropFeedback('valid' | 'invalid' | null)`
//     during dragover (the parent owns the transitions axis and is
//     the only place that can run evaluateDrop)
//
// Drop UX: the column emits `dragover` and `drop` events; visual
// outline classes are applied based on the `dropFeedback` prop set
// by the board.
// ════════════════════════════════════════════════════════════════════

interface Props {
  state: KanbanState;
  records: KanbanRecord[];
  axisReadOnly: boolean;
  /** Visual outline state, driven by the parent during drag. */
  dropFeedback?: 'valid' | 'invalid' | null;
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  dropFeedback: null,
  class: '',
});

const emit = defineEmits<{
  dragover: [event: DragEvent, state: KanbanState];
  dragleave: [event: DragEvent, state: KanbanState];
  drop: [event: DragEvent, state: KanbanState];
}>();

/** Sorted view of the column's records — severity first, then recency. */
const sortedRecords = computed(() => [...props.records].sort(kanbanSort));

const headerLabel = computed(() => props.state.column_label ?? props.state.label);

/** Internal flag toggled to add a subtle background when dragged-over. */
const isOver = ref(false);

const outlineClass = computed(() => {
  if (props.dropFeedback === 'valid') return 'outline-dashed outline-2 outline-success';
  if (props.dropFeedback === 'invalid') return 'outline-dashed outline-2 outline-danger';
  return '';
});

function handleDragOver(event: DragEvent): void {
  // preventDefault lets the browser fire the subsequent `drop` event.
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = props.axisReadOnly ? 'none' : 'move';
  }
  isOver.value = true;
  emit('dragover', event, props.state);
}

function handleDragLeave(event: DragEvent): void {
  isOver.value = false;
  emit('dragleave', event, props.state);
}

function handleDrop(event: DragEvent): void {
  event.preventDefault();
  isOver.value = false;
  emit('drop', event, props.state);
}
</script>

<template>
  <section
    :data-state-id="props.state.id"
    :data-terminal="props.state.terminal ? 'true' : 'false'"
    :class="
      cn(
        'flex h-full min-w-[280px] flex-1 flex-col rounded-lg bg-card transition-colors',
        isOver ? 'bg-card-2' : '',
        outlineClass,
        props.class,
      )
    "
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <header class="flex items-center justify-between gap-2 border-b border-b-1 px-3 py-2">
      <h3 class="text-[10px] font-bold uppercase tracking-wider text-t-3">
        {{ headerLabel }}
      </h3>
      <span
        class="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-card-2 px-1.5 text-[10px] font-semibold text-t-2"
        data-testid="kanban-column-count"
      >
        {{ sortedRecords.length }}
      </span>
    </header>

    <div class="flex-1 space-y-2 overflow-y-auto p-2">
      <slot v-for="record in sortedRecords" :key="record.id" name="card" :record="record" />
    </div>
  </section>
</template>
