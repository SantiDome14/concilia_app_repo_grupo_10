<script setup lang="ts">
import type { Quote } from '@/types/quote';

defineProps<{ quote: Quote }>();

function formatAmount(value: string, currency: string): string {
  // The amounts are stored as plain strings to preserve precision; the
  // legacy `core-trd-frontend` displays them with thousand separators
  // and currency code suffix. Use Intl.NumberFormat for locale-aware
  // rendering but stay defensive against non-numeric input.
  const num = Number(value);
  if (!Number.isFinite(num)) return `${value} ${currency}`;
  const formatter = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: currency === 'ARS' ? 0 : 2,
  });
  return `${formatter.format(num)} ${currency}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<template>
  <section data-testid="quote-summary">
    <dl class="grid grid-cols-[140px_1fr] gap-x-6 gap-y-3 text-[13px]">
      <dt class="font-medium text-t-4">ID</dt>
      <dd class="font-mono text-t-2">{{ quote.id }}</dd>

      <dt class="font-medium text-t-4">Cliente</dt>
      <dd class="font-semibold text-t-1">
        {{ quote.client_name }}
        <span v-if="quote.ardua_docket" class="ml-1 font-mono text-xs text-t-4">
          ({{ quote.ardua_docket }})
        </span>
      </dd>

      <dt class="font-medium text-t-4">Operación</dt>
      <dd>
        <span
          :class="
            quote.operation === 'BUY'
              ? 'text-success'
              : 'text-danger'
          "
          class="font-semibold"
        >
          {{ quote.operation }}
        </span>
      </dd>

      <dt class="font-medium text-t-4">Origen</dt>
      <dd class="font-mono text-t-2">{{ formatAmount(quote.origin_amount, quote.origin_currency) }}</dd>

      <dt class="font-medium text-t-4">Destino</dt>
      <dd class="font-mono text-t-2">{{ formatAmount(quote.destination_amount, quote.destination_currency) }}</dd>

      <dt class="font-medium text-t-4">Tipo de cambio</dt>
      <dd class="font-mono text-t-2">{{ quote.exchange_rate }}</dd>

      <dt class="font-medium text-t-4">Plazo</dt>
      <dd class="text-t-2">{{ quote.term }}</dd>

      <dt class="font-medium text-t-4">Creada</dt>
      <dd class="text-t-2">{{ formatDate(quote.created_at) }}</dd>

      <dt class="font-medium text-t-4">Liquidación</dt>
      <dd class="text-t-2">{{ formatDate(quote.liquidate_date) }}</dd>

      <template v-if="quote.notes">
        <dt class="font-medium text-t-4">Notas</dt>
        <dd class="text-t-2">{{ quote.notes }}</dd>
      </template>

      <template v-if="quote.ccc_group_id">
        <dt class="font-medium text-t-4">CCC</dt>
        <dd>
          <span class="rounded bg-info-bg px-2 py-0.5 text-[11px] font-bold text-info">
            Grupo {{ quote.ccc_group_id }}
          </span>
        </dd>
      </template>
    </dl>
  </section>
</template>
