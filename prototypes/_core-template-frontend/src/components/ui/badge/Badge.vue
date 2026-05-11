<script setup lang="ts">
import { cn } from '@/lib/cn';
import { badgeVariants, type BadgeVariants } from '.';

interface Props {
  variant?: BadgeVariants['variant'];
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'neutral',
  class: '',
});
</script>

<template>
  <span :class="cn(badgeVariants({ variant: props.variant }), props.class)">
    <slot />
  </span>
</template>
