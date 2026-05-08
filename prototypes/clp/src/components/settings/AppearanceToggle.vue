<script setup lang="ts">
import { Monitor, Sun, Moon } from 'lucide-vue-next';
import type { Appearance } from '@/stores/preferences';
import { cn } from '@/lib/cn';

// ════════════════════════════════════════════════════════════════════
// <AppearanceToggle> — System / Light / Dark 3-button selector
// ────────────────────────────────────────────────────────────────────
// Icon-only segmented control matching the prototype:
//   System (Monitor) · Light (Sun) · Dark (Moon)
// The active option is highlighted with the brand-bg token + brand
// border. Pure controlled component — model-bound to the preferences
// store via v-model on the consumer side.
// ════════════════════════════════════════════════════════════════════

interface Props {
  modelValue: Appearance;
}

const props = defineProps<Props>();
const emit = defineEmits<{ 'update:modelValue': [value: Appearance] }>();

const OPTIONS: { value: Appearance; label: string; icon: typeof Monitor }[] = [
  { value: 'system', label: 'Seguir sistema', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
];

function select(value: Appearance): void {
  if (value === props.modelValue) return;
  emit('update:modelValue', value);
}
</script>

<template>
  <div
    role="radiogroup"
    aria-label="Apariencia"
    class="inline-flex items-center gap-1 rounded-md border border-b-2 bg-card-2 p-1"
    data-testid="appearance-toggle"
  >
    <button
      v-for="opt in OPTIONS"
      :key="opt.value"
      type="button"
      role="radio"
      :aria-checked="props.modelValue === opt.value"
      :title="opt.label"
      :data-testid="`appearance-${opt.value}`"
      :class="
        cn(
          'flex h-7 w-8 items-center justify-center rounded text-t-3 transition-colors hover:text-t-1',
          props.modelValue === opt.value
            ? 'border border-b-3 bg-brand-bg text-brand'
            : '',
        )
      "
      @click="select(opt.value)"
    >
      <component :is="opt.icon" class="h-3.5 w-3.5" />
    </button>
  </div>
</template>
