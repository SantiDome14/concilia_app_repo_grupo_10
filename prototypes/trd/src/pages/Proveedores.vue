<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
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
import LiquidityKpiCards from '@/trd/proveedores/LiquidityKpiCards.vue';
import LiquidityDrawer from '@/trd/proveedores/LiquidityDrawer.vue';
import {
  useLiquidityList,
  useLiquidityProviders,
} from '@/composables/useLiquidity';
import {
  usePersistedPageSize,
  isAllowedPageSize,
  type AllowedPageSize,
} from '@/composables/usePersistedPageSize';
import type {
  LiquidityPeriod,
  LiquidityStatus,
  LiquiditySummary,
  LiquidityTerm,
} from '@/types/liquidity';

// ════════════════════════════════════════════════════════════════════
// TRD — Proveedores de Liquidez (Mesa de Dinero)
// ────────────────────────────────────────────────────────────────────
// L1 — page header (title only in v1; "Nueva operación" CTA deferred
//      to `add-trd-proveedores-create`).
// L2 — 2 KPI cards (Operaciones / Volumen, with REQ-35 ARS contravalor
//      on the second card when the filter narrows to a single non-USD
//      quote pair).
// L3 — filters: Período (weekly/monthly/quarterly/yearly/all),
//      Proveedor, Estado, Plazo. All filters drive both the table AND
//      the summary (server returns them together — REQ-1 §3).
// Table — server-paginated rows with row-click → LiquidityDrawer.
//
// Read-only end-to-end. Create / cancel / receive transitions land
// with `add-trd-proveedores-create` and `add-trd-proveedores-mutations`.
// ════════════════════════════════════════════════════════════════════

const router = useRouter();
const route = useRoute();

const PERIODS: { value: LiquidityPeriod; label: string }[] = [
  { value: 'all',       label: 'Todo' },
  { value: 'weekly',    label: 'Última semana' },
  { value: 'monthly',   label: 'Último mes' },
  { value: 'quarterly', label: 'Último trimestre' },
  { value: 'yearly',    label: 'Último año' },
];

const STATUSES: { value: LiquidityStatus | 'ALL'; label: string }[] = [
  { value: 'ALL',       label: 'Todos' },
  { value: 'PENDING',   label: 'Pendiente' },
  { value: 'RECEIVED',  label: 'Recibida' },
  { value: 'CANCELLED', label: 'Cancelada' },
];

const TERMS: { value: LiquidityTerm | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'T0',  label: 'T0' },
  { value: 'T+1', label: 'T+1' },
  { value: 'T+2', label: 'T+2' },
];

function readPeriod(value: unknown): LiquidityPeriod {
  const v = String(value ?? '');
  if (v === 'weekly' || v === 'monthly' || v === 'quarterly' || v === 'yearly') return v;
  return 'all';
}
function readStatus(value: unknown): LiquidityStatus | 'ALL' {
  const v = String(value ?? '');
  if (v === 'PENDING' || v === 'RECEIVED' || v === 'CANCELLED') return v;
  return 'ALL';
}
function readTerm(value: unknown): LiquidityTerm | 'ALL' {
  const v = String(value ?? '');
  if (v === 'T0' || v === 'T+1' || v === 'T+2') return v;
  return 'ALL';
}
function readPageSize(value: unknown, fallback: AllowedPageSize): AllowedPageSize {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && isAllowedPageSize(parsed) ? parsed : fallback;
}
function readPage(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

// ─── State, seeded from the URL ──────────────────────────────────────
const persistedPageSize = usePersistedPageSize('trd.proveedores.pageSize', 25);
persistedPageSize.value = readPageSize(route.query.pageSize, persistedPageSize.value);

const period = ref<LiquidityPeriod>(readPeriod(route.query.period));
const providerId = ref<string>(String(route.query.providerId ?? 'ALL'));
const status = ref<LiquidityStatus | 'ALL'>(readStatus(route.query.status));
const term = ref<LiquidityTerm | 'ALL'>(readTerm(route.query.term));
const page = ref<number>(readPage(route.query.page));
const pageSize = persistedPageSize;

const drawerOperationId = ref<string | null>(null);
const drawerOpen = ref(false);

// Filter changes reset to page 1.
watch([period, providerId, status, term], () => {
  page.value = 1;
});

// ─── Providers select feed ───────────────────────────────────────────
const providersQuery = useLiquidityProviders();
const providers = computed(() => providersQuery.data.value ?? []);

// ─── Main list query (rows + summary) ────────────────────────────────
const filters = computed(() => ({
  providerId: providerId.value === 'ALL' ? undefined : providerId.value,
  status: status.value,
  term: term.value,
  period: period.value,
  page: page.value,
  pageSize: pageSize.value,
}));

const query = useLiquidityList(filters);
const items = computed(() => query.data.value?.data ?? []);
const pagination = computed(
  () => query.data.value?.pagination ?? {
    page: 1,
    pageSize: pageSize.value,
    total: 0,
    totalPages: 1,
  },
);
const EMPTY_SUMMARY: LiquiditySummary = {
  total_operations: 0,
  pending_count: 0,
  received_count: 0,
  total_usd: '0',
  usd_bought: '0',
  usd_sold: '0',
};
const summary = computed<LiquiditySummary>(
  () => query.data.value?.summary ?? EMPTY_SUMMARY,
);

// ─── URL sync ────────────────────────────────────────────────────────
watch(
  [period, providerId, status, term, page, pageSize],
  () => {
    const newQuery: Record<string, string> = {};
    if (period.value !== 'all') newQuery.period = period.value;
    if (providerId.value !== 'ALL') newQuery.providerId = providerId.value;
    if (status.value !== 'ALL') newQuery.status = status.value;
    if (term.value !== 'ALL') newQuery.term = term.value;
    if (page.value !== 1) newQuery.page = String(page.value);
    newQuery.pageSize = String(pageSize.value);
    router.replace({ query: newQuery });
  },
  { flush: 'post' },
);

// ─── Drawer ──────────────────────────────────────────────────────────
function openDrawer(id: string): void {
  drawerOperationId.value = id;
  drawerOpen.value = true;
}

// ─── Display helpers ─────────────────────────────────────────────────
const STATUS_VARIANT: Record<LiquidityStatus, BadgeVariants['variant']> = {
  PENDING: 'warning',
  RECEIVED: 'success',
  CANCELLED: 'neutral',
};
const STATUS_LABEL: Record<LiquidityStatus, string> = {
  PENDING: 'Pendiente',
  RECEIVED: 'Recibida',
  CANCELLED: 'Cancelada',
};

function formatAmount(value: string, currency: string): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return `${value} ${currency}`;
  return `${new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: currency === 'ARS' ? 0 : 2,
  }).format(num)} ${currency}`;
}
function formatDateShort(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

const hasFilters = computed(
  () =>
    period.value !== 'all' ||
    providerId.value !== 'ALL' ||
    status.value !== 'ALL' ||
    term.value !== 'ALL',
);
const emptyDescription = computed(() =>
  hasFilters.value
    ? 'Probá ajustar los filtros o el período.'
    : 'No hay operaciones registradas todavía.',
);

const isInitialLoading = computed(
  () => query.isLoading.value && !query.data.value,
);
</script>

<template>
  <div class="flex flex-col gap-5" data-testid="proveedores-page">
    <!-- L1 -->
    <header class="flex items-center justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-[22px] font-extrabold tracking-tight text-t-1">Proveedores de Liquidez</h1>
        <p class="text-[13px] text-t-4">
          Blotter de compras y ventas de liquidez que la Mesa ejecuta con brokers externos.
        </p>
      </div>
    </header>

    <!-- L2 — KPI cards -->
    <LiquidityKpiCards :summary="summary" />

    <!-- L3 — filters -->
    <div class="flex flex-wrap items-center gap-3">
      <Select v-model="period">
        <SelectTrigger class="w-[170px]" data-testid="proveedores-period">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="p in PERIODS" :key="p.value" :value="p.value">
            {{ p.label }}
          </SelectItem>
        </SelectContent>
      </Select>

      <Select v-model="providerId">
        <SelectTrigger class="w-[180px]" data-testid="proveedores-provider">
          <SelectValue placeholder="Proveedor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos los proveedores</SelectItem>
          <SelectItem v-for="p in providers" :key="p.id" :value="p.id">
            {{ p.name }}
          </SelectItem>
        </SelectContent>
      </Select>

      <Select v-model="status">
        <SelectTrigger class="w-[150px]" data-testid="proveedores-status">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="s in STATUSES" :key="s.value" :value="s.value">
            {{ s.label }}
          </SelectItem>
        </SelectContent>
      </Select>

      <Select v-model="term">
        <SelectTrigger class="w-[120px]" data-testid="proveedores-term">
          <SelectValue placeholder="Plazo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="t in TERMS" :key="t.value" :value="t.value">
            {{ t.label }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- Skeleton -->
    <div
      v-if="isInitialLoading"
      class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2"
      data-testid="proveedores-skeleton"
    >
      <div class="border-b border-b-2 px-[18px] py-2.5">
        <Skeleton class="h-3 w-32" />
      </div>
      <div v-for="i in 5" :key="i" class="flex items-center gap-4 border-b border-b-1 px-[18px] py-3 last:border-b-0">
        <Skeleton class="h-3 w-20" />
        <Skeleton class="h-3 w-1/5" />
        <Skeleton class="h-3 w-16" />
        <Skeleton class="h-3 w-1/4" />
        <Skeleton class="h-3 w-12" />
      </div>
    </div>

    <!-- Empty -->
    <EmptyState
      v-else-if="items.length === 0"
      title="No hay operaciones para mostrar"
      :description="emptyDescription"
      data-testid="proveedores-empty"
    />

    <!-- Table -->
    <div
      v-else
      class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2"
      data-testid="proveedores-table"
    >
      <table class="w-full border-collapse">
        <thead>
          <tr class="border-b border-b-2">
            <th class="px-[18px] py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Fecha op.</th>
            <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Proveedor</th>
            <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Tipo</th>
            <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Par</th>
            <th class="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Monto</th>
            <th class="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">TC</th>
            <th class="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Contravalor</th>
            <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Plazo</th>
            <th class="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Liquidación</th>
            <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="op in items"
            :key="op.id"
            class="cursor-pointer border-b border-b-1 transition-colors last:border-b-0 hover:bg-white/[0.02]"
            :data-testid="`row-${op.id}`"
            @click="openDrawer(op.id)"
          >
            <td class="px-[18px] py-2.5 text-xs text-t-3">{{ formatDateShort(op.operation_date) }}</td>
            <td class="px-3.5 py-2.5 text-[13px] font-semibold text-t-2">{{ op.provider_name }}</td>
            <td class="px-3.5 py-2.5">
              <span
                :class="op.operation_type === 'BUY' ? 'text-success' : 'text-danger'"
                class="text-[11px] font-bold"
              >
                {{ op.operation_type }}
              </span>
            </td>
            <td class="px-3.5 py-2.5 text-xs text-t-3">
              {{ op.base_currency_code }}/{{ op.quote_currency_code }}
            </td>
            <td class="px-3.5 py-2.5 text-right font-mono text-[13px] text-t-2">
              {{ formatAmount(op.origin_amount, op.base_currency_code) }}
            </td>
            <td class="px-3.5 py-2.5 text-right font-mono text-xs text-t-3">{{ op.exchange_rate }}</td>
            <td class="px-3.5 py-2.5 text-right font-mono text-[13px] text-t-2">
              {{ formatAmount(op.destination_amount, op.quote_currency_code) }}
            </td>
            <td class="px-3.5 py-2.5 text-xs text-t-3">{{ op.term }}</td>
            <td class="px-3.5 py-2.5 text-right text-xs text-t-3">{{ formatDateShort(op.settlement_date) }}</td>
            <td class="px-3.5 py-2.5">
              <Badge :variant="STATUS_VARIANT[op.status]">
                {{ STATUS_LABEL[op.status] }}
              </Badge>
            </td>
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

    <LiquidityDrawer
      v-if="drawerOperationId"
      :open="drawerOpen"
      :operation-id="drawerOperationId"
      @update:open="(v: boolean) => (drawerOpen = v)"
    />
  </div>
</template>
