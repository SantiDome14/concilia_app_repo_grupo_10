<script setup lang="ts">
import { computed } from 'vue';
import { DialogOverlay, type DialogOverlayProps, useForwardProps } from 'reka-ui';
import { cn } from '@/lib/cn';

interface Props extends DialogOverlayProps {
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
  <DialogOverlay
    v-bind="forwarded"
    :class="
      cn(
        'fixed inset-0 z-[600] bg-black/75 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        props.class,
      )
    "
  />
</template>
