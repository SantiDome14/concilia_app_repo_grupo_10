<script setup lang="ts">
import { ref } from 'vue';
import PageShell from '@/components/PageShell.vue';
import DocSection from '@/components/DocSection.vue';
import EndpointHeader from '@/components/EndpointHeader.vue';
import DisclaimerCallout from '@/components/DisclaimerCallout.vue';
import ParamTable, { type Param } from '@/components/ParamTable.vue';
import ResponseExample from '@/components/ResponseExample.vue';
import MultiLangCodeBlock, { type CodeSample } from '@/components/MultiLangCodeBlock.vue';
import TryItPanel, { type TryItField } from '@/components/TryItPanel.vue';

const BASE_URL = 'https://api.arduasolutions.com';
const PATH = '/prices/{pair}';

const tryItOpen = ref(false);

const authParams: Param[] = [
  {
    name: 'x-api-key',
    type: 'string',
    location: 'HEADER',
    required: true,
    description: 'Tu API key personal.',
  },
];

const pathParams: Param[] = [
  {
    name: 'pair',
    type: 'string',
    location: 'PATH',
    required: true,
    description:
      'Par de activos en formato {from}-{to}. En v1 el único par soportado es USDC-ARS.',
  },
];

const tryItFields: TryItField[] = [
  {
    name: 'pair',
    location: 'PATH',
    required: true,
    placeholder: 'USDC-ARS',
    default: 'USDC-ARS',
    description: 'Par de activos en formato {from}-{to}.',
  },
];

const codeSamples: CodeSample[] = [
  {
    label: 'cURL',
    language: 'bash',
    code: `curl -X GET 'https://api.arduasolutions.com/prices/USDC-ARS' \\
  -H 'x-api-key: TU_API_KEY'`,
  },
  {
    label: 'JavaScript',
    language: 'javascript',
    code: `const response = await fetch(
  'https://api.arduasolutions.com/prices/USDC-ARS',
  { headers: { 'x-api-key': 'TU_API_KEY' } }
);
const data = await response.json();`,
  },
  {
    label: 'Python',
    language: 'python',
    code: `import requests
response = requests.get(
    'https://api.arduasolutions.com/prices/USDC-ARS',
    headers={'x-api-key': 'TU_API_KEY'}
)
data = response.json()`,
  },
  {
    label: 'Go',
    language: 'go',
    code: `req, _ := http.NewRequest("GET", "https://api.arduasolutions.com/prices/USDC-ARS", nil)
req.Header.Set("x-api-key", "TU_API_KEY")
resp, _ := http.DefaultClient.Do(req)`,
  },
];

const response200 = {
  pair: 'USDC-ARS',
  buy: '1151.23',
  sell: '1138.67',
};

const responseTab = ref<200 | 400 | 401 | 404 | 429>(200);
const responses: Record<200 | 400 | 401 | 404 | 429, unknown> = {
  200: response200,
  400: { error: 'Par no válido o no soportado' },
  401: { error: 'API key ausente o inválida' },
  404: { error: 'Precio no disponible en este momento' },
  429: {
    error: 'Rate limit excedido. Revisá los headers X-RateLimit-Remaining y Retry-After.',
  },
};
const responseStatuses: (200 | 400 | 401 | 404 | 429)[] = [200, 400, 401, 404, 429];
</script>

<template>
  <PageShell
    title="GET /prices/{pair}"
    subtitle="Consultá un precio de referencia para un par de activos soportado"
  >
    <DocSection :level="1">Consultar precio de referencia</DocSection>

    <EndpointHeader
      :method="'GET'"
      :path="PATH"
      :base-url="BASE_URL"
      :path-params="['pair']"
      @try-it="tryItOpen = true"
    />

    <p>
      Devuelve un precio de referencia de <strong>compra</strong> (<code>buy</code>) y
      <strong>venta</strong> (<code>sell</code>) para un par de activos soportado. Los precios son
      indicativos y se actualizan en tiempo real.
    </p>

    <DisclaimerCallout variant="referential" />

    <DocSection :level="2">Authorizations</DocSection>
    <ParamTable :params="authParams" hide-location />

    <DocSection :level="2">Path Parameters</DocSection>
    <ParamTable :params="pathParams" hide-location />

    <DocSection :level="2">Responses</DocSection>

    <DocSection :level="3">200 — Success</DocSection>
    <ResponseExample :status="200" :body="response200" />

    <DocSection :level="3">400 — Bad Request</DocSection>
    <ResponseExample :status="400" :body="{ error: 'Par no válido o no soportado' }" />

    <DocSection :level="3">401 — Unauthorized</DocSection>
    <ResponseExample :status="401" :body="{ error: 'API key ausente o inválida' }" />

    <DocSection :level="3">404 — Not Found</DocSection>
    <ResponseExample :status="404" :body="{ error: 'Precio no disponible en este momento' }" />

    <DocSection :level="3">429 — Too Many Requests</DocSection>
    <ResponseExample
      :status="429"
      :body="{
        error: 'Rate limit excedido. Revisá los headers X-RateLimit-Remaining y Retry-After.',
      }"
    />

    <template #rightpanel>
      <div class="flex flex-col gap-6 px-5 py-4">
        <div>
          <h4
            class="mb-2 text-[10px] font-semibold tracking-wider uppercase"
            :style="{ color: 'var(--text-muted)' }"
          >
            Request
          </h4>
          <MultiLangCodeBlock :samples="codeSamples" storage-key="ardua-docs-lang-prices" />
        </div>

        <div>
          <h4
            class="mb-2 text-[10px] font-semibold tracking-wider uppercase"
            :style="{ color: 'var(--text-muted)' }"
          >
            Response
          </h4>
          <div class="-mb-px flex gap-1">
            <button
              v-for="s in responseStatuses"
              :key="s"
              type="button"
              class="border-b-2 px-2 py-1.5 font-mono text-xs"
              :style="{
                color: responseTab === s ? 'var(--accent-violet)' : 'var(--text-secondary)',
                borderColor: responseTab === s ? 'var(--accent-violet)' : 'transparent',
              }"
              @click="responseTab = s"
            >
              {{ s }}
            </button>
          </div>
          <div class="mt-3">
            <ResponseExample :status="responseTab" :body="responses[responseTab]" />
          </div>
        </div>
      </div>
    </template>
  </PageShell>

  <TryItPanel
    v-model:open="tryItOpen"
    :method="'GET'"
    :path="PATH"
    :base-url="BASE_URL"
    :fields="tryItFields"
  />
</template>
