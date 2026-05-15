<script setup lang="ts">
import { ref, watchEffect } from 'vue';
import { Check, Copy } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { highlightCode } from '@/lib/shiki';

const props = withDefaults(
  defineProps<{
    code: string;
    language?: string;
    filename?: string;
  }>(),
  { language: 'bash' },
);

const html = ref('');
const copied = ref(false);

watchEffect(async () => {
  html.value = await highlightCode(props.code.trim(), props.language);
});

async function copy() {
  try {
    await navigator.clipboard.writeText(props.code.trim());
    copied.value = true;
    setTimeout(() => (copied.value = false), 2000);
  } catch {
    toast.error('No se pudo copiar al portapapeles');
  }
}
</script>

<template>
  <div
    class="group relative overflow-hidden"
    :style="{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
    }"
  >
    <div
      v-if="filename"
      class="flex items-center justify-between px-4 py-2 text-xs"
      :style="{
        borderBottom: '1px solid var(--border-subtle)',
        color: 'var(--text-muted)',
      }"
    >
      <span class="font-mono">{{ filename }}</span>
    </div>

    <button
      type="button"
      class="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
      :style="{
        background: 'var(--bg-base)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        color: copied ? 'var(--method-get)' : 'var(--text-secondary)',
      }"
      :title="copied ? 'Copiado' : 'Copiar al portapapeles'"
      @click="copy"
    >
      <Check v-if="copied" :size="13" />
      <Copy v-else :size="13" />
    </button>

    <!-- eslint-disable-next-line vue/no-v-html — Shiki output is trusted HTML produced from local code strings -->
    <div class="shiki-host overflow-x-auto px-4 py-3 text-[13px] leading-relaxed" v-html="html" />
  </div>
</template>

<style>
.shiki-host pre {
  margin: 0;
  background: transparent !important;
  font-family: var(--font-mono);
}
.shiki-host code {
  background: transparent !important;
  font-family: var(--font-mono);
}
</style>
