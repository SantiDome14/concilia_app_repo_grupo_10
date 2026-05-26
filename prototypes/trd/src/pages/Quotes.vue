<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Search } from 'lucide-vue-next';
import { refDebounced } from '@vueuse/core';
import { Input } from '@/components/ui/input';
import { Badge, type BadgeVariants } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import EmptyState from '@/components/feedback/EmptyState.vue';
import Skeleton from '@/components/feedback/Skeleton.vue';
import TablePagination from '@/components/data-display/TablePagination.vue';
import QuoteDrawer from '@/trd/quotes/QuoteDrawer.vue';
import { useQuotesList } from '@/composables/useQuotes';
import {
  usePersistedPageSize,
  isAllowedPageSize,
  type AllowedPageSize,
} from '@/composables/usePersistedPageSize';
import type { QuoteStatus, QuoteTab } from '@/types/quote';

// ════════════════════════════════════════════════════════════════════
// TRD — Quotes (Mesa de Dinero)
// ────────────────────────────────────────────────────────────────────
// L1 — page header (title "Quotes", no CTA in v1).
// L1.5 — tabs Activos / Historial, URL-synced as `?tab=activos|historial`.
// L3 — search + status filter + date range. Filters reset to page 1.
// Table — server-paginated via vue-query + the canonical
//         <TablePagination> footer. Row click opens the QuoteDrawer
//         with timeline + activity log.
//
// All mutations (create, cancel, edit-notes, CCC) are deferred to
// dedicated `add-trd-quote-*` capabilities. v1 is read-only.
// ════════════════════════════════════════════════════════════════════

const router = useRouter();
const route = useRoute();

function readPageSize(value: unknown, fallback: AllowedPageSize): AllowedPageSize {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && isAllowedPageSize(parsed) ? parsed : fallback;
}

function readPage(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function readTab(value: unknown): QuoteTab {
  return value === 'historial' ? 'historial' : 'activos';
}

function readStatus(value: unknown): QuoteStatus | 'ALL' {
  const v = String(value ?? '');
  if (v === 'PENDING' || v === 'ACCEPTED' || v === 'COMPLETED' || v === 'CANCELLED')
    return v;
  return 'ALL';
}

// ─── State, seeded from the URL ──────────────────────────────────────
const persistedPageSize = usePersistedPageSize('trd.quotes.pageSize', 25);
persistedPageSize.value = readPageSize(route.query.pageSize, persistedPageSize.value);

const tab = ref<QuoteTab>(readTab(route.query.tab));
const search = ref<string>(String(route.query.q ?? ''));
const debouncedSearch = refDebounced(search, 300);
const statusFilter = ref<QuoteStatus | 'ALL'>(readStatus(route.query.status));
const dateFrom = ref<string>(String(route.query.dateFrom ?? ''));
const dateTo = ref<string>(String(route.query.dateTo ?? ''));
const page = ref<number>(readPage(route.query.page));
const pageSize = persistedPageSize;
const drawerQuoteId = ref<string | null>(null);
const drawerOpen = ref(false);

// Constrain status options based on the active tab — Activos can only
// surface PENDING / ACCEPTED; selecting a terminal state inside Activos
// would yield 0 results otherwise.
const allowedStatuses = computed<(QuoteStatus | 'ALL')[]>(() => {
  return tab.value === 'activos'
    ? ['ALL', 'PENDING', 'ACCEPTED']
    : ['ALL', 'PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED'];
});

const STATUS_LABEL: Record<QuoteStatus | 'ALL', string> = {
  ALL: 'Todos',
  PENDING: 'Pendiente',
  ACCEPTED: 'Aceptada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
};

const STATUS_VARIANT: Record<QuoteStatus, BadgeVariants['variant']> = {
  PENDING: 'warning',
  ACCEPTED: 'info',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
};

// When switching tabs the active status filter may be invalid — clamp
// it back to 'ALL' on switch.
watch(tab, (next) => {
  if (next === 'activos' && (statusFilter.value === 'COMPLETED' || statusFilter.value === 'CANCELLED')) {
    statusFilter.value = 'ALL';
  }
});

// Filter changes reset to page 1.
watch([debouncedSearch, statusFilter, dateFrom, dateTo, tab], () => {
  page.value = 1;
});

// ─── Query ────────────────────────────────────────────────────────
const filters = computed(() => ({
  tab: tab.value,
  status: statusFilter.value,
  dateFrom: dateFrom.value || undefined,
  dateTo: dateTo.value || undefined,
  q: debouncedSearch.value.trim() || undefined,
  page: page.value,
  pageSize: pageSize.value,
}));

const query = useQuotesList(filters);
const items = computed(() => query.data.value?.data ?? []);
const pagination = computed(
  () => query.data.value?.pagination ?? {
    page: 1,
    pageSize: pageSize.value,
    total: 0,
    totalPages: 1,
  },
);

// ─── URL sync ─────────────────────────────────────────────────────
watch(
  [tab, debouncedSearch, statusFilter, dateFrom, dateTo, page, pageSize],
  () => {
    const newQuery: Record<string, string> = {};
    newQuery.tab = tab.value;
    if (debouncedSearch.value.trim()) newQuery.q = debouncedSearch.value.trim();
    if (statusFilter.value !== 'ALL') newQuery.status = statusFilter.value;
    if (dateFrom.value) newQuery.dateFrom = dateFrom.value;
    if (dateTo.value) newQuery.dateTo = dateTo.value;
    if (page.value !== 1) newQuery.page = String(page.value);
    newQuery.pageSize = String(pageSize.value);
    router.replace({ query: newQuery });
  },
  { flush: 'post' },
);

// ─── Drawer ───────────────────────────────────────────────────────
function openDrawer(id: string): void {
  drawerQuoteId.value = id;
  drawerOpen.value = true;
}

// ─── Empty-state copy ─────────────────────────────────────────────
const hasFilters = computed(
  () =>
    !!debouncedSearch.value.trim() ||
    statusFilter.value !== 'ALL' ||
    !!dateFrom.value ||
    !!dateTo.value,
);
const emptyDescription = computed(() =>
  hasFilters.value
    ? 'Probá ajustar los filtros o el rango de fechas.'
    : tab.value === 'activos'
      ? 'No hay cotizaciones activas en este momento.'
      : 'No hay cotizaciones en el historial.',
);

// ─── Display helpers ─────────────────────────────────────────────────
function formatAmount(value: string, currency: string): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return `${value} ${currency}`;
  return `${new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: currency === 'ARS' ? 0 : 2,
  }).format(num)} ${currency}`;
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

const isInitialLoading = computed(
  () => query.isLoading.value && !query.data.value,
);
</script>

<template>
  <div class="flex flex-col gap-5" data-testid="quotes-page">
    <!-- L1 -->
    <header class="flex items-center justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-[22px] font-extrabold tracking-tight text-t-1">Quotes</h1>
        <p class="text-[13px] text-t-4">
          Operaciones OTC de compra y venta de FX que la Mesa ejecuta con clientes.
        </p>
      </div>
    </header>

    <!-- Tabs -->
    <div class="flex items-center gap-1 border-b border-b-2" data-testid="quotes-tabs">
      <button
        type="button"
        :class="[
          'px-3 py-2 text-[13px] font-semibold transition-colors',
          tab === 'activos'
            ? 'border-b-2 border-brand text-brand'
            : 'border-b-2 border-transparent text-t-3 hover:text-t-1',
        ]"
        data-testid="tab-activos"
        @click="tab = 'activos'"
      >
        Activos
      </button>
      <button
        type="button"
        :class="[
          'px-3 py-2 text-[13px] font-semibold transition-colors',
          tab === 'historial'
            ? 'border-b-2 border-brand text-brand'
            : 'border-b-2 border-transparent text-t-3 hover:text-t-1',
        ]"
        data-testid="tab-historial"
        @click="tab = 'historial'"
      >
        Historial
      </button>
    </div>

    <!-- L3 — filters -->
    <div class="flex flex-wrap items-center gap-3">
      <div class="relative w-[260px]">
        <Search class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t-4" />
        <Input
          v-model="search"
          placeholder="Buscar por cliente, legajo o id..."
          class="pl-8"
          data-testid="quotes-search"
        />
      </div>

      <Select
        v-model="statusFilter"
        :data-testid="'quotes-status'"
      >
        <SelectTrigger class="w-[160px]" data-testid="quotes-status-trigger">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="s in allowedStatuses" :key="s" :value="s">
            {{ STATUS_LABEL[s] }}
          </SelectItem>
        </SelectContent>
      </Select>

      <div class="flex items-center gap-2">
        <label for="dateFrom" class="text-xs text-t-4">Desde</label>
        <input
          id="dateFrom"
          v-model="dateFrom"
          type="date"
          class="h-9 rounded-md border border-b-2 bg-card px-2 text-xs text-t-2 outline-none focus:border-b-3"
          data-testid="quotes-date-from"
        />
        <label for="dateTo" class="text-xs text-t-4">Hasta</label>
        <input
          id="dateTo"
          v-model="dateTo"
          type="date"
          class="h-9 rounded-md border border-b-2 bg-card px-2 text-xs text-t-2 outline-none focus:border-b-3"
          data-testid="quotes-date-to"
        />
      </div>
    </div>

    <!-- Skeleton -->
    <div
      v-if="isInitialLoading"
      class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2"
      data-testid="quotes-skeleton"
    >
      <div class="border-b border-b-2 px-[18px] py-2.5">
        <Skeleton class="h-3 w-32" />
      </div>
      <div v-for="i in 5" :key="i" class="flex items-center gap-4 border-b border-b-1 px-[18px] py-3 last:border-b-0">
        <Skeleton class="h-3 w-16" />
        <Skeleton class="h-3 w-1/4" />
        <Skeleton class="h-3 w-1/6" />
        <Skeleton class="h-3 w-1/6" />
        <Skeleton class="h-3 w-12" />
      </div>
    </div>

    <!-- Empty -->
    <EmptyState
      v-else-if="items.length === 0"
      title="No hay cotizaciones para mostrar"
      :description="emptyDescription"
      data-testid="quotes-empty"
    />

    <!-- Table -->
    <div
      v-else
      class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2"
      data-testid="quotes-table"
    >
      <table class="w-full border-collapse">
        <thead>
          <tr class="border-b border-b-2">
            <th class="px-[18px] py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">ID</th>
            <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Cliente</th>
            <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Op</th>
            <th class="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Origen</th>
            <th class="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Destino</th>
            <th class="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">TC</th>
            <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Plazo</th>
            <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Estado</th>
            <th class="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Fecha</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="q in items"
            :key="q.id"
            class="cursor-pointer border-b border-b-1 transition-colors last:border-b-0 hover:bg-white/[0.02]"
            :data-testid="`row-${q.id}`"
            @click="openDrawer(q.id)"
          >
            <td class="px-[18px] py-2.5 font-mono text-xs text-t-3">{{ q.id }}</td>
            <td class="px-3.5 py-2.5 text-[13px] font-semibold text-t-2">
              {{ q.client_name }}
              <span v-if="q.ardua_docket" class="ml-1 font-mono text-xs text-t-4">({{ q.ardua_docket }})</span>
            </td>
            <td class="px-3.5 py-2.5">
              <span
                :class="q.operation === 'BUY' ? 'text-success' : 'text-danger'"
                class="text-[11px] font-bold"
              >
                {{ q.operation }}
              </span>
            </td>
            <td class="px-3.5 py-2.5 text-right font-mono text-[13px] text-t-2">
              {{ formatAmount(q.origin_amount, q.origin_currency) }}
            </td>
            <td class="px-3.5 py-2.5 text-right font-mono text-[13px] text-t-2">
              {{ formatAmount(q.destination_amount, q.destination_currency) }}
            </td>
            <td class="px-3.5 py-2.5 text-right font-mono text-xs text-t-3">{{ q.exchange_rate }}</td>
            <td class="px-3.5 py-2.5 text-xs text-t-3">{{ q.term }}</td>
            <td class="px-3.5 py-2.5">
              <Badge :variant="STATUS_VARIANT[q.status]">
                {{ STATUS_LABEL[q.status] }}
              </Badge>
            </td>
            <td class="px-3.5 py-2.5 text-right text-xs text-t-3">{{ formatDateShort(q.created_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <TablePagination
      v-if="items.length > 0"
      :page="pagination.page"
      :page-size="pagination.pageSize"
      :total="pagination.total"
      :total-pages="pagination.totalPages"
      :page-size-options="[10, 25, 50, 100]"
      @update:page="(v: number) => (page = v)"
      @update:page-size="(v: number) => {
        if (isAllowedPageSize(v)) pageSize = v;
      }"
    />

    <!-- Drawer (mounted but not visible until openDrawer fires) -->
    <QuoteDrawer
      v-if="drawerQuoteId"
      :open="drawerOpen"
      :quote-id="drawerQuoteId"
      @update:open="(v: boolean) => (drawerOpen = v)"
    />
  </div>
</template>
