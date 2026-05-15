<script setup lang="ts">
import { computed } from 'vue';
import CodeBlock from './CodeBlock.vue';

const props = defineProps<{
  status: number;
  body: unknown;
  description?: string;
}>();

const color = computed(() => {
  if (props.status >= 500) return 'var(--status-500)';
  if (props.status >= 400) return 'var(--status-400)';
  return 'var(--status-200)';
});

const code = computed(() => {
  if (typeof props.body === 'string') return props.body;
  return JSON.stringify(props.body, null, 2);
});
</script>

<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-2 text-xs">
      <span
        class="font-mono font-semibold"
        :style="{
          color,
          background: `${color}1A`,
          border: `1px solid ${color}40`,
          padding: '2px 8px',
          borderRadius: 'var(--radius-sm)',
        }"
      >
        {{ status }}
      </span>
      <span v-if="description" :style="{ color: 'var(--text-secondary)' }">
        {{ description }}
      </span>
    </div>
    <CodeBlock :code="code" language="json" />
  </div>
</template>
