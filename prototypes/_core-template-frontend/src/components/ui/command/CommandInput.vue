<script setup lang="ts">
import { computed } from 'vue';
import { ListboxFilter, type ListboxFilterProps, useForwardProps } from 'reka-ui';
import { Search } from 'lucide-vue-next';
import { cn } from '@/lib/cn';

interface Props extends ListboxFilterProps {
  class?: string;
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
});

const delegatedProps = computed(() => {
  const { class: _ignored, placeholder: _placeholder, ...rest } = props;
  void _ignored;
  void _placeholder;
  return rest;
});

const forwarded = useForwardProps(delegatedProps);
</script>

<template>
  <div class="flex items-center border-b border-b-2 px-3" cmdk-input-wrapper>
    <Search class="mr-2 h-4 w-4 shrink-0 text-t-3" />
    <ListboxFilter
      v-bind="forwarded"
      :placeholder="props.placeholder"
      :class="
        cn(
          'flex h-10 w-full rounded-md bg-transparent py-3 text-sm text-t-1 outline-none placeholder:text-t-4 disabled:cursor-not-allowed disabled:opacity-50',
          props.class,
        )
      "
    />
  </div>
</template>
