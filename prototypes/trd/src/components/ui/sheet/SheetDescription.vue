<script setup lang="ts">
import { computed } from 'vue';
import { DialogDescription, type DialogDescriptionProps, useForwardProps } from 'reka-ui';
import { cn } from '@/lib/cn';

interface Props extends DialogDescriptionProps {
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
  <DialogDescription v-bind="forwarded" :class="cn('text-sm text-t-3', props.class)">
    <slot />
  </DialogDescription>
</template>
