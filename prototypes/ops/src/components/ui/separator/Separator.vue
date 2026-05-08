<script setup lang="ts">
import { Separator, type SeparatorProps } from 'reka-ui';
import { cn } from '@/lib/cn';

interface Props extends SeparatorProps {
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  orientation: 'horizontal',
  decorative: true,
  class: '',
});
</script>

<template>
  <Separator
    :orientation="props.orientation"
    :decorative="props.decorative"
    :class="
      cn(
        'shrink-0 bg-b-2',
        props.orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        props.class,
      )
    "
  />
</template>
