<script setup lang="ts">
import PageShell from '@/components/PageShell.vue';
import DocSection from '@/components/DocSection.vue';
</script>

<template>
  <PageShell title="Versioning" subtitle="Política de versiones y cómo leer el changelog">
    <DocSection :level="1">Versioning</DocSection>

    <p>
      La API de Ardua sigue <strong>Semantic Versioning</strong>
      (<code>MAJOR.MINOR.PATCH</code>):
    </p>

    <ul>
      <li><strong>MAJOR</strong> — cambios incompatibles con versiones anteriores.</li>
      <li><strong>MINOR</strong> — nuevas capacidades, backwards-compatible.</li>
      <li><strong>PATCH</strong> — fixes, backwards-compatible.</li>
    </ul>

    <DocSection :level="2">Versión actual</DocSection>

    <p>
      La versión actual de la API es <strong>v1.0.0</strong>, indicada en el header del portal y
      en la URL base: <code>https://api.arduasolutions.com</code>.
    </p>

    <DocSection :level="2">Política de cambios breaking</DocSection>

    <p>
      Antes de introducir un cambio breaking, comunicamos el plan con un mínimo de
      <strong>90 días de anticipación</strong> a través de:
    </p>

    <ul>
      <li>
        Notificación directa a los integradores activos vía <strong>product@arduasolutions.com</strong>.
      </li>
      <li>
        Entrada en el Changelog marcada con etiqueta <code>[BREAKING]</code>.
      </li>
    </ul>

    <DocSection :level="2">Deprecación</DocSection>

    <p>
      Las capacidades deprecadas se mantienen funcionales durante un período de transición no
      menor a 90 días antes de ser removidas. Durante ese período, las respuestas incluyen un
      header <code>X-Ardua-Deprecation</code> con la URL del changelog correspondiente.
    </p>

    <DocSection :level="2">¿Preguntas?</DocSection>

    <p>Escribinos a <strong>product@arduasolutions.com</strong>.</p>
  </PageShell>
</template>
