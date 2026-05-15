<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '@/lib/cn';
import type { KanbanRecord } from '@/types/kanban';

// ════════════════════════════════════════════════════════════════════
// <KanbanCard> — draggable card surface for <KanbanColumn>
// ────────────────────────────────────────────────────────────────────
// The card body is rendered by the caller via the default slot
// (typically a <CardItem>) so Tarjetas and Tablero share the same
// `renderCard(record, mode)` per the core-data-tables contract.
//
// Drag wiring:
//   - draggable={!terminal && props.draggable}
//   - dragstart sets `text/plain` to record.id and a custom mime type
//     `application/x-kanban-card` to disambiguate from text drops.
//   - terminal cards are visually faded and not draggable.
//
// Severity is rendered as a 3px left border using the same hsl tokens
// as <CardItem>; this is the glanceable layer per core-data-tables.
// ════════════════════════════════════════════════════════════════════

type Severity = NonNullable<KanbanRecord['severity']>;

interface Props {
  record: KanbanRecord;
  /** Whether the column itself permits drag (false when terminal column). */
  draggable: boolean;
  severity?: Severity;
  /** Marks terminal column origin; visually fades and disables drag. */
  terminal?: boolean;
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  severity: undefined,
  terminal: false,
  class: '',
});

const emit = defineEmits<{
  dragstart: [record: KanbanRecord, event: DragEvent];
  dragend: [record: KanbanRecord, event: DragEvent];
}>();

const SEVERITY_BORDER: Record<Severity, string> = {
  critical: 'border-l-[3px] border-l-[hsl(var(--danger))]',
  high: 'border-l-[3px] border-l-[hsl(var(--warning))]',
  medium: 'border-l-[3px] border-l-[hsl(var(--info))]',
  low: 'border-l-[3px] border-l-[hsl(var(--t-3))]',
};

const severityClass = computed(() =>
  props.severity ? SEVERITY_BORDER[props.severity] : '',
);

const isDraggable = computed(() => props.draggable && !props.terminal);

function handleDragStart(event: DragEvent): void {
  if (!isDraggable.value) {
    event.preventDefault();
    return;
  }
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', props.record.id);
    event.dataTransfer.setData('application/x-kanban-card', props.record.id);
    event.dataTransfer.effectAllowed = 'move';
  }
  emit('dragstart', props.record, event);
}

function handleDragEnd(event: DragEvent): void {
  emit('dragend', props.record, event);
}
</script>

<template>
  <div
    :draggable="isDraggable"
    :data-record-id="props.record.id"
    :data-terminal="props.terminal ? 'true' : 'false'"
    :class="
      cn(
        'rounded-lg border border-b-1 bg-card-2 transition-colors',
        severityClass,
        isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-not-allowed opacity-70',
        props.class,
      )
    "
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
  >
    <slot />
  </div>
</template>
