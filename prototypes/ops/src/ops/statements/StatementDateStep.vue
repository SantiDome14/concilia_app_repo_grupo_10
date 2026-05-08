<script setup lang="ts">
import { computed } from 'vue';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/cn';
import { QUICK_FILTERS, resolveQuickFilter } from './quick-filters';
import type { DateRange, StatementQuickFilterKey } from './types';

// ════════════════════════════════════════════════════════════════════
// StatementDateStep — implements Requirement 4.
//
// Renders the 8 chips above a `<DatePicker mode="range">`. Mutual
// exclusivity is enforced inside the parent: clicking a chip emits
// `pick-chip` with the key; the parent resolves and emits both the
// new range and the active chipKey. Manually editing the calendar
// emits `pick-range` with chipKey: null (per Requirement 4 scenario
// "Manual calendar edit deselects the active chip").
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  range: DateRange | null;
  /** The currently-active chip key, or null if a literal range is set. */
  activeChipKey: StatementQuickFilterKey | null;
}>();

const emit = defineEmits<{
  /** Operator picked a quick-filter chip. */
  'pick-chip': [key: StatementQuickFilterKey];
  /** Operator manually edited the calendar (or cleared it). */
  'pick-range': [range: DateRange | null];
}>();

// ── Bridge native Date model ↔ DatePicker {start, end} model ─────
const datePickerModel = computed<{ start: Date; end: Date } | null>(() => {
  if (!props.range) return null;
  return { start: props.range.from, end: props.range.to };
});

function onDatePickerUpdate(value: Date | { start: Date; end: Date } | null): void {
  if (value && typeof value === 'object' && 'start' in value && 'end' in value) {
    emit('pick-range', { from: value.start, to: value.end });
  } else {
    emit('pick-range', null);
  }
}

function onChipClick(key: StatementQuickFilterKey): void {
  emit('pick-chip', key);
}

// ── Sanity check (used by tests + stable in template) ───────────
function isChipActive(key: StatementQuickFilterKey): boolean {
  return props.activeChipKey === key;
}

// Sample "today" reference exposed on the chip aria-label so screen
// readers know the resolved range without re-computing.
function chipAriaLabel(key: StatementQuickFilterKey): string {
  const r = resolveQuickFilter(key);
  return `${formatYmd(r.from)} – ${formatYmd(r.to)}`;
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <!-- Chips row -->
    <div class="grid grid-cols-4 gap-2" data-testid="statement-date-chips">
      <button
        v-for="filter in QUICK_FILTERS"
        :key="filter.key"
        type="button"
        :class="
          cn(
            'rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
            isChipActive(filter.key)
              ? 'border-brand bg-brand-bg text-brand'
              : 'border-b-1 bg-card text-t-3 hover:bg-card-2 hover:text-t-1',
          )
        "
        :data-testid="`statement-chip-${filter.key}`"
        :aria-pressed="isChipActive(filter.key)"
        :aria-label="`${filter.label} — ${chipAriaLabel(filter.key)}`"
        @click="onChipClick(filter.key)"
      >
        {{ filter.label }}
      </button>
    </div>

    <!-- Calendar -->
    <DatePicker
      mode="range"
      :model-value="datePickerModel"
      placeholder="Seleccionar período…"
      data-testid="statement-date-picker"
      @update:model-value="onDatePickerUpdate"
    />
  </div>
</template>
