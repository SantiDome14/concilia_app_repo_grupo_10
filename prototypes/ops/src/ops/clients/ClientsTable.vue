<script setup lang="ts">
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Skeleton from '@/components/feedback/Skeleton.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import PortalStatusChip from '@/components/feedback/PortalStatusChip.vue';
import { ManifestActionsMenu } from '@/components/manifest';
import type { Client } from './types';

// ════════════════════════════════════════════════════════════════════
// ClientsTable — canonical column set for the Clientes master list.
// ────────────────────────────────────────────────────────────────────
// Columns: Legajo · Nombre · CUIT/CUIL · Email · Portal · Estado ·
// Acciones. The row stays clickable (bubbles up to the page so the
// detail route navigation works); the Acciones cell stops propagation
// so opening the per-row menu does not also trigger a navigation.
// Per-row actions come from the `ops.clients` manifest via
// <ManifestActionsMenu>; the page wires the dispatcher.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  rows: Client[];
  isLoading: boolean;
  hasActiveFilters: boolean;
  manifestKey: string;
}>();

const emit = defineEmits<{
  'row-click': [client: Client];
  'clear-filters': [];
}>();

function onRowClick(client: Client): void {
  emit('row-click', client);
}
</script>

<template>
  <div class="rounded-lg border border-b-2 bg-card">
    <table class="w-full table-auto text-sm">
      <thead class="border-b border-b-2 text-[10px] font-bold uppercase tracking-wider text-t-4">
        <tr>
          <th class="px-4 py-3 text-left">Legajo</th>
          <th class="px-4 py-3 text-left">Nombre</th>
          <th class="px-4 py-3 text-left">CUIT/CUIL</th>
          <th class="px-4 py-3 text-left">Email</th>
          <th class="px-4 py-3 text-left">Portal</th>
          <th class="px-4 py-3 text-left">Estado</th>
          <th class="w-12 px-4 py-3 text-center">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <template v-if="props.isLoading">
          <tr v-for="i in 5" :key="`skeleton-${i}`">
            <td class="px-4 py-3"><Skeleton class="h-4 w-20" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-40" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-32" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-48" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-20" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-14" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-6" /></td>
          </tr>
        </template>

        <tr v-else-if="props.rows.length === 0">
          <td :colspan="7" class="px-4 py-8">
            <EmptyState
              v-if="!props.hasActiveFilters"
              title="No hay clientes"
              description="No se encontraron clientes para mostrar"
            />
            <EmptyState
              v-else
              title="Sin resultados para los filtros aplicados"
              description="Probá ajustar los filtros o limpialos para ver todos los clientes."
            />
            <div v-if="props.hasActiveFilters" class="mt-3 flex justify-center">
              <Button variant="ghost" @click="emit('clear-filters')">
                Limpiar filtros
              </Button>
            </div>
          </td>
        </tr>

        <tr
          v-for="row in props.rows"
          v-else
          :key="row.id"
          class="cursor-pointer border-t border-b-1 transition-colors hover:bg-card-2"
          :data-testid="`client-row-${row.id}`"
          @click="onRowClick(row)"
        >
          <td class="px-4 py-3 font-mono text-t-2">{{ row.docket || '—' }}</td>
          <td class="px-4 py-3 text-t-1">{{ row.name || '—' }}</td>
          <td class="px-4 py-3 font-mono text-t-2">{{ row.tax_number || '—' }}</td>
          <td class="max-w-md truncate px-4 py-3 text-t-3" :title="row.email ?? ''">
            {{ row.email || '—' }}
          </td>
          <td class="px-4 py-3">
            <PortalStatusChip :status="row.portal_status" />
          </td>
          <td class="px-4 py-3">
            <Badge :variant="row.is_active ? 'success' : 'danger'">
              {{ row.is_active ? 'Activo' : 'Inactivo' }}
            </Badge>
          </td>
          <td class="px-4 py-3 text-center" @click.stop>
            <div class="flex items-center justify-center">
              <ManifestActionsMenu
                :manifest-key="props.manifestKey"
                :record="row as unknown as Record<string, unknown>"
                variant="table"
                :data-testid="`client-row-${row.id}-actions`"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
