<script setup lang="ts">
import { CheckboxIndicator, CheckboxRoot, type CheckboxRootEmits, type CheckboxRootProps } from 'reka-ui';
import { Check, Minus } from 'lucide-vue-next';
import { useForwardPropsEmits } from 'reka-ui';
import { computed } from 'vue';
import { cn } from '@/lib/cn';

interface Props extends CheckboxRootProps {
  class?: string;
}

const props = defineProps<Props>();
const emits = defineEmits<CheckboxRootEmits>();

const delegatedProps = computed(() => {
  const { class: _ignored, ...rest } = props;
  void _ignored;
  return rest;
});

const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <CheckboxRoot
    v-bind="forwarded"
    :class="
      cn(
        'peer h-4 w-4 shrink-0 rounded-sm border border-b-2 bg-card-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-brand data-[state=checked]:border-brand data-[state=checked]:text-white',
        props.class,
      )
    "
  >
    <CheckboxIndicator class="flex h-full w-full items-center justify-center text-current">
      <Check v-if="forwarded.modelValue !== 'indeterminate'" class="h-3 w-3" />
      <Minus v-else class="h-3 w-3" />
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
