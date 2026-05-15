<script setup lang="ts">
import PageShell from '@/components/PageShell.vue';
import DocSection from '@/components/DocSection.vue';
import CodeBlock from '@/components/CodeBlock.vue';
import DocTable from '@/components/DocTable.vue';
import Callout from '@/components/Callout.vue';

const statusCodes = [
  ['200', 'OK — el request fue exitoso'],
  ['400', 'Bad Request — parámetro inválido o faltante'],
  ['401', 'Unauthorized — API key ausente o inválida'],
  ['404', 'Not Found — el recurso no existe'],
  ['429', 'Too Many Requests — rate limit excedido'],
  ['500', 'Internal Server Error — error del lado de Ardua'],
];

const rateLimitHeaders = [
  ['X-RateLimit-Limit', 'Máximo de requests permitidos en la ventana'],
  ['X-RateLimit-Remaining', 'Requests restantes en la ventana actual'],
  ['X-RateLimit-Reset', 'Timestamp Unix de cuando se reinicia el contador'],
  ['Retry-After', 'Segundos que tenés que esperar antes de reintentar'],
];

const errorShape = `{
  "error": "descripción del error",
  "code": "OPTIONAL_ERROR_CODE"
}`;
</script>

<template>
  <PageShell
    title="Errors & rate limits"
    subtitle="Cómo manejar errores y respetar los rate limits"
  >
    <DocSection :level="1">Errors &amp; rate limits</DocSection>

    <p>
      Las APIs de Ardua usan códigos de estado HTTP estándar para indicar el resultado de cada
      request. Esta página documenta los códigos que vas a encontrar, qué los dispara, y cómo
      manejar el rate limiting.
    </p>

    <DocSection :level="2">Códigos de estado</DocSection>

    <DocTable :columns="['Código', 'Significado']" :rows="statusCodes" />

    <DocSection :level="2">Estructura del error</DocSection>

    <p>Todos los errores devuelven JSON con esta forma:</p>

    <CodeBlock :code="errorShape" language="json" />

    <DocSection :level="2">Ejemplos por código</DocSection>

    <DocSection :level="3">400 — Bad Request</DocSection>
    <CodeBlock :code='`{ "error": "Par no válido o no soportado" }`' language="json" />

    <DocSection :level="3">401 — Unauthorized</DocSection>
    <CodeBlock :code='`{ "error": "API key ausente o inválida" }`' language="json" />

    <DocSection :level="3">404 — Not Found</DocSection>
    <CodeBlock :code='`{ "error": "Precio no disponible en este momento" }`' language="json" />

    <DocSection :level="3">429 — Too Many Requests</DocSection>
    <CodeBlock
      :code='`{ "error": "Rate limit excedido. Revisá los headers X-RateLimit-Remaining y Retry-After." }`'
      language="json"
    />

    <DocSection :level="3">500 — Internal Server Error</DocSection>
    <CodeBlock :code='`{ "error": "Error interno. Intentá nuevamente más tarde." }`' language="json" />

    <DocSection :level="2">Rate limiting</DocSection>

    <p>
      Cada <code>API_KEY</code> tiene un límite de requests por ventana de tiempo. Cuando lo
      superás, la API devuelve un <code>429</code> e incluye estos headers en la respuesta:
    </p>

    <DocTable :columns="['Header', 'Descripción']" :rows="rateLimitHeaders" />

    <Callout variant="info">
      Recomendamos implementar <strong>exponential backoff</strong> ante <code>429</code>s:
      esperar el tiempo indicado por <code>Retry-After</code> y duplicarlo en cada reintento.
    </Callout>
  </PageShell>
</template>
