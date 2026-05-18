<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '@/lib/cn';

// ════════════════════════════════════════════════════════════════════
// TablePagination — canonical client-side pagination footer
// ────────────────────────────────────────────────────────────────────
// The single canonical pagination UI for client-side tables. Paired
// with `useTable<T>()` (state owner) per `core-data-tables` spec.
//
// Controlled component: state lives in the parent's `useTable<T>()`;
// this component reflects `page` / `pageSize` props and emits
// `update:page` / `update:pageSize` (v-model style).
//
// Inline pagination markup or hand-rolled state refs in page
// components are rejected at review. This component is the only
// spec-compliant client-side pagination surface.
// ════════════════════════════════════════════════════════════════════

interface Props {
  /** Current page (1-based). */
  page: number;
  /** Active page size. */
  pageSize: number;
  /** Total record count across all pages. */
  total: number;
  /** Total page count. */
  totalPages: number;
  /** Selectable page sizes in the `Show:` dropdown. */
  pageSizeOptions?: readonly number[];
}

const props = withDefaults(defineProps<Props>(), {
  pageSizeOptions: () => [10, 25, 50, 100],
});

const emit = defineEmits<{
  'update:page': [value: number];
  'update:pageSize': [value: number];
}>();

// Overflow algorithm: when totalPages <= 7 render every page;
// otherwise render [1, …, current-1, current, current+1, …, last].
const paginationPages = computed<(number | '…')[]>(() => {
  const tp = props.totalPages;
  const current = props.page;
  if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  if (current > 3) pages.push('…');
  const start = Math.max(2, current - 1);
  const end = Math.min(tp - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < tp - 2) pages.push('…');
  pages.push(tp);
  return pages;
});

function onPageChange(next: number): void {
  if (next < 1 || next > props.totalPages) return;
  emit('update:page', next);
}

function onPageSizeChange(event: Event): void {
  const next = Number((event.target as HTMLSelectElement).value);
  if (!Number.isFinite(next) || next <= 0) return;
  emit('update:pageSize', next);
  // Reset to page 1 when page size changes (per spec scenario).
  emit('update:page', 1);
}
</script>

<template>
  <div class="mt-3.5 flex items-center justify-between" data-testid="table-pagination">
    <div class="text-xs text-t-3" data-testid="table-pagination-info">
      Page <b class="font-semibold text-t-2">{{ page }}</b> of {{ totalPages }} ·
      {{ total }} resultado{{ total !== 1 ? 's' : '' }}
    </div>
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-1.5 text-xs text-t-3">
        Show:
        <select
          :value="pageSize"
          class="rounded-md border border-b-2 bg-card px-2 py-1 text-xs text-t-2 outline-none"
          data-testid="table-pagination-size"
          @change="onPageSizeChange"
        >
          <option v-for="opt in pageSizeOptions" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </div>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-md border border-b-2 bg-card text-xs font-semibold text-t-3 transition-colors hover:border-b-3 hover:text-t-1 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="page === 1"
          data-testid="table-pagination-prev"
          @click="onPageChange(page - 1)"
        >
          ‹
        </button>
        <template v-for="(p, i) in paginationPages" :key="i">
          <button
            v-if="p === '…'"
            type="button"
            class="h-7 w-auto cursor-default px-2 text-xs text-t-4"
            disabled
          >
            …
          </button>
          <button
            v-else
            type="button"
            :class="
              cn(
                'flex h-7 w-7 items-center justify-center rounded-md border text-xs font-semibold transition-colors',
                p === page
                  ? 'border-info bg-info-bg text-info'
                  : 'border-b-2 bg-card text-t-3 hover:border-b-3 hover:text-t-1',
              )
            "
            :data-testid="`table-pagination-page-${p}`"
            @click="onPageChange(p as number)"
          >
            {{ p }}
          </button>
        </template>
        <button
          type="button"
          class="flex h-7 w-7 items-center justify-center rounded-md border border-b-2 bg-card text-xs font-semibold text-t-3 transition-colors hover:border-b-3 hover:text-t-1 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="page === totalPages"
          data-testid="table-pagination-next"
          @click="onPageChange(page + 1)"
        >
          ›
        </button>
      </div>
    </div>
  </div>
</template>
