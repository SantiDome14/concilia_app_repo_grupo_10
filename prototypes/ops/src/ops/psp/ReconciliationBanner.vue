<script setup lang="ts">
import { computed, ref } from 'vue';
import { AlertTriangle, ChevronDown, X } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { getSponsorLabel } from './sponsor-catalog';
import type { ReconciliationMismatch } from './types';

// ════════════════════════════════════════════════════════════════════
// ReconciliationBanner — implements Requirement 3 (Decision 6 +
// Decision 7c). Stackable alert area with per-session
// dismissible-to-pill toggle.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  mismatches: ReconciliationMismatch[];
}>();

const STORAGE_KEY = 'ops:psp:reconciliationDismissed';

function readDismissed(): boolean {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeDismissed(value: boolean): void {
  try {
    if (value) window.sessionStorage.setItem(STORAGE_KEY, '1');
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private browsing / quota — silent no-op.
  }
}

const isDismissed = ref(readDismissed());

// Sort alphabetically by sponsor label (Decision 6: predictable order).
const sortedMismatches = computed<ReconciliationMismatch[]>(() => {
  return [...props.mismatches].sort((a, b) => a.sponsor.localeCompare(b.sponsor));
});

const count = computed(() => sortedMismatches.value.length);

function dismiss(): void {
  isDismissed.value = true;
  writeDismissed(true);
}

function expand(): void {
  isDismissed.value = false;
  writeDismissed(false);
}

function variantFor(mismatch: ReconciliationMismatch): 'danger' | 'warning' {
  // Negative difference → deficit (danger). Surplus → warning.
  const num = Number.parseFloat(mismatch.difference);
  return Number.isFinite(num) && num >= 0 ? 'warning' : 'danger';
}

function formatAmount(value: string): string {
  const num = Number.parseFloat(value);
  if (!Number.isFinite(num)) return value;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(num));
}

function formatCheckedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (diffMin < 1) return 'checked Justo ahora';
  if (diffMin < 60) return `checked Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `checked Hace ${diffH}h`;
  return `checked Hace ${Math.floor(diffH / 24)}d`;
}

function tagFor(mismatch: ReconciliationMismatch): string {
  const num = Number.parseFloat(mismatch.difference);
  return Number.isFinite(num) && num >= 0 ? 'Surplus' : 'Deficit';
}

function signFor(mismatch: ReconciliationMismatch): string {
  const num = Number.parseFloat(mismatch.difference);
  return Number.isFinite(num) && num >= 0 ? '+' : '-';
}
</script>

<template>
  <div
    v-if="count > 0"
    class="flex flex-col gap-2"
    data-testid="reconciliation-banner-area"
  >
    <!-- Pill (collapsed) -->
    <button
      v-if="isDismissed"
      type="button"
      class="inline-flex w-fit items-center gap-2 rounded-full border border-warning/30 bg-warning-bg px-3 py-1.5 text-xs font-semibold text-warning transition-all hover:bg-warning/10"
      data-testid="reconciliation-pill"
      @click="expand"
    >
      <AlertTriangle class="h-3.5 w-3.5" />
      Reconciliación: {{ count }} sponsor con mismatch
      <ChevronDown class="h-3.5 w-3.5" />
    </button>

    <!-- Stackable banners (expanded) -->
    <template v-else>
      <div
        v-for="mismatch in sortedMismatches"
        :key="mismatch.sponsor"
        :class="
          cn(
            'flex items-center gap-3 rounded-lg border-2 px-4 py-3',
            variantFor(mismatch) === 'danger'
              ? 'border-danger/30 bg-danger-bg text-danger'
              : 'border-warning/30 bg-warning-bg text-warning',
          )
        "
        :data-testid="`reconciliation-banner-${mismatch.sponsor}`"
        role="alert"
      >
        <AlertTriangle class="h-5 w-5 shrink-0" />
        <div class="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span class="font-bold uppercase tracking-wide">
            {{ getSponsorLabel(mismatch.sponsor) }}
          </span>
          <Badge :variant="variantFor(mismatch)">{{ tagFor(mismatch) }}</Badge>
          <span class="font-mono text-base font-bold">
            {{ signFor(mismatch) }}${{ formatAmount(mismatch.difference) }}
          </span>
          <span class="text-xs opacity-80">
            DB ${{ formatAmount(mismatch.db_balance) }} vs API ${{ formatAmount(mismatch.api_balance) }}
          </span>
          <span class="text-xs opacity-70">{{ formatCheckedAt(mismatch.checked_at) }}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          class="shrink-0"
          :data-testid="`reconciliation-dismiss`"
          @click="dismiss"
        >
          <X class="h-3.5 w-3.5" />
        </Button>
      </div>
    </template>
  </div>
</template>
