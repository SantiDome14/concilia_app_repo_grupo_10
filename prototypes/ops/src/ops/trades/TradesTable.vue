<script setup lang="ts">
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Skeleton from '@/components/feedback/Skeleton.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { ManifestActionsMenu } from '@/components/manifest';
import type { Quote } from './types';

// ════════════════════════════════════════════════════════════════════
// TradesTable — Lista view
// ────────────────────────────────────────────────────────────────────
// Columns (operator review 2026-05-22): ID · Fecha · Cliente · Operación ·
// Par · Término · Monto · TC · Calculated · Status · Acciones. Per-row
// Acciones surfaced through <ManifestActionsMenu> wired to the
// ops.trades manifest passed by the parent page.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  rows: Quote[];
  isLoading: boolean;
  hasActiveFilters: boolean;
  manifestKey: string;
}>();

const emit = defineEmits<{
  'row-click': [quote: Quote];
  'clear-filters': [];
}>();

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const s = status.toUpperCase();
  if (s === 'COMPLETED' || s === 'ACCEPTED') return 'success';
  if (s === 'PENDING') return 'warning';
  if (s === 'REJECTED' || s === 'EXPIRED' || s === 'CANCELLED') return 'danger';
  return 'neutral';
}

function operationVariant(operation: string): 'success' | 'danger' | 'neutral' {
  const o = operation.toUpperCase();
  if (o === 'BUY') return 'success';
  if (o === 'SELL') return 'danger';
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

function formatDate(value: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}
</script>

<template>
  <div class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2" data-testid="trades-table">
    <table class="w-full border-collapse">
      <thead>
        <tr class="border-b border-b-2">
          <th class="px-[18px] py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">ID</th>
          <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Fecha</th>
          <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Cliente</th>
          <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Operación</th>
          <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Par</th>
          <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Término</th>
          <th class="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Monto</th>
          <th class="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">TC</th>
          <th class="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Calculated</th>
          <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Status</th>
          <th class="px-3.5 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-t-3">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <template v-if="props.isLoading">
          <tr v-for="i in 5" :key="`skeleton-${i}`">
            <td class="px-[18px] py-2.5"><Skeleton class="h-4 w-16" /></td>
            <td class="px-3.5 py-2.5"><Skeleton class="h-4 w-24" /></td>
            <td class="px-3.5 py-2.5"><Skeleton class="h-4 w-32" /></td>
            <td class="px-3.5 py-2.5"><Skeleton class="h-4 w-12" /></td>
            <td class="px-3.5 py-2.5"><Skeleton class="h-4 w-16" /></td>
            <td class="px-3.5 py-2.5"><Skeleton class="h-4 w-10" /></td>
            <td class="px-3.5 py-2.5"><Skeleton class="h-4 w-20" /></td>
            <td class="px-3.5 py-2.5"><Skeleton class="h-4 w-16" /></td>
            <td class="px-3.5 py-2.5"><Skeleton class="h-4 w-20" /></td>
            <td class="px-3.5 py-2.5"><Skeleton class="h-4 w-16" /></td>
            <td class="px-3.5 py-2.5"><Skeleton class="h-4 w-6" /></td>
          </tr>
        </template>

        <tr v-else-if="props.rows.length === 0">
          <td :colspan="11" class="px-[18px] py-8">
            <EmptyState
              v-if="!props.hasActiveFilters"
              title="Sin cotizaciones"
              description="No hay cotizaciones cargadas"
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
          :data-testid="`quote-row-${row.id}`"
          @click="emit('row-click', row)"
        >
          <td class="px-[18px] py-2.5 font-mono text-xs text-t-3">{{ row.id }}</td>
          <td class="whitespace-nowrap px-3.5 py-2.5 text-xs text-t-3">{{ formatDate(row.created_at) }}</td>
          <td class="max-w-[200px] truncate px-3.5 py-2.5 text-xs font-semibold text-t-2" :title="row.client_name ?? ''">
            {{ row.client_name || '—' }}
          </td>
          <td class="px-3.5 py-2.5">
            <Badge :variant="operationVariant(row.operation)" class="text-[10px]">
              {{ row.operation || '—' }}
            </Badge>
          </td>
          <td class="px-3.5 py-2.5 font-mono text-xs text-t-2">
            {{ row.origin_currency }}/{{ row.destination_currency }}
          </td>
          <td class="px-3.5 py-2.5 text-xs text-t-3">{{ row.term || '—' }}</td>
          <td class="whitespace-nowrap px-3.5 py-2.5 text-right font-mono text-xs tabular-nums text-t-2">
            {{ formatAmount(row.origin_amount) }} {{ row.origin_currency }}
          </td>
          <td class="whitespace-nowrap px-3.5 py-2.5 text-right font-mono text-xs tabular-nums text-t-3">
            {{ formatAmount(row.exchange_rate) }}
          </td>
          <td class="whitespace-nowrap px-3.5 py-2.5 text-right font-mono text-xs tabular-nums text-t-2">
            {{ formatAmount(row.destination_amount) }} {{ row.destination_currency }}
          </td>
          <td class="px-3.5 py-2.5">
            <Badge :variant="statusVariant(row.status)" class="text-[10px]">
              {{ row.status || '—' }}
            </Badge>
          </td>
          <td class="px-3.5 py-2.5 text-center" @click.stop>
            <div class="flex items-center justify-center">
              <ManifestActionsMenu
                :manifest-key="props.manifestKey"
                :record="row as unknown as Record<string, unknown>"
                variant="table"
                :data-testid="`quote-row-${row.id}-actions`"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
