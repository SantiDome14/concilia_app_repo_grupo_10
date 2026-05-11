<script setup lang="ts">
import { computed } from 'vue';
import { SelectSeparator, type SelectSeparatorProps, useForwardProps } from 'reka-ui';
import { cn } from '@/lib/cn';

interface Props extends SelectSeparatorProps {
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
  <SelectSeparator v-bind="forwarded" :class="cn('-mx-1 my-1 h-px bg-b-2', props.class)" />
</template>
