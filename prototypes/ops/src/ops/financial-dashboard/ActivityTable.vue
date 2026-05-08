<script setup lang="ts">
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Skeleton from '@/components/feedback/Skeleton.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { getSponsorLabel } from '@/ops/psp/sponsor-catalog';
import type { Movement } from './types';

// ════════════════════════════════════════════════════════════════════
// ActivityTable — implements part of Requirement 3 + Requirement 4
// (row click opens MovementDetailsModal — parent listens to @row-click).
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  rows: Movement[];
  isLoading: boolean;
  hasActiveFilters: boolean;
}>();

const emit = defineEmits<{
  'row-click': [movement: Movement];
  'clear-filters': [];
}>();

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const s = status.toUpperCase();
  if (s === 'COMPLETED') return 'success';
  if (s === 'PENDING') return 'warning';
  if (s === 'FAILED' || s === 'CANCELLED') return 'danger';
  return 'neutral';
}

function formatAmount(value: string): string {
  const num = Number.parseFloat(value);
  if (!Number.isFinite(num)) return value;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
</script>

<template>
  <div class="rounded-lg border border-b-2 bg-card">
    <table class="w-full table-auto text-sm">
      <thead class="border-b border-b-2 text-[10px] font-bold uppercase tracking-wider text-t-4">
        <tr>
          <th class="px-4 py-3 text-left">Fecha</th>
          <th class="px-4 py-3 text-left">Tipo</th>
          <th class="px-4 py-3 text-left">Origen</th>
          <th class="px-4 py-3 text-left">Destino</th>
          <th class="px-4 py-3 text-left">Moneda</th>
          <th class="px-4 py-3 text-right">Monto</th>
          <th class="px-4 py-3 text-left">Estado</th>
          <th class="px-4 py-3 text-left">Sponsor</th>
          <th class="px-4 py-3 text-left">Cliente</th>
        </tr>
      </thead>
      <tbody>
        <template v-if="props.isLoading">
          <tr v-for="i in 5" :key="`skeleton-${i}`">
            <td class="px-4 py-3"><Skeleton class="h-4 w-24" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-16" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-28" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-28" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-12" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-20" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-20" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-16" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-32" /></td>
          </tr>
        </template>

        <tr v-else-if="props.rows.length === 0">
          <td :colspan="9" class="px-4 py-8">
            <EmptyState
              v-if="!props.hasActiveFilters"
              title="Sin movimientos"
              description="No hay movimientos cargados"
            />
            <EmptyState
              v-else
              title="Sin resultados para los filtros aplicados"
              description="Probá ajustar o limpiar los filtros"
            />
            <div v-if="props.hasActiveFilters" class="mt-3 flex justify-center">
              <Button variant="ghost" @click="emit('clear-filters')">Limpiar filtros</Button>
            </div>
          </td>
        </tr>

        <tr
          v-for="row in props.rows"
          v-else
          :key="row.id"
          class="cursor-pointer border-t border-b-1 transition-colors hover:bg-card-2"
          :data-testid="`movement-row-${row.id}`"
          @click="emit('row-click', row)"
        >
          <td class="whitespace-nowrap px-4 py-3 font-mono text-xs text-t-3">{{ row.date }}</td>
          <td class="px-4 py-3 text-t-2">{{ row.type || '—' }}</td>
          <td class="max-w-[180px] truncate px-4 py-3 text-t-3" :title="row.origin ?? ''">
            {{ row.origin || '—' }}
          </td>
          <td class="max-w-[180px] truncate px-4 py-3 text-t-3" :title="row.destination ?? ''">
            {{ row.destination || '—' }}
          </td>
          <td class="px-4 py-3 text-t-2">{{ row.currency || '—' }}</td>
          <td class="whitespace-nowrap px-4 py-3 text-right font-mono text-t-1">
            ${{ formatAmount(row.amount) }}
          </td>
          <td class="px-4 py-3">
            <Badge :variant="statusVariant(row.status)">{{ row.status || '—' }}</Badge>
          </td>
          <td class="px-4 py-3 text-t-2">{{ getSponsorLabel(row.sponsor) }}</td>
          <td class="max-w-[180px] truncate px-4 py-3 text-t-2" :title="row.client ?? ''">
            {{ row.client || '—' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
