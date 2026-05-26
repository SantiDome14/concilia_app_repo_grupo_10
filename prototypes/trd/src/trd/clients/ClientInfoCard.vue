<script setup lang="ts">
import { Badge } from '@/components/ui/badge';
import type { Client } from '@/types/client';
import { displayValueOrDash } from '@/types/client';

defineProps<{ client: Client }>();
</script>

<template>
  <section
    class="rounded-[10px] border border-b-2 bg-card-2 p-5"
    data-testid="client-info-card"
  >
    <header class="mb-4 flex items-center justify-between">
      <h2 class="text-sm font-bold uppercase tracking-wider text-t-3">Información</h2>
    </header>

    <dl class="grid grid-cols-[140px_1fr] gap-x-6 gap-y-3 text-[13px]">
      <dt class="font-medium text-t-4">ID</dt>
      <dd class="font-mono text-t-2">{{ client.id }}</dd>

      <dt class="font-medium text-t-4">Nombre</dt>
      <dd class="font-semibold text-t-1">{{ client.name }}</dd>

      <dt class="font-medium text-t-4">Legajo Ardua</dt>
      <dd class="font-mono text-t-2">{{ displayValueOrDash(client.ardua_docket) }}</dd>

      <dt class="font-medium text-t-4">Legajo Circuit</dt>
      <dd class="font-mono text-t-2">{{ displayValueOrDash(client.circuit_docket) }}</dd>

      <dt class="font-medium text-t-4">Estado</dt>
      <dd>
        <Badge :variant="client.is_active ? 'success' : 'neutral'">
          {{ client.is_active ? 'Activo' : 'Inactivo' }}
        </Badge>
      </dd>
    </dl>
  </section>
</template>
