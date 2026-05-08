<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '@/lib/cn';
import type { CoinagHealth } from './types';

// ════════════════════════════════════════════════════════════════════
// CoinagHealthIndicator — read-only chip with three states.
//
// Per `extend-ops-psp-partner-rename-default-tab-and-filter` the chip
// label is generic (`Operativo` / `Degradado` / `Caído`) — it lives
// inside the COINAG partner's collapsible header in the Posición
// tree, so the partner name is redundant in the label itself.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  /** Latest health snapshot. May be null while the first poll is pending. */
  health: CoinagHealth | null;
  /** When true, render a small "stale" decoration over the dot. */
  isStale?: boolean;
}>();

const status = computed(() => props.health?.status ?? 'down');

const STATUS_LABEL: Record<CoinagHealth['status'], string> = {
  healthy: 'Operativo',
  degraded: 'Degradado',
  down: 'Caído',
};

const STATUS_DOT: Record<CoinagHealth['status'], string> = {
  healthy: 'bg-success',
  degraded: 'bg-warning',
  down: 'bg-danger',
};

const tooltip = computed(() => {
  const message = props.health?.message ? `${props.health.message} · ` : '';
  if (!props.health?.checked_at) return STATUS_LABEL[status.value];
  const date = new Date(props.health.checked_at);
  if (Number.isNaN(date.getTime())) return `${message}${STATUS_LABEL[status.value]}`;
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60_000);
  const checked =
    diffMin < 1
      ? 'checked Justo ahora'
      : diffMin < 60
        ? `checked Hace ${diffMin} min`
        : `checked Hace ${Math.floor(diffMin / 60)}h`;
  return `${message}${checked}`;
});
</script>

<template>
  <div
    class="inline-flex items-center gap-2 rounded-full border border-b-1 bg-card px-3 py-1.5 text-xs font-medium text-t-2"
    :title="tooltip"
    data-testid="coinag-health-indicator"
  >
    <span
      :class="
        cn(
          'relative inline-block h-2 w-2 rounded-full',
          STATUS_DOT[status],
          props.isStale && 'opacity-60',
        )
      "
    >
      <span
        v-if="status === 'healthy' && !props.isStale"
        class="absolute inset-0 animate-ping rounded-full bg-success/60"
        aria-hidden="true"
      />
    </span>
    <span>{{ STATUS_LABEL[status] }}</span>
    <span v-if="props.isStale" class="text-[10px] text-t-4">(stale)</span>
  </div>
</template>
