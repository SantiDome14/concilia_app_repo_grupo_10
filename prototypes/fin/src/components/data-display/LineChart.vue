<script setup lang="ts" generic="T extends Record<string, unknown>">
import { computed } from 'vue';
import { VisXYContainer, VisLine, VisAxis, VisTooltip } from '@unovis/vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { resolveSeriesColor, type SeriesColor, type ChartSeries } from './chart-colors';

// ════════════════════════════════════════════════════════════════════
// LineChart — canonical line chart wrapper (Unovis-backed)
// ────────────────────────────────────────────────────────────────────
// Spec: `core-charts`. Single + multi-series via `series`.
// Empty data renders <EmptyState>; never an empty axes canvas.
// Optional tick formatters expose human-readable axis labels (e.g.,
// date short format on X, compact currency on Y).
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  data: T[];
  xAccessor: (d: T) => number | string | Date;
  /** Single accessor → 1 series. Use `series` for multi-series. */
  yAccessor?: (d: T) => number;
  series?: ChartSeries<T>[];
  /** Per-series color tokens or var(--*) refs. Defaults to chart-N order. */
  colors?: SeriesColor[];
  height?: number | string;
  tooltip?: boolean;
  /** Required for accessibility — populates SVG <title>/<desc> + aria-label. */
  title?: string;
  description?: string;
  emptyMessage?: string;
  /** Tick label formatters. Receive the raw axis value (number | Date). */
  xTickFormat?: (value: number) => string;
  yTickFormat?: (value: number) => string;
  /** Optional tick count hint passed to Unovis. */
  xNumTicks?: number;
  yNumTicks?: number;
  /** Explicit tick positions. Overrides numTicks when provided. */
  xTickValues?: number[];
  yTickValues?: number[];
}>();

const isEmpty = computed(() => !Array.isArray(props.data) || props.data.length === 0);

const resolvedSeries = computed<ChartSeries<T>[]>(() => {
  if (props.series && props.series.length > 0) return props.series;
  if (props.yAccessor) return [{ name: 'series-1', accessor: props.yAccessor }];
  return [];
});

const resolvedColors = computed<string[]>(() =>
  resolvedSeries.value.map((_, idx) => resolveSeriesColor(props.colors, idx)),
);

const containerHeight = computed(() => props.height ?? '100%');
</script>

<template>
  <EmptyState
    v-if="isEmpty"
    :title="props.emptyMessage ?? 'Sin datos para mostrar'"
  />

  <div
    v-else
    class="h-full w-full"
    :aria-label="props.description ?? props.title ?? 'Gráfico de líneas'"
  >
    <VisXYContainer
      :data="props.data"
      :height="containerHeight"
    >
      <template v-if="props.title || props.description">
        <title>{{ props.title }}</title>
        <desc>{{ props.description ?? '' }}</desc>
      </template>
      <VisLine
        v-for="(serie, idx) in resolvedSeries"
        :key="serie.name"
        :x="props.xAccessor"
        :y="serie.accessor"
        :color="resolvedColors[idx]"
      />
      <VisAxis
        type="x"
        :tick-format="props.xTickFormat"
        :num-ticks="props.xNumTicks"
        :tick-values="props.xTickValues"
      />
      <VisAxis
        type="y"
        :tick-format="props.yTickFormat"
        :num-ticks="props.yNumTicks"
        :tick-values="props.yTickValues"
      />
      <VisTooltip v-if="props.tooltip ?? true" />
    </VisXYContainer>
  </div>
</template>
