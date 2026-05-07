<script setup lang="ts">
import { computed } from 'vue';
import {
  DialogClose,
  DialogContent,
  type DialogContentEmits,
  type DialogContentProps,
  DialogPortal,
  useForwardPropsEmits,
} from 'reka-ui';
import { X } from 'lucide-vue-next';
import { cn } from '@/lib/cn';
import SheetOverlay from './SheetOverlay.vue';
import { sheetVariants, type SheetVariants } from '.';

interface Props extends DialogContentProps {
  class?: string;
  side?: SheetVariants['side'];
}

const props = withDefaults(defineProps<Props>(), {
  side: 'right',
});

const emits = defineEmits<DialogContentEmits>();

const delegatedProps = computed(() => {
  const { class: _ignored, side: _side, ...rest } = props;
  void _ignored;
  void _side;
  return rest;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <DialogPortal>
    <SheetOverlay />
    <DialogContent
      v-bind="forwarded"
      :class="cn(sheetVariants({ side: props.side }), props.class)"
    >
      <slot />
      <DialogClose
        class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-bg transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-brand disabled:pointer-events-none"
      >
        <X class="h-4 w-4" />
        <span class="sr-only">Close</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
