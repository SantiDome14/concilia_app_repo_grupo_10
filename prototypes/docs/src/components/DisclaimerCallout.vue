<script setup lang="ts">
import { computed } from 'vue';

type Variant = 'referential' | 'warning' | 'info' | 'danger';

const props = withDefaults(
  defineProps<{
    variant?: Variant;
    text?: string;
  }>(),
  { variant: 'referential' },
);

const REFERENTIAL_TEXT =
  'Los precios devueltos son de carácter referencial y no constituyen una oferta ni una obligación de Ardua de operar a esos valores. Para ejecutar una operación, contactá a la Mesa de Dinero de Ardua.';

const styling = computed(() => {
  const map: Record<Variant, { color: string; bg: string }> = {
    referential: {
      color: 'var(--accent-violet)',
      bg: 'var(--accent-violet-soft)',
    },
    warning: {
      color: 'var(--method-put)',
      bg: 'rgba(245, 158, 11, 0.10)',
    },
    info: {
      color: 'var(--method-post)',
      bg: 'rgba(59, 130, 246, 0.10)',
    },
    danger: {
      color: 'var(--method-delete)',
      bg: 'rgba(239, 68, 68, 0.10)',
    },
  };
  return map[props.variant];
});

const body = computed(() => {
  if (props.text) return props.text;
  return REFERENTIAL_TEXT;
});
</script>

<template>
  <div
    class="my-5 flex items-start gap-3 px-4 py-3 text-sm"
    :style="{
      background: styling.bg,
      borderLeft: `4px solid ${styling.color}`,
      borderRadius: 'var(--radius-md)',
      color: 'var(--text-secondary)',
    }"
    role="note"
  >
    <span aria-hidden="true" class="select-none text-base leading-snug">⚠️</span>
    <p class="m-0 leading-relaxed">
      <slot>{{ body }}</slot>
    </p>
  </div>
</template>
