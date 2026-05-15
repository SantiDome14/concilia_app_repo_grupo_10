<script setup lang="ts">
import { computed } from 'vue';

type Variant = 'info' | 'warning' | 'danger' | 'success';

const props = withDefaults(
  defineProps<{
    variant?: Variant;
    icon?: string;
  }>(),
  { variant: 'info' },
);

const styling = computed(() => {
  const map: Record<
    Variant,
    { color: string; bg: string; icon: string }
  > = {
    info: {
      color: 'var(--method-post)',
      bg: 'rgba(59, 130, 246, 0.10)',
      icon: 'ℹ️',
    },
    warning: {
      color: 'var(--method-put)',
      bg: 'rgba(245, 158, 11, 0.10)',
      icon: '⚠️',
    },
    danger: {
      color: 'var(--method-delete)',
      bg: 'rgba(239, 68, 68, 0.10)',
      icon: '❗️',
    },
    success: {
      color: 'var(--method-get)',
      bg: 'rgba(16, 185, 129, 0.10)',
      icon: '✅',
    },
  };
  return map[props.variant];
});
</script>

<template>
  <div
    class="my-4 flex items-start gap-3 px-4 py-3 text-sm"
    :style="{
      background: styling.bg,
      borderLeft: `3px solid ${styling.color}`,
      borderRadius: 'var(--radius-md)',
      color: 'var(--text-secondary)',
    }"
  >
    <span aria-hidden="true" class="select-none text-base leading-snug">
      {{ icon ?? styling.icon }}
    </span>
    <div class="flex-1 [&_p]:m-0 [&_p+p]:mt-2">
      <slot />
    </div>
  </div>
</template>
