<script setup lang="ts">
import { Inbox } from 'lucide-vue-next';
import type { Component } from 'vue';

interface Props {
  title?: string;
  description?: string;
  icon?: Component;
}

withDefaults(defineProps<Props>(), {
  title: 'Sin resultados',
  description: '',
  icon: undefined,
});
</script>

<template>
  <div class="flex min-h-[400px] flex-col items-center justify-center gap-3.5 text-t-4">
    <div
      class="flex h-14 w-14 items-center justify-center rounded-2xl border border-b-2 bg-card"
    >
      <component :is="icon ?? Inbox" class="h-6 w-6" />
    </div>
    <div class="text-base font-bold text-t-3">{{ title }}</div>
    <div v-if="description" class="text-[13px] text-t-4">{{ description }}</div>
  </div>
</template>
