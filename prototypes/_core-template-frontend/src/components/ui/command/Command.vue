<script setup lang="ts">
import { computed } from 'vue';
import {
  ListboxRoot,
  type ListboxRootEmits,
  type ListboxRootProps,
  useForwardPropsEmits,
} from 'reka-ui';
import { cn } from '@/lib/cn';

interface Props extends /* @vue-ignore */ ListboxRootProps {
  class?: string;
}

const props = defineProps<Props>();
const emits = defineEmits<ListboxRootEmits>();

const delegatedProps = computed(() => {
  const { class: _ignored, ...rest } = props;
  void _ignored;
  return rest;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <ListboxRoot
    v-bind="forwarded"
    :class="
      cn(
        'flex h-full w-full flex-col overflow-hidden rounded-md bg-card-2 text-t-1',
        props.class,
      )
    "
  >
    <slot />
  </ListboxRoot>
</template>
