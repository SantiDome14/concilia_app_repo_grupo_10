<script setup lang="ts">
import TopBar from '@/components/TopBar.vue';
import Sidebar from '@/components/Sidebar.vue';
</script>

<template>
  <TopBar />
  <Sidebar />

  <main
    class="min-h-screen"
    :style="{
      paddingTop: 'var(--layout-topbar-h)',
      paddingLeft: 'var(--layout-sidebar-w)',
    }"
  >
    <slot />
  </main>
</template>
