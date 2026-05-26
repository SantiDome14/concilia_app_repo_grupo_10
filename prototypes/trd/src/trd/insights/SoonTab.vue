<script setup lang="ts">
import type { Component } from 'vue';
import EmptyState from '@/components/feedback/EmptyState.vue';

// ════════════════════════════════════════════════════════════════════
// <SoonTab> — "Próximamente" placeholder for future Insights tabs
// ────────────────────────────────────────────────────────────────────
// Renders an EmptyState describing what the tab will eventually
// surface. Replace the component import in `Insights.vue` when the
// real implementation lands.
// ════════════════════════════════════════════════════════════════════

defineProps<{
  title: string;
  description: string;
  icon?: Component;
}>();
</script>

<template>
  <div class="flex flex-col gap-3" data-testid="insights-soon-tab">
    <EmptyState :title="title" :description="description" :icon="icon" />
    <p class="text-center text-xs font-bold uppercase tracking-wider text-t-4">
      Próximamente
    </p>
  </div>
</template>
