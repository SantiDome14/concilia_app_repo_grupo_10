<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { Button } from '@/components/ui/button';
import { ROUTE_PATHS } from '@/config/routes';
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-bg px-4">
    <div class="w-full max-w-md text-center">
      <div class="mb-4 text-7xl font-extrabold text-t-4">404</div>
      <h1 class="mb-2 text-xl font-bold text-t-1">Página no encontrada</h1>
      <p class="mb-6 text-sm text-t-3">
        La ruta a la que intentás acceder no existe o fue movida.
      </p>
      <RouterLink :to="ROUTE_PATHS.DASHBOARD">
        <Button variant="primary" size="md">Volver al inicio</Button>
      </RouterLink>
    </div>
  </div>
</template>
