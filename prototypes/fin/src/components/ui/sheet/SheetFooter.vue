<script setup lang="ts">
import { cn } from '@/lib/cn';

interface Props {
  class?: string;
}

const props = withDefaults(defineProps<Props>(), { class: '' });
</script>

<template>
  <div
    :class="
      cn(
        'flex flex-col-reverse gap-2 border-t border-b-2 pt-4 sm:flex-row sm:justify-end sm:gap-2',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
