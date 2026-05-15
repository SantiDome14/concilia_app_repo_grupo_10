<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import axios, { type AxiosError } from 'axios';
import { Loader2, Play, X } from 'lucide-vue-next';
import CodeBlock from './CodeBlock.vue';
import ResponseExample from './ResponseExample.vue';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type TryItField = {
  name: string;
  location: 'PATH' | 'QUERY' | 'HEADER';
  required?: boolean;
  placeholder?: string;
  default?: string;
  description?: string;
};

const props = defineProps<{
  open: boolean;
  method: HttpMethod;
  path: string;
  baseUrl: string;
  fields: TryItField[];
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const API_KEY_STORAGE = 'ardua-docs-api-key';

const values = ref<Record<string, string>>({});
const apiKey = ref('');
const loading = ref(false);
const result = ref<null | {
  status: number;
  latencyMs: number;
  body: unknown;
  error?: string;
}>(null);

onMounted(() => {
  const saved = localStorage.getItem(API_KEY_STORAGE);
  if (saved) apiKey.value = saved;
  for (const field of props.fields) {
    if (field.default) values.value[field.name] = field.default;
  }
});

const interpolatedPath = computed(() => {
  let p = props.path;
  for (const f of props.fields.filter((f) => f.location === 'PATH')) {
    const v = values.value[f.name] || '';
    p = p.replace(`{${f.name}}`, encodeURIComponent(v));
  }
  return p;
});

const finalUrl = computed(() => {
  const url = new URL(props.baseUrl + interpolatedPath.value);
  for (const f of props.fields.filter((f) => f.location === 'QUERY')) {
    const v = values.value[f.name];
    if (v) url.searchParams.set(f.name, v);
  }
  return url.toString();
});

const curlPreview = computed(() => {
  const headers: string[] = [`  -H 'x-api-key: ${apiKey.value || 'TU_API_KEY'}'`];
  for (const f of props.fields.filter((f) => f.location === 'HEADER' && f.name !== 'x-api-key')) {
    const v = values.value[f.name];
    if (v) headers.push(`  -H '${f.name}: ${v}'`);
  }
  return `curl -X ${props.method} '${finalUrl.value}' \\\n${headers.join(' \\\n')}`;
});

function persistApiKey() {
  if (apiKey.value) localStorage.setItem(API_KEY_STORAGE, apiKey.value);
}

async function run() {
  loading.value = true;
  result.value = null;
  const t0 = performance.now();
  persistApiKey();

  const headers: Record<string, string> = {};
  if (apiKey.value) headers['x-api-key'] = apiKey.value;
  for (const f of props.fields.filter((f) => f.location === 'HEADER' && f.name !== 'x-api-key')) {
    const v = values.value[f.name];
    if (v) headers[f.name] = v;
  }

  try {
    const response = await axios.request({
      method: props.method,
      url: finalUrl.value,
      headers,
      validateStatus: () => true,
    });
    result.value = {
      status: response.status,
      latencyMs: Math.round(performance.now() - t0),
      body: response.data,
    };
  } catch (err) {
    const ax = err as AxiosError;
    result.value = {
      status: 0,
      latencyMs: Math.round(performance.now() - t0),
      body: null,
      error:
        ax.message ||
        'No se pudo ejecutar el request. Si estás corriendo el portal local, puede ser un bloqueo de CORS.',
    };
  } finally {
    loading.value = false;
  }
}

function close() {
  emit('update:open', false);
}
</script>

<template>
  <transition
    enter-active-class="transition-transform duration-200"
    enter-from-class="translate-x-full"
    leave-active-class="transition-transform duration-200"
    leave-to-class="translate-x-full"
  >
    <aside
      v-if="open"
      class="fixed right-0 z-40 flex w-full max-w-[480px] flex-col overflow-y-auto border-l"
      :style="{
        top: 'var(--layout-topbar-h)',
        bottom: 0,
        background: 'var(--bg-elevated)',
        borderColor: 'var(--border-subtle)',
      }"
    >
      <header
        class="flex items-center justify-between px-5 py-3"
        :style="{ borderBottom: '1px solid var(--border-subtle)' }"
      >
        <div class="flex items-center gap-2">
          <span
            class="font-mono text-xs font-semibold"
            :style="{ color: 'var(--method-get)' }"
          >
            {{ method }}
          </span>
          <span
            class="font-mono text-xs"
            :style="{ color: 'var(--text-secondary)' }"
          >
            {{ path }}
          </span>
        </div>
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center"
          :style="{ color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)' }"
          title="Cerrar"
          @click="close"
        >
          <X :size="16" />
        </button>
      </header>

      <div class="flex flex-col gap-5 px-5 py-4">
        <!-- API key -->
        <div>
          <label
            class="mb-1 block text-[10px] font-semibold tracking-wider uppercase"
            :style="{ color: 'var(--text-muted)' }"
          >
            x-api-key
          </label>
          <input
            v-model="apiKey"
            type="password"
            placeholder="Tu API key"
            autocomplete="off"
            class="w-full px-3 py-2 text-sm font-mono"
            :style="{
              background: 'var(--bg-base)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
            }"
            @blur="persistApiKey"
          />
          <p class="m-0 mt-1 text-[11px]" :style="{ color: 'var(--text-muted)' }">
            Se guarda solo en este navegador (localStorage) y nunca se envía a otro lado que
            <code class="font-mono">api.arduasolutions.com</code>.
          </p>
        </div>

        <!-- Fields -->
        <div v-for="f in fields" :key="`${f.location}-${f.name}`">
          <label
            class="mb-1 block text-[10px] font-semibold tracking-wider uppercase"
            :style="{ color: 'var(--text-muted)' }"
          >
            {{ f.name }}
            <span class="ml-1 font-normal" :style="{ color: 'var(--text-muted)' }">
              · {{ f.location.toLowerCase() }}
            </span>
            <span v-if="f.required" :style="{ color: 'var(--method-delete)' }"> *</span>
          </label>
          <input
            v-model="values[f.name]"
            type="text"
            :placeholder="f.placeholder ?? ''"
            class="w-full px-3 py-2 text-sm font-mono"
            :style="{
              background: 'var(--bg-base)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
            }"
          />
          <p
            v-if="f.description"
            class="m-0 mt-1 text-[11px]"
            :style="{ color: 'var(--text-muted)' }"
          >
            {{ f.description }}
          </p>
        </div>

        <button
          type="button"
          class="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
          :style="{
            background: 'var(--accent-violet)',
            color: 'var(--text-primary)',
            borderRadius: 'var(--radius-sm)',
          }"
          :disabled="loading"
          @click="run"
        >
          <Loader2 v-if="loading" :size="14" class="animate-spin" />
          <Play v-else :size="14" />
          {{ loading ? 'Ejecutando…' : 'Run' }}
        </button>

        <!-- Preview -->
        <div>
          <h4
            class="mb-2 text-[10px] font-semibold tracking-wider uppercase"
            :style="{ color: 'var(--text-muted)' }"
          >
            Request
          </h4>
          <CodeBlock :code="curlPreview" language="bash" />
        </div>

        <!-- Result -->
        <div v-if="result">
          <h4
            class="mb-2 flex items-center gap-2 text-[10px] font-semibold tracking-wider uppercase"
            :style="{ color: 'var(--text-muted)' }"
          >
            Response · {{ result.latencyMs }}ms
          </h4>
          <ResponseExample
            v-if="!result.error && result.status > 0"
            :status="result.status"
            :body="result.body"
          />
          <div
            v-else
            class="px-3 py-2 text-sm"
            :style="{
              background: 'rgba(239, 68, 68, 0.10)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--method-delete)',
            }"
          >
            {{ result.error }}
          </div>
        </div>
      </div>
    </aside>
  </transition>
</template>
