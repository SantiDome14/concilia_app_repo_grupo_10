<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { Badge } from '@/components/ui/badge';
import { TablePagination } from '@/components/data-display';
import {
  ViewToggle,
  CardsGrid,
  CardItem,
  type ViewMode,
} from '@/components/views';
import { KanbanBoard } from '@/components/kanban';
import { ManifestActionsMenu } from '@/components/manifest';
import { useTable } from '@/composables/useTable';
import { useCapabilities } from '@/composables/useCapabilities';
import { useManifestModule } from '@/composables/useManifestModule';
import { PAGE_SIZE_OPTIONS } from '@/constants';
import { getQuote, listQuotes, updateQuote } from '@/api/modules/trades';
import TradesFilters from '@/ops/trades/TradesFilters.vue';
import TradesTable from '@/ops/trades/TradesTable.vue';
import QuoteDetailsModal from '@/ops/trades/QuoteDetailsModal.vue';
import { OPS_TRADES_MANIFEST_KEY } from '@/manifests/ops.trades.actions';
import type {
  Quote,
  QuoteDetails,
  QuotesListResponse,
  QuotesPeriod,
} from '@/ops/trades/types';
import type { KanbanAxis, KanbanRecord } from '@/types/kanban';

// ════════════════════════════════════════════════════════════════════
// Trades page — Type A master list at /trades.
// ────────────────────────────────────────────────────────────────────
// Quotes are originated by TRD's Mesa de Dinero; OPS does NOT create
// them, so the page header has only the ViewToggle (no Main / Secondary
// CTA). Active + Historic are no longer separate tabs — the Estado
// filter handles segmentation.
//
// L1: title + ViewToggle.
// L2: 5 KPI tiles (Total · Activos · Pendientes · Aceptados · Completados).
// L3: search left + filters right (Período · Estado · Operación · Plazo).
// Body: Lista (default) · Tarjetas · Tablero (estado_operativo axis,
//       OPS owns the lifecycle so all transitions are drag-droppable).
// Footer: <TablePagination> via useTable.
//
// Per-row Acciones surface through <ManifestActionsMenu>; the page
// registers a dispatcher that PATCHes the quote via updateQuote with
// optimistic update + rollback.
// ════════════════════════════════════════════════════════════════════

const route = useRoute();
const router = useRouter();
const { can } = useCapabilities();
const queryClient = useQueryClient();
const tradesMod = useManifestModule(OPS_TRADES_MANIFEST_KEY);

const canRead = computed(() => can('cotizaciones:read') || can('OPS_ADMIN'));

// ─── State (URL-reflected) ──────────────────────────────────────────
const search = ref<string>(typeof route.query.search === 'string' ? route.query.search : '');
const period = ref<QuotesPeriod>(parsePeriod(route.query.period));
const statusFilter = ref<string>(typeof route.query.status === 'string' ? route.query.status : '');
const operationFilter = ref<string>(
  typeof route.query.operation === 'string' ? route.query.operation : '',
);
const termFilter = ref<string>(typeof route.query.term === 'string' ? route.query.term : '');
const view = ref<ViewMode>(parseView(route.query.view));

type AxisId = 'estado_operativo' | 'confirmacion_origen' | 'confirmacion_destino';

const activeAxisId = ref<AxisId>(parseAxisId(route.query.axis));

function parsePeriod(value: unknown): QuotesPeriod {
  if (value === 'todo' || value === 'semana' || value === 'mes') return value;
  return 'dia';
}

function parseView(value: unknown): ViewMode {
  if (value === 'cards' || value === 'kanban') return value;
  return 'list';
}

function parseAxisId(value: unknown): AxisId {
  if (value === 'confirmacion_origen' || value === 'confirmacion_destino') return value;
  return 'estado_operativo';
}

// Reference "today" anchor — matches the latest mock record.
const TRADES_TODAY_ISO = '2026-05-15';

function withinPeriod(iso: string, p: QuotesPeriod): boolean {
  if (p === 'todo') return true;
  const today = new Date(`${TRADES_TODAY_ISO}T00:00:00Z`).getTime();
  const cutoffDays = p === 'dia' ? 0 : p === 'semana' ? 7 : 30;
  const cutoff = today - cutoffDays * 86_400_000;
  return new Date(iso).getTime() >= cutoff;
}

// ─── URL sync ───────────────────────────────────────────────────────
watch(
  [search, period, statusFilter, operationFilter, termFilter, view, activeAxisId],
  ([s, p, st, op, t, viewMode, axisId]) => {
    const next: Record<string, string> = {};
    if (s) next.search = s;
    if (p !== 'dia') next.period = p;
    if (st) next.status = st;
    if (op) next.operation = op;
    if (t) next.term = t;
    if (viewMode !== 'list') next.view = viewMode;
    if (axisId !== 'estado_operativo') next.axis = axisId;
    if (typeof route.query.quote === 'string') next.quote = route.query.quote;
    void router.replace({ query: next });
  },
);

// ─── Data (full ledger; client-side filtering + pagination) ─────────
const TRADES_KEY = ['ops', 'trades', 'list'] as const;
const FETCH_PAGE_SIZE = 1000;

const tradesQuery = useQuery({
  queryKey: TRADES_KEY,
  queryFn: () => listQuotes({ page: 1, pageSize: FETCH_PAGE_SIZE }),
  enabled: canRead,
});

const allQuotes = computed<Quote[]>(() => tradesQuery.data.value?.data ?? []);

const filtered = computed<Quote[]>(() => {
  let source = allQuotes.value;
  const q = search.value.trim().toLowerCase();
  if (q !== '') {
    source = source.filter((row) => {
      const idHit = row.id.toLowerCase().includes(q);
      const clientHit = (row.client_name ?? '').toLowerCase().includes(q);
      return idHit || clientHit;
    });
  }
  if (period.value !== 'todo') {
    source = source.filter((row) => withinPeriod(row.created_at, period.value));
  }
  if (statusFilter.value) source = source.filter((row) => row.status === statusFilter.value);
  if (operationFilter.value) source = source.filter((row) => row.operation === operationFilter.value);
  if (termFilter.value) source = source.filter((row) => row.term === termFilter.value);
  return source;
});

const hasActiveFilters = computed(
  () =>
    Boolean(search.value) ||
    period.value !== 'dia' ||
    Boolean(statusFilter.value) ||
    Boolean(operationFilter.value) ||
    Boolean(termFilter.value),
);

const termOptions = computed(() =>
  Array.from(new Set(allQuotes.value.map((q) => q.term).filter((t): t is string => Boolean(t)))).sort(),
);

function clearFilters(): void {
  search.value = '';
  period.value = 'todo';
  statusFilter.value = '';
  operationFilter.value = '';
  termFilter.value = '';
}

// ─── L2 KPIs ────────────────────────────────────────────────────────
//   Total       — every row in the filtered set
//   Activos     — non-terminal (PENDING + ACCEPTED)
//   Pendientes  — PENDING only (esperando confirmación)
//   Aceptados   — ACCEPTED only (en proceso)
//   Completados — COMPLETED (liquidados)
const kpis = computed(() => {
  const rows = filtered.value;
  let pending = 0;
  let accepted = 0;
  let completed = 0;
  for (const r of rows) {
    if (r.status === 'PENDING') pending += 1;
    else if (r.status === 'ACCEPTED') accepted += 1;
    else if (r.status === 'COMPLETED') completed += 1;
  }
  return {
    total: rows.length,
    activos: pending + accepted,
    pendientes: pending,
    aceptados: accepted,
    completados: completed,
  };
});

// ─── Pagination via useTable ────────────────────────────────────────
const table = useTable<Quote>({ data: filtered, pageSize: 10 });

// ─── Mutation: PATCH /quotes/:id ────────────────────────────────────
type UpdatePayload = { id: string; patch: Record<string, unknown> };

const updateMutation = useMutation({
  mutationFn: ({ id, patch }: UpdatePayload) => updateQuote(id, patch),
  onMutate: async ({ id, patch }) => {
    await queryClient.cancelQueries({ queryKey: TRADES_KEY });
    const snapshot = queryClient.getQueryData<QuotesListResponse>(TRADES_KEY);
    queryClient.setQueryData<QuotesListResponse>(TRADES_KEY, (old) => {
      if (!old) return old;
      return {
        ...old,
        // Mirror the backend derivation: once both legs land on `true`
        // AND the quote was ACCEPTED, OPS auto-transitions to COMPLETED.
        // Applying it client-side keeps the kanban / KPIs in sync with
        // the eventual server response (avoids a "leg=true, status=ACCEPTED"
        // flash between optimistic patch and refetch).
        data: old.data.map((q) => {
          if (q.id !== id) return q;
          const merged = { ...q, ...patch } as Quote;
          if (
            merged.leg_origen_confirmed === true &&
            merged.leg_destino_confirmed === true &&
            merged.status === 'ACCEPTED'
          ) {
            merged.status = 'COMPLETED';
          }
          return merged;
        }),
      };
    });
    return { snapshot };
  },
  onError: (_err, _vars, ctx) => {
    if (ctx?.snapshot) queryClient.setQueryData(TRADES_KEY, ctx.snapshot);
    toast.error('No se pudo guardar el cambio. Se revirtió.');
  },
  onSettled: () => {
    void queryClient.invalidateQueries({ queryKey: TRADES_KEY });
  },
});

tradesMod.registerDispatcher({
  update: (recordId, patch) => {
    updateMutation.mutate({ id: recordId, patch });
  },
  create: () => {
    // Trades are originated by TRD — OPS never creates them through this page.
  },
});

// ─── Kanban axes — every state-bearing field of a Quote surfaces as a
//     column breakdown. Three axes:
//       - estado_operativo       (RO: PENDING / ACCEPTED / COMPLETED / REJECTED / EXPIRED)
//       - confirmacion_origen    (Sin confirmar / Confirmado — drag opens confirmar_origen)
//       - confirmacion_destino   (same — opens confirmar_destino)
//     The two confirmation axes consume projected discriminators
//     (_origen_state / _destino_state) derived from the boolean leg
//     fields, so the kanban renders Sin/Confirmado columns without
//     touching the original booleans.
const KANBAN_AXES: Record<AxisId, KanbanAxis> = {
  estado_operativo: {
    axis_id: 'estado_operativo',
    label: 'Estado operativo',
    description:
      'Vista por estado del lifecycle. La transición a COMPLETED es automática cuando los dos lados están confirmados.',
    state_field: 'status',
    states: [
      { id: 'PENDING', label: 'Pending', order: 1 },
      { id: 'ACCEPTED', label: 'Accepted', order: 2 },
      { id: 'COMPLETED', label: 'Completed', order: 3, terminal: true },
      { id: 'REJECTED', label: 'Rejected', order: 4, terminal: true },
      { id: 'EXPIRED', label: 'Expired', order: 5, terminal: true },
    ],
    transitions: [],
    read_only: true,
  },
  confirmacion_origen: {
    axis_id: 'confirmacion_origen',
    label: 'Confirmación · Lado origen',
    description:
      'Arrastrá una tarjeta "Sin confirmar" a "Confirmado" para registrar la pierna lado origen.',
    state_field: '_origen_state',
    states: [
      { id: 'sin_confirmar', label: 'Sin confirmar', order: 1 },
      { id: 'confirmado', label: 'Confirmado', order: 2 },
    ],
    transitions: [{ from: 'sin_confirmar', to: 'confirmado', mode: 'modal' }],
  },
  confirmacion_destino: {
    axis_id: 'confirmacion_destino',
    label: 'Confirmación · Lado destino',
    description:
      'Arrastrá una tarjeta "Sin confirmar" a "Confirmado" para registrar la pierna lado destino.',
    state_field: '_destino_state',
    states: [
      { id: 'sin_confirmar', label: 'Sin confirmar', order: 1 },
      { id: 'confirmado', label: 'Confirmado', order: 2 },
    ],
    transitions: [{ from: 'sin_confirmar', to: 'confirmado', mode: 'modal' }],
  },
};

const activeAxis = computed<KanbanAxis>(() => KANBAN_AXES[activeAxisId.value]);

function setActiveAxis(next: AxisId): void {
  if (next === activeAxisId.value) return;
  activeAxisId.value = next;
}

const kanbanRecords = computed<KanbanRecord[]>(() =>
  filtered.value.map(
    (q) =>
      ({
        ...(q as unknown as Record<string, unknown>),
        _origen_state: q.leg_origen_confirmed ? 'confirmado' : 'sin_confirmar',
        _destino_state: q.leg_destino_confirmed ? 'confirmado' : 'sin_confirmar',
      }) as unknown as KanbanRecord,
  ),
);

function handleKanbanTransition(payload: {
  recordId: string;
  fromState: string;
  toState: string;
  mode: string;
  axisId: string;
}): void {
  if (payload.mode !== 'modal') return;
  if (payload.toState !== 'confirmado') return;
  const record = allQuotes.value.find((q) => q.id === payload.recordId);
  if (!record) return;
  const actionId =
    payload.axisId === 'confirmacion_origen'
      ? 'trades.confirmar_origen'
      : payload.axisId === 'confirmacion_destino'
        ? 'trades.confirmar_destino'
        : null;
  if (!actionId) return;
  tradesMod.openDialog(actionId, record as unknown as Record<string, unknown>);
}

// ─── Card helpers (Tarjetas + Tablero) ──────────────────────────────
function statusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const s = status.toUpperCase();
  if (s === 'COMPLETED' || s === 'ACCEPTED') return 'success';
  if (s === 'PENDING') return 'warning';
  if (s === 'REJECTED' || s === 'EXPIRED' || s === 'CANCELLED') return 'danger';
  return 'neutral';
}

function formatAmount(value: string): string {
  const num = Number.parseFloat(value);
  if (!Number.isFinite(num)) return value;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(value: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

// ─── Quote details modal ────────────────────────────────────────────
const detailsOpen = ref(false);
const detailsQuote = ref<QuoteDetails | null>(null);

async function openDetails(quote: Quote): Promise<void> {
  try {
    detailsQuote.value = await getQuote(quote.id);
    detailsOpen.value = true;
    void router.replace({ query: { ...route.query, quote: quote.id } });
  } catch {
    detailsQuote.value = null;
  }
}

function onDetailsOpenChange(value: boolean): void {
  detailsOpen.value = value;
  if (!value) {
    detailsQuote.value = null;
    const next = { ...route.query };
    delete next.quote;
    void router.replace({ query: next });
  }
}

// Deep-link: `?quote=<id>` opens the modal on mount / route change.
watch(
  () => route.query.quote,
  async (id, prev) => {
    if (id === prev) return;
    if (typeof id !== 'string' || !id) return;
    if (detailsOpen.value && detailsQuote.value?.id === id) return;
    try {
      detailsQuote.value = await getQuote(id);
      detailsOpen.value = true;
    } catch {
      detailsQuote.value = null;
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex flex-col gap-5 px-[22px] py-5" data-testid="trades-page">
    <!-- L1 · Page header — no CTAs (OPS does not create quotes) -->
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-[22px] font-extrabold tracking-tight text-t-1">Trades</h1>
        <p class="mt-1 text-xs text-t-3">
          Cotizaciones del desk de TRD. OPS gestiona la liquidación post-aceptación.
        </p>
      </div>
      <div class="flex items-center gap-3" data-testid="trades-view-toggle-slot">
        <ViewToggle
          v-model="view"
          :views="['list', 'cards', 'kanban']"
          data-testid="trades-view-toggle"
        />
      </div>
    </header>

    <!-- L2 · KPI strip -->
    <section
      class="grid grid-cols-2 gap-3 lg:grid-cols-5"
      data-testid="trades-kpis"
    >
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Total</div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">{{ kpis.total }}</div>
        <div class="mt-1 text-[11px] text-t-4">todos los registros</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Activos</div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">{{ kpis.activos }}</div>
        <div class="mt-1 text-[11px] text-t-4">no terminales</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Pendientes</div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-warning">{{ kpis.pendientes }}</div>
        <div class="mt-1 text-[11px] text-t-4">esperando confirmación</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Aceptados</div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-success">{{ kpis.aceptados }}</div>
        <div class="mt-1 text-[11px] text-t-4">en proceso</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Completados</div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">{{ kpis.completados }}</div>
        <div class="mt-1 text-[11px] text-t-4">liquidados</div>
      </div>
    </section>

    <!-- L3 · Search + filters -->
    <TradesFilters
      :search="search"
      :period="period"
      :status="statusFilter"
      :operation="operationFilter"
      :term="termFilter"
      :has-active-filters="hasActiveFilters"
      :term-options="termOptions"
      @update:search="(v) => (search = v)"
      @update:period="(v) => (period = v)"
      @update:status="(v) => (statusFilter = v)"
      @update:operation="(v) => (operationFilter = v)"
      @update:term="(v) => (termFilter = v)"
      @clear-filters="clearFilters"
    />

    <!-- LIST view -->
    <template v-if="view === 'list'">
      <TradesTable
        :rows="table.paged.value"
        :is-loading="tradesQuery.isPending.value"
        :has-active-filters="hasActiveFilters"
        :manifest-key="OPS_TRADES_MANIFEST_KEY"
        @row-click="openDetails"
        @clear-filters="clearFilters"
      />
      <TablePagination
        v-if="!tradesQuery.isPending.value && table.total.value > 0"
        :page="table.page.value"
        :page-size="table.pageSize.value"
        :total="table.total.value"
        :total-pages="table.totalPages.value"
        :page-size-options="PAGE_SIZE_OPTIONS"
        data-testid="trades-pagination"
        @update:page="table.setPage"
        @update:page-size="table.setPageSize"
      />
    </template>

    <!-- CARDS view -->
    <CardsGrid v-else-if="view === 'cards'" data-testid="trades-cards">
      <CardItem
        v-for="q in filtered"
        :key="q.id"
        :record="q as unknown as Record<string, unknown>"
        :data-testid="`trades-card-${q.id}`"
        @click="openDetails(q)"
      >
        <template #header>
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <span class="font-mono text-[11px] text-t-4">{{ q.id }}</span>
            <span class="truncate text-sm font-semibold text-t-1">
              {{ q.client_name || '—' }}
            </span>
          </div>
          <Badge :variant="statusVariant(q.status)" class="text-[10px]">{{ q.status }}</Badge>
          <span @click.stop>
            <ManifestActionsMenu
              :manifest-key="OPS_TRADES_MANIFEST_KEY"
              :record="q as unknown as Record<string, unknown>"
              variant="card"
            />
          </span>
        </template>
        <template #body>
          <div class="space-y-1 text-xs text-t-3">
            <div class="font-mono text-sm text-t-2">
              {{ q.operation }} · {{ q.origin_currency }}/{{ q.destination_currency }} · {{ q.term ?? '—' }}
            </div>
            <div class="truncate">Monto: {{ formatAmount(q.origin_amount) }} {{ q.origin_currency }}</div>
            <div class="truncate">TC: {{ formatAmount(q.exchange_rate) }}</div>
            <div class="truncate">Calculated: {{ formatAmount(q.destination_amount) }} {{ q.destination_currency }}</div>
          </div>
        </template>
        <template #footer>
          <span>{{ formatDate(q.created_at) }}</span>
        </template>
      </CardItem>
    </CardsGrid>

    <!-- KANBAN view -->
    <div v-else class="min-h-[480px]" data-testid="trades-kanban-wrapper">
      <KanbanBoard
        :axis="activeAxis"
        :axes="KANBAN_AXES"
        :records="kanbanRecords"
        title="Cotizaciones"
        @transition="handleKanbanTransition"
        @update:axis-id="(id: string) => setActiveAxis(id as AxisId)"
      >
        <template #card="{ record }">
          <CardItem :record="record" @click="openDetails(record as unknown as Quote)">
            <template #header>
              <div class="flex min-w-0 flex-1 items-center gap-2">
                <span class="font-mono text-[11px] text-t-4">
                  {{ (record as unknown as Quote).id }}
                </span>
                <span class="truncate text-sm font-semibold text-t-1">
                  {{ (record as unknown as Quote).client_name || '—' }}
                </span>
              </div>
              <span @click.stop>
                <ManifestActionsMenu
                  :manifest-key="OPS_TRADES_MANIFEST_KEY"
                  :record="record"
                  variant="card"
                />
              </span>
            </template>
            <template #body>
              <div class="space-y-1 text-xs text-t-3">
                <div class="font-mono text-sm text-t-2">
                  {{ (record as unknown as Quote).operation }} ·
                  {{ (record as unknown as Quote).origin_currency }}/{{ (record as unknown as Quote).destination_currency }}
                </div>
                <div>{{ formatAmount((record as unknown as Quote).origin_amount) }}
                  {{ (record as unknown as Quote).origin_currency }}</div>
              </div>
            </template>
            <template #footer>
              <span>{{ formatDate((record as unknown as Quote).created_at) }}</span>
            </template>
          </CardItem>
        </template>
      </KanbanBoard>
    </div>

    <QuoteDetailsModal
      :open="detailsOpen"
      :quote="detailsQuote"
      @update:open="onDetailsOpenChange"
    />
  </div>
</template>
