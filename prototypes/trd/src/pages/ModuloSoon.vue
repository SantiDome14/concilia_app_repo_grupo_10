<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { Rocket } from 'lucide-vue-next';
import EmptyState from '@/components/feedback/EmptyState.vue';

// ════════════════════════════════════════════════════════════════════
// ModuloSoon — placeholder for modules registered in the IA but not
// yet implemented. The route's `meta.breadcrumb` drives the displayed
// module name. Used by Bots and Lotes in v1; future modules can
// route through this same component while they wait for an
// implementation.
// ════════════════════════════════════════════════════════════════════

const route = useRoute();
const label = computed(
  () => (route.meta.breadcrumb as string | undefined) ?? 'Este módulo',
);
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <div class="flex items-baseline gap-2.5 border-b border-b-1 px-[22px] py-[18px]">
      <h1 class="text-2xl font-bold tracking-tight text-t-1">{{ label }}</h1>
      <span
        class="rounded border border-b-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-t-4"
      >
        Soon
      </span>
    </div>
    <div class="flex-1">
      <EmptyState
        :icon="Rocket"
        title="Próximamente"
        :description="`El módulo ${label} estará disponible en una próxima entrega.`"
      />
    </div>
  </div>
</template>
