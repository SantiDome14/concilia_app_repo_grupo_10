<script setup lang="ts">
import { computed, mergeProps, useAttrs } from 'vue';
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
import DialogOverlay from './DialogOverlay.vue';

const props = defineProps<Props>();

const emits = defineEmits<DialogContentEmits>();

// The wrapper's root is <DialogPortal>, which mounts a <Teleport>. Vue can't
// fall-through attrs onto a Teleport root, so we disable inheritance and
// forward $attrs (e.g. data-testid) onto the inner DOM-rooted DialogContent.
defineOptions({ inheritAttrs: false });

interface Props extends DialogContentProps {
  class?: string;
}

const attrs = useAttrs();

const delegatedProps = computed(() => {
  const { class: _ignored, ...rest } = props;
  void _ignored;
  return rest;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);

const bindings = computed(() => mergeProps(forwarded.value, attrs));
</script>

<template>
  <DialogPortal>
    <DialogOverlay />
    <DialogContent
      v-bind="bindings"
      :class="
        cn(
          'fixed left-1/2 top-1/2 z-[601] flex max-h-[80vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-hidden rounded-lg border border-b-2 bg-card p-6 text-t-1 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          props.class,
        )
      "
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
