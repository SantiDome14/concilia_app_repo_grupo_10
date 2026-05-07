<script setup lang="ts" generic="T extends Record<string, unknown>">
import { computed } from 'vue';
import { VisXYContainer, VisArea, VisAxis, VisTooltip } from '@unovis/vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { resolveSeriesColor, type SeriesColor, type ChartSeries } from './chart-colors';

const props = defineProps<{
  data: T[];
  xAccessor: (d: T) => number | string | Date;
  yAccessor?: (d: T) => number;
  series?: ChartSeries<T>[];
  colors?: SeriesColor[];
  height?: number | string;
  tooltip?: boolean;
  title?: string;
  description?: string;
  emptyMessage?: string;
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
    :aria-label="props.description ?? props.title ?? 'Gráfico de área'"
  >
    <VisXYContainer
      :data="props.data"
      :height="containerHeight"
    >
      <template v-if="props.title || props.description">
        <title>{{ props.title }}</title>
        <desc>{{ props.description ?? '' }}</desc>
      </template>
      <VisArea
        v-for="(serie, idx) in resolvedSeries"
        :key="serie.name"
        :x="props.xAccessor"
        :y="serie.accessor"
        :color="resolvedColors[idx]"
      />
      <VisAxis type="x" />
      <VisAxis type="y" />
      <VisTooltip v-if="props.tooltip ?? true" />
    </VisXYContainer>
  </div>
</template>
