<script setup lang="ts">
import { computed } from 'vue';
import {
  SelectScrollUpButton,
  type SelectScrollUpButtonProps,
  useForwardProps,
} from 'reka-ui';
import { ChevronUp } from 'lucide-vue-next';
import { cn } from '@/lib/cn';

interface Props extends SelectScrollUpButtonProps {
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
  <SelectScrollUpButton
    v-bind="forwarded"
    :class="cn('flex cursor-default items-center justify-center py-1 text-t-3', props.class)"
  >
    <ChevronUp class="h-4 w-4" />
  </SelectScrollUpButton>
</template>
