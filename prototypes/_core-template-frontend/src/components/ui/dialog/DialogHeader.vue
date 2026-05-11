<script setup lang="ts">
import { cn } from '@/lib/cn';

interface Props {
  class?: string;
}

const props = withDefaults(defineProps<Props>(), { class: '' });
</script>

<template>
  <div :class="cn('flex flex-col gap-1.5 text-left', props.class)">
    <slot />
  </div>
</template>
