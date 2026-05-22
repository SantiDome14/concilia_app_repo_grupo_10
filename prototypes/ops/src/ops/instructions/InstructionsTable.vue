<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Skeleton from '@/components/feedback/Skeleton.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { ManifestActionsMenu } from '@/components/manifest';
import type { Instruction, InstructionStatus } from './types';

// `Badge` is used for the status chip. The `attributes_count` is
// intentionally NOT rendered in the table — it surfaces in the detail
// modal instead.

// ════════════════════════════════════════════════════════════════════
// InstructionsTable — Lista view for the Instrucciones page.
// ────────────────────────────────────────────────────────────────────
// Columns: Nombre · Proveedor · Moneda · Descripción · Estado · Acciones.
// `attributes_count` stays on the record (surfaced in the detail modal)
// but is intentionally NOT a column — the canonical row shape stays
// flat. Per-row actions surface through <ManifestActionsMenu> wired to
// the `ops.instructions` manifest passed in via `manifestKey` (canonical
// pattern — the inline Edit/Eliminar Popover was retired in favour of
// the engine flow).
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  rows: Instruction[];
  isLoading: boolean;
  hasActiveFilters: boolean;
  currencyLabels: Record<string, string>;
  manifestKey: string;
}>();

const emit = defineEmits<{
  'row-click': [instruction: Instruction];
  'clear-filters': [];
}>();

const STATUS_LABELS: Record<InstructionStatus, string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
};

function statusVariant(
  status: InstructionStatus,
): 'success' | 'warning' | 'neutral' {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'DRAFT':
      return 'warning';
    case 'INACTIVE':
      return 'neutral';
  }
}
</script>

<template>
  <div class="rounded-lg border border-b-2 bg-card">
    <table class="w-full table-auto text-sm">
      <thead class="border-b border-b-2 text-[10px] font-bold uppercase tracking-wider text-t-4">
        <tr>
          <th class="px-4 py-3 text-left">Nombre</th>
          <th class="px-4 py-3 text-left">Proveedor</th>
          <th class="px-4 py-3 text-left">Moneda</th>
          <th class="px-4 py-3 text-left">Descripción</th>
          <th class="px-4 py-3 text-left">Estado</th>
          <th class="w-12 px-4 py-3 text-center">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <template v-if="props.isLoading">
          <tr v-for="i in 5" :key="`skeleton-${i}`">
            <td class="px-4 py-3"><Skeleton class="h-4 w-32" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-20" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-12" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-48" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-16" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-6" /></td>
          </tr>
        </template>

        <tr v-else-if="props.rows.length === 0">
          <td :colspan="6" class="px-4 py-8">
            <EmptyState
              v-if="!props.hasActiveFilters"
              title="No hay instrucciones cargadas"
              description="Hacé click en Crear instrucción para empezar"
            />
            <EmptyState
              v-else
              title="Sin resultados para los filtros aplicados"
              description="Probá ajustar los filtros o limpialos."
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
          :data-testid="`instruction-row-${row.id}`"
          @click="emit('row-click', row)"
        >
          <td class="px-4 py-3 text-t-1">{{ row.name }}</td>
          <td class="px-4 py-3 text-t-2">{{ row.provider || '—' }}</td>
          <td class="px-4 py-3 text-t-2">
            {{ props.currencyLabels[row.currency_id] ?? row.currency_id }}
          </td>
          <td class="max-w-md truncate px-4 py-3 text-t-3" :title="row.description ?? ''">
            {{ row.description || '—' }}
          </td>
          <td class="px-4 py-3">
            <Badge :variant="statusVariant(row.status)">
              {{ STATUS_LABELS[row.status] }}
            </Badge>
          </td>
          <td class="px-4 py-3 text-center" @click.stop>
            <div class="flex items-center justify-center">
              <ManifestActionsMenu
                :manifest-key="props.manifestKey"
                :record="row as unknown as Record<string, unknown>"
                variant="table"
                :data-testid="`instruction-row-${row.id}-actions`"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
