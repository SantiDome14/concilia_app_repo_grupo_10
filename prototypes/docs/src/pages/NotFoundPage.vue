<script setup lang="ts">
import PageShell from '@/components/PageShell.vue';
import DocSection from '@/components/DocSection.vue';
</script>

<template>
  <PageShell title="404" subtitle="Página no encontrada">
    <DocSection :level="1">404 · No encontramos esa página</DocSection>
    <p>
      El recurso que buscás no existe en esta documentación. Probá desde el menú lateral o volvé a
      la <router-link to="/">página principal</router-link>.
    </p>
  </PageShell>
</template>
