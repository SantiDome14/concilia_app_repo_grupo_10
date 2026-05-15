<script setup lang="ts">
import PageShell from '@/components/PageShell.vue';
import DocSection from '@/components/DocSection.vue';
import CodeBlock from '@/components/CodeBlock.vue';
import DocTable from '@/components/DocTable.vue';

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
</script>

<template>
  <PageShell title="Introduction" subtitle="Qué es la API de Ardua y cómo empezar">
    <DocSection :level="1">Bienvenido a la API de Ardua</DocSection>

    <p>
      Las APIs de Ardua te permiten integrarte con nuestra infraestructura financiera B2B de forma
      programática. Están diseñadas para ser simples, predecibles y fáciles de integrar.
    </p>

    <p>
      Todas las respuestas son en <strong>JSON</strong>, todos los requests usan <strong>HTTPS</strong>,
      y la autenticación se hace con una <code>API_KEY</code> que te enviamos nosotros tras un
      proceso de onboarding seguro.
    </p>

    <DocSection :level="2">Base URL</DocSection>

    <CodeBlock code="https://api.arduasolutions.com" language="bash" />

    <p>Todos los endpoints que encontrás en esta documentación usan esta URL como base.</p>

    <DocSection :level="2">Autenticación</DocSection>

    <p>Cada request debe incluir tu <code>API_KEY</code> en el header <code>x-api-key</code>:</p>

    <CodeBlock
      :code="`curl https://api.arduasolutions.com/prices/USDC-ARS \\\n  -H 'x-api-key: TU_API_KEY'`"
      language="bash"
    />

    <p>
      Si todavía no tenés tu <code>API_KEY</code>, seguí los pasos en la sección
      <router-link to="/authentication">Authentication</router-link>.
    </p>

    <DocSection :level="2">Formato de respuestas</DocSection>

    <p>
      Todas las respuestas exitosas devuelven un objeto JSON con los datos del recurso solicitado.
      Los errores también devuelven JSON con un campo <code>error</code> que describe qué salió mal.
    </p>

    <CodeBlock code='{ "error": "missing API key" }' language="json" />

    <DocSection :level="2">Códigos de estado</DocSection>

    <DocTable :columns="['Código', 'Significado']" :rows="statusCodes" />

    <DocSection :level="2">Rate limiting</DocSection>

    <p>
      Cada <code>API_KEY</code> tiene un límite de requests por ventana de tiempo. Cuando lo
      superás, la API devuelve un <code>429</code> e incluye estos headers en la respuesta:
    </p>

    <DocTable :columns="['Header', 'Descripción']" :rows="rateLimitHeaders" />

    <DocSection :level="2">¿Preguntas?</DocSection>

    <p>
      Escribinos a <strong>product@arduasolutions.com</strong> — respondemos el mismo día hábil.
    </p>
  </PageShell>
</template>
