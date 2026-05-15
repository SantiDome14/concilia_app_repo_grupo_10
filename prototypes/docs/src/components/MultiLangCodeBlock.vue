<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import CodeBlock from './CodeBlock.vue';

export type CodeSample = {
  label: string;
  language: string;
  code: string;
};

const props = defineProps<{
  samples: CodeSample[];
  storageKey?: string;
}>();

const storageKey = computed(() => props.storageKey ?? 'ardua-docs-lang');
const active = ref(0);

onMounted(() => {
  const saved = localStorage.getItem(storageKey.value);
  if (saved) {
    const idx = props.samples.findIndex((s) => s.label === saved);
    if (idx >= 0) active.value = idx;
  }
});

watch(active, (idx) => {
  const sample = props.samples[idx];
  if (sample) localStorage.setItem(storageKey.value, sample.label);
});
</script>

<template>
  <div>
    <div
      class="flex items-center gap-1 px-1"
      :style="{
        borderBottom: '1px solid var(--border-subtle)',
      }"
    >
      <button
        v-for="(sample, idx) in samples"
        :key="sample.label"
        type="button"
        class="-mb-px border-b-2 px-3 py-2 text-xs font-medium transition-colors"
        :style="{
          color: active === idx ? 'var(--accent-violet)' : 'var(--text-secondary)',
          borderColor: active === idx ? 'var(--accent-violet)' : 'transparent',
        }"
        @click="active = idx"
      >
        {{ sample.label }}
      </button>
    </div>

    <div class="mt-3">
      <CodeBlock
        v-if="samples[active]"
        :code="samples[active].code"
        :language="samples[active].language"
      />
    </div>
  </div>
</template>
