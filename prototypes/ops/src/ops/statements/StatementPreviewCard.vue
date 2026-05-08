<script setup lang="ts">
import type { Account, Client } from '@/ops/clients/types';
import type { DateRange } from './types';

// ════════════════════════════════════════════════════════════════════
// StatementPreviewCard — implements Requirement 8 (Decision 7c).
// In-place confirmation card showing the about-to-be-fired request.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  client: Client;
  account: Account;
  range: DateRange;
}>();

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${day}/${m}/${y}`;
}

function currencyLabel(): string {
  return props.account.currency?.name?.toUpperCase() ?? '???';
}
</script>

<template>
  <div
    class="rounded-lg border border-b-1 bg-card-2 px-4 py-3"
    data-testid="statement-preview-card"
  >
    <div
      class="mb-2 text-[10px] font-bold uppercase tracking-wider text-t-3"
    >
      Resumen
    </div>
    <dl class="grid grid-cols-[80px_1fr] gap-y-1.5 text-xs">
      <dt class="text-t-4">Cliente</dt>
      <dd class="text-t-1">{{ props.client.name || 'Cliente sin nombre' }}</dd>
      <dt class="text-t-4">Cuenta</dt>
      <dd class="font-mono text-t-1">
        {{ props.account.account_number }} · {{ currencyLabel() }}
      </dd>
      <dt class="text-t-4">Período</dt>
      <dd class="font-mono text-t-1">
        {{ formatDate(props.range.from) }} – {{ formatDate(props.range.to) }}
      </dd>
    </dl>
  </div>
</template>
