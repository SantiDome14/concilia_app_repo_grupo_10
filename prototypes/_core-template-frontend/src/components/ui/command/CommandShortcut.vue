<script setup lang="ts">
import { cn } from '@/lib/cn';

interface Props {
  class?: string;
}

const props = withDefaults(defineProps<Props>(), { class: '' });
</script>

<template>
  <span :class="cn('ml-auto text-xs tracking-widest text-t-4', props.class)">
    <slot />
  </span>
</template>
