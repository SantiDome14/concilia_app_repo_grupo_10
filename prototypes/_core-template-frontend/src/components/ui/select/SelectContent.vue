<script setup lang="ts">
import { computed } from 'vue';
import {
  SelectContent,
  type SelectContentEmits,
  type SelectContentProps,
  SelectPortal,
  SelectViewport,
  useForwardPropsEmits,
} from 'reka-ui';
import { cn } from '@/lib/cn';
import SelectScrollUpButton from './SelectScrollUpButton.vue';
import SelectScrollDownButton from './SelectScrollDownButton.vue';

interface Props extends SelectContentProps {
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  position: 'popper',
});

const emits = defineEmits<SelectContentEmits>();

const delegatedProps = computed(() => {
  const { class: _ignored, ...rest } = props;
  void _ignored;
  return rest;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <SelectPortal>
    <SelectContent
      v-bind="forwarded"
      :class="
        cn(
          'relative z-[9999] max-h-[--reka-select-content-available-height] min-w-[8rem] overflow-hidden rounded-md border border-b-2 bg-card-2 text-t-1 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          props.position === 'popper'
            && 'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          props.class,
        )
      "
    >
      <SelectScrollUpButton />
      <SelectViewport
        :class="
          cn(
            'p-1',
            props.position === 'popper'
              && 'h-[--reka-select-trigger-height] w-full min-w-[--reka-select-trigger-width]',
          )
        "
      >
        <slot />
      </SelectViewport>
      <SelectScrollDownButton />
    </SelectContent>
  </SelectPortal>
</template>
