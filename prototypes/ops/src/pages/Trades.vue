<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { useRoute, useRouter } from 'vue-router';
import { useCapabilities } from '@/composables/useCapabilities';
import { listQuotes } from '@/api/modules/trades';
import TradesFilters from '@/ops/trades/TradesFilters.vue';
import TradesTable from '@/ops/trades/TradesTable.vue';
import type { QuotesView } from '@/ops/trades/types';

// ════════════════════════════════════════════════════════════════════
// Trades page — implements ops-cotizaciones Requirements 1-5.
// Type-A master list at /trades with sub-toggle Active / Historic.
// Read-only in v1 — quote action modals (Pay / DirectSwap /
// Unsupported) defer to extend-ops-cotizaciones-quote-actions.
//
// Module/page user-facing name is "Trades"; the underlying capability
// slug + permission string (`cotizaciones:read`) stay tied to the
// archived OpenSpec contract.
// ════════════════════════════════════════════════════════════════════

const route = useRoute();
const router = useRouter();
const { can } = useCapabilities();

const canRead = computed(() => can('cotizaciones:read') || can('OPS_ADMIN'));

const VALID_VIEWS: QuotesView[] = ['active', 'historic'];

const initialView: QuotesView = (() => {
  const fromQuery = route.query.view;
  if (typeof fromQuery === 'string' && VALID_VIEWS.includes(fromQuery as QuotesView)) {
    return fromQuery as QuotesView;
  }
  return 'active';
})();

const quotesView = ref<QuotesView>(initialView);
const quoteOperation = ref<string>(
  typeof route.query.operation === 'string' ? route.query.operation : '',
);
const quotePair = ref<string>(typeof route.query.pair === 'string' ? route.query.pair : '');
const quotePage = ref<number>(1);
const quotePageSize = 25;

watch(
  [quotesView, quoteOperation, quotePair],
  ([view, op, pair]) => {
    const next: Record<string, string> = { view };
    if (op) next.operation = op;
    if (pair) next.pair = pair;
    void router.replace({ query: next });
  },
);

const quoteQueryParams = computed(() => ({
  ...(quotesView.value === 'active' ? { status: 'ACCEPTED' } : {}),
  ...(quoteOperation.value ? { operation: quoteOperation.value } : {}),
  ...(quotePair.value ? { pair: quotePair.value } : {}),
  page: quotePage.value,
  pageSize: quotePageSize,
}));

const quotesQuery = useQuery({
  queryKey: computed(() => ['ops', 'trades', 'list', quoteQueryParams.value] as const),
  queryFn: () => listQuotes(quoteQueryParams.value),
  enabled: canRead,
});

const quotes = computed(() => quotesQuery.data.value?.data ?? []);

const pairOptions = computed(() =>
  Array.from(
    new Set(
      quotes.value.map((q) => `${q.origin_currency}/${q.destination_currency}`).filter(Boolean),
    ),
  ).sort(),
);

const hasActiveFilters = computed(
  () => Boolean(quoteOperation.value) || Boolean(quotePair.value),
);

function clearFilters(): void {
  quoteOperation.value = '';
  quotePair.value = '';
  quotePage.value = 1;
}
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-t-1">Trades</h1>
        <p class="text-xs text-t-4">Quotes operativos del desk.</p>
      </div>
    </div>

    <TradesFilters
      :view="quotesView"
      :operation="quoteOperation"
      :pair="quotePair"
      :has-active-filters="hasActiveFilters"
      :pair-options="pairOptions"
      @update:view="(v: QuotesView) => { quotesView = v; quotePage = 1; }"
      @update:operation="(v: string) => { quoteOperation = v; quotePage = 1; }"
      @update:pair="(v: string) => { quotePair = v; quotePage = 1; }"
      @clear-filters="clearFilters"
    />
    <TradesTable :rows="quotes" :is-loading="quotesQuery.isPending.value" />
  </div>
</template>
