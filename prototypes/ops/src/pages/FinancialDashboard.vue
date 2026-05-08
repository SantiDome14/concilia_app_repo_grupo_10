<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { useRoute, useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { useCapabilities } from '@/composables/useCapabilities';
import {
  getMovement,
  listMovements,
  listQuotes,
} from '@/ops/financial-dashboard/api';
import ActivityFilters from '@/ops/financial-dashboard/ActivityFilters.vue';
import ActivityTable from '@/ops/financial-dashboard/ActivityTable.vue';
import QuotesFilters from '@/ops/financial-dashboard/QuotesFilters.vue';
import QuotesTable from '@/ops/financial-dashboard/QuotesTable.vue';
import MovementDetailsModal from '@/ops/financial-dashboard/MovementDetailsModal.vue';
import type {
  DashboardTab,
  Movement,
  MovementDetails,
  QuotesView,
} from '@/ops/financial-dashboard/types';
import type { SponsorCode } from '@/ops/psp/types';

// ════════════════════════════════════════════════════════════════════
// FinancialDashboard page — implements ops-financial-dashboard
// Requirements 1-11. Type-A page with 2 tabs (Activity + Quotes) at
// /financial-dashboard. v1 read-only at the data-mutation level
// (Decision 1) — every CTA that creates / pays / imports defers.
// ════════════════════════════════════════════════════════════════════

const route = useRoute();
const router = useRouter();
const { can } = useCapabilities();

const canRead = computed(() => can('dashboard:read') || can('OPS_ADMIN'));

// ─── Tab state with URL + localStorage persistence (Requirement 1) ──
const VALID_TABS: DashboardTab[] = ['activity', 'quotes'];
const VALID_VIEWS: QuotesView[] = ['active', 'historic'];
const LAST_TAB_KEY = 'ops:financial-dashboard:lastTab';
const LAST_QUOTES_VIEW_KEY = 'ops:financial-dashboard:lastQuotesView';

function readSavedTab(): DashboardTab | null {
  try {
    const v = window.localStorage.getItem(LAST_TAB_KEY);
    return VALID_TABS.includes(v as DashboardTab) ? (v as DashboardTab) : null;
  } catch {
    return null;
  }
}

function writeSavedTab(tab: DashboardTab): void {
  try {
    window.localStorage.setItem(LAST_TAB_KEY, tab);
  } catch {
    // ignore
  }
}

function readSavedQuotesView(): QuotesView | null {
  try {
    const v = window.localStorage.getItem(LAST_QUOTES_VIEW_KEY);
    return VALID_VIEWS.includes(v as QuotesView) ? (v as QuotesView) : null;
  } catch {
    return null;
  }
}

function writeSavedQuotesView(view: QuotesView): void {
  try {
    window.localStorage.setItem(LAST_QUOTES_VIEW_KEY, view);
  } catch {
    // ignore
  }
}

const initialTab: DashboardTab = (() => {
  const fromQuery = route.query.tab;
  if (typeof fromQuery === 'string' && VALID_TABS.includes(fromQuery as DashboardTab)) {
    return fromQuery as DashboardTab;
  }
  return readSavedTab() ?? 'activity';
})();

const initialQuotesView: QuotesView = (() => {
  const fromQuery = route.query.view;
  if (typeof fromQuery === 'string' && VALID_VIEWS.includes(fromQuery as QuotesView)) {
    return fromQuery as QuotesView;
  }
  return readSavedQuotesView() ?? 'active';
})();

const activeTab = ref<DashboardTab>(initialTab);
const quotesView = ref<QuotesView>(initialQuotesView);

// ─── Activity filter state ──────────────────────────────────────────
const sponsorFilter = ref<SponsorCode | null>(
  typeof route.query.sponsor === 'string' ? route.query.sponsor : null,
);
const movSearch = ref<string>(typeof route.query.search === 'string' ? route.query.search : '');
const movType = ref<string>(typeof route.query.type === 'string' ? route.query.type : '');
const movStatus = ref<string>(typeof route.query.status === 'string' ? route.query.status : '');
const movOrigin = ref<string>(typeof route.query.origin === 'string' ? route.query.origin : '');
const movPage = ref<number>(Number(route.query.page) || 1);
const movPageSize = 25;

// ─── Quotes filter state ────────────────────────────────────────────
const quoteOperation = ref<string>(
  typeof route.query.operation === 'string' ? route.query.operation : '',
);
const quotePair = ref<string>(typeof route.query.pair === 'string' ? route.query.pair : '');
const quotePage = ref<number>(1);
const quotePageSize = 25;

// ─── URL sync ───────────────────────────────────────────────────────
watch(
  [
    activeTab,
    quotesView,
    sponsorFilter,
    movSearch,
    movType,
    movStatus,
    movOrigin,
    movPage,
    quoteOperation,
    quotePair,
  ],
  ([tab, view, sponsor, search, type, status, origin, page, op, pair]) => {
    const next: Record<string, string> = { tab };
    if (tab === 'activity') {
      if (sponsor) next.sponsor = sponsor;
      if (search) next.search = search;
      if (type) next.type = type;
      if (status) next.status = status;
      if (origin) next.origin = origin;
      if (page > 1) next.page = String(page);
    } else {
      // quotes
      next.view = view;
      if (op) next.operation = op;
      if (pair) next.pair = pair;
    }
    if (typeof route.query.movement === 'string') next.movement = route.query.movement;
    void router.replace({ query: next });
    writeSavedTab(tab);
    writeSavedQuotesView(view);
  },
);

function setTab(tab: DashboardTab): void {
  activeTab.value = tab;
}

// ─── Movements query ────────────────────────────────────────────────
const movQueryParams = computed(() => ({
  ...(sponsorFilter.value ? { sponsor: sponsorFilter.value } : {}),
  ...(movSearch.value ? { search: movSearch.value } : {}),
  ...(movType.value ? { type: movType.value } : {}),
  ...(movStatus.value ? { status: movStatus.value } : {}),
  ...(movOrigin.value ? { origin: movOrigin.value } : {}),
  page: movPage.value,
  pageSize: movPageSize,
}));

const movementsQuery = useQuery({
  queryKey: computed(() => ['ops', 'dashboard', 'movements', movQueryParams.value] as const),
  queryFn: () => listMovements(movQueryParams.value),
  enabled: computed(() => canRead.value && activeTab.value === 'activity'),
});

const movements = computed(() => movementsQuery.data.value?.data ?? []);
const movementsTotal = computed(() => movementsQuery.data.value?.total ?? 0);

const hasActiveActivityFilters = computed(
  () =>
    Boolean(sponsorFilter.value) ||
    Boolean(movSearch.value) ||
    Boolean(movType.value) ||
    Boolean(movStatus.value) ||
    Boolean(movOrigin.value),
);

const movementsCountsBySponsor = computed<Record<SponsorCode, number>>(() => {
  const counts: Record<SponsorCode, number> = {};
  for (const m of movements.value) {
    if (!m.sponsor) continue;
    counts[m.sponsor] = (counts[m.sponsor] ?? 0) + 1;
  }
  return counts;
});

const typeOptions = computed(() =>
  Array.from(new Set(movements.value.map((m) => m.type).filter(Boolean))).sort(),
);
const statusOptions = computed(() =>
  Array.from(new Set(movements.value.map((m) => m.status).filter(Boolean))).sort(),
);
const originOptions = computed(() => ['MANUAL', 'SWIFT', 'AUTO']);

function clearActivityFilters(): void {
  sponsorFilter.value = null;
  movSearch.value = '';
  movType.value = '';
  movStatus.value = '';
  movOrigin.value = '';
  movPage.value = 1;
}

// ─── Quotes query ───────────────────────────────────────────────────
const quoteQueryParams = computed(() => ({
  ...(quotesView.value === 'active' ? { status: 'ACCEPTED' } : {}),
  ...(quoteOperation.value ? { operation: quoteOperation.value } : {}),
  ...(quotePair.value ? { pair: quotePair.value } : {}),
  page: quotePage.value,
  pageSize: quotePageSize,
}));

const quotesQuery = useQuery({
  queryKey: computed(() => ['ops', 'dashboard', 'quotes', quoteQueryParams.value] as const),
  queryFn: () => listQuotes(quoteQueryParams.value),
  enabled: computed(() => canRead.value && activeTab.value === 'quotes'),
});

const quotes = computed(() => quotesQuery.data.value?.data ?? []);

const pairOptions = computed(() =>
  Array.from(
    new Set(
      quotes.value.map((q) => `${q.origin_currency}/${q.destination_currency}`).filter(Boolean),
    ),
  ).sort(),
);

const hasActiveQuotesFilters = computed(
  () => Boolean(quoteOperation.value) || Boolean(quotePair.value),
);

function clearQuotesFilters(): void {
  quoteOperation.value = '';
  quotePair.value = '';
  quotePage.value = 1;
}

// ─── Movement details modal (Requirement 4 + Decision 6c) ───────────
const detailsOpen = ref(false);
const detailsMovement = ref<MovementDetails | null>(null);
const isLoadingDetails = ref(false);

async function openDetails(movement: Movement): Promise<void> {
  isLoadingDetails.value = true;
  try {
    const fetched = await getMovement(movement.id);
    detailsMovement.value = fetched;
    detailsOpen.value = true;
    void router.replace({ query: { ...route.query, movement: movement.id } });
  } catch {
    // The modal renders nothing when movement is null; the toast surfaces in api.
    detailsMovement.value = null;
  } finally {
    isLoadingDetails.value = false;
  }
}

function onDetailsOpenChange(value: boolean): void {
  detailsOpen.value = value;
  if (!value) {
    detailsMovement.value = null;
    const next = { ...route.query };
    delete next.movement;
    void router.replace({ query: next });
  }
}

// Auto-open from `?movement=:id` deep-link (Decision 6c).
watch(
  () => route.query.movement,
  async (id, prev) => {
    if (id === prev) return;
    if (typeof id !== 'string' || !id) return;
    if (detailsOpen.value && detailsMovement.value?.id === id) return;
    isLoadingDetails.value = true;
    try {
      detailsMovement.value = await getMovement(id);
      detailsOpen.value = true;
    } catch {
      detailsMovement.value = null;
    } finally {
      isLoadingDetails.value = false;
    }
  },
  { immediate: true },
);

const TAB_LABELS: Record<DashboardTab, string> = {
  activity: 'Activity',
  quotes: 'Quotes',
};
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <!-- L1 page header -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-t-1">Financial Dashboard</h1>
        <p class="text-xs text-t-4">
          Movimientos consolidados y quotes operativos.
        </p>
      </div>
    </div>

    <!-- Tab indicator -->
    <div
      class="flex items-center gap-1 border-b border-b-1"
      role="tablist"
      data-testid="dashboard-tabs"
    >
      <button
        v-for="tab in VALID_TABS"
        :key="tab"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab"
        :class="
          cn(
            '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
            activeTab === tab
              ? 'border-brand text-t-1'
              : 'border-transparent text-t-4 hover:text-t-2',
          )
        "
        :data-testid="`dashboard-tab-${tab}`"
        @click="setTab(tab)"
      >
        {{ TAB_LABELS[tab] }}
      </button>
    </div>

    <!-- Activity tab -->
    <section
      v-if="activeTab === 'activity'"
      class="flex flex-col gap-4"
      data-testid="dashboard-tab-body-activity"
    >
      <ActivityFilters
        :search="movSearch"
        :sponsor="sponsorFilter"
        :type="movType"
        :status="movStatus"
        :origin="movOrigin"
        :counts-by-sponsor="movementsCountsBySponsor"
        :has-active-filters="hasActiveActivityFilters"
        :type-options="typeOptions"
        :status-options="statusOptions"
        :origin-options="originOptions"
        @update:search="(v: string) => { movSearch = v; movPage = 1; }"
        @update:sponsor="(v: string | null) => { sponsorFilter = v; movPage = 1; }"
        @update:type="(v: string) => { movType = v; movPage = 1; }"
        @update:status="(v: string) => { movStatus = v; movPage = 1; }"
        @update:origin="(v: string) => { movOrigin = v; movPage = 1; }"
        @clear-filters="clearActivityFilters"
      />
      <ActivityTable
        :rows="movements"
        :is-loading="movementsQuery.isPending.value"
        :has-active-filters="hasActiveActivityFilters"
        @row-click="openDetails"
        @clear-filters="clearActivityFilters"
      />
      <div
        v-if="!movementsQuery.isPending.value && movements.length > 0"
        class="flex items-center justify-between text-xs text-t-4"
      >
        <div>{{ movementsTotal }} movimiento{{ movementsTotal === 1 ? '' : 's' }}</div>
        <div class="flex gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            :disabled="movPage <= 1"
            data-testid="dashboard-mov-prev"
            @click="movPage = Math.max(1, movPage - 1)"
          >
            Anterior
          </Button>
          <Button
            variant="ghost"
            size="sm"
            :disabled="movements.length < movPageSize"
            data-testid="dashboard-mov-next"
            @click="movPage += 1"
          >
            Siguiente
          </Button>
        </div>
      </div>
    </section>

    <!-- Quotes tab -->
    <section
      v-else
      class="flex flex-col gap-4"
      data-testid="dashboard-tab-body-quotes"
    >
      <QuotesFilters
        :view="quotesView"
        :operation="quoteOperation"
        :pair="quotePair"
        :has-active-filters="hasActiveQuotesFilters"
        :pair-options="pairOptions"
        @update:view="(v: QuotesView) => { quotesView = v; quotePage = 1; }"
        @update:operation="(v: string) => { quoteOperation = v; quotePage = 1; }"
        @update:pair="(v: string) => { quotePair = v; quotePage = 1; }"
        @clear-filters="clearQuotesFilters"
      />
      <QuotesTable :rows="quotes" :is-loading="quotesQuery.isPending.value" />
    </section>

    <!-- Movement Details modal (canonical home — Decision 2) -->
    <MovementDetailsModal
      :open="detailsOpen"
      :movement="detailsMovement"
      @update:open="onDetailsOpenChange"
    />
  </div>
</template>
