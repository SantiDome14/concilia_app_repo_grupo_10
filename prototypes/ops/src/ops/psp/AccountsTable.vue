<script setup lang="ts">
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Skeleton from '@/components/feedback/Skeleton.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { ManifestActionsMenu } from '@/components/manifest';
import { getSponsorLabel } from './sponsor-catalog';
import type { PspAccount } from './types';

// ════════════════════════════════════════════════════════════════════
// AccountsTable — CVU-only listing for the PSP Cuentas tab.
// ────────────────────────────────────────────────────────────────────
// CBU-padre rows are intentionally excluded by the page query
// (operator review 2026-05-22) — each row in this table is a CVU
// belonging to a single client. The Parent column resolves the CVU's
// `parent_cbu_id` through the `parentLookup` map passed by the page
// (id → account_number).
//
// Per-row Acciones flow through the manifest engine via
// <ManifestActionsMenu> + the `ops.psp.cuentas` manifest passed by
// the parent as `manifestKey`. The page-side dispatcher intercepts
// the navigation marker.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  rows: PspAccount[];
  isLoading: boolean;
  hasActiveFilters: boolean;
  /** id → CBU account_number lookup so each CVU row can render its parent. */
  parentLookup: Record<string, string>;
  /** Manifest key for the per-row <ManifestActionsMenu>. */
  manifestKey: string;
}>();

const emit = defineEmits<{
  'row-click': [account: PspAccount];
  'clear-filters': [];
}>();

function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const s = status.toUpperCase();
  if (s === 'ACTIVE') return 'success';
  if (s === 'PAUSED') return 'warning';
  if (s === 'INACTIVE' || s === 'BLOCKED') return 'danger';
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

function parentLabel(row: PspAccount): string {
  if (!row.parent_cbu_id) return '—';
  return props.parentLookup[row.parent_cbu_id] ?? row.parent_cbu_id;
}
</script>

<template>
  <div class="rounded-lg border border-b-2 bg-card">
    <table class="w-full table-auto text-sm">
      <thead class="border-b border-b-2 text-[10px] font-bold uppercase tracking-wider text-t-4">
        <tr>
          <th class="px-4 py-3 text-left">Cuenta</th>
          <th class="px-4 py-3 text-left">Parent</th>
          <th class="px-4 py-3 text-left">Partner</th>
          <th class="px-4 py-3 text-left">Currency</th>
          <th class="px-4 py-3 text-right">Balance</th>
          <th class="px-4 py-3 text-left">Cliente</th>
          <th class="px-4 py-3 text-left">Estado</th>
          <th class="px-4 py-3 text-center">Acciones</th>
        </tr>
      </thead>
      <tbody>
        <template v-if="props.isLoading">
          <tr v-for="i in 5" :key="`skeleton-${i}`">
            <td class="px-4 py-3"><Skeleton class="h-4 w-40" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-32" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-16" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-12" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-20" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-32" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-16" /></td>
            <td class="px-4 py-3"><Skeleton class="h-4 w-24" /></td>
          </tr>
        </template>

        <tr v-else-if="props.rows.length === 0">
          <td :colspan="8" class="px-4 py-8">
            <EmptyState
              v-if="!props.hasActiveFilters"
              title="Sin cuentas"
              description="No hay cuentas operativas"
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
          :data-testid="`account-row-${row.id}`"
          @click="emit('row-click', row)"
        >
          <td class="px-4 py-3 font-mono text-t-1">{{ row.account_number }}</td>
          <td class="px-4 py-3 font-mono text-[11px] text-t-3" :title="row.parent_cbu_id ?? ''">
            {{ parentLabel(row) }}
          </td>
          <td class="px-4 py-3 text-t-2">{{ getSponsorLabel(row.sponsor) }}</td>
          <td class="px-4 py-3 text-t-2">{{ row.currency || '—' }}</td>
          <td class="px-4 py-3 text-right font-mono text-t-1">${{ formatAmount(row.balance) }}</td>
          <td class="max-w-[180px] truncate px-4 py-3 text-t-3" :title="row.owner ?? ''">
            {{ row.owner || '—' }}
          </td>
          <td class="px-4 py-3">
            <Badge :variant="statusVariant(row.status)">{{ row.status || '—' }}</Badge>
          </td>
          <td class="px-4 py-3 text-center" @click.stop>
            <div class="flex items-center justify-center">
              <ManifestActionsMenu
                :manifest-key="props.manifestKey"
                :record="row as unknown as Record<string, unknown>"
                variant="table"
                :data-testid="`account-row-${row.id}-actions`"
              />
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
