<script setup lang="ts">
import { useAttrs } from 'vue';
import { cn } from '@/lib/cn';

interface Props {
  modelValue?: string | number;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  placeholder: '',
  disabled: false,
  class: '',
});

defineEmits<{ 'update:modelValue': [value: string] }>();
defineOptions({ inheritAttrs: false });
const attrs = useAttrs();
</script>

<template>
  <input
    v-bind="attrs"
    :type="props.type"
    :value="props.modelValue"
    :placeholder="props.placeholder"
    :disabled="props.disabled"
    :class="
      cn(
        'w-full rounded-md border border-b-3 bg-[#111] px-3 py-2 text-sm text-t-1 placeholder:text-t-4 focus-visible:border-info focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
        props.class,
      )
    "
    @input="(e) => $emit('update:modelValue', (e.target as HTMLInputElement).value)"
  />
</template>
