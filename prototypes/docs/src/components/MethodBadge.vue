<script setup lang="ts">
import { computed } from 'vue';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const props = withDefaults(
  defineProps<{
    method: HttpMethod;
    size?: 'sm' | 'md';
  }>(),
  { size: 'md' },
);

const color = computed(() => {
  const map: Record<HttpMethod, string> = {
    GET: 'var(--method-get)',
    POST: 'var(--method-post)',
    PUT: 'var(--method-put)',
    PATCH: 'var(--method-patch)',
    DELETE: 'var(--method-delete)',
  };
  return map[props.method];
});

const isSm = computed(() => props.size === 'sm');
</script>

<template>
  <span
    class="inline-flex items-center justify-center font-mono font-medium tracking-wide uppercase"
    :class="isSm ? 'h-5 text-[10px]' : 'h-6 px-2 text-xs'"
    :style="{
      width: isSm ? '48px' : 'auto',
      background: `${color}1A`,
      color,
      border: `1px solid ${color}40`,
      borderRadius: 'var(--radius-sm)',
    }"
  >
    {{ method }}
  </span>
</template>
