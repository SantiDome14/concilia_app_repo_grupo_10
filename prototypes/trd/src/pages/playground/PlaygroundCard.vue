<script setup lang="ts">
// ════════════════════════════════════════════════════════════════════
// PlaygroundCard — wrapper for showcasing a component variant
// ────────────────────────────────────────────────────────────────────
// Renders a card with a title, optional description, the live demo
// (default slot), and optional code snippet (#code slot) below.
// Used exclusively by the Playground pages — not part of the public
// component catalog.
// ════════════════════════════════════════════════════════════════════

defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <article class="space-y-3 rounded-lg border border-b-2 bg-card p-4">
    <header class="space-y-1">
      <h3 class="text-sm font-bold text-t-1">{{ title }}</h3>
      <p v-if="description" class="text-xs text-t-3">{{ description }}</p>
    </header>
    <div class="rounded-md border border-b-1 bg-bg p-4">
      <slot />
    </div>
    <details
      v-if="$slots.code"
      class="text-xs text-t-3"
    >
      <summary class="cursor-pointer font-semibold uppercase tracking-wider text-[10px] text-t-4 hover:text-t-2">
        Snippet
      </summary>
      <pre class="mt-2 overflow-x-auto rounded-md border border-b-1 bg-card-2 p-3 text-[11px] leading-relaxed text-t-2"><slot name="code" /></pre>
    </details>
  </article>
</template>
