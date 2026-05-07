<script setup lang="ts">
import { computed } from 'vue';
import { DialogTitle, type DialogTitleProps, useForwardProps } from 'reka-ui';
import { cn } from '@/lib/cn';

interface Props extends DialogTitleProps {
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
  <DialogTitle
    v-bind="forwarded"
    :class="cn('text-base font-semibold leading-none tracking-tight text-t-1', props.class)"
  >
    <slot />
  </DialogTitle>
</template>
