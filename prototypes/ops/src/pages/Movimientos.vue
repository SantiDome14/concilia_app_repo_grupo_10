<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { useRoute, useRouter } from 'vue-router';
import { Plus } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
  createMovement,
  getMovement,
  listMovements,
  updateMovement,
} from '@/api/modules/movimientos';
import MovimientosFilters, {
  type PeriodValue,
} from '@/ops/movimientos/MovimientosFilters.vue';
import MovimientosTable from '@/ops/movimientos/MovimientosTable.vue';
import MovementDetailsModal from '@/ops/movimientos/MovementDetailsModal.vue';
import {
  MOVEMENT_TYPE_OPTIONS,
  MOVEMENT_STATUS_OPTIONS,
  MOVEMENT_RAIL_OPTIONS,
  getMovementTypeLabel,
  getMovementRailLabel,
} from '@/ops/movimientos/catalog';
import { OPS_MOVIMIENTOS_MANIFEST_KEY } from '@/manifests/ops.movimientos.actions';
import type {
  Movement,
  MovementDetails,
  MovementsListResponse,
} from '@/ops/movimientos/types';
import type { SponsorCode } from '@/ops/psp/types';
import type { KanbanAxis, KanbanRecord } from '@/types/kanban';

// ════════════════════════════════════════════════════════════════════
// Movimientos page — Type A master list at /movimientos.
// ────────────────────────────────────────────────────────────────────
// L1 header: title + ViewToggle + "+ Create Movement" CTA (Wizard-of-Oz
// stub for v1). L2: 5 KPI tiles computed over filtered rows. L3: search
// (left) + filters (right) with Período / Tipo / Rail / Partner / Estado.
// Three views: Lista (default, paginated via useTable + TablePagination),
// Tarjetas (CardsGrid), Tablero (KanbanBoard, read-only axis = status).
//
// Transport: full ledger fetched once via `listMovements` (server-side
// pagination disabled — `pageSize: 1000`); pagination is local. PSP
// keeps its own server-side path.
// ════════════════════════════════════════════════════════════════════

const route = useRoute();
const router = useRouter();
const { can } = useCapabilities();
const queryClient = useQueryClient();
const movimientosMod = useManifestModule(OPS_MOVIMIENTOS_MANIFEST_KEY);

const canRead = computed(() => can('movimientos:read') || can('OPS_ADMIN'));
const canCreate = computed(() => can('movimientos:write') || can('OPS_ADMIN'));

// ─── Filter state (URL-reflected) ──────────────────────────────────
const sponsorFilter = ref<SponsorCode | null>(
  typeof route.query.sponsor === 'string' ? route.query.sponsor : null,
);
const movSearch = ref<string>(typeof route.query.search === 'string' ? route.query.search : '');
const movType = ref<string>(typeof route.query.type === 'string' ? route.query.type : '');
const movStatus = ref<string>(typeof route.query.status === 'string' ? route.query.status : '');
const movRail = ref<string>(typeof route.query.rail === 'string' ? route.query.rail : '');
const movPeriod = ref<PeriodValue>(parsePeriod(route.query.period));
const view = ref<ViewMode>(parseView(route.query.view));

function parsePeriod(value: unknown): PeriodValue {
  if (value === 'dia' || value === 'semana' || value === 'mes') return value;
  return 'todo';
}

function parseView(value: unknown): ViewMode {
  if (value === 'cards' || value === 'kanban') return value;
  return 'list';
}

// Reference "today" anchor — matches the latest mock record.
const MOV_TODAY_ISO = '2026-05-15';

function withinPeriodo(fecha: string, periodo: PeriodValue): boolean {
  if (periodo === 'todo') return true;
  const today = new Date(`${MOV_TODAY_ISO}T00:00:00Z`).getTime();
  const cutoffDays = periodo === 'dia' ? 0 : periodo === 'semana' ? 7 : 30;
  const cutoff = today - cutoffDays * 86_400_000;
  return new Date(`${fecha}T00:00:00Z`).getTime() >= cutoff;
}

// ─── URL sync ───────────────────────────────────────────────────────
watch(
  [sponsorFilter, movSearch, movType, movStatus, movRail, movPeriod, view],
  ([sponsor, search, type, status, rail, period, viewMode]) => {
    const next: Record<string, string> = {};
    if (sponsor) next.sponsor = sponsor;
    if (search) next.search = search;
    if (type) next.type = type;
    if (status) next.status = status;
    if (rail) next.rail = rail;
    if (period !== 'todo') next.period = period;
    if (viewMode !== 'list') next.view = viewMode;
    if (typeof route.query.movement === 'string') next.movement = route.query.movement;
    void router.replace({ query: next });
  },
);

// ─── Movements query (full ledger, client-side paginated) ───────────
const FETCH_PAGE_SIZE = 1000;
const movementsQueryKey = computed(
  () => ['ops', 'movimientos', 'list', { sponsor: sponsorFilter.value }] as const,
);

const movementsQuery = useQuery({
  queryKey: movementsQueryKey,
  queryFn: () =>
    listMovements({
      ...(sponsorFilter.value ? { sponsor: sponsorFilter.value } : {}),
      page: 1,
      pageSize: FETCH_PAGE_SIZE,
    }),
  enabled: canRead,
});

const allMovements = computed<Movement[]>(() => movementsQuery.data.value?.data ?? []);

// ─── Mutation: PATCH /movements/:id with optimistic + rollback ──────
type UpdatePayload = { id: string; patch: Record<string, unknown> };

const updateMutation = useMutation({
  mutationFn: ({ id, patch }: UpdatePayload) => updateMovement(id, patch),
  onMutate: async ({ id, patch }) => {
    await queryClient.cancelQueries({ queryKey: movementsQueryKey.value });
    const snapshot = queryClient.getQueryData<MovementsListResponse>(
      movementsQueryKey.value,
    );
    queryClient.setQueryData<MovementsListResponse>(
      movementsQueryKey.value,
      (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((m) =>
            m.id === id ? ({ ...m, ...patch } as Movement) : m,
          ),
        };
      },
    );
    return { snapshot };
  },
  onError: (_err, _vars, ctx) => {
    if (ctx?.snapshot) {
      queryClient.setQueryData(movementsQueryKey.value, ctx.snapshot);
    }
    toast.error('No se pudo guardar el cambio. Se revirtió y resincronizó.');
  },
  onSettled: () => {
    void queryClient.invalidateQueries({ queryKey: movementsQueryKey.value });
  },
});

// ─── Mutation: POST /movements (used by Crear Ajuste DB/CR) ─────────
const createMutation = useMutation({
  mutationFn: (payload: Record<string, unknown>) => createMovement(payload),
  onError: (err) => {
    const msg = err instanceof Error ? err.message : 'No se pudo crear el ajuste.';
    toast.error(msg);
  },
  onSettled: () => {
    void queryClient.invalidateQueries({ queryKey: movementsQueryKey.value });
  },
});

// Manifest engine never mutates records — it dispatches computed
// patches here, and useMutation owns optimistic + rollback + refetch.
//
// `_create_adjustment` is a manifest-side marker (set by the
// Crear Ajuste DB/CR actions) that re-routes the patch into a POST
// instead of a PATCH against the source record. The marker stays out
// of the persisted payload.
//
// The ajuste is a brand-new movement: the source is referenced only
// via `metadata.source_movement_id`, and only the fields that have to
// match for the balance netting to make sense (client, currency,
// sponsor) are inherited. Bank / cuenta and contraparte are left
// blank so the new ajuste lands as "Sin asignar" and can be imputed
// through `asignar_banco_cuenta` if and when needed.
movimientosMod.registerDispatcher({
  update: (recordId, patch) => {
    const marker = patch['_create_adjustment'];
    if (marker === 'DEBIT' || marker === 'CREDIT') {
      const source = allMovements.value.find((m) => m.id === recordId);
      if (!source) return;
      const monto = String(patch['ajuste_monto'] ?? '0');
      const signed = marker === 'DEBIT' && !monto.startsWith('-') ? `-${monto}` : monto;
      createMutation.mutate({
        type: marker === 'DEBIT' ? 'AJUSTE_DEBITO' : 'AJUSTE_CREDITO',
        status: 'COMPLETED',
        amount: signed,
        currency: source.currency,
        rail: 'INTERNAL',
        client: source.client,
        sponsor: source.sponsor,
        destination: null,
        origin: null,
        counterparty: null,
        metadata: {
          source_movement_id: source.id,
          concept: String(patch['ajuste_concepto'] ?? ''),
        },
      });
      return;
    }
    updateMutation.mutate({ id: recordId, patch });
  },
  create: () => {
    // ModuleCTA-level create flow not used by this manifest yet.
  },
});

const filteredMovements = computed<Movement[]>(() => {
  let source = allMovements.value;

  const q = movSearch.value.trim().toLowerCase();
  if (q !== '') {
    source = source.filter((m) => {
      const idHit = m.id.toLowerCase().includes(q);
      const clientHit = (m.client ?? '').toLowerCase().includes(q);
      const cpHit = (m.counterparty ?? '').toLowerCase().includes(q);
      return idHit || clientHit || cpHit;
    });
  }
  if (movPeriod.value !== 'todo') {
    source = source.filter((m) => withinPeriodo(m.date, movPeriod.value));
  }
  if (movType.value) source = source.filter((m) => m.type === movType.value);
  if (movRail.value) source = source.filter((m) => m.rail === movRail.value);
  if (movStatus.value) source = source.filter((m) => m.status === movStatus.value);

  return source;
});

const hasActiveFilters = computed(
  () =>
    Boolean(sponsorFilter.value) ||
    Boolean(movSearch.value) ||
    Boolean(movType.value) ||
    Boolean(movStatus.value) ||
    Boolean(movRail.value) ||
    movPeriod.value !== 'todo',
);

const typeOptions = MOVEMENT_TYPE_OPTIONS;
const statusOptions = MOVEMENT_STATUS_OPTIONS;
const railOptions = MOVEMENT_RAIL_OPTIONS;

function clearFilters(): void {
  sponsorFilter.value = null;
  movSearch.value = '';
  movType.value = '';
  movStatus.value = '';
  movRail.value = '';
  movPeriod.value = 'todo';
}

// ─── L2 KPIs ────────────────────────────────────────────────────────
// Buckets follow the operator-approved naming:
//  - Entradas  → DEPOSIT-like rows (positive cash flow into the platform)
//  - Salidas   → WITHDRAWAL-like rows (negative cash flow out)
//  - Internos  → INT_/IN_/COLLECTOR_/FEE — neither client deposit nor withdrawal
//  - Sin asignar → outflows without destination AND without origin
const DEPOSIT_LIKE = new Set(['DEPOSIT', 'FX_DEPOSIT']);
const WITHDRAWAL_LIKE = new Set(['WITHDRAWAL', 'FX_WITHDRAWAL']);

const kpis = computed(() => {
  const rows = filteredMovements.value;
  let entradas = 0;
  let salidas = 0;
  let internos = 0;
  let sinAsignar = 0;
  for (const r of rows) {
    if (DEPOSIT_LIKE.has(r.type)) entradas += 1;
    else if (WITHDRAWAL_LIKE.has(r.type)) salidas += 1;
    else internos += 1;
    if (!r.destination && !r.origin) sinAsignar += 1;
  }
  return { total: rows.length, entradas, salidas, internos, sinAsignar };
});

// ─── Table state via useTable ───────────────────────────────────────
const movTable = useTable<Movement>({
  data: filteredMovements,
  pageSize: 10,
});

// ─── Kanban axis — imputación Lado Ardua (sin asignar / asignado) ───
// `_imp_destination` is a projected discriminator computed below; the
// kanban transition opens the `asignar_banco_cuenta` action so the
// operator imputes the row through the manifest engine.
const IMPUTACION_AXIS: KanbanAxis = {
  axis_id: 'imputacion_banco_cuenta',
  label: 'Imputación · Banco y Cuenta',
  description: 'Arrastrá un movimiento "Sin asignar" a "Asignado" para imputarle banco y cuenta.',
  state_field: '_imp_destination',
  states: [
    { id: 'sin_asignar', label: 'Sin asignar', order: 1 },
    { id: 'asignado', label: 'Asignado', order: 2 },
  ],
  transitions: [{ from: 'sin_asignar', to: 'asignado', mode: 'modal' }],
};

const kanbanRecords = computed<KanbanRecord[]>(() =>
  filteredMovements.value.map(
    (m) =>
      ({
        ...(m as unknown as Record<string, unknown>),
        _imp_destination: m.destination ? 'asignado' : 'sin_asignar',
      }) as unknown as KanbanRecord,
  ),
);

function handleKanbanTransition(payload: {
  recordId: string;
  fromState: string;
  toState: string;
  mode: string;
}): void {
  if (payload.mode !== 'modal') return;
  const record = allMovements.value.find((m) => m.id === payload.recordId);
  if (!record) return;
  if (payload.toState === 'asignado') {
    movimientosMod.openDialog(
      'movimientos.asignar_banco_cuenta',
      record as unknown as Record<string, unknown>,
    );
  }
}

// ─── Movement details modal ─────────────────────────────────────────
const detailsOpen = ref(false);
const detailsMovement = ref<MovementDetails | null>(null);

async function openDetails(movement: Movement): Promise<void> {
  try {
    const fetched = await getMovement(movement.id);
    detailsMovement.value = fetched;
    detailsOpen.value = true;
    void router.replace({ query: { ...route.query, movement: movement.id } });
  } catch {
    detailsMovement.value = null;
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

watch(
  () => route.query.movement,
  async (id, prev) => {
    if (id === prev) return;
    if (typeof id !== 'string' || !id) return;
    if (detailsOpen.value && detailsMovement.value?.id === id) return;
    try {
      detailsMovement.value = await getMovement(id);
      detailsOpen.value = true;
    } catch {
      detailsMovement.value = null;
    }
  },
  { immediate: true },
);

// ─── Create Movement (Wizard-of-Oz stub) ────────────────────────────
function onCreateMovement(): void {
  toast.info('Create Movement', {
    description: 'El diálogo de alta llegará en una próxima tanda.',
  });
}

function formatAmount(value: string): string {
  const num = Number.parseFloat(value);
  if (!Number.isFinite(num)) return value;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function isInflow(amount: string): boolean {
  return !amount.trim().startsWith('-');
}
</script>

<template>
  <div class="flex flex-col gap-5 px-[22px] py-5" data-testid="movimientos-page">
    <!-- L1 · Page header -->
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-[22px] font-extrabold tracking-tight text-t-1">Movimientos</h1>
        <p class="mt-1 text-xs text-t-3">Registros de entrada y salida de fondos.</p>
      </div>
      <div class="flex items-center gap-3" data-testid="movimientos-main-cta">
        <ViewToggle
          v-model="view"
          :views="['list', 'cards', 'kanban']"
          data-testid="movimientos-view-toggle"
        />
        <Button
          variant="primary"
          :disabled="!canCreate"
          data-testid="movimientos-create"
          @click="onCreateMovement"
        >
          <Plus class="h-4 w-4" />
          Create Movement
        </Button>
      </div>
    </header>

    <!-- L2 · KPI strip -->
    <section
      class="grid grid-cols-2 gap-3 lg:grid-cols-5"
      data-testid="movimientos-kpis"
    >
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Total movimientos
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">
          {{ kpis.total }}
        </div>
        <div class="mt-1 text-[11px] text-t-4">en el período</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Entradas</div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-success">
          {{ kpis.entradas }}
        </div>
        <div class="mt-1 text-[11px] text-t-4">Deposit</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Salidas</div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-danger">
          {{ kpis.salidas }}
        </div>
        <div class="mt-1 text-[11px] text-t-4">Withdrawals</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Internos</div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">
          {{ kpis.internos }}
        </div>
        <div class="mt-1 text-[11px] text-t-4">ni Deposit ni Withdrawal</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Sin asignar</div>
        <div
          class="text-2xl font-extrabold leading-none tracking-tight"
          :class="kpis.sinAsignar > 0 ? 'text-warning' : 'text-t-1'"
        >
          {{ kpis.sinAsignar }}
        </div>
        <div class="mt-1 text-[11px] text-t-4">sin banco / cuenta</div>
      </div>
    </section>

    <!-- L3 · Search + filters -->
    <MovimientosFilters
      :search="movSearch"
      :sponsor="sponsorFilter"
      :type="movType"
      :status="movStatus"
      :rail="movRail"
      :period="movPeriod"
      :has-active-filters="hasActiveFilters"
      :type-options="typeOptions"
      :status-options="statusOptions"
      :rail-options="railOptions"
      @update:search="(v) => (movSearch = v)"
      @update:sponsor="(v) => (sponsorFilter = v)"
      @update:type="(v) => (movType = v)"
      @update:status="(v) => (movStatus = v)"
      @update:rail="(v) => (movRail = v)"
      @update:period="(v) => (movPeriod = v)"
      @clear-filters="clearFilters"
    />

    <!-- LIST view -->
    <template v-if="view === 'list'">
      <MovimientosTable
        :rows="movTable.paged.value"
        :is-loading="movementsQuery.isPending.value"
        :has-active-filters="hasActiveFilters"
        :manifest-key="OPS_MOVIMIENTOS_MANIFEST_KEY"
        @row-click="openDetails"
        @clear-filters="clearFilters"
      />
      <TablePagination
        v-if="!movementsQuery.isPending.value && movTable.total.value > 0"
        :page="movTable.page.value"
        :page-size="movTable.pageSize.value"
        :total="movTable.total.value"
        :total-pages="movTable.totalPages.value"
        :page-size-options="PAGE_SIZE_OPTIONS"
        data-testid="movimientos-pagination"
        @update:page="movTable.setPage"
        @update:page-size="movTable.setPageSize"
      />
    </template>

    <!-- CARDS view -->
    <CardsGrid v-else-if="view === 'cards'" data-testid="movimientos-cards">
      <CardItem
        v-for="m in filteredMovements"
        :key="m.id"
        :record="m as unknown as Record<string, unknown>"
        :data-testid="`movimientos-card-${m.id}`"
        @click="openDetails(m)"
      >
        <template #header>
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <span class="font-mono text-[11px] text-t-4">{{ m.id }}</span>
            <span class="truncate text-sm font-semibold text-t-1">
              {{ getMovementTypeLabel(m.type) }}
            </span>
          </div>
          <Badge variant="neutral" class="text-[10px]">
            {{ getMovementRailLabel(m.rail) }}
          </Badge>
          <span @click.stop>
            <ManifestActionsMenu
              :manifest-key="OPS_MOVIMIENTOS_MANIFEST_KEY"
              :record="m as unknown as Record<string, unknown>"
              variant="card"
            />
          </span>
        </template>
        <template #body>
          <div class="space-y-1 text-xs text-t-3">
            <div
              class="font-mono text-sm"
              :class="isInflow(m.amount) ? 'text-success' : 'text-danger'"
            >
              {{ isInflow(m.amount) ? '+' : '' }}{{ formatAmount(m.amount) }} {{ m.currency }}
            </div>
            <div class="truncate">Cliente: {{ m.client ?? '—' }}</div>
            <div class="truncate">Banco/Cuenta: {{ m.destination ?? m.origin ?? 'Sin asignar' }}</div>
          </div>
        </template>
        <template #footer>
          <span>{{ m.date }}</span>
          <Badge
            :variant="m.status === 'COMPLETED' ? 'success' : m.status === 'PENDING' ? 'warning' : 'danger'"
            class="text-[10px]"
          >
            {{ m.status }}
          </Badge>
        </template>
      </CardItem>
    </CardsGrid>

    <!-- KANBAN view -->
    <div v-else class="min-h-[480px]" data-testid="movimientos-kanban-wrapper">
      <KanbanBoard
        :axis="IMPUTACION_AXIS"
        :records="kanbanRecords"
        title="Imputación · Banco y Cuenta"
        @transition="handleKanbanTransition"
      >
        <template #card="{ record }">
          <CardItem :record="record" @click="openDetails(record as unknown as Movement)">
            <template #header>
              <div class="flex min-w-0 flex-1 items-center gap-2">
                <span class="font-mono text-[11px] text-t-4">
                  {{ (record as unknown as Movement).id }}
                </span>
                <span class="truncate text-sm font-semibold text-t-1">
                  {{ getMovementTypeLabel((record as unknown as Movement).type) }}
                </span>
              </div>
              <Badge variant="neutral" class="text-[10px]">
                {{ getMovementRailLabel((record as unknown as Movement).rail) }}
              </Badge>
              <span @click.stop>
                <ManifestActionsMenu
                  :manifest-key="OPS_MOVIMIENTOS_MANIFEST_KEY"
                  :record="record"
                  variant="card"
                />
              </span>
            </template>
            <template #body>
              <div class="space-y-1 text-xs text-t-3">
                <div
                  class="font-mono text-sm"
                  :class="isInflow((record as unknown as Movement).amount) ? 'text-success' : 'text-danger'"
                >
                  {{ isInflow((record as unknown as Movement).amount) ? '+' : '' }}{{ formatAmount((record as unknown as Movement).amount) }}
                  {{ (record as unknown as Movement).currency }}
                </div>
                <div class="truncate">{{ (record as unknown as Movement).client ?? '—' }}</div>
              </div>
            </template>
            <template #footer>
              <span>{{ (record as unknown as Movement).date }}</span>
            </template>
          </CardItem>
        </template>
      </KanbanBoard>
    </div>

    <MovementDetailsModal
      :open="detailsOpen"
      :movement="detailsMovement"
      @update:open="onDetailsOpenChange"
    />
  </div>
</template>
