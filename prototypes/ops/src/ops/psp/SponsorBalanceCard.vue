<script setup lang="ts">
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import type { BancoSponsor, SponsorBalance } from './types';
import { getSponsorByCode } from './sponsor-catalog';

// ════════════════════════════════════════════════════════════════════
// SponsorBalanceCard — implements Requirement 4. One card per active
// banco sponsor showing balance + last-checked + click-to-filter
// semantics (the parent listens to @select and toggles the filter).
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  /** Sponsor metadata. */
  sponsor: BancoSponsor;
  /** Latest balance + checked_at. May be null if backend hasn't reported one yet. */
  balance: SponsorBalance | null;
  /** Whether this sponsor is currently the active filter (cross-tab). */
  isActiveFilter: boolean;
  /** When true, the parent treats clicks as toggle-the-filter. */
  isClickable?: boolean;
}>();

const emit = defineEmits<{
  select: [code: string];
}>();

function onClick(): void {
  if (!props.isClickable) return;
  emit('select', props.sponsor.code);
}

function formatBalance(value: string | undefined): string {
  if (!value) return '—';
  const num = Number.parseFloat(value);
  if (!Number.isFinite(num)) return value;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatCheckedAt(iso: string | undefined): string {
  if (!iso) return 'Sin chequeos';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Sin chequeos';
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Justo ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `Hace ${diffD}d`;
}

// Validate that the sponsor still exists in the catalog (defensive).
const catalogEntry = getSponsorByCode(props.sponsor.code);
const tone = catalogEntry?.tone ?? 'neutral';
</script>

<template>
  <button
    type="button"
    :disabled="!props.isClickable"
    :class="
      cn(
        'group flex items-stretch gap-3 rounded-xl border-2 bg-card p-4 text-left transition-all',
        props.isActiveFilter
          ? 'border-brand bg-brand-bg shadow-md'
          : 'border-b-2 hover:border-b-2 hover:bg-card-2',
        !props.isClickable && 'cursor-default opacity-100',
      )
    "
    :data-testid="`sponsor-card-${props.sponsor.code}`"
    :aria-pressed="props.isActiveFilter"
    @click="onClick"
  >
    <!-- Logo / monogram -->
    <div class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-b-1 bg-card-2">
      <img
        v-if="props.sponsor.logo"
        :src="props.sponsor.logo"
        :alt="props.sponsor.label"
        class="h-full w-full object-cover"
      />
      <span v-else class="text-sm font-bold text-t-2">
        {{ props.sponsor.label.slice(0, 2).toUpperCase() }}
      </span>
    </div>
    <div class="flex flex-1 flex-col">
      <div class="flex items-start justify-between gap-2">
        <Badge :variant="tone">{{ props.sponsor.label }}</Badge>
        <span class="text-[10px] text-t-4">{{ formatCheckedAt(props.balance?.checked_at) }}</span>
      </div>
      <div class="mt-2">
        <p class="font-mono text-2xl font-bold text-t-1">
          {{ props.balance ? `$${formatBalance(props.balance.balance)}` : '—' }}
        </p>
        <p class="mt-0.5 text-xs text-t-4">{{ props.balance?.currency ?? '' }}</p>
      </div>
    </div>
  </button>
</template>
