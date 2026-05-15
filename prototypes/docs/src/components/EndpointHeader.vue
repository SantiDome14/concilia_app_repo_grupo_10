<script setup lang="ts">
import { computed } from 'vue';
import MethodBadge from './MethodBadge.vue';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

const props = withDefaults(
  defineProps<{
    method: HttpMethod;
    path: string;
    pathParams?: string[];
    baseUrl?: string;
  }>(),
  {
    pathParams: () => [],
    baseUrl: '',
  },
);

defineEmits<{
  tryIt: [];
}>();

type Segment = { value: string; isParam: boolean };

const segments = computed<Segment[]>(() => {
  const parts: Segment[] = [];
  const path = props.path;
  let buf = '';
  let inParam = false;

  for (let i = 0; i < path.length; i++) {
    const ch = path[i];
    if (ch === '{') {
      if (buf) parts.push({ value: buf, isParam: false });
      buf = '';
      inParam = true;
      continue;
    }
    if (ch === '}') {
      if (buf) parts.push({ value: buf, isParam: true });
      buf = '';
      inParam = false;
      continue;
    }
    buf += ch;
  }
  if (buf) parts.push({ value: buf, isParam: inParam });
  return parts;
});
</script>

<template>
  <div
    class="flex items-center justify-between gap-3 px-4 py-3"
    :style="{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
    }"
  >
    <div class="flex min-w-0 items-center gap-3">
      <MethodBadge :method="method" />
      <span
        v-if="baseUrl"
        class="hidden font-mono text-xs sm:inline"
        :style="{ color: 'var(--text-muted)' }"
      >
        {{ baseUrl }}
      </span>
      <span
        class="overflow-hidden truncate font-mono text-sm"
        :style="{ color: 'var(--text-primary)' }"
      >
        <template v-for="(seg, idx) in segments" :key="idx">
          <span
            v-if="seg.isParam"
            :style="{
              background: 'var(--accent-violet-soft)',
              color: 'var(--accent-violet)',
              padding: '1px 4px',
              borderRadius: 'var(--radius-sm)',
            }"
          >
            {{ '{' + seg.value + '}' }}
          </span>
          <template v-else>{{ seg.value }}</template>
        </template>
      </span>
    </div>

    <button
      type="button"
      class="flex shrink-0 items-center gap-1 px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
      :style="{
        background: 'var(--accent-violet)',
        color: 'var(--text-primary)',
        borderRadius: 'var(--radius-sm)',
      }"
      @click="$emit('tryIt')"
    >
      Try it
    </button>
  </div>
</template>
