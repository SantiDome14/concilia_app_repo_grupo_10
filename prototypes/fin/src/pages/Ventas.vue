<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { Search } from 'lucide-vue-next';
import { Input } from '@/components/ui/input';
import { Badge, type BadgeVariants } from '@/components/ui/badge';
import EmptyState from '@/components/feedback/EmptyState.vue';
import {
  CardsGrid,
  CardItem,
  ViewToggle,
  type Severity,
  type ViewMode,
} from '@/components/views';
import { KanbanBoard, KanbanAxisDialog } from '@/components/kanban';
import { RecordDetailModal, type DetailField } from '@/components/modals';
import { ManifestActionsMenu } from '@/components/manifest';
import type { KanbanAxis } from '@/types/kanban';
import { useManifestModule } from '@/composables/useManifestModule';
import {
  FIN_COTIZACIONES_MANIFEST_KEY,
} from '@/manifests/fin.cotizaciones.actions';
import { QUOTES } from '@/mocks/fin/quotes';
import type { FacturaState, Quote, QuoteStatus } from '@/types/fin';

// ════════════════════════════════════════════════════════════════════
// Cotizaciones — FIN documentation surface (L1/L2/L3)
// ────────────────────────────────────────────────────────────────────
//   L1 — title + ViewToggle (list / kanban).
//   L2 — KPI cards (Por facturar, Facturadas, No facturables, Anuladas).
//   L3 — search + filters (Cliente / Estado · trading / Período).
//
// Manifest engine: 4 actions (Generar Factura, Marcar No facturable,
// Re-cotizar, Anular Quote) declared in `fin.cotizaciones`. Kanban
// axis `fin.facturaState` drives drop targets; transitions open the
// matching action dialog (drop into "facturada" → Generar Factura;
// drop into "no-req" → Marcar No facturable).
// ════════════════════════════════════════════════════════════════════

const cotizaciones = useManifestModule(FIN_COTIZACIONES_MANIFEST_KEY);

const view = ref<ViewMode>('list');
const search = ref('');
const filterStatus = ref<QuoteStatus | ''>('');
const filterPeriodo = ref<string>('30d');

const quotes = ref<Quote[]>(QUOTES.map((q) => structuredClone(q)));

const PERIOD_OPTIONS: { value: string; label: string; days: number | null }[] = [
  { value: '7d', label: 'Últimos 7 días', days: 7 },
  { value: '30d', label: 'Últimos 30 días', days: 30 },
  { value: '90d', label: 'Últimos 90 días', days: 90 },
  { value: 'all', label: 'Todo el período', days: null },
];

const REFERENCE_DAY = '2026-04-24';

function withinPeriod(fecha: string): boolean {
  const opt = PERIOD_OPTIONS.find((p) => p.value === filterPeriodo.value);
  if (!opt || opt.days === null) return true;
  const ref = new Date(REFERENCE_DAY);
  const cur = new Date(fecha);
  const diffDays = (ref.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= opt.days;
}

const filtered = computed<Quote[]>(() => {
  const term = search.value.trim().toLowerCase();
  return quotes.value.filter((q) => {
    if (filterStatus.value && q.status !== filterStatus.value) return false;
    if (!withinPeriod(q.fecha)) return false;
    if (term) {
      const haystack = `${q.id} ${q.cliente_nombre} ${q.par}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });
});

const kpis = computed(() => {
  const all = filtered.value;
  return {
    porFacturar: all.filter((q) => q.fin.facturaState === 'pendiente' && (q.status === 'executed' || q.status === 'settled')).length,
    facturadas: all.filter((q) => q.fin.facturaState === 'facturada').length,
    noFacturables: all.filter((q) => q.fin.facturaState === 'no-req').length,
    anuladas: all.filter((q) => q.status === 'cancelled').length,
  };
});

// ─── Kanban axes ─────────────────────────────────────────────────────
// Two axes mirror the FIN.Cotizaciones tablero:
//   - `fin.facturaState` (documentacion, FIN, drag&drop libre): drop
//     into facturada → opens "Generar Factura"; drop into no-req →
//     opens "Marcar No Facturable". Single-action transitions (no
//     composite) because the dimension only has these two writers.
//   - `quote.status` (governance, TRD, read-only): page-level only.
//     The trading lifecycle is owned by TRD; FIN surfaces it for
//     situational awareness — no drag, no drop targets.
const FIN_FACTURA_KANBAN_AXIS: KanbanAxis = {
  axis_id: 'fin.facturaState',
  label: 'Documentación (FIN)',
  description: 'Flujo de facturación del quote · drag&drop libre',
  state_field: 'fin.facturaState',
  states: [
    { id: 'pendiente', label: 'Pendiente', column_label: 'Pendiente', order: 1 },
    { id: 'facturada', label: 'Facturada', column_label: 'Facturada', order: 2, terminal: true },
    { id: 'no-req', label: 'No facturable', column_label: 'No facturable', order: 3, terminal: true },
  ],
  transitions: [
    { from: 'pendiente', to: 'facturada', mode: 'modal' },
    { from: 'pendiente', to: 'no-req', mode: 'modal' },
  ],
};

const TRD_STATUS_KANBAN_AXIS: KanbanAxis = {
  axis_id: 'quote.status',
  label: 'Trading (TRD)',
  description: 'Estado del quote en el ciclo de TRD · read-only desde FIN',
  state_field: 'status',
  states: [
    { id: 'pending', label: 'Pendiente', column_label: 'Pendiente', order: 1 },
    { id: 'offered', label: 'Ofertada', column_label: 'Ofertada', order: 2 },
    { id: 'executed', label: 'Ejecutada', column_label: 'Ejecutada', order: 3 },
    { id: 'settled', label: 'Liquidada', column_label: 'Liquidada', order: 4, terminal: true },
    { id: 'cancelled', label: 'Anulada', column_label: 'Anulada', order: 5, terminal: true },
  ],
  transitions: [],
  read_only: true,
};

const KANBAN_AXES: Record<string, KanbanAxis> = {
  [FIN_FACTURA_KANBAN_AXIS.axis_id]: FIN_FACTURA_KANBAN_AXIS,
  [TRD_STATUS_KANBAN_AXIS.axis_id]: TRD_STATUS_KANBAN_AXIS,
};

const AXIS_PERSISTENCE_KEY = 'core-fin.cotizaciones.kanban-axis';

const activeAxisId = ref<string | null>(null);
const axisDialogOpen = ref(false);

const activeAxis = computed<KanbanAxis | null>(() => {
  if (activeAxisId.value === null) return null;
  return KANBAN_AXES[activeAxisId.value] ?? null;
});

onMounted(() => {
  const stored = sessionStorage.getItem(AXIS_PERSISTENCE_KEY);
  if (stored && stored in KANBAN_AXES) {
    activeAxisId.value = stored;
  }
});

watch(view, (next) => {
  if (next !== 'kanban' || activeAxisId.value !== null) return;
  const ids = Object.keys(KANBAN_AXES);
  if (ids.length === 1) {
    selectAxis(ids[0] as string);
  } else if (ids.length > 1) {
    axisDialogOpen.value = true;
  }
});

function selectAxis(axisId: string): void {
  activeAxisId.value = axisId;
  sessionStorage.setItem(AXIS_PERSISTENCE_KEY, axisId);
}

function openAxisDialog(): void {
  axisDialogOpen.value = true;
}

function handleKanbanTransition(payload: {
  recordId: string;
  fromState: string;
  toState: string;
  mode: string;
  axisId: string;
}): void {
  if (payload.mode !== 'modal') return;
  const q = quotes.value.find((row) => row.id === payload.recordId);
  if (!q) return;
  if (payload.axisId === 'fin.facturaState') {
    if (payload.toState === 'facturada') {
      cotizaciones.openDialog(
        'fin.cotizaciones.documentacion.generar_factura',
        q as unknown as Record<string, unknown>,
      );
    } else if (payload.toState === 'no-req') {
      cotizaciones.openDialog(
        'fin.cotizaciones.documentacion.marcar_no_facturable',
        q as unknown as Record<string, unknown>,
      );
    }
  }
}

const STATUS_OPTIONS: QuoteStatus[] = [
  'pending',
  'offered',
  'executed',
  'settled',
  'cancelled',
];

const STATUS_LABEL: Record<QuoteStatus, string> = {
  pending: 'Pendiente',
  offered: 'Ofertada',
  executed: 'Ejecutada',
  settled: 'Liquidada',
  cancelled: 'Anulada',
};

function statusVariant(s: QuoteStatus): BadgeVariants['variant'] {
  switch (s) {
    case 'settled':
      return 'success';
    case 'executed':
      return 'info';
    case 'cancelled':
      return 'danger';
    case 'offered':
      return 'warning';
    default:
      return 'neutral';
  }
}

function facturaVariant(s: FacturaState): BadgeVariants['variant'] {
  switch (s) {
    case 'facturada':
      return 'success';
    case 'no-req':
      return 'neutral';
    default:
      return 'warning';
  }
}

function facturaLabel(s: FacturaState): string {
  return s === 'facturada' ? 'Facturada' : s === 'no-req' ? 'No facturable' : 'Pendiente';
}

function fmtMonto(q: Quote): string {
  return `${q.moneda} ${q.monto.toLocaleString('es-AR')}`;
}

// ─── Detail modal ────────────────────────────────────────────────────
const detailRecord = ref<Quote | null>(null);

function openDetail(q: Quote): void {
  detailRecord.value = q;
}

function closeDetail(value: boolean): void {
  if (!value) detailRecord.value = null;
}

const detailFields = computed<DetailField[]>(() => {
  const q = detailRecord.value;
  if (!q) return [];
  // Mirrors the legacy prototype's `openQDetail` two-section layout:
  // TRD-native (read-only from FIN) + FIN-managed.
  return [
    { label: 'Datos TRD · origen (read-only)', variant: 'section' },
    { label: 'ID', value: q.id, variant: 'mono' },
    { label: 'Fecha', value: q.fecha },
    { label: 'Cliente', value: q.cliente_nombre },
    { label: 'Par', value: q.par },
    { label: 'Volumen', value: fmtMonto(q), variant: 'mono' },
    { label: 'Spread (bps)', value: q.spread_bps, variant: 'mono' },
    {
      label: 'Estado TRD',
      value: STATUS_LABEL[q.status],
      variant: 'badge',
      badge: statusVariant(q.status),
    },

    { label: 'Gestión FIN', variant: 'section' },
    {
      label: 'Estado factura',
      value: facturaLabel(q.fin.facturaState),
      variant: 'badge',
      badge: facturaVariant(q.fin.facturaState),
    },
    { label: 'Nº Factura', value: q.fin.factura, variant: 'mono' },
    { label: 'Fecha de facturación', value: q.fin.fact_at, span: 2 },
    { label: 'Motivo no facturable', value: q.fin.no_factura_motivo, span: 2 },
    { label: 'Motivo de anulación', value: q.fin.anulacion_motivo, span: 2 },
  ];
});

function quoteSeverity(q: Quote): Severity | undefined {
  if (q.status === 'cancelled') return 'low';
  if (q.fin.facturaState === 'pendiente' && (q.status === 'executed' || q.status === 'settled')) {
    return 'high';
  }
  if (q.fin.facturaState === 'facturada') return 'low';
  return undefined;
}

const kanbanRecords = computed(() =>
  filtered.value.map(
    (q) => ({ ...q, id: q.id }) as unknown as Record<string, unknown> & { id: string },
  ),
);
</script>

<template>
  <div class="flex flex-col gap-5 px-[22px] py-5" data-testid="cotizaciones-page">
    <!-- L1 · Page header -->
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-[22px] font-extrabold tracking-tight text-t-1">Cotizaciones</h1>
        <p class="mt-1 text-xs text-t-3">
          Quotes ejecutados por TRD bajo la lente FIN — facturación y governance.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <ViewToggle v-model="view" :views="['list', 'cards', 'kanban']" />
      </div>
    </header>

    <!-- L2 · KPI cards -->
    <section
      class="grid grid-cols-2 gap-3 lg:grid-cols-4"
      data-testid="cotizaciones-kpis"
    >
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Por facturar
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-warning">
          {{ kpis.porFacturar }}
        </div>
        <div class="mt-1.5 text-[11px] text-t-4">quotes ejecutados pendientes</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Facturadas
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-success">
          {{ kpis.facturadas }}
        </div>
        <div class="mt-1.5 text-[11px] text-t-4">factura emitida</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          No facturables
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">
          {{ kpis.noFacturables }}
        </div>
        <div class="mt-1.5 text-[11px] text-t-4">marcadas con motivo</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Anuladas
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-danger">
          {{ kpis.anuladas }}
        </div>
        <div class="mt-1.5 text-[11px] text-t-4">canceladas antes de ejecutar</div>
      </div>
    </section>

    <!-- L3 · Section header (search + filters) -->
    <div
      class="flex flex-wrap items-center gap-2"
      data-testid="cotizaciones-section-header"
    >
      <span class="text-sm font-bold text-t-2">Quotes</span>
      <div class="w-4" />
      <div class="relative">
        <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t-4" />
        <Input
          v-model="search"
          placeholder="Buscar por ID, cliente o par…"
          class="w-[260px] pl-8"
        />
      </div>
      <div class="flex-1" />
      <select
        v-model="filterPeriodo"
        class="rounded-md border border-b-2 bg-card px-3 py-2 text-xs text-t-2"
        aria-label="Filtrar por período"
        data-testid="filter-periodo"
      >
        <option v-for="p in PERIOD_OPTIONS" :key="p.value" :value="p.value">
          {{ p.label }}
        </option>
      </select>
      <select
        v-model="filterStatus"
        class="rounded-md border border-b-2 bg-card px-3 py-2 text-xs text-t-2"
        aria-label="Filtrar por estado"
        data-testid="filter-status"
      >
        <option value="">Estado · Todos</option>
        <option v-for="st in STATUS_OPTIONS" :key="st" :value="st">
          {{ STATUS_LABEL[st] }}
        </option>
      </select>
    </div>

    <!-- L3 · Body -->
    <section data-testid="cotizaciones-body">
      <EmptyState
        v-if="filtered.length === 0"
        title="No hay cotizaciones en este período"
        description="Ajustá filtros o ampliá el período."
      />

      <!-- LIST view -->
      <div
        v-else-if="view === 'list'"
        class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2"
        data-testid="cotizaciones-list"
      >
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b border-b-2">
              <th class="px-[18px] py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">ID</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Fecha</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Cliente</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Par</th>
              <th class="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Monto</th>
              <th class="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Spread</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Status</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Factura</th>
              <th class="px-3.5 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-t-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="q in filtered"
              :key="q.id"
              class="cursor-pointer border-b border-b-1 transition-colors last:border-b-0 hover:bg-white/[0.02]"
              :data-testid="`row-${q.id}`"
              @click="openDetail(q)"
            >
              <td class="px-[18px] py-2.5">
                <span class="font-mono text-xs text-t-3">{{ q.id }}</span>
              </td>
              <td class="px-3.5 py-2.5 text-xs text-t-3">{{ q.fecha }}</td>
              <td class="px-3.5 py-2.5 text-[13px] font-semibold text-t-2">{{ q.cliente_nombre }}</td>
              <td class="px-3.5 py-2.5 text-xs text-t-3">{{ q.par }}</td>
              <td class="px-3.5 py-2.5 text-right text-xs font-mono text-t-2">{{ fmtMonto(q) }}</td>
              <td class="px-3.5 py-2.5 text-right text-xs text-t-3">{{ q.spread_bps }} bps</td>
              <td class="px-3.5 py-2.5">
                <Badge :variant="statusVariant(q.status)">{{ STATUS_LABEL[q.status] }}</Badge>
              </td>
              <td class="px-3.5 py-2.5">
                <Badge :variant="facturaVariant(q.fin.facturaState)">
                  {{ facturaLabel(q.fin.facturaState) }}
                </Badge>
              </td>
              <td class="px-3.5 py-2.5 text-center" @click.stop>
                <div class="flex items-center justify-center">
                  <ManifestActionsMenu
                    :manifest-key="FIN_COTIZACIONES_MANIFEST_KEY"
                    :record="q as unknown as Record<string, unknown>"
                    variant="table"
                    :data-testid="`row-${q.id}-actions`"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- CARDS view -->
      <CardsGrid
        v-else-if="view === 'cards'"
        data-testid="cotizaciones-cards"
      >
        <CardItem
          v-for="q in filtered"
          :key="q.id"
          :record="q as unknown as Record<string, unknown>"
          :severity="quoteSeverity(q)"
          :data-testid="`card-${q.id}`"
          @click="openDetail(q)"
        >
          <template #header>
            <div class="flex min-w-0 flex-1 items-center gap-2">
              <span class="font-mono text-[11px] text-t-4">{{ q.id }}</span>
              <span class="truncate text-sm font-semibold text-t-1">{{ q.cliente_nombre }}</span>
            </div>
            <Badge :variant="statusVariant(q.status)">{{ STATUS_LABEL[q.status] }}</Badge>
            <span @click.stop>
              <ManifestActionsMenu
                :manifest-key="FIN_COTIZACIONES_MANIFEST_KEY"
                :record="q as unknown as Record<string, unknown>"
                variant="card"
                :data-testid="`card-${q.id}-actions`"
              />
            </span>
          </template>
          <template #body>
            <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
              <span class="text-t-4">Fecha</span>
              <span class="text-t-2">{{ q.fecha }}</span>
              <span class="text-t-4">Par</span>
              <span class="text-t-2">{{ q.par }}</span>
              <span class="text-t-4">Monto</span>
              <span class="font-mono text-t-2">{{ fmtMonto(q) }}</span>
              <span class="text-t-4">Spread</span>
              <span class="text-t-2">{{ q.spread_bps }} bps</span>
            </div>
          </template>
          <template #footer>
            <Badge :variant="facturaVariant(q.fin.facturaState)">
              {{ facturaLabel(q.fin.facturaState) }}
            </Badge>
            <span class="text-t-4">{{ q.fin.factura ?? '—' }}</span>
          </template>
        </CardItem>
      </CardsGrid>

      <!-- KANBAN view -->
      <div v-else class="min-h-[480px]" data-testid="cotizaciones-kanban-wrapper">
        <KanbanBoard
          :axis="activeAxis"
          :axes="KANBAN_AXES"
          :records="kanbanRecords"
          title="Tablero FIN"
          @transition="handleKanbanTransition"
          @update:axis-id="selectAxis"
          @change-axis="openAxisDialog"
        >
          <template #card="{ record }">
            <CardItem
              :record="record"
              :severity="quoteSeverity(record as unknown as Quote)"
              @click="openDetail(record as unknown as Quote)"
            >
              <template #header>
                <div class="flex min-w-0 flex-1 items-center gap-2">
                  <span class="font-mono text-[11px] text-t-4">
                    {{ (record as unknown as Quote).id }}
                  </span>
                  <span class="truncate text-sm font-semibold text-t-1">
                    {{ (record as unknown as Quote).cliente_nombre }}
                  </span>
                </div>
                <span @click.stop>
                  <ManifestActionsMenu
                    :manifest-key="FIN_COTIZACIONES_MANIFEST_KEY"
                    :record="record"
                    variant="card"
                  />
                </span>
              </template>
              <template #body>
                <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                  <span class="text-t-4">Par</span>
                  <span class="text-t-2">{{ (record as unknown as Quote).par }}</span>
                  <span class="text-t-4">Monto</span>
                  <span class="font-mono text-t-2">
                    {{ fmtMonto(record as unknown as Quote) }}
                  </span>
                </div>
              </template>
              <template #footer>
                <span>{{ (record as unknown as Quote).fecha }}</span>
                <span class="text-t-4">
                  {{ STATUS_LABEL[(record as unknown as Quote).status] }}
                </span>
              </template>
            </CardItem>
          </template>
        </KanbanBoard>
      </div>
    </section>

    <RecordDetailModal
      :open="detailRecord !== null"
      :title="detailRecord ? 'Detalle del Quote' : ''"
      :subtitle="detailRecord ? `${detailRecord.id} · ${detailRecord.cliente_nombre}` : ''"
      :fields="detailFields"
      @update:open="closeDetail"
    />

    <KanbanAxisDialog
      :open="axisDialogOpen"
      :axes="KANBAN_AXES"
      :active-axis-id="activeAxisId"
      title="¿Cómo querés organizar el Tablero de Cotizaciones?"
      description="Documentación es flujo de trabajo de FIN (drag&drop libre); Trading es read-only — el ciclo del quote lo gobierna TRD."
      @update:open="axisDialogOpen = $event"
      @select="(axisId) => { selectAxis(axisId); axisDialogOpen = false; }"
    />
  </div>
</template>
