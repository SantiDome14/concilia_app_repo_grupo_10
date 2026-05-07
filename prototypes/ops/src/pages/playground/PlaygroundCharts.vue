<script setup lang="ts">
import PlaygroundCard from './PlaygroundCard.vue';
import {
  LineChart,
  BarChart,
  AreaChart,
  PieChart,
} from '@/components/data-display';

// ════════════════════════════════════════════════════════════════════
// PlaygroundCharts — showroom for chart wrappers (Unovis-backed)
// ────────────────────────────────────────────────────────────────────
// Each chart in default + multi-series + edge-case (empty data).
// Series colors auto-resolve to var(--chart-1..--chart-N) tokens.
// ════════════════════════════════════════════════════════════════════

interface QuotePoint extends Record<string, unknown> {
  date: number; // ms epoch for ordinal X
  buy: number;
  sell: number;
}

const monthMs = (m: number): number => new Date(2026, m - 1, 1).getTime();
const quotesData: QuotePoint[] = [
  { date: monthMs(1), buy: 120, sell: 80 },
  { date: monthMs(2), buy: 145, sell: 110 },
  { date: monthMs(3), buy: 138, sell: 132 },
  { date: monthMs(4), buy: 170, sell: 150 },
  { date: monthMs(5), buy: 195, sell: 165 },
];

interface CategoryPoint extends Record<string, unknown> {
  category: string;
  amount: number;
}
const categoryData: CategoryPoint[] = [
  { category: 'Operativos', amount: 4200 },
  { category: 'Ventas', amount: 3100 },
  { category: 'Mantenimiento', amount: 1800 },
  { category: 'Inversión', amount: 2400 },
];

interface DistributionSlice extends Record<string, unknown> {
  label: string;
  value: number;
}
const distributionData: DistributionSlice[] = [
  { label: 'BTC', value: 35 },
  { label: 'USDT', value: 28 },
  { label: 'USD', value: 22 },
  { label: 'ARS', value: 10 },
  { label: 'EUR', value: 5 },
];

const emptyData: QuotePoint[] = [];
</script>

<template>
  <div class="space-y-8 px-6 py-6">
    <header class="space-y-1">
      <h1 class="text-xl font-bold text-t-1">Charts — Unovis wrappers</h1>
      <p class="text-sm text-t-3">
        4 wrappers canónicos. Cada serie auto-asigna su color al token
        <code class="rounded bg-card-2 px-1.5 py-0.5 font-mono text-[11px]">--chart-N</code>
        en orden de declaración. Hardcoded hex está prohibido por el spec.
      </p>
    </header>

    <!-- ─── LineChart ─── -->
    <section class="space-y-3">
      <h2 class="text-base font-bold text-t-1">LineChart</h2>
      <div class="grid gap-4 lg:grid-cols-2">
        <PlaygroundCard
          title="Single series"
          description="yAccessor → 1 serie. Color automático: --chart-1."
        >
          <div class="h-64 w-full">
            <LineChart
              :data="quotesData"
              :x-accessor="(d) => d.date"
              :y-accessor="(d) => d.buy"
              title="Volumen de compras"
              description="Mensual 2026"
            />
          </div>
        </PlaygroundCard>

        <PlaygroundCard
          title="Multi-series"
          description="series → 2 líneas. Colores: --chart-1, --chart-2."
        >
          <div class="h-64 w-full">
            <LineChart
              :data="quotesData"
              :x-accessor="(d) => d.date"
              :series="[
                { name: 'Compras', accessor: (d) => d.buy },
                { name: 'Ventas', accessor: (d) => d.sell },
              ]"
              title="Compras vs Ventas"
            />
          </div>
        </PlaygroundCard>

        <PlaygroundCard
          title="Empty data → EmptyState"
          description="data: [] renderea EmptyState canónico, no canvas vacío."
        >
          <div class="h-64 w-full">
            <LineChart
              :data="emptyData"
              :x-accessor="(d) => d.date"
              :y-accessor="(d) => d.buy"
            />
          </div>
        </PlaygroundCard>

        <PlaygroundCard
          title="Custom colors via semantic aliases"
          description="colors: ['success', 'danger']."
        >
          <div class="h-64 w-full">
            <LineChart
              :data="quotesData"
              :x-accessor="(d) => d.date"
              :series="[
                { name: 'Compras', accessor: (d) => d.buy },
                { name: 'Ventas', accessor: (d) => d.sell },
              ]"
              :colors="['success', 'danger']"
            />
          </div>
        </PlaygroundCard>
      </div>
    </section>

    <!-- ─── BarChart ─── -->
    <section class="space-y-3">
      <h2 class="text-base font-bold text-t-1">BarChart</h2>
      <div class="grid gap-4 lg:grid-cols-2">
        <PlaygroundCard
          title="Vertical, grouped (default)"
          description="Single series sobre eje categórico."
        >
          <div class="h-64 w-full">
            <BarChart
              :data="categoryData"
              :x-accessor="(d) => d.category"
              :y-accessor="(d) => d.amount"
              title="Gastos por categoría"
            />
          </div>
        </PlaygroundCard>

        <PlaygroundCard
          title="Stacked, multi-series"
          description="mode='stacked' apila series."
        >
          <div class="h-64 w-full">
            <BarChart
              :data="quotesData"
              :x-accessor="(d) => d.date"
              :series="[
                { name: 'Compras', accessor: (d) => d.buy },
                { name: 'Ventas', accessor: (d) => d.sell },
              ]"
              mode="stacked"
              title="Volumen apilado"
            />
          </div>
        </PlaygroundCard>
      </div>
    </section>

    <!-- ─── AreaChart ─── -->
    <section class="space-y-3">
      <h2 class="text-base font-bold text-t-1">AreaChart</h2>
      <div class="grid gap-4 lg:grid-cols-2">
        <PlaygroundCard title="Single series con fill">
          <div class="h-64 w-full">
            <AreaChart
              :data="quotesData"
              :x-accessor="(d) => d.date"
              :y-accessor="(d) => d.buy"
              title="Cash flow"
            />
          </div>
        </PlaygroundCard>

        <PlaygroundCard title="Multi-series">
          <div class="h-64 w-full">
            <AreaChart
              :data="quotesData"
              :x-accessor="(d) => d.date"
              :series="[
                { name: 'Compras', accessor: (d) => d.buy },
                { name: 'Ventas', accessor: (d) => d.sell },
              ]"
            />
          </div>
        </PlaygroundCard>
      </div>
    </section>

    <!-- ─── PieChart ─── -->
    <section class="space-y-3">
      <h2 class="text-base font-bold text-t-1">PieChart</h2>
      <div class="grid gap-4 lg:grid-cols-2">
        <PlaygroundCard
          title="Pie completo"
          description="innerRadius: 0 (default)."
        >
          <div class="h-64 w-full">
            <PieChart
              :data="distributionData"
              :x-accessor="(d) => d.label"
              :y-accessor="(d) => d.value"
              title="Distribución de balance"
            />
          </div>
        </PlaygroundCard>

        <PlaygroundCard
          title="Donut variant"
          description="innerRadius: 60 px."
        >
          <div class="h-64 w-full">
            <PieChart
              :data="distributionData"
              :x-accessor="(d) => d.label"
              :y-accessor="(d) => d.value"
              :inner-radius="60"
              title="Distribución (donut)"
            />
          </div>
        </PlaygroundCard>
      </div>
    </section>
  </div>
</template>
