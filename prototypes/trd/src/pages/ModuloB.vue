<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import { useQuery } from '@tanstack/vue-query';
import {
  Plus,
  Search,
  ChevronRight,
  Building2,
  Wallet,
  AlertTriangle,
} from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge, type BadgeVariants } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Segmenter } from '@/components/views';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { PAGE_SIZE_OPTIONS } from '@/constants';
import {
  getMovimientosKpis,
  getPosicionKpis,
  getPosicionTree,
  listCola,
  listMonedas,
  listMovimientos,
  listSociedades,
  type MovimientosKpis,
  type PosicionKpis,
} from '@/api/modules/fin';
import type {
  CuentaPos,
  Moneda,
  MovimientoEstado,
  MovimientoLedger,
  MovimientoOrigen,
  RetiroEnCola,
  SociedadPos,
} from '@/types/fin';
import { cn } from '@/lib/cn';

// ════════════════════════════════════════════════════════════════════
// Módulo B — Disponibilidades (Tesorería)
// ────────────────────────────────────────────────────────────────────
// Migrated from prototypes/fin/fin-prototype.html (Tesorería page).
// 3 functional sections (NOT segmentation tabs — these are sub-modules
// within Disponibilidades):
//   · Posición          — KPIs + filters + sociedad/cuenta tree
//   · Movimientos       — KPIs + ledger table + pagination
//   · Cola de Asignación — warning banner + retiros pendientes
//
// Main CTA "Cargar movimiento manual" sits on the title row regardless
// of the active section (per the prototype's header pattern).
// ════════════════════════════════════════════════════════════════════

// ─── Reactive datasets — vue-query against MSW / real backend ────────
const posicionTreeQuery = useQuery({
  queryKey: ['fin', 'posicion', 'tree'],
  queryFn: getPosicionTree,
});
const posicionKpisQuery = useQuery({
  queryKey: ['fin', 'posicion', 'kpis'],
  queryFn: getPosicionKpis,
});
const movimientosQuery = useQuery({
  queryKey: ['fin', 'movimientos'],
  queryFn: listMovimientos,
});
const movimientosKpisQuery = useQuery({
  queryKey: ['fin', 'movimientos', 'kpis'],
  queryFn: getMovimientosKpis,
});
const colaQuery = useQuery({
  queryKey: ['fin', 'cola'],
  queryFn: listCola,
});
const sociedadesCatalogQuery = useQuery({
  queryKey: ['fin', 'sociedades'],
  queryFn: listSociedades,
});
const monedasCatalogQuery = useQuery({
  queryKey: ['fin', 'monedas'],
  queryFn: listMonedas,
});

const sociedades = ref<SociedadPos[]>([]);
const movimientos = ref<MovimientoLedger[]>([]);
const cola = ref<RetiroEnCola[]>([]);

watch(
  () => posicionTreeQuery.data.value,
  (data) => {
    if (data)
      sociedades.value = data.map((s) => ({
        ...s,
        totals: s.totals.map((t) => ({ ...t })),
        cuentas: s.cuentas.map((c) => ({ ...c })),
      }));
  },
  { immediate: true },
);
watch(
  () => movimientosQuery.data.value,
  (data) => {
    if (data) movimientos.value = data.map((m) => ({ ...m }));
  },
  { immediate: true },
);
watch(
  () => colaQuery.data.value,
  (data) => {
    if (data) cola.value = data.map((c) => ({ ...c }));
  },
  { immediate: true },
);

const sociedadesCatalog = computed(() => sociedadesCatalogQuery.data.value ?? []);
const monedasCatalog = computed<Moneda[]>(() => monedasCatalogQuery.data.value ?? []);

const POSICION_KPIS_FALLBACK: PosicionKpis = {
  posicionConsolidada: '—',
  liquidezDisponible: '—',
  comprometido: '—',
  cuentasActivas: 0,
  sociedadesActivas: 0,
};
const MOVIMIENTOS_KPIS_FALLBACK: MovimientosKpis = {
  movimientosHoy: 0,
  volumenIngresado: '—',
  volumenEgresado: '—',
  enCola: 0,
};
const posicionKpis = computed<PosicionKpis>(
  () => posicionKpisQuery.data.value ?? POSICION_KPIS_FALLBACK,
);
const movimientosKpis = computed<MovimientosKpis>(
  () => movimientosKpisQuery.data.value ?? MOVIMIENTOS_KPIS_FALLBACK,
);

// ─── Tab state ──────────────────────────────────────────────────────
type FinTab = 'posicion' | 'movimientos' | 'cola';
const tab = ref<FinTab>('posicion');

const TAB_OPTIONS = computed(() => [
  { value: 'posicion' as const, label: 'Posición' },
  { value: 'movimientos' as const, label: 'Movimientos' },
  { value: 'cola' as const, label: 'Cola de Asignación', count: cola.value.length },
]);

// ════════════════════════════════════════════════════════════════════
// POSICIÓN tab
// ════════════════════════════════════════════════════════════════════
const ALL = '__all__';

const filterSociedad = ref<string>('');
const filterMoneda = ref<string>('');

const filterSociedadModel = computed<string>({
  get: () => filterSociedad.value || ALL,
  set: (v) => {
    filterSociedad.value = v === ALL ? '' : v;
  },
});
const filterMonedaModel = computed<string>({
  get: () => filterMoneda.value || ALL,
  set: (v) => {
    filterMoneda.value = v === ALL ? '' : v;
  },
});

interface FilteredSociedad {
  sociedad: SociedadPos;
  cuentasFiltradas: CuentaPos[];
}

const filteredSociedades = computed<FilteredSociedad[]>(() =>
  sociedades.value
    .filter((s) => !filterSociedad.value || s.id === filterSociedad.value)
    .map((s) => ({
      sociedad: s,
      cuentasFiltradas: filterMoneda.value
        ? s.cuentas.filter((c) => c.moneda === filterMoneda.value)
        : s.cuentas,
    })),
);

function toggleSociedad(id: string): void {
  const s = sociedades.value.find((x) => x.id === id);
  if (s) s.open = !s.open;
}

// ════════════════════════════════════════════════════════════════════
// MOVIMIENTOS tab
// ════════════════════════════════════════════════════════════════════
const movSearch = ref('');
const movFilterTipo = ref<string>('');
const movFilterOrigen = ref<MovimientoOrigen | ''>('');
const movFilterEstado = ref<MovimientoEstado | ''>('');
const movPage = ref(1);
const movPageSize = ref(10);

const movFilterTipoModel = computed<string>({
  get: () => movFilterTipo.value || ALL,
  set: (v) => {
    movFilterTipo.value = v === ALL ? '' : v;
    movPage.value = 1;
  },
});
const movFilterOrigenModel = computed<string>({
  get: () => movFilterOrigen.value || ALL,
  set: (v) => {
    movFilterOrigen.value = v === ALL ? '' : (v as MovimientoOrigen);
    movPage.value = 1;
  },
});
const movFilterEstadoModel = computed<string>({
  get: () => movFilterEstado.value || ALL,
  set: (v) => {
    movFilterEstado.value = v === ALL ? '' : (v as MovimientoEstado);
    movPage.value = 1;
  },
});

const TIPOS_DISTINCT = computed(() =>
  Array.from(new Set(movimientos.value.map((m) => m.tipo))).sort(),
);

const filteredMovs = computed<MovimientoLedger[]>(() => {
  const term = movSearch.value.trim().toLowerCase();
  return movimientos.value.filter((m) => {
    if (movFilterTipo.value && m.tipo !== movFilterTipo.value) return false;
    if (movFilterOrigen.value && m.origen !== movFilterOrigen.value) return false;
    if (movFilterEstado.value && m.estado !== movFilterEstado.value) return false;
    if (term) {
      const hay = `${m.id} ${m.cuenta}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });
});

const movTotalPages = computed(() =>
  Math.max(1, Math.ceil(filteredMovs.value.length / movPageSize.value)),
);

const pagedMovs = computed<MovimientoLedger[]>(() => {
  const safePage = Math.min(movPage.value, movTotalPages.value);
  const start = (safePage - 1) * movPageSize.value;
  return filteredMovs.value.slice(start, start + movPageSize.value);
});

// Clamp the active page when the filter set shrinks (replaces the prior
// in-computed mutation, which violated vue/no-side-effects-in-computed).
watch(movTotalPages, (tp) => {
  if (movPage.value > tp) movPage.value = tp;
});

const movPaginationPages = computed<(number | '…')[]>(() => {
  const tp = movTotalPages.value;
  const current = movPage.value;
  if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  if (current > 3) pages.push('…');
  const start = Math.max(2, current - 1);
  const end = Math.min(tp - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < tp - 2) pages.push('…');
  pages.push(tp);
  return pages;
});

function isInflow(tipo: string): boolean {
  const ins = ['DEPOSIT', 'COLLECTOR_IN', 'TRANSFER_IN', 'SWAP_IN', 'REBATE', 'ADDITION'];
  return ins.includes(tipo);
}

function origenVariant(origen: MovimientoOrigen): BadgeVariants['variant'] {
  if (origen === 'OPS') return 'info';
  if (origen === 'MAN') return 'warning';
  return 'neutral';
}

function estadoVariant(estado: MovimientoEstado): BadgeVariants['variant'] {
  if (estado === 'CONF') return 'success';
  if (estado === 'PEND') return 'warning';
  return 'neutral';
}

const ORIGEN_LABELS: Record<MovimientoOrigen, string> = {
  OPS: 'OPS',
  MAN: 'Manual',
  MANOK: 'Manual ✓',
};

const ESTADO_LABELS: Record<MovimientoEstado, string> = {
  CONF: 'Confirmado',
  COLA: 'En cola',
  PEND: 'Pendiente',
};

// ════════════════════════════════════════════════════════════════════
// COLA tab
// ════════════════════════════════════════════════════════════════════
function tiempoChipVariant(tiempo: string): BadgeVariants['variant'] {
  if (tiempo.includes('hs')) return 'danger';
  if (tiempo.includes('min') && parseInt(tiempo, 10) <= 30) return 'success';
  return 'warning';
}

function asignarCuenta(retiro: RetiroEnCola): void {
  toast.info('Asignar cuenta de origen', {
    description: `${retiro.id} · ${retiro.cliente} — pendiente wireado al manifest`,
  });
}

// ════════════════════════════════════════════════════════════════════
// Page-level CTAs
// ════════════════════════════════════════════════════════════════════
function onCargarManual(): void {
  toast.info('Cargar movimiento manual', {
    description: 'Pendiente wireado al manifest fin.tesoreria.cargar_manual',
  });
}
</script>

<template>
  <div class="flex flex-col gap-5" data-testid="modulo-b-page">
    <!-- L1 · Page header -->
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex flex-col gap-1">
        <h1 class="text-[22px] font-extrabold tracking-tight text-t-1">
          Disponibilidades
        </h1>
        <p class="text-xs text-t-3">
          Gestión de fondos del grupo · ledger event-sourced con posición en tiempo real
        </p>
      </div>
      <Button
        variant="primary"
        size="md"
        data-testid="modulo-b-cta-cargar-manual"
        @click="onCargarManual"
      >
        <Plus class="h-3.5 w-3.5" />
        Cargar movimiento manual
      </Button>
    </header>

    <!-- Functional sub-tabs (NOT a Segmenter for record filtering) -->
    <Segmenter
      v-model="tab"
      :options="TAB_OPTIONS"
      aria-label="Sección"
      data-testid="modulo-b-tabs"
    />

    <!-- ═══════════════════════════════════════════════════════════════
         POSICIÓN
         ═══════════════════════════════════════════════════════════════ -->
    <template v-if="tab === 'posicion'">
      <section
        class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        data-testid="posicion-kpis"
      >
        <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
          <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
            Posición consolidada
          </div>
          <div class="font-mono text-2xl font-extrabold leading-none tracking-tight text-t-1">
            {{ posicionKpis.posicionConsolidada }}
          </div>
          <div class="mt-1.5 text-[11px] text-t-4">equivalente · todas las monedas</div>
        </div>
        <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
          <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
            Liquidez disponible
          </div>
          <div class="font-mono text-2xl font-extrabold leading-none tracking-tight text-success">
            {{ posicionKpis.liquidezDisponible }}
          </div>
          <div class="mt-1.5 text-[11px] text-t-4">no comprometida</div>
        </div>
        <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
          <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
            Comprometido
          </div>
          <div class="font-mono text-2xl font-extrabold leading-none tracking-tight text-warning">
            {{ posicionKpis.comprometido }}
          </div>
          <div class="mt-1.5 text-[11px] text-t-4">en quotes activos / retiros</div>
        </div>
        <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
          <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
            Cuentas activas
          </div>
          <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">
            {{ posicionKpis.cuentasActivas }}
          </div>
          <div class="mt-1.5 text-[11px] text-t-4">
            en {{ posicionKpis.sociedadesActivas }} sociedades
          </div>
        </div>
      </section>

      <div
        class="flex flex-wrap items-center gap-2"
        data-testid="posicion-section-header"
      >
        <span class="text-sm font-bold text-t-2">Posición por sociedad</span>
        <div class="flex-1" />
        <Select v-model="filterSociedadModel">
          <SelectTrigger
            class="h-9 w-[170px] text-xs"
            aria-label="Filtrar por sociedad"
            data-testid="filter-sociedad"
          >
            <SelectValue placeholder="Sociedad · Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="ALL">Sociedad · Todas</SelectItem>
            <SelectItem
              v-for="s in sociedadesCatalog"
              :key="s.value"
              :value="s.value"
            >
              {{ s.label }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="filterMonedaModel">
          <SelectTrigger
            class="h-9 w-[150px] text-xs"
            aria-label="Filtrar por moneda"
            data-testid="filter-moneda"
          >
            <SelectValue placeholder="Moneda · Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="ALL">Moneda · Todas</SelectItem>
            <SelectItem v-for="m in monedasCatalog" :key="m" :value="m">
              {{ m }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- Sociedad tree -->
      <section class="flex flex-col gap-2.5" data-testid="posicion-tree">
        <EmptyState
          v-if="filteredSociedades.length === 0"
          title="Sin resultados"
          description="Probá ajustar los filtros aplicados"
        />
        <div
          v-for="row in filteredSociedades"
          :key="row.sociedad.id"
          :data-testid="`tree-soc-${row.sociedad.id}`"
          :class="
            cn(
              'overflow-hidden rounded-[11px] border border-b-2 bg-card-2 transition-colors',
              row.sociedad.open && 'shadow-[0_0_0_1px_rgba(255,255,255,0.04)]',
            )
          "
        >
          <button
            type="button"
            class="flex w-full items-center gap-3 px-[18px] py-3.5 text-left transition-colors hover:bg-white/[0.03]"
            :aria-expanded="row.sociedad.open"
            @click="toggleSociedad(row.sociedad.id)"
          >
            <ChevronRight
              :class="
                cn(
                  'h-3.5 w-3.5 shrink-0 text-t-3 transition-transform',
                  row.sociedad.open && 'rotate-90',
                )
              "
            />
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <div class="text-sm font-bold text-t-1">{{ row.sociedad.name }}</div>
              <div class="text-[11px] text-t-4">{{ row.sociedad.sub }}</div>
            </div>
            <div class="flex flex-wrap items-center gap-3.5">
              <div
                v-for="t in row.sociedad.totals"
                :key="t.lbl"
                class="flex flex-col items-end gap-0.5"
              >
                <span class="text-[9px] font-extrabold uppercase tracking-wider text-t-4">
                  {{ t.lbl }}
                </span>
                <span class="font-mono text-[13px] font-bold text-t-1 tabular-nums">
                  {{ t.val }}
                </span>
              </div>
            </div>
          </button>

          <div v-if="row.sociedad.open" class="border-t border-b-1 bg-card">
            <!-- Accounts header -->
            <div
              class="grid items-center gap-3.5 border-b border-b-2 bg-card-2 px-[18px] py-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4"
              style="grid-template-columns: 32px 2fr 1fr 1fr 1fr 1fr"
            >
              <div></div>
              <div>Cuenta</div>
              <div class="text-right">Saldo</div>
              <div class="text-right">DR acum</div>
              <div class="text-right">CR acum</div>
              <div class="text-right">Posición neta</div>
            </div>

            <div
              v-if="row.cuentasFiltradas.length === 0"
              class="px-[18px] py-6 text-center text-[12px] text-t-4"
            >
              Sin cuentas para los filtros aplicados
            </div>
            <div
              v-for="cuenta in row.cuentasFiltradas"
              :key="`${row.sociedad.id}-${cuenta.name}`"
              class="grid items-center gap-3.5 border-b border-b-1 px-[18px] py-2.5 text-xs last:border-b-0"
              style="grid-template-columns: 32px 2fr 1fr 1fr 1fr 1fr"
              :data-testid="`tree-acc-${cuenta.name}`"
            >
              <div
                class="flex h-7 w-7 items-center justify-center rounded-md border border-b-2 bg-card text-t-3"
              >
                <component
                  :is="cuenta.icon === 'wallet' ? Wallet : Building2"
                  class="h-3.5 w-3.5"
                />
              </div>
              <div class="flex min-w-0 flex-col gap-0.5">
                <span class="text-[13px] font-semibold text-t-1">{{ cuenta.name }}</span>
                <span class="font-mono text-[10px] text-t-4">{{ cuenta.det }}</span>
              </div>
              <div class="text-right font-mono font-bold text-t-1 tabular-nums">
                {{ cuenta.saldo }}
                <span class="text-[10px] font-normal text-t-4">{{ cuenta.moneda }}</span>
              </div>
              <div class="text-right font-mono text-t-4 tabular-nums">{{ cuenta.dr }}</div>
              <div class="text-right font-mono text-t-4 tabular-nums">{{ cuenta.cr }}</div>
              <div class="text-right font-mono font-bold text-t-1 tabular-nums">
                {{ cuenta.neta }}
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>

    <!-- ═══════════════════════════════════════════════════════════════
         MOVIMIENTOS
         ═══════════════════════════════════════════════════════════════ -->
    <template v-else-if="tab === 'movimientos'">
      <section
        class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        data-testid="movimientos-kpis"
      >
        <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
          <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
            Movimientos hoy
          </div>
          <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">
            {{ movimientosKpis.movimientosHoy }}
          </div>
          <div class="mt-1.5 text-[11px] text-t-4">ingresados al ledger</div>
        </div>
        <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
          <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
            Volumen ingresado
          </div>
          <div class="font-mono text-2xl font-extrabold leading-none tracking-tight text-success">
            {{ movimientosKpis.volumenIngresado }}
          </div>
          <div class="mt-1.5 text-[11px] text-t-4">DEPOSIT + COLLECTOR_IN + ADDITION</div>
        </div>
        <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
          <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
            Volumen egresado
          </div>
          <div class="font-mono text-2xl font-extrabold leading-none tracking-tight text-danger">
            {{ movimientosKpis.volumenEgresado }}
          </div>
          <div class="mt-1.5 text-[11px] text-t-4">WITHDRAWAL + COLLECTOR_OUT</div>
        </div>
        <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
          <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
            En cola
          </div>
          <div class="text-2xl font-extrabold leading-none tracking-tight text-warning">
            {{ movimientosKpis.enCola }}
          </div>
          <div class="mt-1.5 text-[11px] text-t-4">sin asignación</div>
        </div>
      </section>

      <div
        class="flex flex-wrap items-center gap-2"
        data-testid="movimientos-section-header"
      >
        <div class="relative">
          <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t-4" />
          <Input
            v-model="movSearch"
            placeholder="Buscar por cuenta o ID…"
            class="w-[220px] pl-8"
          />
        </div>
        <div class="flex-1" />
        <Select v-model="movFilterTipoModel">
          <SelectTrigger class="h-9 w-[140px] text-xs" aria-label="Filtrar por tipo">
            <SelectValue placeholder="Tipo · Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="ALL">Tipo · Todos</SelectItem>
            <SelectItem v-for="t in TIPOS_DISTINCT" :key="t" :value="t">
              {{ t }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="movFilterOrigenModel">
          <SelectTrigger class="h-9 w-[140px] text-xs" aria-label="Filtrar por origen">
            <SelectValue placeholder="Origen · Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="ALL">Origen · Todos</SelectItem>
            <SelectItem value="OPS">OPS</SelectItem>
            <SelectItem value="MAN">Manual</SelectItem>
            <SelectItem value="MANOK">Manual ✓</SelectItem>
          </SelectContent>
        </Select>
        <Select v-model="movFilterEstadoModel">
          <SelectTrigger class="h-9 w-[140px] text-xs" aria-label="Filtrar por estado">
            <SelectValue placeholder="Estado · Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="ALL">Estado · Todos</SelectItem>
            <SelectItem value="CONF">Confirmado</SelectItem>
            <SelectItem value="COLA">En cola</SelectItem>
            <SelectItem value="PEND">Pendiente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2">
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b border-b-2">
              <th class="px-[18px] py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">ID</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Fecha</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Tipo</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Cuenta</th>
              <th class="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Monto</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Moneda</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Origen</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="pagedMovs.length === 0">
              <td colspan="8" class="p-10 text-center text-[13px] text-t-4">Sin resultados</td>
            </tr>
            <tr
              v-for="m in pagedMovs"
              :key="m.id"
              class="border-b border-b-1 transition-colors last:border-b-0 hover:bg-white/[0.02]"
              :data-testid="`mov-row-${m.id}`"
            >
              <td class="px-[18px] py-2.5 font-mono text-xs text-t-3">{{ m.id }}</td>
              <td class="px-3.5 py-2.5 font-mono text-xs text-t-3">{{ m.fecha }}</td>
              <td class="px-3.5 py-2.5">
                <Badge :variant="isInflow(m.tipo) ? 'success' : 'neutral'" class="font-mono">
                  {{ m.tipo }}
                </Badge>
              </td>
              <td class="px-3.5 py-2.5 text-[13px] font-semibold text-t-2">{{ m.cuenta }}</td>
              <td
                :class="
                  cn(
                    'px-3.5 py-2.5 text-right font-mono text-[13px] font-bold tabular-nums',
                    isInflow(m.tipo) ? 'text-success' : 'text-danger',
                  )
                "
              >
                {{ m.monto }}
              </td>
              <td class="px-3.5 py-2.5 text-xs text-t-3">{{ m.moneda }}</td>
              <td class="px-3.5 py-2.5">
                <Badge :variant="origenVariant(m.origen)">{{ ORIGEN_LABELS[m.origen] }}</Badge>
              </td>
              <td class="px-3.5 py-2.5">
                <Badge :variant="estadoVariant(m.estado)">{{ ESTADO_LABELS[m.estado] }}</Badge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="mt-1 flex items-center justify-between">
        <div class="text-xs text-t-3">
          Page <b class="font-semibold text-t-2">{{ movPage }}</b> of {{ movTotalPages }} · {{ filteredMovs.length }}
          resultado{{ filteredMovs.length !== 1 ? 's' : '' }}
        </div>
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1.5 text-xs text-t-3">
            Show:
            <select
              :value="movPageSize"
              class="rounded-md border border-b-2 bg-card px-2 py-1 text-xs text-t-2 outline-none"
              @change="(e) => { movPageSize = Number((e.target as HTMLSelectElement).value); movPage = 1; }"
            >
              <option v-for="opt in PAGE_SIZE_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </div>
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="flex h-7 w-7 items-center justify-center rounded-md border border-b-2 bg-card text-xs font-semibold text-t-3 transition-colors hover:border-b-3 hover:text-t-1 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="movPage === 1"
              @click="movPage = movPage - 1"
            >
              ‹
            </button>
            <template v-for="(p, i) in movPaginationPages" :key="i">
              <button
                v-if="p === '…'"
                type="button"
                class="h-7 w-auto cursor-default px-2 text-xs text-t-4"
                disabled
              >
                …
              </button>
              <button
                v-else
                type="button"
                :class="
                  cn(
                    'flex h-7 w-7 items-center justify-center rounded-md border text-xs font-semibold transition-colors',
                    p === movPage
                      ? 'border-info bg-info-bg text-info'
                      : 'border-b-2 bg-card text-t-3 hover:border-b-3 hover:text-t-1',
                  )
                "
                @click="movPage = p as number"
              >
                {{ p }}
              </button>
            </template>
            <button
              type="button"
              class="flex h-7 w-7 items-center justify-center rounded-md border border-b-2 bg-card text-xs font-semibold text-t-3 transition-colors hover:border-b-3 hover:text-t-1 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="movPage === movTotalPages"
              @click="movPage = movPage + 1"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- ═══════════════════════════════════════════════════════════════
         COLA DE ASIGNACIÓN
         ═══════════════════════════════════════════════════════════════ -->
    <template v-else>
      <div
        class="flex items-start gap-3 rounded-md border border-warning/40 bg-warning/[0.05] px-4 py-3"
        data-testid="cola-warning"
      >
        <AlertTriangle class="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <p class="text-[13px] text-t-2">
          Estos retiros fueron solicitados sin cuenta de Ardua asignada. Hasta que un
          operador asigne la cuenta de origen, el movimiento no impacta la posición.
        </p>
      </div>

      <div class="flex items-center gap-2" data-testid="cola-section-header">
        <span class="text-sm font-bold text-t-2">Retiros pendientes de asignación</span>
        <span class="rounded-full bg-card px-2 py-0.5 text-[11px] text-t-3">
          {{ cola.length }}
        </span>
      </div>

      <div class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2">
        <table class="w-full border-collapse">
          <thead>
            <tr class="border-b border-b-2">
              <th class="px-[18px] py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">ID Mov.</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Fecha solicitud</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Cliente</th>
              <th class="px-3.5 py-2.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Monto</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Moneda</th>
              <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Tiempo en cola</th>
              <th class="px-3.5 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-t-3">Acción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="cola.length === 0">
              <td colspan="7" class="p-10 text-center text-[13px] text-t-4">
                Sin retiros pendientes — la cola está vacía.
              </td>
            </tr>
            <tr
              v-for="r in cola"
              :key="r.id"
              class="border-b border-b-1 transition-colors last:border-b-0 hover:bg-white/[0.02]"
              :data-testid="`cola-row-${r.id}`"
            >
              <td class="px-[18px] py-2.5 font-mono text-xs text-t-3">{{ r.id }}</td>
              <td class="px-3.5 py-2.5 font-mono text-xs text-t-3">{{ r.fecha }}</td>
              <td class="px-3.5 py-2.5 text-[13px] font-semibold text-t-2">{{ r.cliente }}</td>
              <td class="px-3.5 py-2.5 text-right font-mono text-[13px] font-bold text-t-1 tabular-nums">
                {{ r.monto }}
              </td>
              <td class="px-3.5 py-2.5 text-xs text-t-3">{{ r.moneda }}</td>
              <td class="px-3.5 py-2.5">
                <Badge :variant="tiempoChipVariant(r.tiempo)">{{ r.tiempo }}</Badge>
              </td>
              <td class="px-3.5 py-2.5 text-center">
                <Button
                  variant="primary"
                  size="sm"
                  :data-testid="`cola-row-${r.id}-asignar`"
                  @click="asignarCuenta(r)"
                >
                  Asignar cuenta
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
