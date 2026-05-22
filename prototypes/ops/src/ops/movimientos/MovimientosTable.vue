<script setup lang="ts">
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Skeleton from '@/components/feedback/Skeleton.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { ManifestActionsMenu } from '@/components/manifest';
import {
  getMovementTypeLabel,
  getMovementStatusLabel,
  getMovementRailLabel,
} from './catalog';
import type { Movement } from './types';

// ════════════════════════════════════════════════════════════════════
// MovimientosTable — Lista view
// ────────────────────────────────────────────────────────────────────
// Columns (operator review 2026-05-22): ID · Fecha · Cliente · RAIL ·
// Tipo · Monto · Estado · Banco/Cuenta · Acciones. Bank/Cuenta surfaces
// `destination` (the where-it-landed side from OPS' perspective); when
// null we render the "Sin asignar" badge.
//
// Per-row Acciones use the canonical <ManifestActionsMenu> wired to the
// `ops.movimientos` manifest — pages pass the manifest key as a prop
// (see `core-actions-menu`).
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  rows: Movement[];
  isLoading: boolean;
  hasActiveFilters: boolean;
  manifestKey: string;
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

function isInflow(amount: string): boolean {
  return !amount.trim().startsWith('-');
}
</script>

<template>
  <div class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2" data-testid="movimientos-table">
    <table class="w-full border-collapse">
      <thead>
        <tr class="border-b border-b-2">
          <th class="px-[18px] py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">ID</th>
          <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Fecha</th>
          <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Cliente</th>
          <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Rail</th>
          <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Tipo</th>
          <th class="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Monto</th>
          <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Estado</th>
          <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Banco / Cuenta</th>
          <th class="px-3.5 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-t-3">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <template v-if="props.isLoading">
          <tr v-for="i in 5" :key="`skeleton-${i}`">
            <td class="px-[18px] py-2.5"><Skeleton class="h-4 w-20" /></td>
            <td class="px-3.5 py-2.5"><Skeleton class="h-4 w-24" /></td>
            <td class="px-3.5 py-2.5"><Skeleton class="h-4 w-32" /></td>
            <td class="px-3.5 py-2.5"><Skeleton class="h-4 w-16" /></td>
            <td class="px-3.5 py-2.5"><Skeleton class="h-4 w-20" /></td>
            <td class="px-3.5 py-2.5"><Skeleton class="h-4 w-24" /></td>
            <td class="px-3.5 py-2.5"><Skeleton class="h-4 w-20" /></td>
            <td class="px-3.5 py-2.5"><Skeleton class="h-4 w-40" /></td>
            <td class="px-3.5 py-2.5"><Skeleton class="h-4 w-6" /></td>
          </tr>
        </template>

        <tr v-else-if="props.rows.length === 0">
          <td :colspan="9" class="px-[18px] py-8">
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
          class="cursor-pointer border-b border-b-1 transition-colors last:border-b-0 hover:bg-white/[0.02]"
          :data-testid="`movement-row-${row.id}`"
          @click="emit('row-click', row)"
        >
          <td class="px-[18px] py-2.5 font-mono text-xs text-t-3">{{ row.id }}</td>
          <td class="whitespace-nowrap px-3.5 py-2.5 text-xs text-t-3">{{ row.date }}</td>
          <td class="max-w-[200px] truncate px-3.5 py-2.5 text-xs font-semibold text-t-2" :title="row.client ?? ''">
            {{ row.client || '—' }}
          </td>
          <td class="px-3.5 py-2.5">
            <span class="rounded bg-card px-1.5 py-0.5 font-mono text-[10px] font-bold text-t-3">
              {{ getMovementRailLabel(row.rail) }}
            </span>
          </td>
          <td class="px-3.5 py-2.5 text-xs text-t-2">{{ getMovementTypeLabel(row.type) }}</td>
          <td
            class="whitespace-nowrap px-3.5 py-2.5 text-right font-mono text-xs tabular-nums"
            :class="isInflow(row.amount) ? 'text-success' : 'text-danger'"
          >
            {{ isInflow(row.amount) ? '+' : '' }}{{ formatAmount(row.amount) }} {{ row.currency }}
          </td>
          <td class="px-3.5 py-2.5">
            <Badge :variant="statusVariant(row.status)" class="text-[10px]">
              {{ getMovementStatusLabel(row.status) }}
            </Badge>
          </td>
          <td class="max-w-[220px] truncate px-3.5 py-2.5 text-xs text-t-3" :title="row.destination ?? row.origin ?? ''">
            <Badge v-if="!row.destination && !row.origin" variant="warning" class="text-[10px]">
              Sin asignar
            </Badge>
            <template v-else>
              {{ row.destination || row.origin }}
            </template>
          </td>
          <td class="px-3.5 py-2.5 text-center" @click.stop>
            <div class="flex items-center justify-center">
              <ManifestActionsMenu
                :manifest-key="props.manifestKey"
                :record="row as unknown as Record<string, unknown>"
                variant="table"
                :data-testid="`movement-row-${row.id}-actions`"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
