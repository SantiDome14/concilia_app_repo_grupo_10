<script setup lang="ts">
import { computed } from 'vue';
import {
  SelectScrollDownButton,
  type SelectScrollDownButtonProps,
  useForwardProps,
} from 'reka-ui';
import { ChevronDown } from 'lucide-vue-next';
import { cn } from '@/lib/cn';

interface Props extends SelectScrollDownButtonProps {
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
  <SelectScrollDownButton
    v-bind="forwarded"
    :class="cn('flex cursor-default items-center justify-center py-1 text-t-3', props.class)"
  >
    <ChevronDown class="h-4 w-4" />
  </SelectScrollDownButton>
</template>
