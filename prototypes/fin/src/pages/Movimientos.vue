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
import { applyFreeTransition } from '@/lib/kanban/transitions';
import { RecordDetailModal, type DetailField } from '@/components/modals';
import { resolveCuenta } from '@/mocks/fin/cuentas';
import { ManifestActionsMenu } from '@/components/manifest';
import type { KanbanAxis } from '@/types/kanban';
import { useManifestModule } from '@/composables/useManifestModule';
import {
  FIN_MOVIMIENTOS_MANIFEST_KEY,
} from '@/manifests/fin.movimientos.actions';
import { MOVIMIENTOS } from '@/mocks/fin/movimientos';
import { SOCIEDADES } from '@/mocks/fin/sociedades';
import type {
  ImputacionState,
  Movimiento,
  MovimientoTipo,
} from '@/types/fin';

// ════════════════════════════════════════════════════════════════════
// Movimientos — FIN imputation surface (L1/L2/L3)
// ────────────────────────────────────────────────────────────────────
//   L1 — title + ViewToggle (list / kanban).
//   L2 — KPI cards (Pendientes, Parciales, Imputados, Conciliados).
//   L3 — search + filters (Sociedad / Tipo / Período) + body.
//
// The legacy "Pendientes / Resueltos" Segmenter is dropped in favour
// of a Período + Estado filter pair in L3 (see
// `feedback_fin-segments-deprecated`). The Estado axis surfaces as the
// kanban view's columns; on the list view it is exposed as a regular
// filter dropdown.
//
// Manifest engine: 9 imputation/governance/conciliacion actions are
// declared in the `fin.movimientos` manifest registered at boot.
// ════════════════════════════════════════════════════════════════════

const movimientosMod = useManifestModule(FIN_MOVIMIENTOS_MANIFEST_KEY);

// ─── Page state ──────────────────────────────────────────────────────
const view = ref<ViewMode>('list');
const search = ref('');
const filterSociedad = ref<string>('');
const filterTipo = ref<string>('');
const filterPeriodo = ref<string>('30d');
const filterImput = ref<ImputacionState | ''>('');

// ─── Reactive dataset (mock-backed) ──────────────────────────────────
const movimientos = ref<Movimiento[]>(MOVIMIENTOS.map((m) => structuredClone(m)));

// ─── Período → date predicate ────────────────────────────────────────
const PERIOD_OPTIONS: { value: string; label: string; days: number | null }[] = [
  { value: '7d', label: 'Últimos 7 días', days: 7 },
  { value: '30d', label: 'Últimos 30 días', days: 30 },
  { value: '90d', label: 'Últimos 90 días', days: 90 },
  { value: 'all', label: 'Todo el período', days: null },
];

// The legacy seed dates are pinned to April 2026; "today" anchored to
// the latest record keeps the demo deterministic.
const REFERENCE_DAY = '2026-04-24';

function withinPeriod(fecha: string): boolean {
  const opt = PERIOD_OPTIONS.find((p) => p.value === filterPeriodo.value);
  if (!opt || opt.days === null) return true;
  const ref = new Date(REFERENCE_DAY);
  const cur = new Date(fecha);
  const diffDays = (ref.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= opt.days;
}

const TIPO_OPTIONS: MovimientoTipo[] = [
  'DEPOSIT',
  'WITHDRAWAL',
  'COLLECTOR_IN',
  'COLLECTOR_OUT',
  'SWAP_IN',
  'SWAP_OUT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'FEE',
  'TAX',
  'REBATE',
  'ADDITION',
];

const filtered = computed<Movimiento[]>(() => {
  const term = search.value.trim().toLowerCase();
  return movimientos.value.filter((m) => {
    if (filterSociedad.value && m.fin.sociedad_id !== filterSociedad.value) return false;
    if (filterTipo.value && m.tipo !== filterTipo.value) return false;
    if (filterImput.value && (m.fin.imput ?? null) !== filterImput.value) return false;
    if (!withinPeriod(m.fecha)) return false;
    if (term) {
      const haystack = `${m.id} ${m.tipo} ${m.ops.client ?? ''} ${m.ops.counterparty ?? ''}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });
});

// ─── KPIs ────────────────────────────────────────────────────────────
const kpis = computed(() => {
  const all = filtered.value;
  return {
    pendientes: all.filter((m) => m.fin.imput === 'PEND').length,
    parciales: all.filter((m) => m.fin.imput === 'PARC').length,
    imputados: all.filter((m) => m.fin.imput === 'IMP').length,
    conciliados: all.filter((m) => m.fin.conc === 'CONC').length,
  };
});

// ─── Kanban axes ─────────────────────────────────────────────────────
// Three axes mirror the prototype's tablero options for Movimientos:
//   - `fin.imput` (imputacion, FIN, drag&drop libre): composite-dialog
//     flow bundles every pending imputation action (Asignar Estructura
//     / Banco-Cuenta / Cliente / ...) into a single modal per
//     `core-actions-manifest` Requirement 16. Declared in the manifest.
//   - `fin.conc` (conciliacion, FIN, drag&drop libre): drop into CONC
//     opens the composite-dialog of the conciliacion dimension (today,
//     just `Marcar Conciliado`). Declared in the manifest.
//   - `ops.status` (operativo, OPS, read-only): page-level only. FIN
//     surfaces the rail-side operational state for situational
//     awareness; the field is owned by OPS and FIN cannot mutate it,
//     so this axis is NOT declared in the FIN manifest.
const FIN_IMPUT_KANBAN_AXIS: KanbanAxis = {
  axis_id: 'fin.imput',
  label: 'Imputación contable (FIN)',
  description: 'Flujo de trabajo de imputación contable · drag&drop libre',
  state_field: 'fin.imput',
  states: [
    { id: 'PEND', label: 'Pendiente', column_label: 'Pendiente', order: 1 },
    { id: 'PARC', label: 'Parcial', column_label: 'Parcial', order: 2 },
    { id: 'IMP', label: 'Imputado', column_label: 'Imputado', order: 3, terminal: true },
  ],
  transitions: [
    { from: 'PEND', to: 'PARC', mode: 'modal' },
    { from: 'PEND', to: 'IMP', mode: 'modal' },
    { from: 'PARC', to: 'IMP', mode: 'modal' },
  ],
};

const FIN_CONC_KANBAN_AXIS: KanbanAxis = {
  axis_id: 'fin.conc',
  label: 'Conciliación bancaria (FIN)',
  description: 'Flujo de conciliación contra extractos · drag&drop libre',
  state_field: 'fin.conc',
  states: [
    { id: 'PEND', label: 'Pendiente', column_label: 'Pendiente', order: 1 },
    { id: 'DIFF', label: 'Diferencias', column_label: 'Diferencias', order: 2 },
    { id: 'CONC', label: 'Conciliado', column_label: 'Conciliado', order: 3, terminal: true },
  ],
  // Each non-terminal column transition is supported by exactly one FIN
  // writer action in the manifest (Marcar Conciliado / Marcar con
  // Diferencias). DIFF → PEND is a `free` transition (re-open without
  // user input — the column change *is* the field update). CONC is
  // terminal so no outgoing transitions.
  transitions: [
    { from: 'PEND', to: 'DIFF', mode: 'modal' },
    { from: 'PEND', to: 'CONC', mode: 'modal' },
    { from: 'DIFF', to: 'PEND', mode: 'free' },
    { from: 'DIFF', to: 'CONC', mode: 'modal' },
  ],
};

const OPS_STATUS_KANBAN_AXIS: KanbanAxis = {
  axis_id: 'ops.status',
  label: 'Estado operativo (OPS)',
  description: 'Estado del rail al confirmar la transacción · read-only desde FIN',
  state_field: 'status',
  states: [
    { id: 'PENDING', label: 'Pendiente', column_label: 'Pendiente', order: 1 },
    { id: 'COMPLETED', label: 'Completado', column_label: 'Completado', order: 2, terminal: true },
    { id: 'FAILED', label: 'Fallido', column_label: 'Fallido', order: 3, terminal: true },
  ],
  transitions: [],
  read_only: true,
};

const KANBAN_AXES: Record<string, KanbanAxis> = {
  [FIN_IMPUT_KANBAN_AXIS.axis_id]: FIN_IMPUT_KANBAN_AXIS,
  [FIN_CONC_KANBAN_AXIS.axis_id]: FIN_CONC_KANBAN_AXIS,
  [OPS_STATUS_KANBAN_AXIS.axis_id]: OPS_STATUS_KANBAN_AXIS,
};

const AXIS_PERSISTENCE_KEY = 'core-fin.movimientos.kanban-axis';

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

// First-time activation of the kanban view: when no axis is chosen,
// open the picker (≥ 2 axes) or auto-pick the only one (1 axis).
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

// Per-axis routing for kanban drops. The `imputacion` axis bundles
// multiple writer actions of its dimension into ONE composite dialog
// (per core-actions-manifest Requirement 16). The `conciliacion` axis
// has a 1:1 mapping from drop target → specific writer action, so the
// page routes directly to that action's single-action dialog.
const FIN_CONC_DROP_ACTIONS: Record<string, string> = {
  CONC: 'fin.movimientos.conciliacion.marcar_conciliado',
  DIFF: 'fin.movimientos.conciliacion.marcar_diferencia',
};

function handleKanbanTransition(payload: {
  recordId: string;
  fromState: string;
  toState: string;
  mode: string;
  axisId: string;
}): void {
  const record = movimientos.value.find((m) => m.id === payload.recordId);
  if (!record) return;
  const axis = KANBAN_AXES[payload.axisId];
  if (!axis) return;

  if (payload.mode === 'free') {
    applyFreeTransition(
      record as unknown as Record<string, unknown>,
      axis,
      payload.toState,
    );
    return;
  }

  if (payload.mode !== 'modal') return;

  // fin.conc — single-action-per-drop-target routing.
  if (payload.axisId === 'fin.conc') {
    const actionId = FIN_CONC_DROP_ACTIONS[payload.toState];
    if (actionId) {
      movimientosMod.openDialog(
        actionId,
        record as unknown as Record<string, unknown>,
      );
    }
    return;
  }

  // fin.imput — composite-dialog flow bundles every pending imputation
  // action across the dimension into ONE modal.
  movimientosMod.openComposite(
    record as unknown as Record<string, unknown>,
    payload.axisId,
  );
}

// ─── UI helpers ──────────────────────────────────────────────────────
function imputVariant(state: ImputacionState | null | undefined): BadgeVariants['variant'] {
  switch (state) {
    case 'IMP':
      return 'success';
    case 'PARC':
      return 'warning';
    case 'PEND':
      return 'danger';
    default:
      return 'neutral';
  }
}

function imputLabel(state: ImputacionState | null | undefined): string {
  if (!state) return '—';
  return state === 'IMP' ? 'Imputado' : state === 'PARC' ? 'Parcial' : 'Pendiente';
}

function sociedadLabel(id: string | null | undefined): string {
  if (!id) return '—';
  return SOCIEDADES.find((s) => s.id === id)?.nombre ?? id;
}

function cuentaLabel(id: string | null | undefined): string {
  return resolveCuenta(id)?.label ?? '—';
}

// ─── Detail modal ────────────────────────────────────────────────────
const detailRecord = ref<Movimiento | null>(null);

function openDetail(record: Movimiento): void {
  detailRecord.value = record;
}

function closeDetail(value: boolean): void {
  if (!value) detailRecord.value = null;
}

const detailFields = computed<DetailField[]>(() => {
  const m = detailRecord.value;
  if (!m) return [];
  // Mirrors the legacy prototype's `openMDetail` layout: an OPS section
  // for the rail-side read-only fields, then a FIN section for the
  // managed imputation / conciliation state.
  return [
    { label: 'Datos OPS · origen (read-only)', variant: 'section' },
    { label: 'ID', value: m.id, variant: 'mono' },
    { label: 'Fecha', value: m.fecha },
    { label: 'Tipo', value: m.tipo },
    { label: 'Moneda', value: m.moneda },
    { label: 'Monto', value: m.monto, variant: 'mono', span: 2 },
    {
      label: 'Estado OPS',
      value: m.status,
      variant: 'badge',
      badge:
        m.status === 'COMPLETED'
          ? 'success'
          : m.status === 'FAILED'
            ? 'danger'
            : 'warning',
    },
    { label: 'Rail', value: m.ops.rail },
    { label: 'Cuenta', value: m.ops.account, variant: 'mono' },
    { label: 'Provider', value: m.ops.provider },
    { label: 'Cliente OPS', value: m.ops.client },
    { label: 'Counterparty', value: m.ops.counterparty, span: 2 },

    { label: 'Gestión FIN', variant: 'section' },
    { label: 'Sociedad', value: sociedadLabel(m.fin.sociedad_id) },
    {
      label: 'Imputación',
      value: imputLabel(m.fin.imput),
      variant: 'badge',
      badge: imputVariant(m.fin.imput),
    },
    { label: 'Cuenta asignada', value: cuentaLabel(m.fin.cuenta_id) },
    {
      label: 'Conciliación',
      value:
        m.fin.conc === 'CONC'
          ? 'Conciliado'
          : m.fin.conc === 'DIFF'
            ? 'Diferencias'
            : 'Pendiente',
      variant: 'badge',
      badge:
        m.fin.conc === 'CONC' ? 'success' : m.fin.conc === 'DIFF' ? 'warning' : 'neutral',
    },
    {
      label: 'Nota imputación cliente',
      value: m.fin.cliente_imputation_note,
      span: 2,
    },
    { label: 'Nota conciliación', value: m.fin.conc_note, span: 2 },
  ];
});

function imputSeverity(state: ImputacionState | null | undefined): Severity | undefined {
  switch (state) {
    case 'PEND':
      return 'critical';
    case 'PARC':
      return 'medium';
    case 'IMP':
      return 'low';
    default:
      return undefined;
  }
}

// KanbanBoard requires `id` typed as a string — re-narrow the
// filtered movimientos so vue-tsc accepts the prop.
const kanbanRecords = computed(() =>
  filtered.value.map(
    (m) => ({ ...m, id: m.id }) as unknown as Record<string, unknown> & { id: string },
  ),
);
</script>

<template>
  <div class="flex flex-col gap-5 px-[22px] py-5" data-testid="movimientos-page">
    <!-- L1 · Page header -->
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-[22px] font-extrabold tracking-tight text-t-1">Movimientos</h1>
        <p class="mt-1 text-xs text-t-3">
          Imputación financiera sobre movimientos crudos del módulo Operaciones.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <ViewToggle v-model="view" :views="['list', 'cards', 'kanban']" />
      </div>
    </header>

    <!-- L2 · KPI cards -->
    <section
      class="grid grid-cols-2 gap-3 lg:grid-cols-4"
      data-testid="movimientos-kpis"
    >
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Pendientes
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-danger">
          {{ kpis.pendientes }}
        </div>
        <div class="mt-1.5 text-[11px] text-t-4">sin imputación</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Parciales
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-warning">
          {{ kpis.parciales }}
        </div>
        <div class="mt-1.5 text-[11px] text-t-4">imputación incompleta</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Imputados
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-success">
          {{ kpis.imputados }}
        </div>
        <div class="mt-1.5 text-[11px] text-t-4">listos para asiento</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Conciliados
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">
          {{ kpis.conciliados }}
        </div>
        <div class="mt-1.5 text-[11px] text-t-4">contra extracto bancario</div>
      </div>
    </section>

    <!-- L3 · Section header (search + filters) -->
    <div
      class="flex flex-wrap items-center gap-2"
      data-testid="movimientos-section-header"
    >
      <span class="text-sm font-bold text-t-2">Movimientos</span>
      <div class="w-4" />
      <div class="relative">
        <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t-4" />
        <Input
          v-model="search"
          placeholder="Buscar por ID, tipo, cliente…"
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
        v-model="filterSociedad"
        class="rounded-md border border-b-2 bg-card px-3 py-2 text-xs text-t-2"
        aria-label="Filtrar por sociedad"
        data-testid="filter-sociedad"
      >
        <option value="">Sociedad · Todas</option>
        <option v-for="s in SOCIEDADES" :key="s.id" :value="s.id">
          {{ s.nombre }}
        </option>
      </select>
      <select
        v-model="filterTipo"
        class="rounded-md border border-b-2 bg-card px-3 py-2 text-xs text-t-2"
        aria-label="Filtrar por tipo"
        data-testid="filter-tipo"
      >
        <option value="">Tipo · Todos</option>
        <option v-for="t in TIPO_OPTIONS" :key="t" :value="t">{{ t }}</option>
      </select>
      <select
        v-model="filterImput"
        class="rounded-md border border-b-2 bg-card px-3 py-2 text-xs text-t-2"
        aria-label="Filtrar por imputación"
        data-testid="filter-imput"
      >
        <option value="">Imputación · Todas</option>
        <option value="PEND">Pendiente</option>
        <option value="PARC">Parcial</option>
        <option value="IMP">Imputado</option>
      </select>
    </div>

    <!-- L3 · Body -->
    <section data-testid="movimientos-body">
      <EmptyState
        v-if="filtered.length === 0"
        title="No hay movimientos en este período"
        description="Ajustá filtros o ampliá el período."
      />

      <!-- LIST view -->
      <div
        v-else-if="view === 'list'"
        class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2"
        data-testid="movimientos-list"
      >
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b border-b-2">
              <th class="px-[18px] py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">ID</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Fecha</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Tipo</th>
              <th class="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Monto</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Cliente / Contraparte</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Sociedad</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Imput.</th>
              <th class="px-3.5 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-t-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="m in filtered"
              :key="m.id"
              class="cursor-pointer border-b border-b-1 transition-colors last:border-b-0 hover:bg-white/[0.02]"
              :data-testid="`row-${m.id}`"
              @click="openDetail(m)"
            >
              <td class="px-[18px] py-2.5">
                <span class="font-mono text-xs text-t-3">{{ m.id }}</span>
              </td>
              <td class="px-3.5 py-2.5 text-xs text-t-3">{{ m.fecha }}</td>
              <td class="px-3.5 py-2.5 text-xs text-t-2">{{ m.tipo }}</td>
              <td class="px-3.5 py-2.5 text-right text-xs font-mono text-t-2">{{ m.monto }}</td>
              <td class="px-3.5 py-2.5 text-xs text-t-3">
                {{ m.ops.client ?? m.ops.counterparty ?? '—' }}
              </td>
              <td class="px-3.5 py-2.5 text-xs text-t-3">{{ sociedadLabel(m.fin.sociedad_id) }}</td>
              <td class="px-3.5 py-2.5">
                <Badge :variant="imputVariant(m.fin.imput)">{{ imputLabel(m.fin.imput) }}</Badge>
              </td>
              <td class="px-3.5 py-2.5 text-center" @click.stop>
                <div class="flex items-center justify-center">
                  <ManifestActionsMenu
                    :manifest-key="FIN_MOVIMIENTOS_MANIFEST_KEY"
                    :record="m as unknown as Record<string, unknown>"
                    variant="table"
                    :data-testid="`row-${m.id}-actions`"
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
        data-testid="movimientos-cards"
      >
        <CardItem
          v-for="m in filtered"
          :key="m.id"
          :record="m as unknown as Record<string, unknown>"
          :severity="imputSeverity(m.fin.imput)"
          :data-testid="`card-${m.id}`"
          @click="openDetail(m)"
        >
          <template #header>
            <div class="flex min-w-0 flex-1 items-center gap-2">
              <span class="font-mono text-[11px] text-t-4">{{ m.id }}</span>
              <span class="truncate text-sm font-semibold text-t-1">{{ m.tipo }}</span>
            </div>
            <Badge :variant="imputVariant(m.fin.imput)">{{ imputLabel(m.fin.imput) }}</Badge>
            <span @click.stop>
              <ManifestActionsMenu
                :manifest-key="FIN_MOVIMIENTOS_MANIFEST_KEY"
                :record="m as unknown as Record<string, unknown>"
                variant="card"
                :data-testid="`card-${m.id}-actions`"
              />
            </span>
          </template>
          <template #body>
            <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
              <span class="text-t-4">Fecha</span>
              <span class="text-t-2">{{ m.fecha }}</span>
              <span class="text-t-4">Monto</span>
              <span class="font-mono text-t-2">{{ m.monto }}</span>
              <span class="text-t-4">Cliente</span>
              <span class="text-t-2 truncate">
                {{ m.ops.client ?? m.ops.counterparty ?? '—' }}
              </span>
              <span class="text-t-4">Sociedad</span>
              <span class="text-t-2">{{ sociedadLabel(m.fin.sociedad_id) }}</span>
            </div>
          </template>
          <template #footer>
            <span>{{ m.ops.rail }}</span>
            <span class="text-t-4">{{ m.moneda }}</span>
          </template>
        </CardItem>
      </CardsGrid>

      <!-- KANBAN view -->
      <div
        v-else
        class="min-h-[480px]"
        data-testid="movimientos-kanban-wrapper"
      >
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
              :severity="imputSeverity((record as unknown as Movimiento).fin.imput)"
              @click="openDetail(record as unknown as Movimiento)"
            >
              <template #header>
                <div class="flex min-w-0 flex-1 items-center gap-2">
                  <span class="font-mono text-[11px] text-t-4">
                    {{ (record as unknown as Movimiento).id }}
                  </span>
                  <span class="truncate text-sm font-semibold text-t-1">
                    {{ (record as unknown as Movimiento).tipo }}
                  </span>
                </div>
                <span @click.stop>
                  <ManifestActionsMenu
                    :manifest-key="FIN_MOVIMIENTOS_MANIFEST_KEY"
                    :record="record"
                    variant="card"
                  />
                </span>
              </template>
              <template #body>
                <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                  <span class="text-t-4">Monto</span>
                  <span class="font-mono text-t-2">
                    {{ (record as unknown as Movimiento).monto }}
                  </span>
                  <span class="text-t-4">Cliente</span>
                  <span class="text-t-2 truncate">
                    {{
                      (record as unknown as Movimiento).ops.client ??
                      (record as unknown as Movimiento).ops.counterparty ??
                      '—'
                    }}
                  </span>
                </div>
              </template>
              <template #footer>
                <span>{{ (record as unknown as Movimiento).fecha }}</span>
                <span class="text-t-4">
                  {{ sociedadLabel((record as unknown as Movimiento).fin.sociedad_id) }}
                </span>
              </template>
            </CardItem>
          </template>
        </KanbanBoard>
      </div>
    </section>

    <!-- Detail modal — opened on row/card/kanban-card click -->
    <RecordDetailModal
      :open="detailRecord !== null"
      :title="
        detailRecord ? `Detalle del movimiento` : ''
      "
      :subtitle="
        detailRecord ? `${detailRecord.id} · ${detailRecord.ops.rail}` : ''
      "
      :fields="detailFields"
      @update:open="closeDetail"
    />

    <!-- Axis picker — opens on first kanban activation and via tabs/CTA -->
    <KanbanAxisDialog
      :open="axisDialogOpen"
      :axes="KANBAN_AXES"
      :active-axis-id="activeAxisId"
      title="¿Cómo querés organizar el Tablero de Movimientos?"
      description="Cada eje refleja una máquina de estados distinta: las dos primeras son flujos de trabajo de FIN (drag&drop libre); el estado OPS viene del rail y es solo lectura."
      @update:open="axisDialogOpen = $event"
      @select="(axisId) => { selectAxis(axisId); axisDialogOpen = false; }"
    />
  </div>
</template>
