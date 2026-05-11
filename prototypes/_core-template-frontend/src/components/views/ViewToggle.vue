<script setup lang="ts">
import { computed } from 'vue';
import { Columns3, LayoutGrid, List } from 'lucide-vue-next';
import { cn } from '@/lib/cn';

// ════════════════════════════════════════════════════════════════════
// <ViewToggle> — module view switcher (Lista / Tarjetas / Tablero)
// ────────────────────────────────────────────────────────────────────
// Renders an icon-only button group with one button per declared view.
// Hidden entirely when the module declares only one view.
//
// Lives in the L1 page-header actions area, between <Segmenter>
// and the Main CTA. The page is responsible for placement.
// ════════════════════════════════════════════════════════════════════

export type ViewMode = 'list' | 'cards' | 'kanban';

interface Props {
  modelValue: ViewMode;
  views: ViewMode[];
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  class: '',
});

const emit = defineEmits<{
  'update:modelValue': [value: ViewMode];
}>();

const VIEW_META: Record<ViewMode, { label: string; icon: typeof List }> = {
  list: { label: 'Lista', icon: List },
  cards: { label: 'Tarjetas', icon: LayoutGrid },
  kanban: { label: 'Tablero', icon: Columns3 },
};

const visible = computed(() => props.views.length > 1);

function select(view: ViewMode): void {
  if (view === props.modelValue) return;
  emit('update:modelValue', view);
}
</script>

<template>
  <div
    v-if="visible"
    role="group"
    aria-label="Vista"
    :class="
      cn(
        'inline-flex items-center gap-2 rounded-md border border-b-2 bg-card-2 p-1',
        props.class,
      )
    "
  >
    <button
      v-for="view in props.views"
      :key="view"
      type="button"
      :title="VIEW_META[view].label"
      :aria-label="VIEW_META[view].label"
      :aria-pressed="view === props.modelValue"
      :class="
        cn(
          'inline-flex h-7 w-7 items-center justify-center rounded-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
          view === props.modelValue
            ? 'bg-brand-bg text-brand'
            : 'text-t-3 hover:bg-card hover:text-t-1',
        )
      "
      @click="select(view)"
    >
      <component
        :is="VIEW_META[view].icon"
        class="h-4 w-4"
        aria-hidden="true"
      />
    </button>
  </div>
</template>
