<script setup lang="ts">
import { computed } from 'vue';
import { SelectLabel, type SelectLabelProps, useForwardProps } from 'reka-ui';
import { cn } from '@/lib/cn';

interface Props extends SelectLabelProps {
  class?: string;
}

const props = defineProps<Props>();

const delegatedProps = computed(() => {
  const { class: _ignored, ...rest } = props;
  void _ignored;
  return rest;
});

const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <SelectLabel
    v-bind="forwarded"
    :class="cn('px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-t-3', props.class)"
  >
    <slot />
  </SelectLabel>
</template>
