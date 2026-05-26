<script setup lang="ts">
import { computed } from 'vue';
import { TrendingUp, TrendingDown, Clock, CheckCircle2, BarChart3 } from 'lucide-vue-next';
import type { LiquiditySummary } from '@/types/liquidity';

// ════════════════════════════════════════════════════════════════════
// <LiquidityKpiCards> — REQ-1 §3 "2 cards compuestos" + REQ-35 ARS
// ────────────────────────────────────────────────────────────────────
// Card 1: Operaciones (count) + Pendientes + Recibidos.
// Card 2: Total USD + BUY USD + SELL USD with a second line for the
//   ARS contravalor when the filter resolves to a single non-USD-quote
//   pair (REQ-35).
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  summary: LiquiditySummary;
}>();

function formatNumber(value: string, currency = ''): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return `${value} ${currency}`.trim();
  const formatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: currency === 'ARS' ? 0 : 2,
  }).format(num);
  return currency ? `${formatted} ${currency}` : formatted;
}

const hasSecondary = computed(
  () =>
    !!props.summary.secondary_currency &&
    !!props.summary.total_secondary,
);
</script>

<template>
  <div class="grid gap-3.5 lg:grid-cols-2" data-testid="liquidity-kpi-cards">
    <!-- Card 1: Operaciones + breakdown by estado -->
    <article
      class="flex flex-col gap-4 rounded-[10px] border border-b-2 bg-card-2 p-5"
      data-testid="liquidity-kpi-card-1"
    >
      <div class="flex items-center gap-2">
        <BarChart3 class="h-4 w-4 text-t-3" />
        <h3 class="text-[11px] font-bold uppercase tracking-wider text-t-3">
          Operaciones
        </h3>
      </div>
      <div class="grid grid-cols-3 gap-5">
        <div>
          <div class="text-[26px] font-extrabold leading-none text-t-1" data-testid="kpi-total-ops">
            {{ formatNumber(String(summary.total_operations)) }}
          </div>
          <div class="mt-1 text-[10px] font-bold uppercase tracking-wider text-t-4">
            Total
          </div>
        </div>
        <div class="border-l border-b-1 pl-5">
          <div class="flex items-center gap-2">
            <Clock class="h-3.5 w-3.5 text-warning" />
            <div class="text-xl font-extrabold leading-none text-warning" data-testid="kpi-pending">
              {{ summary.pending_count }}
            </div>
          </div>
          <div class="mt-1 text-[10px] font-bold uppercase tracking-wider text-t-4">
            Pendientes
          </div>
        </div>
        <div class="border-l border-b-1 pl-5">
          <div class="flex items-center gap-2">
            <CheckCircle2 class="h-3.5 w-3.5 text-success" />
            <div class="text-xl font-extrabold leading-none text-success" data-testid="kpi-received">
              {{ summary.received_count }}
            </div>
          </div>
          <div class="mt-1 text-[10px] font-bold uppercase tracking-wider text-t-4">
            Recibidos
          </div>
        </div>
      </div>
    </article>

    <!-- Card 2: Total / BUY / SELL USD + REQ-35 ARS contravalor -->
    <article
      class="flex flex-col gap-4 rounded-[10px] border border-b-2 bg-card-2 p-5"
      data-testid="liquidity-kpi-card-2"
    >
      <div class="flex items-center gap-2">
        <BarChart3 class="h-4 w-4 text-t-3" />
        <h3 class="text-[11px] font-bold uppercase tracking-wider text-t-3">
          Volumen
        </h3>
        <span
          v-if="hasSecondary"
          class="ml-auto rounded bg-brand-bg px-2 py-0.5 text-[10px] font-bold text-brand"
          data-testid="kpi-secondary-badge"
        >
          + {{ summary.secondary_currency }}
        </span>
      </div>

      <div class="grid grid-cols-3 gap-5">
        <div>
          <div class="font-mono text-base font-bold leading-tight text-t-1" data-testid="kpi-total-usd">
            {{ formatNumber(summary.total_usd, 'USD') }}
          </div>
          <div
            v-if="hasSecondary"
            class="mt-1 font-mono text-xs text-t-4"
            data-testid="kpi-total-secondary"
          >
            {{ formatNumber(summary.total_secondary!, summary.secondary_currency!) }}
          </div>
          <div class="mt-2 text-[10px] font-bold uppercase tracking-wider text-t-4">
            Total
          </div>
        </div>

        <div class="border-l border-b-1 pl-5">
          <div class="flex items-center gap-1.5">
            <TrendingUp class="h-3.5 w-3.5 text-success" />
            <div class="font-mono text-base font-bold leading-tight text-success" data-testid="kpi-buy-usd">
              {{ formatNumber(summary.usd_bought, 'USD') }}
            </div>
          </div>
          <div
            v-if="hasSecondary"
            class="mt-1 font-mono text-xs text-t-4"
            data-testid="kpi-buy-secondary"
          >
            {{ formatNumber(summary.secondary_bought!, summary.secondary_currency!) }}
          </div>
          <div class="mt-2 text-[10px] font-bold uppercase tracking-wider text-t-4">
            BUY
          </div>
        </div>

        <div class="border-l border-b-1 pl-5">
          <div class="flex items-center gap-1.5">
            <TrendingDown class="h-3.5 w-3.5 text-danger" />
            <div class="font-mono text-base font-bold leading-tight text-danger" data-testid="kpi-sell-usd">
              {{ formatNumber(summary.usd_sold, 'USD') }}
            </div>
          </div>
          <div
            v-if="hasSecondary"
            class="mt-1 font-mono text-xs text-t-4"
            data-testid="kpi-sell-secondary"
          >
            {{ formatNumber(summary.secondary_sold!, summary.secondary_currency!) }}
          </div>
          <div class="mt-2 text-[10px] font-bold uppercase tracking-wider text-t-4">
            SELL
          </div>
        </div>
      </div>
    </article>
  </div>
</template>
