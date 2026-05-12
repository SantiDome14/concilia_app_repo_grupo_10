<script setup lang="ts">
import { computed, ref } from 'vue';
import { cn } from '@/lib/cn';
import type {
  KanbanAxis,
  KanbanRecord,
  KanbanState,
  KanbanTransitionMode,
} from '@/types/kanban';
import { evaluateDrop } from '@/lib/kanban/transitions';
import KanbanColumn from './KanbanColumn.vue';
import KanbanCard from './KanbanCard.vue';

// ════════════════════════════════════════════════════════════════════
// <KanbanBoard> — N-column board driven by a declared axis
// ────────────────────────────────────────────────────────────────────
// Responsibilities owned here:
//   1. Render one <KanbanColumn> per state in axis.states (asc order).
//   2. Render the active-axis header + inline axis tabs (one chip per
//      axis, with a "read-only" suffix where applicable) when more
//      than one axis is declared on the page. Click a tab → emit
//      `update:axisId` with the new axis id. The legacy "Cambiar eje"
//      CTA + `change-axis` event is kept as a back-compat path that
//      pages MAY use to open a richer picker dialog (per
//      `<KanbanAxisDialog>`); when the page does not listen, the tabs
//      are the only switcher.
//   3. Bind native HTML5 drag/drop events; on drop, run evaluateDrop
//      and emit the `transition` event with the canonical payload.
//   4. Render an empty state when `axis` is null.
//
// Side-effects (toasts, telemetry, modal opens) are intentionally NOT
// owned here — the parent page consumes the `transition` event and
// dispatches them so the component remains framework-agnostic and
// easily testable. The parent wires this up alongside the manifest
// composite-dialog hook (`useManifestDialog().openComposite(...)`)
// when `mode === 'modal'`.
// ════════════════════════════════════════════════════════════════════

export type KanbanTransitionPayload = {
  recordId: string;
  fromState: string;
  toState: string;
  mode: KanbanTransitionMode;
  axisId: string;
};

interface Props {
  axis: KanbanAxis | null;
  axes?: Record<string, KanbanAxis>;
  records: KanbanRecord[];
  /** Title rendered in the board header above the columns. */
  title?: string;
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  axes: undefined,
  title: undefined,
  class: '',
});

const emit = defineEmits<{
  transition: [payload: KanbanTransitionPayload];
  'change-axis': [];
  'update:axisId': [axisId: string];
}>();

// ────────────────────────────────────────────────────────────────────
// Column ordering
// ────────────────────────────────────────────────────────────────────

const orderedStates = computed<KanbanState[]>(() => {
  if (!props.axis) return [];
  return [...props.axis.states].sort((a, b) => a.order - b.order);
});

// ────────────────────────────────────────────────────────────────────
// Field resolution — supports dot-paths so axes like `fin.imput` work
// ────────────────────────────────────────────────────────────────────

function resolveStateField(record: KanbanRecord, path: string): string | undefined {
  const parts = path.split('.');
  let cursor: unknown = record;
  for (const key of parts) {
    if (cursor && typeof cursor === 'object' && key in (cursor as Record<string, unknown>)) {
      cursor = (cursor as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return typeof cursor === 'string' ? cursor : undefined;
}

// ────────────────────────────────────────────────────────────────────
// Records bucketed by state id — driven by axis.state_field
// ────────────────────────────────────────────────────────────────────

const recordsByState = computed<Record<string, KanbanRecord[]>>(() => {
  const buckets: Record<string, KanbanRecord[]> = {};
  if (!props.axis) return buckets;
  for (const state of props.axis.states) buckets[state.id] = [];
  for (const record of props.records) {
    const stateId = resolveStateField(record, props.axis.state_field);
    if (stateId && stateId in buckets) {
      buckets[stateId].push(record);
    }
  }
  return buckets;
});

// ────────────────────────────────────────────────────────────────────
// Drag tracking — feedback per column during dragover
// ────────────────────────────────────────────────────────────────────

const draggingRecord = ref<KanbanRecord | null>(null);
const dropFeedback = ref<Record<string, 'valid' | 'invalid' | null>>({});

function dropFeedbackFor(stateId: string): 'valid' | 'invalid' | null {
  return dropFeedback.value[stateId] ?? null;
}

function handleCardDragStart(record: KanbanRecord): void {
  draggingRecord.value = record;
}

function handleCardDragEnd(): void {
  draggingRecord.value = null;
  dropFeedback.value = {};
}

function handleColumnDragOver(_event: DragEvent, state: KanbanState): void {
  if (!props.axis || !draggingRecord.value) return;
  const fromState = resolveStateField(draggingRecord.value, props.axis.state_field);
  if (!fromState) return;
  const result = evaluateDrop(props.axis, fromState, state.id);
  // If from === to, surface neutral feedback (no outline) — dropping a
  // card on its own column is a no-op, not a blocked transition.
  if (fromState === state.id) {
    dropFeedback.value = { ...dropFeedback.value, [state.id]: null };
    return;
  }
  dropFeedback.value = {
    ...dropFeedback.value,
    [state.id]: result.allowed ? 'valid' : 'invalid',
  };
}

function handleColumnDragLeave(_event: DragEvent, state: KanbanState): void {
  if (dropFeedback.value[state.id]) {
    dropFeedback.value = { ...dropFeedback.value, [state.id]: null };
  }
}

function handleColumnDrop(event: DragEvent, state: KanbanState): void {
  if (!props.axis) return;
  const recordId = event.dataTransfer?.getData('application/x-kanban-card')
    || event.dataTransfer?.getData('text/plain')
    || draggingRecord.value?.id;
  if (!recordId) return;

  const record = props.records.find((r) => r.id === recordId) ?? draggingRecord.value;
  if (!record) return;

  const fromState = resolveStateField(record, props.axis.state_field);
  if (!fromState || fromState === state.id) {
    handleCardDragEnd();
    return;
  }

  const result = evaluateDrop(props.axis, fromState, state.id);

  emit('transition', {
    recordId: record.id,
    fromState,
    toState: state.id,
    mode: result.mode,
    axisId: props.axis.axis_id,
  });

  handleCardDragEnd();
}

// ────────────────────────────────────────────────────────────────────
// Header — axis tabs + active label
// ────────────────────────────────────────────────────────────────────

const axisEntries = computed<KanbanAxis[]>(() => {
  if (!props.axes) return [];
  return Object.values(props.axes);
});

const showAxisTabs = computed(() => axisEntries.value.length > 1);

function selectAxis(axisId: string): void {
  if (axisId === props.axis?.axis_id) return;
  emit('update:axisId', axisId);
}
</script>

<template>
  <div :class="cn('flex h-full flex-col gap-3', props.class)">
    <header class="flex flex-wrap items-center gap-3">
      <!-- Multi-axis: a small "Ejes" label introduces the tab strip;
           the tab strip itself is the active-axis indicator, so the
           "Organizando por:" pointer is dropped. -->
      <span
        v-if="showAxisTabs"
        class="text-[10px] font-bold uppercase tracking-wider text-t-3"
      >
        Ejes
      </span>
      <nav
        v-if="showAxisTabs"
        role="tablist"
        aria-label="Ejes del Tablero"
        class="flex flex-wrap items-center gap-1 rounded-lg border border-b-1 bg-card-2 p-1"
        data-testid="kanban-axis-tabs"
      >
        <button
          v-for="entry in axisEntries"
          :key="entry.axis_id"
          type="button"
          role="tab"
          :aria-selected="props.axis?.axis_id === entry.axis_id"
          :data-axis-id="entry.axis_id"
          :data-testid="`kanban-axis-tab-${entry.axis_id}`"
          :class="
            cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-t-3 transition-colors hover:text-t-1',
              props.axis?.axis_id === entry.axis_id
                ? 'bg-brand-bg font-semibold text-brand'
                : 'hover:bg-card',
            )
          "
          @click="selectAxis(entry.axis_id)"
        >
          <span class="truncate">{{ entry.label }}</span>
          <span
            v-if="entry.read_only"
            class="rounded bg-card px-1 py-px text-[9px] font-bold uppercase tracking-wider text-t-4"
          >
            RO
          </span>
        </button>
      </nav>

      <!-- Single-axis fallback: no tabs to switch between, so we keep
           the textual "Organizado por:" pointer for the user. -->
      <div v-else-if="props.axis" class="flex flex-col">
        <p v-if="props.title" class="text-[10px] font-bold uppercase tracking-wider text-t-3">
          {{ props.title }}
        </p>
        <p class="text-sm font-semibold text-t-1">
          Organizado por: {{ props.axis.label }}
        </p>
      </div>
    </header>

    <div
      v-if="!props.axis"
      class="flex flex-1 items-center justify-center rounded-lg border border-dashed border-b-1 p-6 text-center text-sm text-t-3"
      data-testid="kanban-no-axis"
    >
      Seleccioná un eje para organizar el Tablero.
    </div>

    <div v-else class="flex flex-1 gap-3 overflow-x-auto pb-2" data-testid="kanban-columns">
      <KanbanColumn
        v-for="state in orderedStates"
        :key="state.id"
        :state="state"
        :records="recordsByState[state.id] ?? []"
        :axis-read-only="Boolean(props.axis.read_only)"
        :drop-feedback="dropFeedbackFor(state.id)"
        @dragover="handleColumnDragOver"
        @dragleave="handleColumnDragLeave"
        @drop="handleColumnDrop"
      >
        <template #card="{ record }">
          <KanbanCard
            :record="record"
            :draggable="!props.axis.read_only"
            :terminal="Boolean(state.terminal)"
            :severity="record.severity"
            @dragstart="handleCardDragStart"
            @dragend="handleCardDragEnd"
          >
            <slot name="card" :record="record" :mode="'kanban' as const" />
          </KanbanCard>
        </template>
      </KanbanColumn>
    </div>
  </div>
</template>
