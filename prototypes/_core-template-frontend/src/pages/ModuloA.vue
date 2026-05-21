<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';
import { Plus, Search, ChevronDown, Edit3 } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ViewToggle,
  CardsGrid,
  CardItem,
  type ViewMode,
} from '@/components/views';
import { KanbanBoard } from '@/components/kanban';
import { TablePagination } from '@/components/data-display';
import { ManifestActionsMenu } from '@/components/manifest';
import type { KanbanAxis, KanbanState } from '@/types/kanban';
import { useManifestModule } from '@/composables/useManifestModule';
import { MODULO_A_MANIFEST_KEY } from '@/manifests/framework.template.modulo_a.actions';
import { useTable } from '@/composables/useTable';
import { formatCurrency, nextSequentialId } from '@/lib/format';
import { PAGE_SIZE_OPTIONS } from '@/constants';
import type { ExampleRecord, RecordStatus } from '@/types/models';
import { cn } from '@/lib/cn';

// ════════════════════════════════════════════════════════════════════
// Módulo A — Reference implementation of the Type-A pattern
// ────────────────────────────────────────────────────────────────────
//   L1 — Page header (title + subtitle + ViewToggle + Main CTA)
//   L2 — KPI cards (computed over the period-filtered set)
//   L3 — Section header (search + filters) + Table | Cards | Tablero
//
// Row actions are FULLY manifest-driven via
// `framework.template.modulo_a` (see
// `src/manifests/framework.template.modulo_a.actions.ts`):
//   · process / confirm / generate / assign / cancel
// The page mounts the canonical `<ManifestActionsMenu>` per row and
// the engine handles enablement (capabilities × predicates), dialogs,
// confirmation, audit, and toasts.
// ════════════════════════════════════════════════════════════════════

// ─── Seed data ──────────────────────────────────────────────────────
// Dates span multiple periods so the period filter has visible effect:
//   · Día (today = 2026-04-30)        → 3 records
//   · Mes / Trimestre (April / Q2)    → 12 records
//   · Semestre / Año (H1 / 2026)      → 23 records
//   · Todos                            → 30 records (3 pages × 10)
const rawData = ref<ExampleRecord[]>([
  // Today (2026-04-30)
  { id: 'R-001', date: '2026-04-30', name: 'Registro Alfa', category: 'Tipo 1', value: 1250.5, status: 'ACTIVE' },
  { id: 'R-002', date: '2026-04-30', name: 'Registro Beta', category: 'Tipo 2', value: 890, status: 'PENDING' },
  { id: 'R-003', date: '2026-04-30', name: 'Registro Gamma', category: 'Tipo 3', value: 3100.75, status: 'ACTIVE' },
  // April 2026 (rest of the month)
  { id: 'R-004', date: '2026-04-21', name: 'Registro Delta', category: 'Tipo 1', value: 455.2, status: 'INACTIVE' },
  { id: 'R-005', date: '2026-04-20', name: 'Registro Epsilon', category: 'Tipo 2', value: 2200, status: 'ACTIVE' },
  { id: 'R-006', date: '2026-04-20', name: 'Registro Zeta', category: 'Tipo 1', value: 670.3, status: 'PENDING' },
  { id: 'R-007', date: '2026-04-19', name: 'Registro Eta', category: 'Tipo 3', value: 1850, status: 'ACTIVE' },
  { id: 'R-008', date: '2026-04-19', name: 'Registro Theta', category: 'Tipo 2', value: 920.4, status: 'ACTIVE' },
  { id: 'R-009', date: '2026-04-18', name: 'Registro Iota', category: 'Tipo 1', value: 4500, status: 'INACTIVE' },
  { id: 'R-010', date: '2026-04-18', name: 'Registro Kappa', category: 'Tipo 3', value: 310.8, status: 'PENDING' },
  { id: 'R-011', date: '2026-04-17', name: 'Registro Lambda', category: 'Tipo 2', value: 2750, status: 'ACTIVE' },
  { id: 'R-012', date: '2026-04-15', name: 'Registro Mu', category: 'Tipo 1', value: 1100, status: 'ACTIVE' },
  // March 2026 (Q1, H1, 2026) — out of Trimestre / Mes / Día
  { id: 'R-013', date: '2026-03-28', name: 'Registro Nu', category: 'Tipo 2', value: 5200, status: 'ACTIVE' },
  { id: 'R-014', date: '2026-03-15', name: 'Registro Xi', category: 'Tipo 1', value: 1840.5, status: 'PENDING' },
  { id: 'R-015', date: '2026-03-08', name: 'Registro Omicron', category: 'Tipo 3', value: 3300, status: 'INACTIVE' },
  { id: 'R-016', date: '2026-03-02', name: 'Registro Pi', category: 'Tipo 2', value: 980.2, status: 'ACTIVE' },
  // February 2026 (Q1, H1, 2026)
  { id: 'R-017', date: '2026-02-22', name: 'Registro Rho', category: 'Tipo 1', value: 2150, status: 'ACTIVE' },
  { id: 'R-018', date: '2026-02-14', name: 'Registro Sigma', category: 'Tipo 3', value: 720.4, status: 'PENDING' },
  { id: 'R-019', date: '2026-02-07', name: 'Registro Tau', category: 'Tipo 2', value: 4400, status: 'INACTIVE' },
  { id: 'R-020', date: '2026-02-01', name: 'Registro Upsilon', category: 'Tipo 1', value: 1580.3, status: 'ACTIVE' },
  // January 2026 (Q1, H1, 2026)
  { id: 'R-021', date: '2026-01-25', name: 'Registro Phi', category: 'Tipo 2', value: 6700, status: 'ACTIVE' },
  { id: 'R-022', date: '2026-01-12', name: 'Registro Chi', category: 'Tipo 1', value: 850, status: 'PENDING' },
  { id: 'R-023', date: '2026-01-04', name: 'Registro Psi', category: 'Tipo 3', value: 2900, status: 'ACTIVE' },
  // December 2025 — out of Año / Semestre — only Todos
  { id: 'R-024', date: '2025-12-22', name: 'Registro Omega', category: 'Tipo 2', value: 5400, status: 'INACTIVE' },
  { id: 'R-025', date: '2025-12-10', name: 'Registro Aurora', category: 'Tipo 1', value: 1230, status: 'ACTIVE' },
  { id: 'R-026', date: '2025-12-03', name: 'Registro Boreal', category: 'Tipo 3', value: 380.5, status: 'PENDING' },
  // October 2025 — only Todos
  { id: 'R-027', date: '2025-10-18', name: 'Registro Cosmos', category: 'Tipo 2', value: 7800, status: 'ACTIVE' },
  { id: 'R-028', date: '2025-10-05', name: 'Registro Delfín', category: 'Tipo 1', value: 1640, status: 'INACTIVE' },
  // 2024 — only Todos
  { id: 'R-029', date: '2024-11-14', name: 'Registro Eclipse', category: 'Tipo 3', value: 9200, status: 'ACTIVE' },
  { id: 'R-030', date: '2024-08-22', name: 'Registro Faro', category: 'Tipo 2', value: 2100, status: 'INACTIVE' },
]);

// ─── View mode (Lista / Tarjetas / Tablero) ──────────────────────────
const view = ref<ViewMode>('list');

// ─── Kanban axis (Tablero view) ──────────────────────────────────────
const MODULO_A_KANBAN_STATES: KanbanState[] = [
  { id: 'ACTIVE', label: 'Activo', column_label: 'Activos', order: 1 },
  { id: 'PENDING', label: 'Pendiente', column_label: 'Pendientes', order: 2 },
  { id: 'INACTIVE', label: 'Inactivo', column_label: 'Inactivos', order: 3 },
];

const MODULO_A_KANBAN_AXIS: KanbanAxis = {
  axis_id: 'modulo_a.status',
  label: 'Estado',
  description: 'Lifecycle del registro',
  state_field: 'status',
  states: MODULO_A_KANBAN_STATES,
  transitions: [
    { from: 'ACTIVE', to: 'PENDING', mode: 'free' },
    { from: 'ACTIVE', to: 'INACTIVE', mode: 'free' },
    { from: 'PENDING', to: 'ACTIVE', mode: 'free' },
    { from: 'PENDING', to: 'INACTIVE', mode: 'free' },
    { from: 'INACTIVE', to: 'ACTIVE', mode: 'free' },
    { from: 'INACTIVE', to: 'PENDING', mode: 'free' },
  ],
};

function handleKanbanTransition(payload: {
  recordId: string;
  fromState: string;
  toState: string;
  mode: string;
}): void {
  const idx = rawData.value.findIndex((r) => r.id === payload.recordId);
  if (idx === -1) return;
  const current = rawData.value[idx];
  if (!current) return;
  rawData.value[idx] = { ...current, status: payload.toState as RecordStatus };
  toast.success('Estado actualizado', {
    description: `${payload.recordId} → ${payload.toState}`,
  });
}

// ─── Period filter (Día / Mes / Trimestre / Semestre / Año / Todos) ─
// Per `core-data-tables`: the period filter has UI privileges — single
// value, default-visible, pinned to the start of the filter row. It
// applies BEFORE the granular filters, so KPIs (computed over the
// period-filtered set) reflect the active period.
type Period = 'all' | 'day' | 'month' | 'quarter' | 'semester' | 'year';

const selectedPeriod = ref<Period>('all');

function matchesPeriod(dateStr: string, period: Period, now: Date): boolean {
  if (period === 'all') return true;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return false;
  const date = new Date(parts[0]!, parts[1]! - 1, parts[2]!);
  if (date.getFullYear() !== now.getFullYear()) return false;
  if (period === 'year') return true;
  if (period === 'semester') {
    return Math.floor(date.getMonth() / 6) === Math.floor(now.getMonth() / 6);
  }
  if (period === 'quarter') {
    return Math.floor(date.getMonth() / 3) === Math.floor(now.getMonth() / 3);
  }
  if (period === 'month') return date.getMonth() === now.getMonth();
  if (period === 'day') {
    return date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
  }
  return true;
}

const NOW = new Date();

const periodFilteredData = computed<ExampleRecord[]>(() =>
  rawData.value.filter((r) => matchesPeriod(r.date, selectedPeriod.value, NOW)),
);

// ─── Table state ────────────────────────────────────────────────────
const {
  filtered,
  paged,
  total,
  totalPages,
  page,
  pageSize,
  setPage,
  setPageSize,
  setSearch,
  setFilter,
} = useTable<ExampleRecord>({
  data: periodFilteredData,
  searchFields: ['name', 'id'],
  pageSize: 10,
});

const searchInput = ref('');
function onSearchInput(v: string): void {
  searchInput.value = v;
  setSearch(v);
}

// ─── KPIs (computed over the period-filtered set) ────────────────────
const kpis = computed(() => {
  const data = periodFilteredData.value;
  return {
    total: data.length,
    active: data.filter((r) => r.status === 'ACTIVE').length,
    pending: data.filter((r) => r.status === 'PENDING').length,
    inactive: data.filter((r) => r.status === 'INACTIVE').length,
  };
});

// ─── Granular filters ────────────────────────────────────────────────
type FilterKey = 'period' | 'category' | 'status';
const openFilter = ref<FilterKey | null>(null);
const selectedCategory = ref<string>('');
const selectedStatus = ref<RecordStatus | ''>('');

const PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'day', label: 'Día' },
  { value: 'month', label: 'Mes' },
  { value: 'quarter', label: 'Trimestre' },
  { value: 'semester', label: 'Semestre' },
  { value: 'year', label: 'Año' },
];

function periodLabel(p: Period): string {
  return PERIOD_OPTIONS.find((o) => o.value === p)?.label ?? 'Período';
}

function toggleFilter(key: FilterKey): void {
  openFilter.value = openFilter.value === key ? null : key;
}

function selectPeriod(p: Period): void {
  selectedPeriod.value = p;
  setPage(1);
  openFilter.value = null;
}

function selectCategory(v: string): void {
  selectedCategory.value = v;
  setFilter('category', v || undefined);
  openFilter.value = null;
}

function selectStatus(v: RecordStatus | ''): void {
  selectedStatus.value = v;
  setFilter('status', v || undefined);
  openFilter.value = null;
}

const filterResultsLabel = computed(() => {
  const hasFilter =
    searchInput.value ||
    selectedCategory.value ||
    selectedStatus.value ||
    selectedPeriod.value !== 'all';
  return hasFilter ? `${total.value} resultado${total.value !== 1 ? 's' : ''}` : '';
});

// ─── Manifest engine wiring ─────────────────────────────────────────
// Row actions are sourced from `framework.template.modulo_a` — predicate
// + capability evaluation, dialogs, on_confirm, audit, and toast all
// live in the manifest. The engine is pure: it dispatches a patch which
// we apply to the local `rawData` ref. (This page uses an inline mock
// dataset, not vue-query.)
const moduloA = useManifestModule(MODULO_A_MANIFEST_KEY);

onMounted(() => {
  moduloA.registerRecordResolver((ref) => {
    if (typeof ref === 'string') {
      return rawData.value.find((r) => r.id === ref) as
        | Record<string, unknown>
        | undefined;
    }
    if (ref && typeof ref === 'object' && typeof ref.id === 'string') {
      return rawData.value.find((r) => r.id === ref.id) as
        | Record<string, unknown>
        | undefined;
    }
    return undefined;
  });
  moduloA.registerDispatcher({
    update: (recordId, patch) => {
      const idx = rawData.value.findIndex((r) => r.id === recordId);
      if (idx === -1) return;
      const current = rawData.value[idx];
      if (!current) return;
      rawData.value[idx] = { ...current, ...(patch as Partial<ExampleRecord>) };
    },
    create: () => {
      // Module-A manifest doesn't declare module CTAs that create records.
    },
  });
});

// ─── Modals ─────────────────────────────────────────────────────────
const detailRecord = ref<ExampleRecord | null>(null);
const editRecord = ref<ExampleRecord | null>(null);
const createOpen = ref(false);

function openDetail(record: ExampleRecord): void {
  detailRecord.value = record;
}

function closeDetail(): void {
  detailRecord.value = null;
}

function openEditFromDetail(): void {
  if (!detailRecord.value) return;
  editRecord.value = { ...detailRecord.value };
  detailRecord.value = null;
}

function closeEdit(): void {
  editRecord.value = null;
}

function saveEdit(): void {
  if (!editRecord.value) return;
  const idx = rawData.value.findIndex((r) => r.id === editRecord.value?.id);
  if (idx !== -1) {
    rawData.value[idx] = { ...editRecord.value };
    toast.success('Cambios guardados', { description: `${editRecord.value.id} — ${editRecord.value.name}` });
  }
  closeEdit();
}

const createForm = ref({
  name: '',
  category: 'Tipo 1' as ExampleRecord['category'],
  value: 0,
  status: 'PENDING' as RecordStatus,
});

function openCreate(): void {
  createForm.value = { name: '', category: 'Tipo 1', value: 0, status: 'PENDING' };
  createOpen.value = true;
}

function closeCreate(): void {
  createOpen.value = false;
}

function submitCreate(): void {
  if (!createForm.value.name.trim()) return;
  const id = nextSequentialId(rawData.value.map((r) => r.id));
  const today = new Date().toISOString().split('T')[0] ?? '';
  rawData.value.unshift({
    id,
    date: today,
    name: createForm.value.name.trim(),
    category: createForm.value.category,
    value: createForm.value.value || 0,
    status: createForm.value.status,
  });
  setPage(1);
  closeCreate();
  toast.success('Registro creado', { description: `${id} — ${createForm.value.name}` });
}

// ─── Status badge mapping ───────────────────────────────────────────
function statusVariant(status: RecordStatus): 'success' | 'warning' | 'neutral' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'PENDING') return 'warning';
  return 'neutral';
}

function onBackdropClick(): void {
  openFilter.value = null;
}
</script>

<template>
  <div @click="onBackdropClick">
    <!-- L1 · Page header -->
    <div class="mb-5 flex items-start justify-between">
      <div>
        <h1 class="text-[22px] font-extrabold tracking-tight text-t-1">Módulo A</h1>
        <p class="mt-1 text-xs text-t-3">
          Demostración del patrón estándar L1/L2/L3 con filtros y acciones
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button variant="primary" size="md" @click="openCreate">
          <Plus class="h-3.5 w-3.5" />
          Crear Registro
        </Button>
        <ViewToggle v-model="view" :views="['list', 'cards', 'kanban']" />
      </div>
    </div>

    <!-- L2 · KPI cards -->
    <div class="mb-[22px] grid grid-cols-4 gap-3">
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Total registros
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">
          {{ kpis.total }}
        </div>
        <div class="mt-1.5 text-[11px] text-t-4">en el período</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Activos</div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-success">
          {{ kpis.active }}
        </div>
        <div class="mt-1.5 text-[11px] text-t-4">en operación</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Pendientes</div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-warning">
          {{ kpis.pending }}
        </div>
        <div class="mt-1.5 text-[11px] text-t-4">requieren acción</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Inactivos</div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">
          {{ kpis.inactive }}
        </div>
        <div class="mt-1.5 text-[11px] text-t-4">fuera de operación</div>
      </div>
    </div>

    <!-- L3 · Section header -->
    <div class="mb-2.5 flex flex-wrap items-center gap-2">
      <span class="text-sm font-bold text-t-2">Registros</span>
      <div class="w-4" />
      <div class="relative">
        <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t-4" />
        <Input
          :model-value="searchInput"
          placeholder="Buscar por nombre..."
          class="w-[220px] pl-8"
          @update:model-value="onSearchInput"
        />
      </div>
      <div class="flex-1" />

      <!-- Period filter (pinned to start of filter row, per core-data-tables privileges) -->
      <div class="relative" @click.stop>
        <button
          type="button"
          :class="
            cn(
              'inline-flex h-9 items-center gap-1.5 rounded-md border border-b-2 bg-card px-3 text-xs font-medium text-t-2 transition-colors hover:border-b-3 hover:text-t-1',
              selectedPeriod !== 'all' && 'border-info text-[#93C5FD]',
            )
          "
          data-testid="filter-period"
          @click="toggleFilter('period')"
        >
          Período: {{ periodLabel(selectedPeriod) }}
          <ChevronDown
            :class="cn('h-2.5 w-2.5 opacity-60 transition-transform', openFilter === 'period' && 'rotate-180')"
          />
        </button>
        <div
          v-if="openFilter === 'period'"
          class="absolute right-0 top-full z-[300] mt-1 min-w-[170px] rounded-lg border border-b-3 bg-card-2 p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.6)]"
        >
          <div class="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-t-4">
            Período
          </div>
          <button
            v-for="opt in PERIOD_OPTIONS"
            :key="opt.value"
            class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-medium text-t-2 transition-colors hover:bg-white/[0.06] hover:text-t-1"
            @click="selectPeriod(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <!-- Category filter -->
      <div class="relative" @click.stop>
        <button
          type="button"
          :class="
            cn(
              'inline-flex h-9 items-center gap-1.5 rounded-md border border-b-2 bg-card px-3 text-xs font-medium text-t-2 transition-colors hover:border-b-3 hover:text-t-1',
              selectedCategory && 'border-info text-[#93C5FD]',
            )
          "
          @click="toggleFilter('category')"
        >
          {{ selectedCategory || 'Categoría' }}
          <ChevronDown
            :class="cn('h-2.5 w-2.5 opacity-60 transition-transform', openFilter === 'category' && 'rotate-180')"
          />
        </button>
        <div
          v-if="openFilter === 'category'"
          class="absolute right-0 top-full z-[300] mt-1 min-w-[170px] rounded-lg border border-b-3 bg-card-2 p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.6)]"
        >
          <div class="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-t-4">
            Categoría
          </div>
          <button
            class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-medium text-t-2 transition-colors hover:bg-white/[0.06] hover:text-t-1"
            @click="selectCategory('')"
          >
            Todos
          </button>
          <button
            v-for="cat in ['Tipo 1', 'Tipo 2', 'Tipo 3']"
            :key="cat"
            class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-medium text-t-2 transition-colors hover:bg-white/[0.06] hover:text-t-1"
            @click="selectCategory(cat)"
          >
            {{ cat }}
          </button>
        </div>
      </div>

      <!-- Status filter -->
      <div class="relative" @click.stop>
        <button
          type="button"
          :class="
            cn(
              'inline-flex h-9 items-center gap-1.5 rounded-md border border-b-2 bg-card px-3 text-xs font-medium text-t-2 transition-colors hover:border-b-3 hover:text-t-1',
              selectedStatus && 'border-info text-[#93C5FD]',
            )
          "
          @click="toggleFilter('status')"
        >
          {{ selectedStatus || 'Estado' }}
          <ChevronDown
            :class="cn('h-2.5 w-2.5 opacity-60 transition-transform', openFilter === 'status' && 'rotate-180')"
          />
        </button>
        <div
          v-if="openFilter === 'status'"
          class="absolute right-0 top-full z-[300] mt-1 min-w-[170px] rounded-lg border border-b-3 bg-card-2 p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.6)]"
        >
          <div class="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-t-4">
            Estado
          </div>
          <button
            class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-medium text-t-2 transition-colors hover:bg-white/[0.06] hover:text-t-1"
            @click="selectStatus('')"
          >
            Todos
          </button>
          <button
            v-for="st in ['ACTIVE', 'PENDING', 'INACTIVE'] as RecordStatus[]"
            :key="st"
            class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-medium text-t-2 transition-colors hover:bg-white/[0.06] hover:text-t-1"
            @click="selectStatus(st)"
          >
            {{ st }}
          </button>
        </div>
      </div>

      <span class="px-1 text-[11px] text-t-4">{{ filterResultsLabel }}</span>
    </div>

    <!-- L3 · Body — Lista / Tarjetas / Tablero -->
    <!-- LIST view -->
    <div
      v-if="view === 'list'"
      class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2"
    >
      <table class="w-full border-collapse">
        <thead>
          <tr class="border-b border-b-2">
            <th class="px-[18px] py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">ID</th>
            <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Fecha</th>
            <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Nombre</th>
            <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Categoría</th>
            <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Valor</th>
            <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Estado</th>
            <th class="w-10 px-3.5 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-t-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="paged.length === 0">
            <td colspan="7" class="p-10 text-center text-[13px] text-t-4">Sin resultados</td>
          </tr>
          <tr
            v-for="record in paged"
            :key="record.id"
            class="cursor-pointer border-b border-b-1 transition-colors last:border-b-0 hover:bg-white/[0.02]"
            @click="openDetail(record)"
          >
            <td class="px-[18px] py-2.5">
              <span class="font-mono text-xs text-t-3">{{ record.id }}</span>
            </td>
            <td class="px-3.5 py-2.5 text-xs text-t-3">{{ record.date }}</td>
            <td class="px-3.5 py-2.5 text-[13px] font-semibold text-t-2">{{ record.name }}</td>
            <td class="px-3.5 py-2.5">
              <Badge variant="info">{{ record.category }}</Badge>
            </td>
            <td class="px-3.5 py-2.5 text-[13px] font-bold text-t-2">
              {{ formatCurrency(record.value) }}
            </td>
            <td class="px-3.5 py-2.5">
              <Badge :variant="statusVariant(record.status)">{{ record.status }}</Badge>
            </td>
            <td class="px-3.5 py-2.5 text-center" @click.stop>
              <div class="flex items-center justify-center">
                <ManifestActionsMenu
                  :manifest-key="MODULO_A_MANIFEST_KEY"
                  :record="record as unknown as Record<string, unknown>"
                  variant="table"
                  :data-testid="`row-${record.id}-actions`"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- CARDS view -->
    <CardsGrid v-else-if="view === 'cards'" data-testid="modulo-a-cards">
      <CardItem
        v-for="record in filtered"
        :key="record.id"
        :record="record as unknown as Record<string, unknown>"
        :data-testid="`modulo-a-card-${record.id}`"
        @click="openDetail(record)"
      >
        <template #header>
          <div class="flex min-w-0 flex-1 items-center gap-2">
            <span class="font-mono text-[11px] text-t-4">{{ record.id }}</span>
            <span class="truncate text-sm font-semibold text-t-1">{{ record.name }}</span>
          </div>
          <Badge :variant="statusVariant(record.status)">{{ record.status }}</Badge>
        </template>
        <template #body>
          <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
            <span class="text-t-4">Fecha</span>
            <span class="text-t-2">{{ record.date }}</span>
            <span class="text-t-4">Categoría</span>
            <span class="text-t-2">{{ record.category }}</span>
            <span class="text-t-4">Valor</span>
            <span class="text-t-2 font-semibold">{{ formatCurrency(record.value) }}</span>
          </div>
        </template>
        <template #footer>
          <span>{{ record.date }}</span>
          <Badge variant="info">{{ record.category }}</Badge>
        </template>
      </CardItem>
    </CardsGrid>

    <!-- KANBAN view -->
    <div
      v-else
      class="min-h-[480px]"
      data-testid="modulo-a-kanban-wrapper"
    >
      <KanbanBoard
        :axis="MODULO_A_KANBAN_AXIS"
        :records="filtered as unknown as Record<string, unknown>[] as never"
        title="Registros"
        @transition="handleKanbanTransition"
      >
        <template #card="{ record }">
          <CardItem
            :record="record"
            @click="openDetail(record as unknown as ExampleRecord)"
          >
            <template #header>
              <div class="flex min-w-0 flex-1 items-center gap-2">
                <span class="font-mono text-[11px] text-t-4">{{ (record as unknown as ExampleRecord).id }}</span>
                <span class="truncate text-sm font-semibold text-t-1">{{ (record as unknown as ExampleRecord).name }}</span>
              </div>
            </template>
            <template #body>
              <div class="text-[11px] text-t-3">
                {{ (record as unknown as ExampleRecord).category }} · {{ formatCurrency((record as unknown as ExampleRecord).value) }}
              </div>
            </template>
            <template #footer>
              <span>{{ (record as unknown as ExampleRecord).date }}</span>
              <Badge variant="info">{{ (record as unknown as ExampleRecord).category }}</Badge>
            </template>
          </CardItem>
        </template>
      </KanbanBoard>
    </div>

    <!-- Pagination — only in list view -->
    <TablePagination
      v-if="view === 'list'"
      :page="page"
      :page-size="pageSize"
      :total="total"
      :total-pages="totalPages"
      :page-size-options="PAGE_SIZE_OPTIONS"
      @update:page="setPage"
      @update:page-size="setPageSize"
    />

    <!-- ─── Create modal ─────────────────────────────────────────── -->
    <div
      v-if="createOpen"
      class="fixed inset-0 z-[500] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      @click.self="closeCreate"
      @keydown.esc="closeCreate"
    >
      <div class="w-full max-w-md rounded-2xl border border-b-3 bg-card shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
        <div class="flex items-start justify-between p-5 pb-0">
          <div>
            <div class="text-base font-bold text-t-1">Crear Registro</div>
            <div class="mt-1 text-xs text-t-3">Completá los datos para dar de alta un registro</div>
          </div>
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-md border border-b-3 text-t-3 transition-colors hover:bg-card-2 hover:text-t-1"
            @click="closeCreate"
          >
            ✕
          </button>
        </div>
        <div class="space-y-3 px-5 pt-4">
          <div>
            <label class="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-t-3">
              Nombre *
            </label>
            <Input v-model="createForm.name" placeholder="Nombre del registro" />
          </div>
          <div>
            <label class="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-t-3">
              Categoría *
            </label>
            <select
              v-model="createForm.category"
              class="w-full rounded-md border border-b-3 bg-surf px-3 py-2 text-sm text-t-1 outline-none"
            >
              <option value="Tipo 1">Tipo 1</option>
              <option value="Tipo 2">Tipo 2</option>
              <option value="Tipo 3">Tipo 3</option>
            </select>
          </div>
          <div>
            <label class="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-t-3">
              Valor
            </label>
            <Input v-model.number="createForm.value" type="number" placeholder="0.00" />
          </div>
          <div>
            <label class="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-t-3">
              Estado inicial
            </label>
            <select
              v-model="createForm.status"
              class="w-full rounded-md border border-b-3 bg-surf px-3 py-2 text-sm text-t-1 outline-none"
            >
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
        <div class="mt-4 flex items-center justify-end gap-2 border-t border-b-1 p-4 px-5">
          <Button variant="ghost" @click="closeCreate">Cancelar</Button>
          <Button variant="primary" @click="submitCreate">
            <Plus class="h-3.5 w-3.5" />
            Crear Registro
          </Button>
        </div>
      </div>
    </div>

    <!-- ─── Detail modal ─────────────────────────────────────────── -->
    <div
      v-if="detailRecord"
      class="fixed inset-0 z-[500] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      @click.self="closeDetail"
      @keydown.esc="closeDetail"
    >
      <div class="w-full max-w-lg rounded-2xl border border-b-3 bg-card shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
        <div class="flex items-start justify-between p-5 pb-0">
          <div>
            <div class="text-base font-bold text-t-1">Detalle del Registro</div>
            <div class="mt-1 text-xs text-t-3">{{ detailRecord.id }} · {{ detailRecord.name }}</div>
          </div>
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-md border border-b-3 text-t-3 transition-colors hover:bg-card-2 hover:text-t-1"
            @click="closeDetail"
          >
            ✕
          </button>
        </div>
        <div class="grid grid-cols-2 gap-2.5 p-5">
          <div class="rounded-md border border-b-2 bg-surf p-3">
            <div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-t-4">ID</div>
            <div class="font-mono text-xs text-t-2">{{ detailRecord.id }}</div>
          </div>
          <div class="rounded-md border border-b-2 bg-surf p-3">
            <div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-t-4">Fecha</div>
            <div class="text-[13px] font-semibold text-t-1">{{ detailRecord.date }}</div>
          </div>
          <div class="col-span-2 rounded-md border border-b-2 bg-surf p-3">
            <div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-t-4">Nombre</div>
            <div class="text-[13px] font-semibold text-t-1">{{ detailRecord.name }}</div>
          </div>
          <div class="rounded-md border border-b-2 bg-surf p-3">
            <div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-t-4">Categoría</div>
            <Badge variant="info">{{ detailRecord.category }}</Badge>
          </div>
          <div class="rounded-md border border-b-2 bg-surf p-3">
            <div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-t-4">Estado</div>
            <Badge :variant="statusVariant(detailRecord.status)">{{ detailRecord.status }}</Badge>
          </div>
          <div class="col-span-2 rounded-md border border-b-2 bg-surf p-3">
            <div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-t-4">Valor</div>
            <div class="text-[13px] font-semibold text-t-1">{{ formatCurrency(detailRecord.value) }}</div>
          </div>
        </div>
        <div class="flex items-center justify-end gap-2 border-t border-b-1 p-4 px-5">
          <Button variant="ghost" @click="closeDetail">Cerrar</Button>
          <Button variant="primary" @click="openEditFromDetail">
            <Edit3 class="h-3.5 w-3.5" />
            Editar
          </Button>
        </div>
      </div>
    </div>

    <!-- ─── Edit modal ───────────────────────────────────────────── -->
    <div
      v-if="editRecord"
      class="fixed inset-0 z-[500] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      @click.self="closeEdit"
      @keydown.esc="closeEdit"
    >
      <div class="w-full max-w-md rounded-2xl border border-b-3 bg-card shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
        <div class="flex items-start justify-between p-5 pb-0">
          <div>
            <div class="text-base font-bold text-t-1">Editar Registro</div>
            <div class="mt-1 text-xs text-t-3">{{ editRecord.id }}</div>
          </div>
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-md border border-b-3 text-t-3 transition-colors hover:bg-card-2 hover:text-t-1"
            @click="closeEdit"
          >
            ✕
          </button>
        </div>
        <div class="space-y-3 p-5">
          <div>
            <label class="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-t-3">
              Nombre
            </label>
            <Input v-model="editRecord.name" />
          </div>
          <div>
            <label class="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-t-3">
              Valor
            </label>
            <Input v-model.number="editRecord.value" type="number" />
          </div>
        </div>
        <div class="flex items-center justify-end gap-2 border-t border-b-1 p-4 px-5">
          <Button variant="ghost" @click="closeEdit">Cancelar</Button>
          <Button variant="primary" @click="saveEdit">Guardar cambios</Button>
        </div>
      </div>
    </div>
  </div>
</template>
