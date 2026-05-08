<script setup lang="ts">
import { Label, type LabelProps } from 'reka-ui';
import { cn } from '@/lib/cn';
import { labelVariants } from '.';

interface Props extends LabelProps {
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  class: '',
});
</script>

<template>
  <Label :for="props.for" :as-child="props.asChild" :class="cn(labelVariants(), props.class)">
    <slot />
  </Label>
</template>
