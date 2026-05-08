<script setup lang="ts">
import type { ClientMovement } from './types';

// ════════════════════════════════════════════════════════════════════
// RecentMovementsTable — implements Requirement 6 (recent movements
// section composition) read-only per Decision 6: rows render with
// `cursor-default` and no hover effect because the canonical movement
// detail modal belongs to `ops-financial-dashboard` (not yet migrated).
// When that capability lands, this component is extended to emit
// `row-click` and the page wires the modal opening.
// ════════════════════════════════════════════════════════════════════

defineProps<{
  movements: ClientMovement[];
}>();
</script>

<template>
  <div class="overflow-hidden rounded-lg border border-b-2 bg-card">
    <table class="w-full text-sm">
      <thead class="border-b border-b-2 text-[10px] font-bold uppercase tracking-wider text-t-4">
        <tr>
          <th class="px-4 py-2.5 text-left">Fecha</th>
          <th class="px-4 py-2.5 text-left">Contraparte</th>
          <th class="px-4 py-2.5 text-left">Tipo</th>
          <th class="px-4 py-2.5 text-right">Monto</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-b-1">
        <tr
          v-for="movement in movements"
          :key="movement.id"
          class="cursor-default transition-colors"
          :data-testid="`movement-row-${movement.id}`"
        >
          <td class="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-t-3">
            {{ movement.date }}
          </td>
          <td class="max-w-[180px] truncate px-4 py-2.5 text-xs uppercase tracking-wide text-t-2">
            {{ movement.counterparty_name || '—' }}
          </td>
          <td class="px-4 py-2.5 text-xs text-t-3">{{ movement.type || '—' }}</td>
          <td class="whitespace-nowrap px-4 py-2.5 text-right font-mono text-xs text-t-1">
            {{ movement.amount }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
