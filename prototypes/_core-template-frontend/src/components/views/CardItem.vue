<script setup lang="ts">
import { computed, onMounted, useSlots } from 'vue';
import { cn } from '@/lib/cn';

// ════════════════════════════════════════════════════════════════════
// <CardItem> — three-zone responsive card (Tarjetas / Tablero)
// ────────────────────────────────────────────────────────────────────
// Mandatory zones in canonical order:
//   - header: id + title + status badges
//   - body:   2-4 key-value summary
//   - footer: timestamp + per-row actions trigger
//
// Severity (optional) applies a 3px colored left border using
// design tokens from core-theming (no hardcoded colors):
//   critical → var(--danger)
//   high     → var(--warning)
//   medium   → var(--info)
//   low      → var(--t-3)
//
// Accessibility: role="button", tabindex=0, Enter/Space → emit click.
// Footer actions must stopPropagation in their own handlers so they
// do not trigger the card-level click.
// ════════════════════════════════════════════════════════════════════

export type Severity = 'critical' | 'high' | 'medium' | 'low';

interface Props {
  record: Record<string, unknown>;
  severity?: Severity;
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  severity: undefined,
  class: '',
});

const emit = defineEmits<{
  click: [record: Record<string, unknown>];
}>();

const slots = useSlots();

const SEVERITY_BORDER: Record<Severity, string> = {
  critical: 'border-l-[3px] border-l-[hsl(var(--danger))]',
  high: 'border-l-[3px] border-l-[hsl(var(--warning))]',
  medium: 'border-l-[3px] border-l-[hsl(var(--info))]',
  low: 'border-l-[3px] border-l-[hsl(var(--t-3))]',
};

const severityClass = computed(() =>
  props.severity ? SEVERITY_BORDER[props.severity] : '',
);

function handleClick(): void {
  emit('click', props.record);
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    handleClick();
  }
}

onMounted(() => {
  if (import.meta.env.DEV) {
    if (!slots.header) console.warn('<CardItem>: missing required "header" slot');
    if (!slots.body) console.warn('<CardItem>: missing required "body" slot');
    if (!slots.footer) console.warn('<CardItem>: missing required "footer" slot');
  }
});
</script>

<template>
  <div
    role="button"
    tabindex="0"
    :class="
      cn(
        'flex min-h-[180px] cursor-pointer flex-col rounded-lg border border-b-1 bg-card-2 transition-colors hover:border-b-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        severityClass,
        props.class,
      )
    "
    @click="handleClick"
    @keydown="handleKeydown"
  >
    <div class="flex items-start justify-between gap-2 border-b border-b-1 p-3">
      <slot name="header" />
    </div>
    <div class="flex-1 p-3 text-sm">
      <slot name="body" />
    </div>
    <div
      class="flex items-center justify-between gap-2 border-t border-b-1 p-3 text-xs text-t-3"
    >
      <slot name="footer" />
    </div>
  </div>
</template>
