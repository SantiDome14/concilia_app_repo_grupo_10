<script setup lang="ts">
import { RouterView } from 'vue-router';
import { Toaster } from 'vue-sonner';
import DocsLayout from '@/layouts/DocsLayout.vue';
</script>

<template>
  <DocsLayout>
    <RouterView v-slot="{ Component, route }">
      <component :is="Component" :key="route.path" />
    </RouterView>
  </DocsLayout>
  <Toaster position="bottom-right" theme="dark" :duration="2500" rich-colors />
</template>
