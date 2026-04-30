<script setup lang="ts">
import { useAttrs } from 'vue';
import { cn } from '@/lib/cn';

interface Props {
  modelValue?: string | number;
  placeholder?: string;
  disabled?: boolean;
  maxlength?: number;
  rows?: number;
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '',
  disabled: false,
  maxlength: undefined,
  rows: 3,
  class: '',
});

defineEmits<{ 'update:modelValue': [value: string] }>();
defineOptions({ inheritAttrs: false });
const attrs = useAttrs();
</script>

<template>
  <textarea
    v-bind="attrs"
    :value="props.modelValue"
    :placeholder="props.placeholder"
    :disabled="props.disabled"
    :maxlength="props.maxlength"
    :rows="props.rows"
    :class="
      cn(
        'w-full rounded-md border border-b-2 bg-card-2 px-3 py-2 text-sm text-t-1 placeholder:text-t-4 focus-visible:border-info focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[72px]',
        props.class,
      )
    "
    @input="(e) => $emit('update:modelValue', (e.target as HTMLTextAreaElement).value)"
  />
</template>
