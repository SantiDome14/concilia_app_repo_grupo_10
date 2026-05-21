<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Search } from 'lucide-vue-next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { toast } from 'vue-sonner';
import { Input } from '@/components/ui/input';
import { Badge, type BadgeVariants } from '@/components/ui/badge';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { Segmenter, CardsGrid } from '@/components/views';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ReporteCard from '@/components/reportes/ReporteCard.vue';
import ReporteDetailModal from '@/components/reportes/ReporteDetailModal.vue';
import { ManifestActionsMenu } from '@/components/manifest';
import { useManifestModule } from '@/composables/useManifestModule';
import { REPORTES_MANIFEST_KEY } from '@/manifests/framework.template.reportes.actions';
import {
  listReportCategories,
  listReportRuns,
  listReports,
  updateReport,
  type ReportCategoryDef,
} from '@/api/modules/reports';
import { depsStatus } from '@/lib/reportes/depsStatus';
import type {
  Periodicity,
  Report,
  ReportRun,
  ReportRunStatus,
  ReportDependencyEvent,
} from '@/types/genericos';
import { cn } from '@/lib/cn';

// ════════════════════════════════════════════════════════════════════
// Reportes — Catálogo (templates) + Ejecución (runs)
// ────────────────────────────────────────────────────────────────────
// Reportes uses the Module Type B Tabs pattern: the page header carries
// the title only, and a `<Segmenter>` placed below the header (above the
// KPIs) exposes two functional sub-tabs — Catálogo and Ejecución — over
// two independent data models (Report templates vs ReportRun executions).
// Each sub-tab has its own KPI strip, its own filters, and its own body.
//
// Cross-app coordination: Generar dispatches REPORT_DEPENDENCY events
// for blocked deps. Destination apps subscribe and create a Tarea in
// their Centro de Solicitudes (NOT an Alerta) — REPORT_DEPENDENCY is
// human-intervention work to unblock generation.
// ════════════════════════════════════════════════════════════════════

const reportesMod = useManifestModule(REPORTES_MANIFEST_KEY);

// ─── State ───────────────────────────────────────────────────────────
type Tab = 'catalogo' | 'ejecucion';
const tab = ref<Tab>('catalogo');
const search = ref('');
const filterCategory = ref<string>('');
const filterPeriodicity = ref<Periodicity | ''>('');
const filterTrigger = ref<'manual' | 'cron' | ''>('');
const filterStatus = ref<ReportRunStatus | ''>('');
const execPage = ref(1);
const execPageSize = ref(10);

// reka-ui forbids `<SelectItem value="">` — use a sentinel for "All" and
// translate to/from the empty-string filter storage via these wrappers.
const ALL = '__all__';
const filterCategoryModel = computed<string>({
  get: () => filterCategory.value || ALL,
  set: (v) => {
    filterCategory.value = v === ALL ? '' : v;
  },
});
const filterPeriodicityModel = computed<string>({
  get: () => filterPeriodicity.value || ALL,
  set: (v) => {
    filterPeriodicity.value = v === ALL ? '' : (v as Periodicity);
  },
});
const filterTriggerModel = computed<string>({
  get: () => filterTrigger.value || ALL,
  set: (v) => {
    filterTrigger.value = v === ALL ? '' : (v as 'manual' | 'cron');
  },
});
const filterStatusModel = computed<string>({
  get: () => filterStatus.value || ALL,
  set: (v) => {
    filterStatus.value = v === ALL ? '' : (v as ReportRunStatus);
  },
});

// ─── Data — vue-query is the source of truth ─────────────────────────
const REPORTS_KEY = ['reports'] as const;
const RUNS_KEY = ['reportRuns'] as const;
const queryClient = useQueryClient();

const reportsQuery = useQuery({ queryKey: REPORTS_KEY, queryFn: listReports });
const runsQuery = useQuery({ queryKey: RUNS_KEY, queryFn: listReportRuns });
const categoriesQuery = useQuery({
  queryKey: ['reportCategories'],
  queryFn: listReportCategories,
});

const reports = computed<Report[]>(() => reportsQuery.data.value ?? []);
const runs = computed<ReportRun[]>(() => runsQuery.data.value ?? []);
const reportCategories = computed<ReportCategoryDef[]>(
  () => categoriesQuery.data.value ?? [],
);
const reportCategoryByKey = computed<Record<string, ReportCategoryDef>>(() =>
  Object.fromEntries(reportCategories.value.map((c) => [c.key, c])),
);

const updateMutation = useMutation({
  mutationFn: (vars: { id: string; patch: Partial<Report> }) => {
    const current = reports.value.find((r) => r.id === vars.id);
    const merged = { ...(current ?? {}), ...vars.patch } as Report;
    return updateReport(vars.id, merged);
  },
  onMutate: async ({ id, patch }) => {
    await queryClient.cancelQueries({ queryKey: REPORTS_KEY });
    const snapshot = queryClient.getQueryData<Report[]>(REPORTS_KEY);
    queryClient.setQueryData<Report[]>(REPORTS_KEY, (old) =>
      (old ?? []).map((r) => (r.id === id ? ({ ...r, ...patch } as Report) : r)),
    );
    return { snapshot };
  },
  onError: (_err, _vars, ctx) => {
    if (ctx?.snapshot) queryClient.setQueryData(REPORTS_KEY, ctx.snapshot);
    toast.error('No se pudo guardar el cambio. Se revirtió y resincronizó.');
  },
  onSettled: () => {
    void queryClient.invalidateQueries({ queryKey: REPORTS_KEY });
  },
});

// ─── Detail modal ────────────────────────────────────────────────────
const detailOpen = ref(false);
const detailReport = ref<Report | null>(null);

function openDetail(r: Report): void {
  detailReport.value = r;
  detailOpen.value = true;
}

// ─── Catálogo filtering ──────────────────────────────────────────────
const PERIODICITIES: Periodicity[] = [
  'Semanal',
  'Mensual',
  'Trimestral',
  'Semestral',
  'Anual',
  'Ad-hoc',
  'On-demand',
];

const filteredCatalog = computed<Report[]>(() => {
  const term = search.value.trim().toLowerCase();
  return reports.value.filter((r) => {
    if (filterCategory.value && r.category !== filterCategory.value) return false;
    if (filterPeriodicity.value && r.periodicity !== filterPeriodicity.value) return false;
    if (term) {
      const hay = `${r.id} ${r.name} ${r.description ?? ''}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });
});

// ─── Ejecución filtering + pagination ────────────────────────────────
const filteredExecutions = computed<ReportRun[]>(() => {
  const term = search.value.trim().toLowerCase();
  return runs.value
    .filter((run) => {
      if (filterTrigger.value && run.trigger.type !== filterTrigger.value)
        return false;
      if (filterStatus.value && run.status !== filterStatus.value) return false;
      if (term) {
        const rep = reports.value.find((r) => r.id === run.report_id);
        const hay = `${run.id} ${rep?.name ?? ''} ${run.requested_by_name}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    })
    .slice()
    .sort((a, b) => b.requested_at.localeCompare(a.requested_at));
});

const execTotalPages = computed(() =>
  Math.max(1, Math.ceil(filteredExecutions.value.length / execPageSize.value)),
);

const pagedExecutions = computed<ReportRun[]>(() => {
  const start = (execPage.value - 1) * execPageSize.value;
  return filteredExecutions.value.slice(start, start + execPageSize.value);
});

// ─── KPIs ────────────────────────────────────────────────────────────
const today = ref(Date.now());

const MS_PER_DAY = 1000 * 60 * 60 * 24;
function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const parts = iso.split('-').map(Number);
  const target = new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1).getTime();
  const ref = new Date(today.value);
  const t = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime();
  return Math.round((target - t) / MS_PER_DAY);
}

function isCurrentMonth(iso: string): boolean {
  const ref = new Date(today.value);
  const yyyy = ref.getFullYear();
  const mm = String(ref.getMonth() + 1).padStart(2, '0');
  return iso.startsWith(`${yyyy}-${mm}`);
}

const catalogKpis = computed(() => {
  const active = reports.value.filter((r) => !r.locked);
  let prox = 0;
  let depPend = 0;
  for (const r of active) {
    if (r.next) {
      const d = daysUntil(r.next);
      if (d !== null && d <= 7 && d >= 0) prox++;
    }
    const s = depsStatus(r, today.value);
    if (s && !s.ready) depPend++;
  }
  const emit = runs.value.filter(
    (h) => isCurrentMonth(h.requested_at.slice(0, 10)) && h.status === 'completed',
  ).length;
  return {
    total: active.length,
    proximos: prox,
    conDeps: depPend,
    emitidosMes: emit,
  };
});

const executionKpis = computed(() => ({
  total: runs.value.length,
  manualesMes: runs.value.filter(
    (r) => r.trigger.type === 'manual' && isCurrentMonth(r.requested_at.slice(0, 10)),
  ).length,
  autoMes: runs.value.filter(
    (r) => r.trigger.type === 'cron' && isCurrentMonth(r.requested_at.slice(0, 10)),
  ).length,
  conError: runs.value.filter((r) => r.status === 'failed').length,
}));

const TAB_OPTIONS = computed(() => [
  {
    value: 'catalogo' as const,
    label: 'Catálogo',
    count: reports.value.filter((r) => !r.locked).length,
  },
  {
    value: 'ejecucion' as const,
    label: 'Ejecución',
    count: runs.value.length,
  },
]);

// ─── Helpers ─────────────────────────────────────────────────────────
function statusVariant(status: ReportRunStatus): BadgeVariants['variant'] {
  if (status === 'completed') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'running') return 'info';
  return 'warning';
}

function statusLabel(status: ReportRunStatus): string {
  if (status === 'completed') return 'Éxito';
  if (status === 'failed') return 'Error';
  if (status === 'running') return 'En curso';
  return 'Solicitada';
}

function triggerLabel(t: ReportRun['trigger']): string {
  if (t.type === 'cron') return 'CRON';
  if (t.type === 'system') return 'Sistema';
  return 'Manual';
}

function reportName(reportId: string): string {
  return reports.value.find((r) => r.id === reportId)?.name ?? reportId;
}

function reportCategory(reportId: string): string {
  const r = reports.value.find((x) => x.id === reportId);
  if (!r) return '';
  return reportCategoryByKey.value[r.category]?.label ?? r.category;
}

function unfulfilled(r: Report) {
  return (r.dependencies ?? []).filter((d) => !d.completed);
}

// ─── Manifest wiring ─────────────────────────────────────────────────
onMounted(() => {
  reportesMod.registerRecordResolver((ref) => {
    if (typeof ref === 'string') {
      const r = reports.value.find((x) => x.id === ref);
      if (r) return r as unknown as Record<string, unknown>;
      const run = runs.value.find((x) => x.id === ref);
      return run as Record<string, unknown> | undefined;
    }
    if (ref && typeof ref === 'object' && typeof ref.id === 'string') {
      const r = reports.value.find((x) => x.id === ref.id);
      if (r) return r as unknown as Record<string, unknown>;
      const run = runs.value.find((x) => x.id === ref.id);
      return run as Record<string, unknown> | undefined;
    }
    return undefined;
  });
  reportesMod.registerDispatcher({
    update: (recordId, patch) => {
      updateMutation.mutate({
        id: recordId,
        patch: patch as Partial<Report>,
      });
    },
    create: () => {
      // Reportes manifest doesn't declare CTAs that create records.
    },
  });
});

// ─── Card actions ────────────────────────────────────────────────────
function generar(r: Report): void {
  // Block + emit REPORT_DEPENDENCY for any unfulfilled deps within their
  // SLA window (depsStatus.blocked). The destination app subscribes and
  // creates a Tarea in its Centro de Solicitudes (with auto_archive on
  // dependency completion) — not an Alerta.
  const status = depsStatus(r, today.value);
  if (status && !status.ready) {
    for (const dep of unfulfilled(r)) {
      const event: ReportDependencyEvent = {
        report_id: r.id,
        app: dep.app,
        module: dep.module,
        task: dep.task,
        sla_days_before: dep.sla_days_before,
        emitted_at: Date.now(),
      };
      window.dispatchEvent(
        new CustomEvent('REPORT_DEPENDENCY', { detail: event }),
      );
    }
    if (status.blocked) return;
  }
  reportesMod.openDialog(
    'reportes.generar_report',
    r as unknown as Record<string, unknown>,
  );
}

function editar(r: Report): void {
  // Stub: no `editar` action defined yet — placeholder dialog wiring
  // for future manifest extension. Open detail for now.
  openDetail(r);
}

function configurarCron(r: Report): void {
  reportesMod.openDialog(
    'reportes.configurar_cron',
    r as unknown as Record<string, unknown>,
  );
}

// Reports per category (after filter)
function reportsForCategory(catKey: string): Report[] {
  return filteredCatalog.value.filter((r) => r.category === catKey);
}
</script>

<template>
  <div class="flex flex-col gap-5" data-testid="reportes-page">
    <!-- Header (title only — Main CTA absent for this module) -->
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-[22px] font-extrabold tracking-tight text-t-1">Reportes</h1>
        <p class="mt-1 text-xs text-t-3">Generación de reportes consolidados</p>
      </div>
    </header>

    <!-- Functional sub-tabs (Type B Tabs pattern — below the header) -->
    <Segmenter
      v-model="tab"
      :options="TAB_OPTIONS"
      aria-label="Sección"
      data-testid="reportes-tabs"
    />

    <!-- L2 KPIs (Catálogo) -->
    <section
      v-if="tab === 'catalogo'"
      class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      data-testid="reportes-catalog-kpis"
    >
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Total en catálogo</div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">{{ catalogKpis.total }}</div>
        <div class="mt-1.5 text-[11px] text-t-4">reportes activos</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Próximos a emitir</div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-warning">{{ catalogKpis.proximos }}</div>
        <div class="mt-1.5 text-[11px] text-t-4">en los próximos 7 días</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Con dependencias pendientes</div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-danger">{{ catalogKpis.conDeps }}</div>
        <div class="mt-1.5 text-[11px] text-t-4">requieren coordinación</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Emitidos este mes</div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-success">{{ catalogKpis.emitidosMes }}</div>
        <div class="mt-1.5 text-[11px] text-t-4">corridas exitosas</div>
      </div>
    </section>

    <!-- L2 KPIs (Ejecución) -->
    <section
      v-else
      class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      data-testid="reportes-ejecucion-kpis"
    >
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Total generaciones</div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">{{ executionKpis.total }}</div>
        <div class="mt-1.5 text-[11px] text-t-4">en el período</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Manuales este mes</div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-info">{{ executionKpis.manualesMes }}</div>
        <div class="mt-1.5 text-[11px] text-t-4">disparadas por usuarios</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Automáticas este mes</div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-success">{{ executionKpis.autoMes }}</div>
        <div class="mt-1.5 text-[11px] text-t-4">disparadas por CRON</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">Con error</div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-danger">{{ executionKpis.conError }}</div>
        <div class="mt-1.5 text-[11px] text-t-4">requieren reintento</div>
      </div>
    </section>

    <!-- L3 Catálogo -->
    <template v-if="tab === 'catalogo'">
      <div class="flex flex-wrap items-center gap-2" data-testid="reportes-catalogo-header">
        <span class="text-sm font-bold text-t-2">Catálogo</span>
        <div class="w-4" />
        <div class="relative">
          <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t-4" />
          <Input
            v-model="search"
            placeholder="Buscar…"
            class="w-[220px] pl-8"
            data-testid="reportes-cat-search"
          />
        </div>
        <div class="flex-1" />
        <Select v-model="filterCategoryModel">
          <SelectTrigger
            class="h-9 w-[170px] text-xs"
            aria-label="Filtrar por categoría"
            data-testid="filter-category"
          >
            <SelectValue placeholder="Categoría · Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="ALL">Categoría · Todas</SelectItem>
            <SelectItem
              v-for="c in reportCategories"
              :key="c.key"
              :value="c.key"
            >
              {{ c.label }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="filterPeriodicityModel">
          <SelectTrigger
            class="h-9 w-[160px] text-xs"
            aria-label="Filtrar por periodicidad"
            data-testid="filter-periodicity"
          >
            <SelectValue placeholder="Periodicidad · Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="ALL">Periodicidad · Todas</SelectItem>
            <SelectItem v-for="p in PERIODICITIES" :key="p" :value="p">
              {{ p }}
            </SelectItem>
          </SelectContent>
        </Select>
        <span
          class="rounded-full bg-card px-2 py-0.5 text-[11px] text-t-3"
          data-testid="reportes-cat-result-count"
        >
          {{ filteredCatalog.length }} resultado{{ filteredCatalog.length !== 1 ? 's' : '' }}
        </span>
      </div>

      <section data-testid="reportes-catalogo-body" class="flex flex-col gap-5">
        <EmptyState
          v-if="filteredCatalog.length === 0"
          title="Sin resultados"
          description="Probá ajustar los filtros o limpiar la búsqueda"
        />
        <template v-else>
          <section
            v-for="cat in reportCategories"
            :key="cat.key"
            class="cat-section flex flex-col gap-2.5"
            :data-testid="`cat-section-${cat.key}`"
          >
            <template v-if="reportsForCategory(cat.key).length > 0">
              <div class="flex items-center gap-2">
                <span class="text-[13px] font-bold text-t-2">{{ cat.label }}</span>
                <span
                  class="rounded-full bg-card px-2 py-0.5 text-[11px] text-t-3"
                  :data-testid="`cat-section-${cat.key}-count`"
                >
                  {{ reportsForCategory(cat.key).length }}
                </span>
              </div>
              <CardsGrid>
                <ReporteCard
                  v-for="r in reportsForCategory(cat.key)"
                  :key="r.id"
                  :report="r"
                  :category="reportCategoryByKey[r.category]"
                  :now="today"
                  @click="openDetail"
                  @editar="editar"
                  @cron="configurarCron"
                  @generar="generar"
                />
              </CardsGrid>
            </template>
          </section>
        </template>
      </section>
    </template>

    <!-- L3 Ejecución -->
    <template v-else>
      <div class="flex flex-wrap items-center gap-2" data-testid="reportes-ejecucion-header">
        <span class="text-sm font-bold text-t-2">Ejecución</span>
        <div class="w-4" />
        <div class="relative">
          <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t-4" />
          <Input
            v-model="search"
            placeholder="Buscar…"
            class="w-[220px] pl-8"
            data-testid="reportes-ejec-search"
          />
        </div>
        <div class="flex-1" />
        <Select v-model="filterTriggerModel">
          <SelectTrigger
            class="h-9 w-[150px] text-xs"
            aria-label="Filtrar por trigger"
            data-testid="filter-trigger"
          >
            <SelectValue placeholder="Trigger · Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="ALL">Trigger · Todos</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="cron">CRON</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="filterStatusModel">
          <SelectTrigger
            class="h-9 w-[150px] text-xs"
            aria-label="Filtrar por estado"
            data-testid="filter-status"
          >
            <SelectValue placeholder="Estado · Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="ALL">Estado · Todos</SelectItem>
            <SelectItem value="completed">Éxito</SelectItem>
            <SelectItem value="failed">Error</SelectItem>
          </SelectContent>
        </Select>
        <span
          class="rounded-full bg-card px-2 py-0.5 text-[11px] text-t-3"
          data-testid="reportes-ejec-result-count"
        >
          {{ filteredExecutions.length }} resultado{{ filteredExecutions.length !== 1 ? 's' : '' }}
        </span>
      </div>

      <section data-testid="reportes-ejecucion-body">
        <EmptyState
          v-if="pagedExecutions.length === 0"
          title="Sin generaciones"
          description="Las corridas aparecerán acá una vez ejecutadas."
        />
        <div
          v-else
          class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2"
        >
          <table class="w-full border-collapse">
            <thead>
              <tr class="border-b border-b-2">
                <th class="px-[18px] py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Fecha generación</th>
                <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Reporte</th>
                <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Categoría</th>
                <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Trigger</th>
                <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Parámetros</th>
                <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Estado</th>
                <th class="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="run in pagedExecutions"
                :key="run.id"
                class="border-b border-b-1 transition-colors last:border-b-0 hover:bg-white/[0.02]"
                :data-testid="`ejecucion-row-${run.id}`"
              >
                <td class="px-[18px] py-2.5 text-xs text-t-2">
                  {{ run.requested_at.slice(0, 16).replace('T', ' ') }}
                </td>
                <td class="px-3.5 py-2.5 text-[13px] font-semibold text-t-2">
                  {{ reportName(run.report_id) }}
                </td>
                <td class="px-3.5 py-2.5 text-xs text-t-3">{{ reportCategory(run.report_id) }}</td>
                <td class="px-3.5 py-2.5">
                  <Badge :variant="run.trigger.type === 'cron' ? 'brand' : 'info'">
                    {{ triggerLabel(run.trigger) }}
                  </Badge>
                </td>
                <td class="px-3.5 py-2.5 text-[11px] text-t-3">{{ run.params ?? '—' }}</td>
                <td class="px-3.5 py-2.5">
                  <Badge :variant="statusVariant(run.status)">{{ statusLabel(run.status) }}</Badge>
                </td>
                <td class="px-3.5 py-2.5 text-right">
                  <div class="flex items-center justify-end">
                    <ManifestActionsMenu
                      :manifest-key="REPORTES_MANIFEST_KEY"
                      :record="run as unknown as Record<string, unknown>"
                      variant="table"
                      :data-testid="`ejecucion-row-${run.id}-actions`"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          v-if="filteredExecutions.length > execPageSize"
          class="mt-3 flex items-center justify-between text-xs text-t-3"
          data-testid="reportes-ejec-pagination"
        >
          <div>
            Page <b class="font-semibold text-t-2">{{ execPage }}</b> of {{ execTotalPages }}
            · {{ filteredExecutions.length }} resultado{{ filteredExecutions.length !== 1 ? 's' : '' }}
          </div>
          <div class="flex items-center gap-1">
            <button
              type="button"
              :class="cn('flex h-7 w-7 items-center justify-center rounded-md border border-b-2 bg-card text-xs font-semibold text-t-3 hover:border-b-3 hover:text-t-1 disabled:cursor-not-allowed disabled:opacity-40')"
              :disabled="execPage === 1"
              @click="execPage = execPage - 1"
            >
              ‹
            </button>
            <button
              type="button"
              :class="cn('flex h-7 w-7 items-center justify-center rounded-md border border-b-2 bg-card text-xs font-semibold text-t-3 hover:border-b-3 hover:text-t-1 disabled:cursor-not-allowed disabled:opacity-40')"
              :disabled="execPage === execTotalPages"
              @click="execPage = execPage + 1"
            >
              ›
            </button>
          </div>
        </div>
      </section>
    </template>

    <!-- Detail modal -->
    <ReporteDetailModal
      :open="detailOpen"
      :report="detailReport"
      :runs="runs"
      :category-by-key="reportCategoryByKey"
      :now="today"
      @update:open="detailOpen = $event"
    />
  </div>
</template>
