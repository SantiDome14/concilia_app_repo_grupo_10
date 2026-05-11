<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Sidebar from './Sidebar.vue';
import Topbar from './Topbar.vue';

// ════════════════════════════════════════════════════════════════════
// AppShell
// ────────────────────────────────────────────────────────────────────
// Wraps authenticated routes with Sidebar + Topbar + Main.
// Pages with meta.layout === 'blank' (Login, NotFound) skip the shell.
// ════════════════════════════════════════════════════════════════════

const route = useRoute();
const useShell = computed(() => route.meta.layout !== 'blank');
</script>

<template>
  <div v-if="useShell" class="flex min-h-screen">
    <Sidebar />
    <div class="ml-[200px] flex flex-1 flex-col transition-[margin] duration-200 [body.sb-collapsed_&]:ml-[60px]">
      <Topbar />
      <main class="px-[22px] pb-9 pt-[22px]">
        <slot />
      </main>
    </div>
  </div>
  <div v-else>
    <slot />
  </div>
</template>
