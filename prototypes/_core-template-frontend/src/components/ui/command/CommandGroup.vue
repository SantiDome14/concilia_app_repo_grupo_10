<script setup lang="ts">
import { computed } from 'vue';
import { ListboxGroup, ListboxGroupLabel, type ListboxGroupProps, useForwardProps } from 'reka-ui';
import { cn } from '@/lib/cn';

interface Props extends ListboxGroupProps {
  class?: string;
  heading?: string;
}

const props = defineProps<Props>();

const delegatedProps = computed(() => {
  const { class: _ignored, heading: _heading, ...rest } = props;
  void _ignored;
  void _heading;
  return rest;
});

const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <ListboxGroup
    v-bind="forwarded"
    :class="cn('overflow-hidden p-1 text-t-1', props.class)"
  >
    <ListboxGroupLabel
      v-if="props.heading"
      class="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-t-3"
    >
      {{ props.heading }}
    </ListboxGroupLabel>
    <slot />
  </ListboxGroup>
</template>
