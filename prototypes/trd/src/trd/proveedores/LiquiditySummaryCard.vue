<script setup lang="ts">
import type { LiquidityOperation } from '@/types/liquidity';

defineProps<{ operation: LiquidityOperation }>();

function formatAmount(value: string, currency: string): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return `${value} ${currency}`;
  return `${new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: currency === 'ARS' ? 0 : 2,
  }).format(num)} ${currency}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
</script>

<template>
  <section data-testid="liquidity-summary">
    <dl class="grid grid-cols-[140px_1fr] gap-x-6 gap-y-3 text-[13px]">
      <dt class="font-medium text-t-4">ID</dt>
      <dd class="font-mono text-t-2">{{ operation.id }}</dd>

      <dt class="font-medium text-t-4">Proveedor</dt>
      <dd class="font-semibold text-t-1">{{ operation.provider_name }}</dd>

      <dt class="font-medium text-t-4">Tipo</dt>
      <dd>
        <span
          :class="operation.operation_type === 'BUY' ? 'text-success' : 'text-danger'"
          class="font-semibold"
        >
          {{ operation.operation_type }}
        </span>
      </dd>

      <dt class="font-medium text-t-4">Par</dt>
      <dd class="text-t-2">{{ operation.base_currency_code }} / {{ operation.quote_currency_code }}</dd>

      <dt class="font-medium text-t-4">Monto</dt>
      <dd class="font-mono text-t-2">
        {{ formatAmount(operation.origin_amount, operation.base_currency_code) }}
      </dd>

      <dt class="font-medium text-t-4">Tipo de cambio</dt>
      <dd class="font-mono text-t-2">{{ operation.exchange_rate }}</dd>

      <dt class="font-medium text-t-4">Contravalor</dt>
      <dd class="font-mono text-t-2">
        {{ formatAmount(operation.destination_amount, operation.quote_currency_code) }}
      </dd>

      <dt class="font-medium text-t-4">Plazo</dt>
      <dd class="text-t-2">{{ operation.term }}</dd>

      <dt class="font-medium text-t-4">Fecha op.</dt>
      <dd class="text-t-2">{{ formatDate(operation.operation_date) }}</dd>

      <dt class="font-medium text-t-4">Liquidación</dt>
      <dd class="text-t-2">{{ formatDate(operation.settlement_date) }}</dd>

      <dt v-if="operation.ardua_company" class="font-medium text-t-4">Empresa</dt>
      <dd v-if="operation.ardua_company" class="text-t-2">{{ operation.ardua_company }}</dd>

      <template v-if="operation.notes">
        <dt class="font-medium text-t-4">Notas</dt>
        <dd class="text-t-2">{{ operation.notes }}</dd>
      </template>
    </dl>
  </section>
</template>
