<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

// ════════════════════════════════════════════════════════════════════
// Topbar
// ────────────────────────────────────────────────────────────────────
// Breadcrumb derived from the current route's meta:
//   - With block:    "Bloque 1 / Módulo A"
//   - Without block: "Home" (standalone label)
//
// The app brand ("APP · Ardua") intentionally lives ONLY in the
// Sidebar — not in the topbar — to avoid redundancy.
// ════════════════════════════════════════════════════════════════════

const route = useRoute();

const block = computed(() => (route.meta.block as string | undefined) ?? '');
const label = computed(() => (route.meta.breadcrumb as string | undefined) ?? '');
</script>

<template>
  <div
    class="sticky top-0 z-40 flex h-[50px] items-center border-b border-b-1 bg-surf px-[22px]"
  >
    <div class="flex items-center gap-1.5 text-[13px]">
      <template v-if="block">
        <span class="text-t-4">{{ block }}</span>
        <span class="text-t-4">/</span>
        <span class="font-semibold text-t-2">{{ label }}</span>
      </template>
      <template v-else>
        <span class="font-semibold text-t-2">{{ label }}</span>
      </template>
    </div>
  </div>
</template>
