<script setup lang="ts">
import { computed } from 'vue';
import { ListboxContent, type ListboxContentProps, useForwardProps } from 'reka-ui';
import { cn } from '@/lib/cn';

interface Props extends ListboxContentProps {
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
  <ListboxContent
    v-bind="forwarded"
    :class="cn('max-h-[300px] overflow-y-auto overflow-x-hidden', props.class)"
  >
    <div role="presentation">
      <slot />
    </div>
  </ListboxContent>
</template>
