<script setup lang="ts">
import { cn } from '@/lib/cn';

interface Props {
  class?: string;
}

const props = withDefaults(defineProps<Props>(), { class: '' });
</script>

<template>
  <div :class="cn('py-6 text-center text-sm text-t-3', props.class)">
    <slot />
  </div>
</template>
