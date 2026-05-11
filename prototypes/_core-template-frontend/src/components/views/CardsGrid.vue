<script setup lang="ts">
import { cn } from '@/lib/cn';

// ════════════════════════════════════════════════════════════════════
// <CardsGrid> — responsive grid container for <CardItem>
// ────────────────────────────────────────────────────────────────────
// Renders a CSS grid with `repeat(auto-fill, minmax(290px, 1fr))`
// so cards reflow to fill the available width. Slot-only — the page
// composes the cards inside.
// ════════════════════════════════════════════════════════════════════

interface Props {
  id?: string;
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  id: undefined,
  class: '',
});
</script>

<template>
  <div
    :id="props.id"
    :class="
      cn(
        'grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-3',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
