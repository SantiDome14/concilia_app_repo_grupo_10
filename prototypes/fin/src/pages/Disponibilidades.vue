<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useRoute, useRouter } from 'vue-router';
import {
  ChevronRight,
  ChevronDown,
  Clock,
  Search,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-vue-next';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Segmenter,
  ViewToggle,
  CardsGrid,
  CardItem,
  type ViewMode,
} from '@/components/views';
import type { SegmentOption } from '@/components/views/Segmenter.vue';
import { KanbanBoard } from '@/components/kanban';
import { TablePagination } from '@/components/data-display';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { ManifestActionsMenu, ManifestModuleCTAs } from '@/components/manifest';
import { useManifestModule } from '@/composables/useManifestModule';
import { useTable } from '@/composables/useTable';
import { PAGE_SIZE_OPTIONS } from '@/constants';
import {
  FIN_DISPONIBILIDADES_MANIFEST_KEY,
} from '@/manifests/fin.disponibilidades.actions';
import {
  FIN_DISPONIBILIDADES_BANCOS_CUENTAS_MANIFEST_KEY,
} from '@/manifests/fin.disponibilidades.bancos_cuentas.actions';
import {
  FIN_DISPONIBILIDADES_MOVIMIENTOS_MANIFEST_KEY,
} from '@/manifests/fin.disponibilidades.movimientos.actions';
import {
  POSICION_TREE,
  POSICION_KPIS,
} from '@/mocks/fin/disponibilidades';
import {
  MOVIMIENTOS,
  MOVIMIENTOS_KPIS,
} from '@/mocks/fin/movimientos';
import { categoriaOf } from '@/lib/movimientos/categoria';
import { formatCompact } from '@/lib/format';
import { useDisponibilidadesCatalogStore } from '@/stores/disponibilidadesCatalog';
import {
  RAIL_OPTIONS,
  type CuentaBanco,
  type EstructuraBanco,
  type EstructuraTipo,
  type Moneda,
  type Movimiento,
  type MovimientoCategoria,
  type MovimientoTipo,
  type PerMoneda,
} from '@/types/fin';
import type { ModuleCTA } from '@/types/manifest';
import type { KanbanAxis } from '@/types/kanban';

// ════════════════════════════════════════════════════════════════════
// FIN.Disponibilidades — REQ-50
// ────────────────────────────────────────────────────────────────────
// Type B page with three sub-tabs in fixed order Posición / Bancos-Cuentas /
// Movimientos. Default Posición. Contextual Main CTA per active sub-tab
// (Decision 1 of design.md). Drill-down from Posición.Cuenta to
// Movimientos with `cuenta_id` filter pre-applied.
//
// Movimientos sub-tab supports three views (REQ-50 §5.3):
//   - Lista (default) — flat table over the ledger with pagination
//   - Tarjetas — CardsGrid
//   - Tablero — KanbanBoard with 6 selectable axes (REQ-50 §5.4)
//
// Bancos / Cuentas sub-tab table also paginates.
//
// URL sync (Refinement E): active sub-tab → `route.query.tab`,
// drill-down → `route.query.cuenta_id`, kanban axis → `route.query.axis`.
// ════════════════════════════════════════════════════════════════════

const movimientosMod = useManifestModule(FIN_DISPONIBILIDADES_MOVIMIENTOS_MANIFEST_KEY);
useManifestModule(FIN_DISPONIBILIDADES_MANIFEST_KEY);
const bancosCuentasMod = useManifestModule(
  FIN_DISPONIBILIDADES_BANCOS_CUENTAS_MANIFEST_KEY,
);

// ─── Pinia store for Bancos/Cuentas + Estructuras CRUD (Fase B) ──────
const catalogStore = useDisponibilidadesCatalogStore();
const { cuentas, kpis: bancosCuentasKpis } = storeToRefs(catalogStore);

// Register a single creator factory on the bancos_cuentas manifest;
// dispatches by `cta.id` (per Decision 4 of
// `extend-fin-disponibilidades-bancos-cuentas-crud`). The dialog engine
// invokes this on confirm for any CTA with `creates_record_type`.
bancosCuentasMod.registerCreator((cta: ModuleCTA, formValues) => {
  if (cta.id === 'fin.disponibilidades.bancos_cuentas.crear') {
    const sociedad_id = String(formValues.sociedad_id ?? '');
    const banco = String(formValues.banco ?? '');
    const cuentaContableRaw = formValues.cuenta_contable;
    const newCuenta: CuentaBanco = {
      id: catalogStore.nextCuentaId(sociedad_id, banco),
      sociedad_id,
      banco,
      tipo_estructura: String(formValues.tipo_estructura ?? '') as EstructuraTipo,
      tipo_cuenta: String(formValues.tipo_cuenta ?? '') as CuentaBanco['tipo_cuenta'],
      moneda: String(formValues.moneda ?? ''),
      numero: String(formValues.numero ?? ''),
      label: `${banco} · ${formValues.moneda ?? ''} · ${formValues.numero ?? ''}`,
      label_short: `${formValues.moneda ?? ''} · ${formValues.numero ?? ''}`,
      estado: 'Activa',
      cuenta_contable:
        typeof cuentaContableRaw === 'string' && cuentaContableRaw !== ''
          ? cuentaContableRaw
          : null,
    };
    catalogStore.addCuenta(newCuenta);
    return newCuenta as unknown as Record<string, unknown>;
  }
  if (cta.id === 'fin.disponibilidades.bancos_cuentas.crear_estructura') {
    const nombre = String(formValues.nombre ?? '');
    const newEstructura: EstructuraBanco = {
      id: catalogStore.nextEstructuraId(nombre),
      nombre,
      tipo_estructura: String(formValues.tipo_estructura ?? '') as EstructuraTipo,
    };
    catalogStore.addEstructura(newEstructura);
    return newEstructura as unknown as Record<string, unknown>;
  }
  // Unknown CTA — return a stub so the engine doesn't throw; the
  // manifest validator would have caught it earlier.
  return formValues as Record<string, unknown>;
});

type SubTab = 'posicion' | 'bancos_cuentas' | 'movimientos';
type AxisId =
  | 'estado_operativo'
  | 'estado_imputacion_ardua'
  | 'estado_imputacion_cliente'
  | 'tipo'
  | 'sociedad'
  | 'categoria';

// Stable key list for rendering per-moneda KPI rows in a deterministic
// order across the 4 ecuación-maestra cards.
const MONEDAS_ORDER: Moneda[] = ['ARS', 'USD', 'USDC', 'USDT', 'EUR', 'CAD'];

function perMonedaRows(per: PerMoneda): Array<{ moneda: Moneda; val: string }> {
  return MONEDAS_ORDER.filter((m) => per[m] != null).map((m) => ({
    moneda: m,
    val: per[m] as string,
  }));
}

const route = useRoute();
const router = useRouter();

// ─── Sub-tab state synced with route.query.tab ───────────────────────
function parseSubTab(value: unknown): SubTab {
  if (value === 'bancos_cuentas' || value === 'movimientos') return value;
  return 'posicion';
}

const subTab = ref<SubTab>(parseSubTab(route.query.tab));

watch(
  () => route.query.tab,
  (val) => {
    subTab.value = parseSubTab(val);
  },
);

function setSubTab(next: SubTab): void {
  if (next === subTab.value) return;
  subTab.value = next;
  router.replace({
    query: { ...route.query, tab: next === 'posicion' ? undefined : next },
  });
}

// ─── Drill-down state — cuenta_id pre-filter from route.query ────────
const drillCuentaId = computed<string | null>(() => {
  const id = route.query.cuenta_id;
  return typeof id === 'string' ? id : null;
});

function drillDownToMovimientos(cuentaId: string): void {
  router.push({
    query: { ...route.query, tab: 'movimientos', cuenta_id: cuentaId },
  });
}

function clearDrillFilter(): void {
  const { cuenta_id: _ignored, ...rest } = route.query;
  void _ignored;
  router.replace({ query: rest });
}

// ─── Segmenter options ───────────────────────────────────────────────
const segmentOptions = computed<SegmentOption<SubTab>[]>(() => [
  { value: 'posicion', label: 'Posición', count: POSICION_TREE.length },
  {
    value: 'bancos_cuentas',
    label: 'Bancos / Cuentas',
    count: cuentas.value.length,
  },
  {
    value: 'movimientos',
    label: 'Movimientos',
    count: MOVIMIENTOS.length,
  },
]);

// ─── Contextual Main CTA (Decision 1) ────────────────────────────────
const activeModuleManifestKey = computed(() =>
  subTab.value === 'bancos_cuentas'
    ? FIN_DISPONIBILIDADES_BANCOS_CUENTAS_MANIFEST_KEY
    : FIN_DISPONIBILIDADES_MANIFEST_KEY,
);

// ─── Posición state ──────────────────────────────────────────────────
const expandedSociedades = ref<Record<string, boolean>>(
  Object.fromEntries(POSICION_TREE.map((s) => [s.id, s.open])),
);

function toggleSociedad(id: string): void {
  expandedSociedades.value[id] = !expandedSociedades.value[id];
}

// ─── Movimientos · projected records for views with derived axes ─────
type MovimientoProjected = Movimiento & {
  _imp_ardua: 'sin_asignar' | 'asignado';
  _imp_cliente: 'sin_asignar' | 'asignado';
  _sociedad: string;
  _categoria: MovimientoCategoria;
};

// ─── Movimientos · L3 filter state ───────────────────────────────────
type Periodo = 'todo' | 'dia' | 'semana' | 'mes';
type TipoFilter = MovimientoTipo | 'all';

const movQuery = ref('');
const movPeriodo = ref<Periodo>('todo');
const movTipo = ref<TipoFilter>('all');
const movRail = ref<string>('all');
const movCuenta = ref<string>('all');

/** Reference "today" anchor for the period filter — matches the mock data. */
const MOV_TODAY_ISO = '2026-04-24';

function withinPeriodo(fecha: string, periodo: Periodo): boolean {
  if (periodo === 'todo') return true;
  const today = new Date(`${MOV_TODAY_ISO}T00:00:00Z`).getTime();
  const cutoffDays = periodo === 'dia' ? 0 : periodo === 'semana' ? 7 : 30;
  const cutoff = today - cutoffDays * 86_400_000;
  return new Date(`${fecha}T00:00:00Z`).getTime() >= cutoff;
}

/**
 * Rail filter options come from the canonical `RAIL_OPTIONS` constant —
 * we expose the full set, not just rails present in the current mock, so
 * the filter shape is stable across data states.
 */
const railOptions = RAIL_OPTIONS;

/** Cuenta options pulled from the catalog store (active only). */
const cuentaOptions = computed<Array<{ value: string; label: string }>>(() =>
  cuentas.value
    .filter((c) => c.estado === 'Activa')
    .map((c) => ({
      value: c.id,
      label: `${c.banco} · ${c.moneda} · ${c.numero}`,
    })),
);

/** Resolve a `fin.cuenta_id` against the catalog store — returns null when unassigned. */
function getCuenta(cuentaId: string | null | undefined): CuentaBanco | null {
  if (!cuentaId) return null;
  return cuentas.value.find((c) => c.id === cuentaId) ?? null;
}

const filteredMovimientos = computed<MovimientoProjected[]>(() => {
  const drillId = drillCuentaId.value;
  let source = drillId
    ? MOVIMIENTOS.filter((m) => m.fin.cuenta_id === drillId)
    : MOVIMIENTOS;

  const q = movQuery.value.trim().toLowerCase();
  if (q !== '') {
    source = source.filter((m) => {
      const clientHit = (m.ops.client ?? '').toLowerCase().includes(q);
      const idHit = m.id.toLowerCase().includes(q);
      return clientHit || idHit;
    });
  }
  if (movPeriodo.value !== 'todo') {
    source = source.filter((m) => withinPeriodo(m.fecha, movPeriodo.value));
  }
  if (movTipo.value !== 'all') {
    const tipo = movTipo.value;
    source = source.filter((m) => m.tipo === tipo);
  }
  if (movRail.value !== 'all') {
    source = source.filter((m) => m.ops.rail === movRail.value);
  }
  if (movCuenta.value !== 'all') {
    source = source.filter((m) => m.fin.cuenta_id === movCuenta.value);
  }

  return source.map((m) => ({
    ...m,
    _imp_ardua: m.fin.cuenta_id ? 'asignado' : 'sin_asignar',
    _imp_cliente: m.fin.cliente_id ? 'asignado' : 'sin_asignar',
    _sociedad: m.fin.sociedad_id ?? 'sin_asignar',
    _categoria: categoriaOf(m.tipo),
  }));
});

/** Tipo options derived from the manifest's kanban axis (single source of truth). */
const movTipoOptions = computed<Array<{ id: MovimientoTipo; label: string }>>(
  () =>
    MOVIMIENTOS_KANBAN_AXES.tipo.states.map((s) => ({
      id: s.id as MovimientoTipo,
      label: s.label,
    })),
);

function clearMovFilters(): void {
  movQuery.value = '';
  movPeriodo.value = 'todo';
  movTipo.value = 'all';
  movRail.value = 'all';
  movCuenta.value = 'all';
}

const movFiltersActive = computed<boolean>(
  () =>
    movQuery.value.trim() !== '' ||
    movPeriodo.value !== 'todo' ||
    movTipo.value !== 'all' ||
    movRail.value !== 'all' ||
    movCuenta.value !== 'all',
);

// ─── Movimientos · view (Lista / Tarjetas / Tablero) — REQ-50 §5.3 ──
const view = ref<ViewMode>('list');

// ─── Movimientos · Kanban axes (REQ-50 §5.4) ─────────────────────────
const MOVIMIENTOS_KANBAN_AXES: Record<AxisId, KanbanAxis> = {
  estado_operativo: {
    axis_id: 'estado_operativo',
    label: 'Estado operativo',
    description: 'Pending / Processing / Completed — gobernado por OPS',
    state_field: 'status',
    states: [
      { id: 'PENDING', label: 'Pending', order: 1 },
      { id: 'PROCESSING', label: 'Processing', order: 2 },
      { id: 'COMPLETED', label: 'Completed', order: 3, terminal: true },
      { id: 'FAILED', label: 'Failed', order: 4, terminal: true },
    ],
    transitions: [],
    read_only: true,
  },
  estado_imputacion_ardua: {
    axis_id: 'estado_imputacion_ardua',
    label: 'Estado imputación Lado Ardua',
    description: 'Drag para abrir el dialog de Asignar Banco y Cuenta',
    state_field: '_imp_ardua',
    states: [
      { id: 'sin_asignar', label: 'Sin asignar', order: 1 },
      { id: 'asignado', label: 'Asignado', order: 2 },
    ],
    transitions: [{ from: 'sin_asignar', to: 'asignado', mode: 'modal' }],
  },
  estado_imputacion_cliente: {
    axis_id: 'estado_imputacion_cliente',
    label: 'Estado imputación Lado Cliente',
    description: 'Drag para abrir el dialog de Asignar Cliente',
    state_field: '_imp_cliente',
    states: [
      { id: 'sin_asignar', label: 'Sin asignar', order: 1 },
      { id: 'asignado', label: 'Asignado', order: 2 },
    ],
    transitions: [{ from: 'sin_asignar', to: 'asignado', mode: 'modal' }],
  },
  tipo: {
    axis_id: 'tipo',
    label: 'Tipo de movimiento',
    state_field: 'tipo',
    states: [
      { id: 'DEPOSIT', label: 'DEPOSIT', order: 1 },
      { id: 'WITHDRAWAL', label: 'WITHDRAWAL', order: 2 },
      { id: 'FEE', label: 'FEE', order: 3 },
      { id: 'REBATE', label: 'REBATE', order: 4 },
      { id: 'SWAP_OUT', label: 'SWAP_OUT', order: 5 },
      { id: 'SWAP_IN', label: 'SWAP_IN', order: 6 },
      { id: 'SPREAD', label: 'SPREAD', order: 7 },
      { id: 'SOLICITUD_RETIRO_PENDING', label: 'SOLICITUD_RETIRO', order: 8 },
      { id: 'DEPOSITO_PENDIENTE', label: 'DEP_PENDIENTE', order: 9 },
      { id: 'ASIGNACION_PENDIENTE', label: 'ASIG_PENDIENTE', order: 10 },
      { id: 'AJUSTE_CREDITO', label: 'AJUSTE_CR', order: 11 },
      { id: 'AJUSTE_DEBITO', label: 'AJUSTE_DB', order: 12 },
      { id: 'MOV_ENTRE_CUENTAS_PROPIAS', label: 'MOV_CUENTAS', order: 13 },
      { id: 'PRESTAMO_INTERCOMPANY', label: 'PRESTAMO_IC', order: 14 },
      { id: 'SWEEPING_CROSS_SOCIEDAD', label: 'SWEEPING_CS', order: 15 },
      { id: 'COMISION_BANCARIA', label: 'COMISION_BCO', order: 16 },
      { id: 'INTERES_BANCARIO', label: 'INTERES_BCO', order: 17 },
      { id: 'PAGO_PROVEEDOR', label: 'PAGO_PROV', order: 18 },
      { id: 'PAGO_SALARIOS', label: 'PAGO_SAL', order: 19 },
      { id: 'APORTE_CAPITAL', label: 'APORTE_CAP', order: 20 },
      { id: 'AJUSTE_MANUAL', label: 'AJUSTE_MAN', order: 21 },
    ],
    transitions: [],
    read_only: true,
  },
  sociedad: {
    axis_id: 'sociedad',
    label: 'Sociedad',
    state_field: '_sociedad',
    states: [
      { id: 'hp', label: 'Haz Pagos', order: 1 },
      { id: 'cp', label: 'Circuit Pay', order: 2 },
      { id: 'asc', label: 'Ardua Solutions Corp', order: 3 },
      { id: 'av', label: 'Astra Ventures', order: 4 },
      { id: 'sin_asignar', label: 'Sin asignar', order: 5 },
    ],
    transitions: [],
    read_only: true,
  },
  categoria: {
    axis_id: 'categoria',
    label: 'Categoría',
    description:
      'Clasificación por (presencia de cliente × presencia de flujo físico) — A/B/F tienen Lado Cliente; C/D/E imputa FIN.',
    state_field: '_categoria',
    states: [
      { id: 'A', label: 'A · cliente + físico', order: 1 },
      { id: 'B', label: 'B · cliente, sin físico', order: 2 },
      { id: 'C', label: 'C · interno', order: 3 },
      { id: 'D', label: 'D · cross-sociedad', order: 4 },
      { id: 'E', label: 'E · sin cliente, sin físico', order: 5 },
    ],
    transitions: [],
    read_only: true,
  },
};

function parseAxis(value: unknown): AxisId {
  if (
    value === 'estado_imputacion_ardua' ||
    value === 'estado_imputacion_cliente' ||
    value === 'tipo' ||
    value === 'sociedad' ||
    value === 'categoria'
  ) {
    return value;
  }
  return 'estado_operativo';
}

const activeAxisId = ref<AxisId>(parseAxis(route.query.axis));

watch(
  () => route.query.axis,
  (val) => {
    activeAxisId.value = parseAxis(val);
  },
);

function setActiveAxis(next: AxisId): void {
  activeAxisId.value = next;
  router.replace({
    query: {
      ...route.query,
      axis: next === 'estado_operativo' ? undefined : next,
    },
  });
}

const activeAxis = computed<KanbanAxis>(
  () => MOVIMIENTOS_KANBAN_AXES[activeAxisId.value],
);

// ─── Kanban transition handler — dispatches to manifest actions ──────
function handleKanbanTransition(payload: {
  recordId: string;
  fromState: string;
  toState: string;
  mode: string;
}): void {
  if (payload.mode !== 'modal') return;
  const record = MOVIMIENTOS.find((m) => m.id === payload.recordId);
  if (!record) return;
  if (activeAxisId.value === 'estado_imputacion_ardua') {
    movimientosMod.openDialog(
      'fin.disponibilidades.movimientos.imputar_ardua.asignar',
      record as unknown as Record<string, unknown>,
    );
  } else if (activeAxisId.value === 'estado_imputacion_cliente') {
    movimientosMod.openDialog(
      'fin.disponibilidades.movimientos.imputar_cliente.asignar',
      record as unknown as Record<string, unknown>,
    );
  }
}

// ─── Bancos / Cuentas filter state ───────────────────────────────────
const bcQuery = ref('');
const bcSociedad = ref<string>('all');
const bcTipoEstructura = ref<string>('all');
const bcTipoCuenta = ref<string>('all');
const bcMoneda = ref<string>('all');
const bcEstado = ref<string>('all');
const bcConfig = ref<'all' | 'configured' | 'not_configured'>('all');

const bcSociedadOptions = computed<Array<{ value: string; label: string }>>(() =>
  Array.from(new Set(cuentas.value.map((c) => c.sociedad_id))).map((id) => ({
    value: id,
    label: id.toUpperCase(),
  })),
);
const bcTipoEstructuraOptions = computed<string[]>(() =>
  Array.from(new Set(cuentas.value.map((c) => c.tipo_estructura))).sort(),
);
const bcTipoCuentaOptions = computed<string[]>(() =>
  Array.from(new Set(cuentas.value.map((c) => c.tipo_cuenta))).sort(),
);
const bcMonedaOptions = computed<string[]>(() =>
  Array.from(new Set(cuentas.value.map((c) => c.moneda))).sort(),
);

const filteredCuentas = computed(() => {
  let list = cuentas.value;
  const q = bcQuery.value.trim().toLowerCase();
  if (q !== '') {
    list = list.filter((c) => {
      const banco = c.banco.toLowerCase();
      const num = c.numero.toLowerCase();
      const cuentaContable = (c.cuenta_contable ?? '').toLowerCase();
      return banco.includes(q) || num.includes(q) || cuentaContable.includes(q);
    });
  }
  if (bcSociedad.value !== 'all') {
    list = list.filter((c) => c.sociedad_id === bcSociedad.value);
  }
  if (bcTipoEstructura.value !== 'all') {
    list = list.filter((c) => c.tipo_estructura === bcTipoEstructura.value);
  }
  if (bcTipoCuenta.value !== 'all') {
    list = list.filter((c) => c.tipo_cuenta === bcTipoCuenta.value);
  }
  if (bcMoneda.value !== 'all') {
    list = list.filter((c) => c.moneda === bcMoneda.value);
  }
  if (bcEstado.value !== 'all') {
    list = list.filter((c) => c.estado === bcEstado.value);
  }
  if (bcConfig.value === 'configured') {
    list = list.filter((c) => c.cuenta_contable !== null);
  } else if (bcConfig.value === 'not_configured') {
    list = list.filter((c) => c.cuenta_contable === null);
  }
  return list;
});

const bcFiltersActive = computed<boolean>(
  () =>
    bcQuery.value.trim() !== '' ||
    bcSociedad.value !== 'all' ||
    bcTipoEstructura.value !== 'all' ||
    bcTipoCuenta.value !== 'all' ||
    bcMoneda.value !== 'all' ||
    bcEstado.value !== 'all' ||
    bcConfig.value !== 'all',
);

function clearBcFilters(): void {
  bcQuery.value = '';
  bcSociedad.value = 'all';
  bcTipoEstructura.value = 'all';
  bcTipoCuenta.value = 'all';
  bcMoneda.value = 'all';
  bcEstado.value = 'all';
  bcConfig.value = 'all';
}

// ─── Pagination via useTable (per core-data-tables spec) ─────────────
// `useTable` owns page state, page-size state, paginated slice, total
// pages and total count. The footer renders through `<TablePagination>`
// — hand-rolled state in this page is forbidden by the spec.
const bcTable = useTable({
  data: filteredCuentas,
  pageSize: 25,
});

const movTable = useTable({
  data: filteredMovimientos,
  pageSize: 25,
});

</script>

<template>
  <div class="flex flex-col gap-5 px-[22px] py-5" data-testid="disponibilidades-page">
    <!-- L1 · Page header -->
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-[22px] font-extrabold tracking-tight text-t-1">Disponibilidades</h1>
        <p class="mt-1 text-xs text-t-3">
          ¿Dónde está el dinero? Posición de fondos por Sociedad → Banco → Cuenta, ledger global de
          movimientos y catálogo de cuentas con lente Finanzas.
        </p>
      </div>
      <div class="flex items-center gap-3" data-testid="disponibilidades-main-cta">
        <ViewToggle
          v-if="subTab === 'movimientos'"
          v-model="view"
          :views="['list', 'cards', 'kanban']"
          data-testid="movimientos-view-toggle"
        />
        <ManifestModuleCTAs :manifest-key="activeModuleManifestKey" />
      </div>
    </header>

    <!-- L1 · Segmenter -->
    <Segmenter
      :model-value="subTab"
      :options="segmentOptions"
      aria-label="Seleccionar sub-tab"
      data-testid="disponibilidades-segmenter"
      @update:model-value="setSubTab"
    />

    <!-- ─── SUB-TAB · POSICIÓN ─────────────────────────────────────── -->
    <template v-if="subTab === 'posicion'">
      <!-- L2 · Ecuación maestra · 4 cards × multi-moneda rows.
           Bancos = Obligaciones + Pendientes + Capacidad operativa, valid
           per moneda. V1 no aplica conversiones cross-moneda — cada KPI
           se presenta en moneda nativa con compact notation. -->
      <section class="space-y-3">
        <h2
          class="text-[11px] font-extrabold uppercase tracking-[0.14em] text-t-3"
          data-testid="posicion-kpis-title"
        >
          Posición consolidada
        </h2>
        <div
          class="grid grid-cols-2 gap-3 lg:grid-cols-4"
          data-testid="posicion-kpis"
        >
        <article class="rounded-xl border border-b-2 bg-card-2 px-5 py-4">
          <header class="mb-4 flex items-center gap-2.5">
            <span class="flex h-7 w-7 items-center justify-center rounded-md bg-info-bg text-info">
              <Wallet class="h-3.5 w-3.5" />
            </span>
            <h3 class="text-sm font-bold text-t-1">Bancos</h3>
          </header>
          <ul class="space-y-2" data-testid="posicion-kpi-bancos">
            <li
              v-for="(row, idx) in perMonedaRows(POSICION_KPIS.bancos)"
              :key="row.moneda"
              class="flex items-baseline justify-between gap-3 pb-2 last:pb-0"
              :class="idx < perMonedaRows(POSICION_KPIS.bancos).length - 1 && 'border-b border-dotted border-b-1'"
            >
              <span class="text-[11px] font-bold uppercase tracking-wider text-t-3">{{ row.moneda }}</span>
              <span class="font-mono text-base font-extrabold tabular-nums text-t-1">{{ formatCompact(row.val) }}</span>
            </li>
          </ul>
        </article>
        <article class="rounded-xl border border-b-2 bg-card-2 px-5 py-4">
          <header class="mb-4 flex items-center gap-2.5">
            <span class="flex h-7 w-7 items-center justify-center rounded-md bg-danger-bg text-danger">
              <Users class="h-3.5 w-3.5" />
            </span>
            <h3 class="text-sm font-bold text-t-1">Obligaciones</h3>
          </header>
          <ul class="space-y-2" data-testid="posicion-kpi-obligaciones">
            <li
              v-for="(row, idx) in perMonedaRows(POSICION_KPIS.obligaciones)"
              :key="row.moneda"
              class="flex items-baseline justify-between gap-3 pb-2 last:pb-0"
              :class="idx < perMonedaRows(POSICION_KPIS.obligaciones).length - 1 && 'border-b border-dotted border-b-1'"
            >
              <span class="text-[11px] font-bold uppercase tracking-wider text-t-3">{{ row.moneda }}</span>
              <span class="font-mono text-base font-extrabold tabular-nums text-t-1">{{ formatCompact(row.val) }}</span>
            </li>
          </ul>
        </article>
        <article class="rounded-xl border border-b-2 bg-card-2 px-5 py-4">
          <header class="mb-4 flex items-center gap-2.5">
            <span class="flex h-7 w-7 items-center justify-center rounded-md bg-warning-bg text-warning">
              <Clock class="h-3.5 w-3.5" />
            </span>
            <h3 class="text-sm font-bold text-t-1">Pendientes</h3>
          </header>
          <ul class="space-y-2" data-testid="posicion-kpi-pendientes">
            <li
              v-for="(row, idx) in perMonedaRows(POSICION_KPIS.pendientes)"
              :key="row.moneda"
              class="flex items-baseline justify-between gap-3 pb-2 last:pb-0"
              :class="idx < perMonedaRows(POSICION_KPIS.pendientes).length - 1 && 'border-b border-dotted border-b-1'"
            >
              <span class="text-[11px] font-bold uppercase tracking-wider text-t-3">{{ row.moneda }}</span>
              <span class="font-mono text-base font-extrabold tabular-nums text-t-1">{{ formatCompact(row.val) }}</span>
            </li>
          </ul>
        </article>
        <article class="rounded-xl border border-b-2 bg-card-2 px-5 py-4">
          <header class="mb-4 flex items-center gap-2.5">
            <span class="flex h-7 w-7 items-center justify-center rounded-md bg-success-bg text-success">
              <TrendingUp class="h-3.5 w-3.5" />
            </span>
            <h3 class="text-sm font-bold text-t-1">Capacidad operativa</h3>
          </header>
          <ul class="space-y-2" data-testid="posicion-kpi-capacidad-operativa">
            <li
              v-for="(row, idx) in perMonedaRows(POSICION_KPIS.capacidadOperativa)"
              :key="row.moneda"
              class="flex items-baseline justify-between gap-3 pb-2 last:pb-0"
              :class="idx < perMonedaRows(POSICION_KPIS.capacidadOperativa).length - 1 && 'border-b border-dotted border-b-1'"
            >
              <span class="text-[11px] font-bold uppercase tracking-wider text-t-3">{{ row.moneda }}</span>
              <span class="font-mono text-base font-extrabold tabular-nums text-t-1">{{ formatCompact(row.val) }}</span>
            </li>
          </ul>
        </article>
        </div>
      </section>

      <section class="space-y-3" data-testid="posicion-tree">
        <h2
          class="text-[11px] font-extrabold uppercase tracking-[0.14em] text-t-3"
          data-testid="posicion-tree-title"
        >
          Saldos por cuentas agrupados por sociedad
        </h2>
        <div
          v-for="soc in POSICION_TREE"
          :key="soc.id"
          class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2"
        >
          <button
            type="button"
            class="flex w-full items-center gap-3 px-[18px] py-3 text-left"
            @click="toggleSociedad(soc.id)"
          >
            <component
              :is="expandedSociedades[soc.id] ? ChevronDown : ChevronRight"
              class="h-4 w-4 text-t-3"
            />
            <div class="flex-1">
              <div class="text-sm font-bold text-t-1">{{ soc.name }}</div>
              <div class="text-[11px] text-t-4">{{ soc.sub }}</div>
            </div>
            <div class="flex items-center gap-2">
              <Badge v-for="t in soc.totals" :key="t.lbl" variant="neutral" class="font-mono">
                {{ t.lbl }} {{ t.val }}
              </Badge>
            </div>
          </button>
          <div v-if="expandedSociedades[soc.id]" class="border-t border-b-1">
            <table class="w-full border-collapse">
              <thead>
                <tr class="border-b border-b-1">
                  <th class="px-[18px] py-2 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Banco</th>
                  <th class="px-3.5 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Cuenta</th>
                  <th class="px-3.5 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Moneda</th>
                  <th class="px-3.5 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Saldo</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="cu in soc.cuentas"
                  :key="cu.id"
                  class="cursor-pointer border-b border-b-1 transition-colors last:border-b-0 hover:bg-white/[0.04]"
                  :data-testid="`posicion-row-${cu.id}`"
                  @click="drillDownToMovimientos(cu.id)"
                >
                  <td class="px-[18px] py-2 text-xs text-t-2">
                    <div class="flex items-center gap-2">
                      <Wallet class="h-3.5 w-3.5 text-t-4" />
                      <span class="font-semibold">{{ cu.banco }}</span>
                    </div>
                  </td>
                  <td class="px-3.5 py-2 text-xs text-t-2">
                    <div class="font-mono">{{ cu.numero }}</div>
                    <div v-if="cu.det" class="text-[11px] text-t-4">{{ cu.det }}</div>
                  </td>
                  <td class="px-3.5 py-2 text-xs">
                    <span class="rounded bg-card px-1.5 py-0.5 font-mono text-[11px] font-bold text-t-3">{{ cu.moneda }}</span>
                  </td>
                  <td class="px-3.5 py-2 text-right text-xs font-mono tabular-nums text-t-2">{{ cu.saldo }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </template>

    <!-- ─── SUB-TAB · BANCOS / CUENTAS ─────────────────────────────── -->
    <template v-else-if="subTab === 'bancos_cuentas'">
      <section class="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="bancos-cuentas-kpis">
        <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
          <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Estructuras totales</div>
          <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">{{ bancosCuentasKpis.estructurasTotales }}</div>
        </div>
        <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
          <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Cuentas activas</div>
          <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">{{ bancosCuentasKpis.cuentasActivas }}</div>
        </div>
        <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
          <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Con configuración contable</div>
          <div class="text-2xl font-extrabold leading-none tracking-tight text-success">{{ bancosCuentasKpis.cuentasConfiguradas }}</div>
        </div>
        <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
          <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Sin configurar</div>
          <div class="text-2xl font-extrabold leading-none tracking-tight text-warning">{{ bancosCuentasKpis.cuentasSinConfigurar }}</div>
        </div>
      </section>

      <section
        class="flex flex-wrap items-center gap-2"
        data-testid="bancos-cuentas-filters"
      >
        <span class="text-sm font-bold text-t-2">Catálogo de cuentas</span>
        <span class="rounded-full bg-card px-2 py-0.5 text-[11px] text-t-3">
          {{ filteredCuentas.length }}
        </span>
        <div class="w-4" />
        <div class="relative">
          <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t-4" />
          <Input
            v-model="bcQuery"
            placeholder="Buscar por banco, número o cuenta contable…"
            class="w-[260px] pl-8"
            data-testid="bancos-cuentas-search"
          />
        </div>
        <div class="flex-1" />
        <Select v-model="bcSociedad">
          <SelectTrigger class="h-9 w-[140px] text-xs" aria-label="Filtrar por sociedad">
            <SelectValue placeholder="Sociedad · Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Sociedad · Todas</SelectItem>
            <SelectItem v-for="s in bcSociedadOptions" :key="s.value" :value="s.value">
              {{ s.label }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="bcTipoEstructura">
          <SelectTrigger class="h-9 w-[160px] text-xs" aria-label="Filtrar por tipo de estructura">
            <SelectValue placeholder="Estructura · Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Estructura · Todas</SelectItem>
            <SelectItem v-for="t in bcTipoEstructuraOptions" :key="t" :value="t">
              {{ t }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="bcTipoCuenta">
          <SelectTrigger class="h-9 w-[160px] text-xs" aria-label="Filtrar por tipo de cuenta">
            <SelectValue placeholder="Cuenta · Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Cuenta · Todas</SelectItem>
            <SelectItem v-for="t in bcTipoCuentaOptions" :key="t" :value="t">
              {{ t }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="bcMoneda">
          <SelectTrigger class="h-9 w-[120px] text-xs" aria-label="Filtrar por moneda">
            <SelectValue placeholder="Moneda · Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Moneda · Todas</SelectItem>
            <SelectItem v-for="m in bcMonedaOptions" :key="m" :value="m">{{ m }}</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="bcEstado">
          <SelectTrigger class="h-9 w-[120px] text-xs" aria-label="Filtrar por estado">
            <SelectValue placeholder="Estado · Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Estado · Todos</SelectItem>
            <SelectItem value="Activa">Activa</SelectItem>
            <SelectItem value="Inactiva">Inactiva</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="bcConfig">
          <SelectTrigger class="h-9 w-[160px] text-xs" aria-label="Filtrar por configuración contable">
            <SelectValue placeholder="Config. · Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Config. · Todas</SelectItem>
            <SelectItem value="configured">Configurada</SelectItem>
            <SelectItem value="not_configured">Sin configurar</SelectItem>
          </SelectContent>
        </Select>
        <button
          v-if="bcFiltersActive"
          type="button"
          class="text-[11px] font-bold uppercase tracking-wider text-info hover:text-info/80"
          data-testid="bancos-cuentas-clear-filters"
          @click="clearBcFilters"
        >
          Limpiar
        </button>
      </section>

      <section class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2" data-testid="bancos-cuentas-table">
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b border-b-2">
              <th class="px-[18px] py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Sociedad</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Banco / Estructura</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Tipo estructura</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Tipo cuenta</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Moneda</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Nro. / Address</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Estado</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Cuenta contable</th>
              <th class="px-3.5 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-t-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="cu in bcTable.paged.value"
              :key="cu.id"
              class="border-b border-b-1 last:border-b-0 hover:bg-white/[0.02]"
              :data-testid="`bancos-cuentas-row-${cu.id}`"
            >
              <td class="px-[18px] py-2.5 text-xs text-t-2">{{ cu.sociedad_id }}</td>
              <td class="px-3.5 py-2.5 text-xs text-t-2 font-semibold">{{ cu.banco }}</td>
              <td class="px-3.5 py-2.5 text-xs text-t-3">{{ cu.tipo_estructura }}</td>
              <td class="px-3.5 py-2.5 text-xs text-t-3">{{ cu.tipo_cuenta }}</td>
              <td class="px-3.5 py-2.5 text-xs text-t-3">{{ cu.moneda }}</td>
              <td class="px-3.5 py-2.5 text-xs font-mono text-t-3">{{ cu.numero }}</td>
              <td class="px-3.5 py-2.5">
                <Badge :variant="cu.estado === 'Activa' ? 'success' : 'neutral'">{{ cu.estado }}</Badge>
              </td>
              <td class="px-3.5 py-2.5">
                <Badge v-if="cu.cuenta_contable === null" variant="warning" class="text-[10px]">Sin configurar</Badge>
                <span v-else class="text-xs text-t-3">{{ cu.cuenta_contable }}</span>
              </td>
              <td class="px-3.5 py-2.5 text-center" @click.stop>
                <div class="flex items-center justify-center">
                  <ManifestActionsMenu
                    :manifest-key="FIN_DISPONIBILIDADES_BANCOS_CUENTAS_MANIFEST_KEY"
                    :record="cu as unknown as Record<string, unknown>"
                    variant="table"
                    :data-testid="`bancos-cuentas-row-${cu.id}-actions`"
                  />
                </div>
              </td>
            </tr>
            <tr v-if="bcTable.paged.value.length === 0">
              <td colspan="9" class="px-[18px] py-6 text-center text-xs text-t-4">
                Sin cuentas que coincidan con los filtros.
              </td>
            </tr>
          </tbody>
        </table>
      </section>
      <TablePagination
        :page="bcTable.page.value"
        :page-size="bcTable.pageSize.value"
        :total="bcTable.total.value"
        :total-pages="bcTable.totalPages.value"
        :page-size-options="PAGE_SIZE_OPTIONS"
        data-testid="bancos-cuentas-pagination"
        @update:page="bcTable.setPage"
        @update:page-size="bcTable.setPageSize"
      />
    </template>

    <!-- ─── SUB-TAB · MOVIMIENTOS ──────────────────────────────────── -->
    <template v-else>
      <section class="grid grid-cols-2 gap-3 lg:grid-cols-5" data-testid="movimientos-kpis">
        <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
          <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Movimientos del día</div>
          <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">{{ MOVIMIENTOS_KPIS.movimientosDelDia }}</div>
        </div>
        <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
          <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Volumen ingresado</div>
          <ul class="space-y-1" data-testid="movimientos-kpi-ingresado">
            <li
              v-for="row in perMonedaRows(MOVIMIENTOS_KPIS.volumenIngresado)"
              :key="row.moneda"
              class="flex items-baseline justify-between gap-2 text-sm"
            >
              <span class="text-[10px] font-bold uppercase tracking-wider text-t-4">{{ row.moneda }}</span>
              <span class="font-mono font-extrabold text-success">{{ row.val }}</span>
            </li>
          </ul>
        </div>
        <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
          <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Volumen egresado</div>
          <ul class="space-y-1" data-testid="movimientos-kpi-egresado">
            <li
              v-for="row in perMonedaRows(MOVIMIENTOS_KPIS.volumenEgresado)"
              :key="row.moneda"
              class="flex items-baseline justify-between gap-2 text-sm"
            >
              <span class="text-[10px] font-bold uppercase tracking-wider text-t-4">{{ row.moneda }}</span>
              <span class="font-mono font-extrabold text-danger">{{ row.val }}</span>
            </li>
          </ul>
        </div>
        <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
          <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Pendientes de imputación</div>
          <div
            class="text-2xl font-extrabold leading-none tracking-tight"
            :class="MOVIMIENTOS_KPIS.pendientesDeImputacion > 0 ? 'text-warning' : 'text-t-1'"
          >
            {{ MOVIMIENTOS_KPIS.pendientesDeImputacion }}
          </div>
        </div>
        <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
          <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Pendientes de asignación</div>
          <div
            class="text-2xl font-extrabold leading-none tracking-tight"
            :class="MOVIMIENTOS_KPIS.pendientesDeAsignacion > 0 ? 'text-warning' : 'text-t-1'"
          >
            {{ MOVIMIENTOS_KPIS.pendientesDeAsignacion }}
          </div>
        </div>
      </section>

      <section
        v-if="drillCuentaId !== null"
        class="flex items-center justify-between rounded-md border border-b-1 bg-card-2 px-4 py-2 text-xs text-t-3"
        data-testid="movimientos-drill-banner"
      >
        <span>
          Filtrado por <span class="font-mono text-t-2">cuenta_id = {{ drillCuentaId }}</span>
          desde drill-down de Posición.
        </span>
        <button
          type="button"
          class="text-[11px] font-bold uppercase tracking-wider text-info hover:text-info/80"
          @click="clearDrillFilter"
        >
          Limpiar filtro
        </button>
      </section>

      <!-- L3 · Search + filters (canonical template pattern) -->
      <section
        class="flex flex-wrap items-center gap-2"
        data-testid="movimientos-filters"
      >
        <span class="text-sm font-bold text-t-2">Ledger de movimientos</span>
        <span class="rounded-full bg-card px-2 py-0.5 text-[11px] text-t-3">
          {{ filteredMovimientos.length }}
        </span>
        <div class="w-4" />
        <div class="relative">
          <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t-4" />
          <Input
            v-model="movQuery"
            placeholder="Buscar por nombre de cliente o ID…"
            class="w-[260px] pl-8"
            data-testid="movimientos-search"
          />
        </div>
        <div class="flex-1" />
        <Select v-model="movPeriodo">
          <SelectTrigger class="h-9 w-[130px] text-xs" aria-label="Filtrar por período">
            <SelectValue placeholder="Período · Todo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">Período · Todo</SelectItem>
            <SelectItem value="dia">Período · Día</SelectItem>
            <SelectItem value="semana">Período · Semana</SelectItem>
            <SelectItem value="mes">Período · Mes</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="movTipo">
          <SelectTrigger class="h-9 w-[170px] text-xs" aria-label="Filtrar por tipo">
            <SelectValue placeholder="Tipo · Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tipo · Todos</SelectItem>
            <SelectItem
              v-for="t in movTipoOptions"
              :key="t.id"
              :value="t.id"
            >
              {{ t.label }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="movRail">
          <SelectTrigger class="h-9 w-[130px] text-xs" aria-label="Filtrar por rail">
            <SelectValue placeholder="Rail · Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Rail · Todos</SelectItem>
            <SelectItem v-for="r in railOptions" :key="r" :value="r">{{ r }}</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="movCuenta">
          <SelectTrigger class="h-9 w-[200px] text-xs" aria-label="Filtrar por estructura / cuenta">
            <SelectValue placeholder="Estructura / Cuenta · Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Estructura / Cuenta · Todas</SelectItem>
            <SelectItem v-for="o in cuentaOptions" :key="o.value" :value="o.value">
              {{ o.label }}
            </SelectItem>
          </SelectContent>
        </Select>
        <button
          v-if="movFiltersActive"
          type="button"
          class="text-[11px] font-bold uppercase tracking-wider text-info hover:text-info/80"
          data-testid="movimientos-clear-filters"
          @click="clearMovFilters"
        >
          Limpiar
        </button>
      </section>

      <!-- Axis selector (only when Tablero view is active) -->
      <section
        v-if="view === 'kanban'"
        class="flex flex-wrap items-center gap-3"
        data-testid="movimientos-toolbar"
      >
        <label
          class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-t-3"
          data-testid="movimientos-axis-selector"
        >
          Eje del Tablero
          <Select
            :model-value="activeAxisId"
            @update:model-value="setActiveAxis(($event as AxisId))"
          >
            <SelectTrigger class="h-8 w-[240px] text-xs" aria-label="Seleccionar eje del Tablero">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="estado_operativo">Estado operativo</SelectItem>
              <SelectItem value="estado_imputacion_ardua">Estado imputación Lado Ardua</SelectItem>
              <SelectItem value="estado_imputacion_cliente">Estado imputación Lado Cliente</SelectItem>
              <SelectItem value="tipo">Tipo de movimiento</SelectItem>
              <SelectItem value="sociedad">Sociedad</SelectItem>
              <SelectItem value="categoria">Categoría (A-E)</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <span v-if="activeAxis.description" class="text-[11px] text-t-4">
          {{ activeAxis.description }}
        </span>
      </section>

      <!-- LIST view -->
      <template v-if="view === 'list'">
      <section
        class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2"
        data-testid="movimientos-table"
      >
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b border-b-2">
              <th class="px-[18px] py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">ID</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Fecha</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Cliente</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Rail</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Tipo</th>
              <th class="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Monto</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Origen</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Estado op.</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Banco / Cuenta</th>
              <th class="px-3.5 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-t-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="m in movTable.paged.value"
              :key="m.id"
              class="border-b border-b-1 last:border-b-0 hover:bg-white/[0.02]"
              :data-testid="`movimientos-row-${m.id}`"
            >
              <td class="px-[18px] py-2.5 font-mono text-xs text-t-3">{{ m.id }}</td>
              <td class="px-3.5 py-2.5 text-xs text-t-3">{{ m.fecha }}</td>
              <td class="px-3.5 py-2.5 text-xs font-semibold text-t-2">{{ m.ops.client ?? '—' }}</td>
              <td class="px-3.5 py-2.5">
                <span class="rounded bg-card px-1.5 py-0.5 font-mono text-[10px] font-bold text-t-3">
                  {{ m.ops.rail }}
                </span>
              </td>
              <td class="px-3.5 py-2.5 text-xs text-t-2">{{ m.tipo }}</td>
              <td
                class="px-3.5 py-2.5 text-right font-mono text-xs tabular-nums"
                :class="m.monto.startsWith('+') ? 'text-success' : 'text-danger'"
              >
                {{ m.monto }}
              </td>
              <td class="px-3.5 py-2.5">
                <Badge
                  :variant="m.origen === 'OPS' ? 'info' : 'warning'"
                  class="text-[10px]"
                >
                  {{ m.origen }}
                </Badge>
              </td>
              <td class="px-3.5 py-2.5">
                <Badge
                  :variant="m.status === 'COMPLETED' ? 'success' : m.status === 'PENDING' ? 'warning' : 'danger'"
                  class="text-[10px]"
                >
                  {{ m.status }}
                </Badge>
              </td>
              <td class="px-3.5 py-2.5 text-xs">
                <template v-if="getCuenta(m.fin.cuenta_id)">
                  <div class="font-semibold text-t-2">{{ getCuenta(m.fin.cuenta_id)?.banco }}</div>
                  <div class="text-[11px] text-t-4">
                    {{ getCuenta(m.fin.cuenta_id)?.moneda }} · {{ getCuenta(m.fin.cuenta_id)?.numero }}
                  </div>
                </template>
                <Badge v-else variant="warning" class="text-[10px]">Sin asignar</Badge>
              </td>
              <td class="px-3.5 py-2.5 text-center" @click.stop>
                <div class="flex items-center justify-center">
                  <ManifestActionsMenu
                    :manifest-key="FIN_DISPONIBILIDADES_MOVIMIENTOS_MANIFEST_KEY"
                    :record="m as unknown as Record<string, unknown>"
                    variant="table"
                    :data-testid="`movimientos-row-${m.id}-actions`"
                  />
                </div>
              </td>
            </tr>
            <tr v-if="movTable.paged.value.length === 0">
              <td colspan="10">
                <EmptyState
                  title="Sin movimientos"
                  description="No hay movimientos que coincidan con los filtros aplicados."
                />
              </td>
            </tr>
          </tbody>
        </table>
      </section>
      <TablePagination
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
          v-for="m in filteredMovimientos"
          :key="m.id"
          :record="m as unknown as Record<string, unknown>"
          :data-testid="`movimientos-card-${m.id}`"
        >
          <template #header>
            <div class="flex min-w-0 flex-1 items-center gap-2">
              <span class="font-mono text-[11px] text-t-4">{{ m.id }}</span>
              <span class="truncate text-sm font-semibold text-t-1">{{ m.tipo }}</span>
            </div>
            <Badge
              :variant="m.origen === 'OPS' ? 'info' : 'warning'"
              class="text-[10px]"
            >
              {{ m.origen }}
            </Badge>
            <span @click.stop>
              <ManifestActionsMenu
                :manifest-key="FIN_DISPONIBILIDADES_MOVIMIENTOS_MANIFEST_KEY"
                :record="m as unknown as Record<string, unknown>"
                variant="card"
              />
            </span>
          </template>
          <template #body>
            <div class="space-y-1 text-xs text-t-3">
              <div class="font-mono text-sm text-t-2">{{ m.monto }} {{ m.moneda }}</div>
              <div>Cuenta: {{ m.fin.cuenta_id ?? 'Sin asignar' }}</div>
              <div>Cliente: {{ m.fin.cliente_id ?? 'Sin asignar' }}</div>
            </div>
          </template>
          <template #footer>
            <span>{{ m.fecha }}</span>
            <Badge variant="neutral" class="text-[10px]">{{ m._categoria }}</Badge>
          </template>
        </CardItem>
      </CardsGrid>

      <!-- KANBAN view -->
      <div v-else class="min-h-[480px]" data-testid="movimientos-kanban-wrapper">
        <KanbanBoard
          :axis="activeAxis"
          :records="filteredMovimientos as unknown as Record<string, unknown>[] as never"
          title="Movimientos"
          @transition="handleKanbanTransition"
        >
          <template #card="{ record }">
            <CardItem :record="record">
              <template #header>
                <div class="flex min-w-0 flex-1 items-center gap-2">
                  <span class="font-mono text-[11px] text-t-4">
                    {{ (record as unknown as Movimiento).id }}
                  </span>
                  <span class="truncate text-sm font-semibold text-t-1">
                    {{ (record as unknown as Movimiento).tipo }}
                  </span>
                </div>
                <Badge
                  :variant="(record as unknown as Movimiento).origen === 'OPS' ? 'info' : 'warning'"
                  class="text-[10px]"
                >
                  {{ (record as unknown as Movimiento).origen }}
                </Badge>
                <span @click.stop>
                  <ManifestActionsMenu
                    :manifest-key="FIN_DISPONIBILIDADES_MOVIMIENTOS_MANIFEST_KEY"
                    :record="record"
                    variant="card"
                  />
                </span>
              </template>
              <template #body>
                <div class="space-y-1 text-xs text-t-3">
                  <div class="font-mono text-sm text-t-2">
                    {{ (record as unknown as Movimiento).monto }}
                    {{ (record as unknown as Movimiento).moneda }}
                  </div>
                  <div>{{ (record as unknown as Movimiento).fecha }}</div>
                </div>
              </template>
              <template #footer>
                <Badge variant="neutral" class="text-[10px]">
                  {{ categoriaOf((record as unknown as Movimiento).tipo) }}
                </Badge>
              </template>
            </CardItem>
          </template>
        </KanbanBoard>
      </div>
    </template>
  </div>
</template>
