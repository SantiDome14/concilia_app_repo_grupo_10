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
        'block rounded-md bg-gradient-to-r from-card-2 via-[#242424] to-card-2 bg-[length:200%_100%] animate-[sk-shim_1.4s_ease-in-out_infinite]',
        props.class,
      )
    "
  />
</template>

<style>
@keyframes sk-shim {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
