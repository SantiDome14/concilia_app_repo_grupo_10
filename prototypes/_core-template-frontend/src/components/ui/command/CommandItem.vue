<script setup lang="ts">
import { computed } from 'vue';
import {
  ListboxItem,
  type ListboxItemEmits,
  type ListboxItemProps,
  useForwardPropsEmits,
} from 'reka-ui';
import { cn } from '@/lib/cn';

interface Props extends ListboxItemProps {
  class?: string;
}

const props = defineProps<Props>();
const emits = defineEmits<ListboxItemEmits>();

const delegatedProps = computed(() => {
  const { class: _ignored, ...rest } = props;
  void _ignored;
  return rest;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <ListboxItem
    v-bind="forwarded"
    :class="
      cn(
        'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm text-t-2 outline-none data-[highlighted]:bg-card data-[highlighted]:text-t-1 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        props.class,
      )
    "
  >
    <slot />
  </ListboxItem>
</template>
