<script setup lang="ts" generic="T extends Record<string, unknown>">
import { computed } from 'vue';
import { VisSingleContainer, VisDonut, VisTooltip } from '@unovis/vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { resolveSeriesColor, type SeriesColor } from './chart-colors';

const props = defineProps<{
  data: T[];
  /** Slice label accessor (used for tooltip + ARIA). */
  xAccessor: (d: T) => string | number;
  /** Slice value accessor. */
  yAccessor: (d: T) => number;
  /** Per-slice colors (token aliases or var(--*)). Defaults to chart-N order. */
  colors?: SeriesColor[];
  height?: number | string;
  tooltip?: boolean;
  /** Inner radius (px). 0 (default) = full pie; > 0 = donut. */
  innerRadius?: number;
  title?: string;
  description?: string;
  emptyMessage?: string;
}>();

const isEmpty = computed(() => !Array.isArray(props.data) || props.data.length === 0);

const valueAccessor = computed(() => props.yAccessor);

const sliceColors = computed<string[]>(() =>
  props.data.map((_, idx) => resolveSeriesColor(props.colors, idx)),
);

const containerHeight = computed(() => props.height ?? '100%');
const innerRadius = computed(() => props.innerRadius ?? 0);
</script>

<template>
  <EmptyState
    v-if="isEmpty"
    :title="props.emptyMessage ?? 'Sin datos para mostrar'"
  />

  <div
    v-else
    class="h-full w-full"
    :aria-label="props.description ?? props.title ?? 'Gráfico de torta'"
  >
    <VisSingleContainer
      :data="props.data"
      :height="containerHeight"
    >
      <template v-if="props.title || props.description">
        <title>{{ props.title }}</title>
        <desc>{{ props.description ?? '' }}</desc>
      </template>
      <VisDonut
        :value="valueAccessor"
        :color="sliceColors"
        :inner-radius="innerRadius"
      />
      <VisTooltip v-if="props.tooltip ?? true" />
    </VisSingleContainer>
  </div>
</template>
