<script setup lang="ts">
import { Badge } from '@/components/ui/badge';
import Skeleton from '@/components/feedback/Skeleton.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import type { Quote } from './types';

// ════════════════════════════════════════════════════════════════════
// CotizacionesTable — implements Requirement 5 + Requirement 6.
// Read-only in v1 (cursor-default) — quote action modals are deferred
// per `add-ops-cotizaciones` proposal "Removed from scope".
// Status badge surfaces a tooltip explaining the deferral (Decision 6d).
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  rows: Quote[];
  isLoading: boolean;
}>();

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const s = status.toUpperCase();
  if (s === 'ACCEPTED') return 'success';
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
  <div class="rounded-lg border border-b-2 bg-card">
    <table class="w-full table-auto text-sm">
      <thead class="border-b border-b-2 text-[10px] font-bold uppercase tracking-wider text-t-4">
        <tr>
          <th class="px-4 py-3 text-left">Cliente</th>
          <th class="px-4 py-3 text-left">Par</th>
          <th class="px-4 py-3 text-left">Operación</th>
          <th class="px-4 py-3 text-left">Term</th>
          <th class="px-4 py-3 text-right">Monto</th>
          <th class="px-4 py-3 text-right">Rate</th>
          <th class="px-4 py-3 text-right">Calculado</th>
          <th class="px-4 py-3 text-left">Estado</th>
          <th class="px-4 py-3 text-left">Fecha</th>
        </tr>
      </thead>
      <tbody>
        <template v-if="props.isLoading">
          <tr v-for="i in 5" :key="`skeleton-${i}`">
            <td class="px-4 py-3"><Skeleton class="h-4 w-32" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-16" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-12" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-12" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-20" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-16" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-20" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-16" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-24" /></td>
          </tr>
        </template>

        <tr v-else-if="props.rows.length === 0">
          <td :colspan="9" class="px-4 py-8">
            <EmptyState
              title="Sin quotes"
              description="No hay quotes para los filtros aplicados"
            />
          </td>
        </tr>

        <tr
          v-for="row in props.rows"
          v-else
          :key="row.id"
          class="cursor-default border-t border-b-1"
          :data-testid="`quote-row-${row.id}`"
        >
          <td class="max-w-[180px] truncate px-4 py-3 text-t-1" :title="row.client_name ?? ''">
            {{ row.client_name || '—' }}
          </td>
          <td class="px-4 py-3 font-mono text-t-2">
            {{ row.origin_currency }}/{{ row.destination_currency }}
          </td>
          <td class="px-4 py-3">
            <Badge :variant="operationVariant(row.operation)">{{ row.operation || '—' }}</Badge>
          </td>
          <td class="px-4 py-3 text-t-3">{{ row.term || '—' }}</td>
          <td class="whitespace-nowrap px-4 py-3 text-right font-mono text-t-1">
            {{ row.origin_currency }} ${{ formatAmount(row.origin_amount) }}
          </td>
          <td class="whitespace-nowrap px-4 py-3 text-right font-mono text-t-2">
            {{ formatAmount(row.exchange_rate) }}
          </td>
          <td class="whitespace-nowrap px-4 py-3 text-right font-mono text-t-1">
            {{ row.destination_currency }} ${{ formatAmount(row.destination_amount) }}
          </td>
          <td class="px-4 py-3">
            <span :title="'Acciones de quote disponibles próximamente'">
              <Badge :variant="statusVariant(row.status)">{{ row.status || '—' }}</Badge>
            </span>
          </td>
          <td class="whitespace-nowrap px-4 py-3 font-mono text-xs text-t-3">
            {{ formatDate(row.created_at) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
