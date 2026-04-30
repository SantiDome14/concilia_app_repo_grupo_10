<script setup lang="ts">
import { computed } from 'vue';
import {
  SelectIcon,
  SelectTrigger,
  type SelectTriggerProps,
  useForwardProps,
} from 'reka-ui';
import { ChevronDown } from 'lucide-vue-next';
import { cn } from '@/lib/cn';

interface Props extends SelectTriggerProps {
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
  <SelectTrigger
    v-bind="forwarded"
    :class="
      cn(
        'flex h-9 w-full items-center justify-between rounded-md border border-b-3 bg-[#111] px-3 py-2 text-sm text-t-1 placeholder:text-t-4 focus-visible:border-info focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-t-4 [&>span]:line-clamp-1',
        props.class,
      )
    "
  >
    <slot />
    <SelectIcon as-child>
      <ChevronDown class="h-4 w-4 text-t-3 shrink-0" />
    </SelectIcon>
  </SelectTrigger>
</template>
