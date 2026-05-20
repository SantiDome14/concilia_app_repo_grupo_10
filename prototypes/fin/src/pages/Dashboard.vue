<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  AlertTriangle,
  BellRing,
  Calendar,
  Check,
  Clock,
  Download,
  FileText,
  Plus,
  TrendingUp,
} from 'lucide-vue-next';
import { Badge, type BadgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart } from '@/components/data-display';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ROUTE_PATHS } from '@/config/routes';
import { ALERTS } from '@/mocks/genericos/alertas';
import { INBOX_SOLICITUDES } from '@/mocks/genericos/inbox';
import { REPORTS_CATALOG } from '@/mocks/genericos/reportes';
import { POSICION_TREE } from '@/mocks/fin/disponibilidades';
import { DASHBOARD_ACTIVITY } from '@/mocks/fin/dashboard-activity';
import { slicePosicionTrend, type PosicionTrendPoint } from '@/mocks/fin/posicion-trend';
import type { Alerta, AlertaState, Severity } from '@/types/genericos';
import { cn } from '@/lib/cn';

// ════════════════════════════════════════════════════════════════════
// Dashboard — vista consolidada FIN
// ────────────────────────────────────────────────────────────────────
// Replicates the legacy `prototypes/fin-old/fin-prototype.html` layout:
//   · L1 header: title + period chip + "Exportar resumen" CTA
//   · L2 KPIs: 4 FIN-specific tiles
//   · Row A: "Posición por sociedad" (2/3) + "Alertas activas" (1/3)
//   · Row B: "Próximos vencimientos · Reportes" (2/3) + "Actividad reciente" (1/3)
// Data is derived from existing FIN mocks where possible; the rest is
// surfaced via small dashboard-specific seed files.
// ════════════════════════════════════════════════════════════════════

const router = useRouter();

const NOW = Date.now();
const MS_DAY = 86_400_000;

// ─── L2 · KPIs (4 canonical tiles per `core-modulo-genericos`) ───────
// Standard 3 (cross-cutting): Alertas activas · Inbox pendientes ·
// Reportes próx. a vencer. FIN-specific 4th: Posición consolidada.

const ACTIVE_ALERT_STATES: AlertaState[] = ['new', 'in_review'];

const alertasActivasCount = computed(
  () => ALERTS.filter((a) => ACTIVE_ALERT_STATES.includes(a.state)).length,
);

const inboxPendientesCount = computed(
  () =>
    INBOX_SOLICITUDES.filter(
      (s) => s.state === 'pendiente' || s.state === 'en_proceso',
    ).length,
);

const reportesProxVencer = computed(() => {
  let n = 0;
  for (const r of REPORTS_CATALOG) {
    if (!r.next) continue;
    const d = daysUntilDate(r.next);
    if (d !== null && d >= 0 && d <= 7) n++;
  }
  return n;
});

const reportesVencidos = computed(() => {
  let n = 0;
  for (const r of REPORTS_CATALOG) {
    if (!r.next) continue;
    const d = daysUntilDate(r.next);
    if (d !== null && d < 0) n++;
  }
  return n;
});

/**
 * Placeholder USD-eq value for the Posición consolidada KPI. V1 does NOT
 * apply cross-currency conversions; this requires the Tipos de Cambio
 * (FX rates) catalog which is a follow-up change. Until then we surface
 * the static seed from the trend series' last point.
 */
const posicionConsolidadaUsdM = computed<number>(() => {
  const trend = slicePosicionTrend('today');
  return trend.length > 0 ? (trend[trend.length - 1]?.value ?? 28.4) : 28.4;
});

// ─── Trend de Posición consolidada (USD-eq) ──────────────────────────
// Driven by the L1 period selector. The chart accepts only periods that
// map to a date range; on the 'today' selector we still show last 7d as
// fallback so the line stays visible.
const posicionTrend = computed<PosicionTrendPoint[]>(() => {
  const p = period.value === 'today' ? '7' : (period.value as '7' | '30' | '90');
  return slicePosicionTrend(p);
});

const trendDelta = computed<{ pct: number; positive: boolean } | null>(() => {
  const series = posicionTrend.value;
  if (series.length < 2) return null;
  const first = series[0]?.value;
  const last = series[series.length - 1]?.value;
  if (first === undefined || last === undefined || first === 0) return null;
  const pct = ((last - first) / first) * 100;
  return { pct, positive: pct >= 0 };
});

const sociedadCount = computed(() => POSICION_TREE.length);

// ─── Alertas activas widget ──────────────────────────────────────────
const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const alertasActivas = computed<Alerta[]>(() =>
  ALERTS.filter((a) => ACTIVE_ALERT_STATES.includes(a.state))
    .slice()
    .sort((a, b) => {
      const sa = SEVERITY_RANK[a.severity ?? 'low'];
      const sb = SEVERITY_RANK[b.severity ?? 'low'];
      if (sa !== sb) return sa - sb;
      return Date.parse(b.detected_at) - Date.parse(a.detected_at);
    })
    .slice(0, 4),
);

const ALERT_STATE_LABELS: Record<string, string> = {
  new: 'Nueva',
  in_review: 'En revisión',
  resolved: 'Resuelta',
  dismissed: 'Descartada',
};

function alertStateVariant(state: AlertaState): BadgeVariants['variant'] {
  if (state === 'in_review') return 'warning';
  if (state === 'new') return 'info';
  return 'neutral';
}

function severityDotClass(severity?: Severity): string {
  if (severity === 'critical') return 'text-danger';
  if (severity === 'high') return 'text-warning';
  if (severity === 'medium') return 'text-info';
  return 'text-t-4';
}

function timeAgo(iso: string): string {
  const diff = NOW - Date.parse(iso);
  if (Number.isNaN(diff) || diff < 0) return '';
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return 'recién';
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
}

// ─── Próximos vencimientos · Reportes ────────────────────────────────
function daysUntilDate(iso: string): number | null {
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3) return null;
  const target = new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1).getTime();
  const ref = new Date(NOW);
  const t = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime();
  return Math.round((target - t) / MS_DAY);
}

function fmtDateIso(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

interface UpcomingReport {
  id: string;
  name: string;
  categoryKey: string;
  iso: string;
  days: number;
}

const proximosVencimientos = computed<UpcomingReport[]>(() => {
  const items: UpcomingReport[] = [];
  for (const r of REPORTS_CATALOG) {
    if (!r.next) continue;
    const d = daysUntilDate(r.next);
    if (d === null) continue;
    items.push({
      id: r.id,
      name: r.name,
      categoryKey: r.category,
      iso: r.next,
      days: d,
    });
  }
  return items.sort((a, b) => a.days - b.days).slice(0, 5);
});

const CATEGORY_LABEL: Record<string, string> = {
  INTERNO: 'INTERNO',
  OPERATIVO: 'OPERATIVO',
};

const CATEGORY_VARIANT: Record<string, BadgeVariants['variant']> = {
  INTERNO: 'info',
  OPERATIVO: 'success',
};

function dueChipVariant(days: number): BadgeVariants['variant'] {
  if (days < 0) return 'danger';
  if (days <= 7) return 'danger';
  if (days <= 30) return 'warning';
  return 'success';
}

function dueChipLabel(item: UpcomingReport): string {
  if (item.days < 0) return 'Vencido';
  if (item.days === 0) return 'Hoy';
  if (item.days === 1) return '1 día';
  return `${item.days} días`;
}

// ─── Actividad reciente — kind icon mapping ──────────────────────────
const ACTIVITY_ICON_BG: Record<'success' | 'info' | 'warning', string> = {
  success: 'bg-success/15 text-success',
  info: 'bg-info/15 text-info',
  warning: 'bg-warning/15 text-warning',
};

const ACTIVITY_ICON: Record<'success' | 'info' | 'warning', typeof Check> = {
  success: Check,
  info: FileText,
  warning: Clock,
};

// ─── L1 · Period selector + Export CTA ───────────────────────────────
const period = ref<string>('30');
const PERIOD_OPTIONS = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
  { value: 'today', label: 'Hoy · 24 abr 2026' },
];

function exportSummary(): void {
  // Real export would target a backend endpoint per `core-api-layer`.
  // For the prototype, the toast suffices.
}

function navigateTo(href: string): void {
  void router.push(href);
}

function onCardKeydown(event: KeyboardEvent, href: string): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    navigateTo(href);
  }
}
</script>

<template>
  <div class="flex flex-col gap-5" data-testid="dashboard-page">
    <!-- L1 · Header -->
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex flex-col gap-1">
        <h1 class="text-[22px] font-extrabold tracking-tight text-t-1">Dashboard</h1>
        <p class="text-xs text-t-3">
          Vista consolidada de la salud financiera y contable del grupo
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Select v-model="period">
          <SelectTrigger
            class="h-9 w-[180px] text-xs"
            aria-label="Rango temporal"
            data-testid="dashboard-period"
          >
            <Calendar class="mr-1.5 h-3.5 w-3.5 text-t-3" />
            <SelectValue placeholder="Últimos 30 días" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="p in PERIOD_OPTIONS" :key="p.value" :value="p.value">
              {{ p.label }}
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="primary"
          data-testid="dashboard-export"
          @click="exportSummary"
        >
          <Download class="mr-1.5 h-3.5 w-3.5" />
          Exportar resumen
        </Button>
      </div>
    </header>

    <!-- L2 · KPIs · canonical 4 tiles per core-modulo-genericos
         (Alertas activas / Inbox pendientes / Reportes próx. a vencer)
         + FIN-specific Posición consolidada. -->
    <section
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      data-testid="dashboard-kpis"
    >
      <div
        role="button"
        tabindex="0"
        data-testid="kpi-alertas-activas"
        class="flex cursor-pointer flex-col gap-1.5 rounded-xl border border-b-2 bg-card-2 p-5 hover:border-b-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        @click="navigateTo(ROUTE_PATHS.ALERTAS)"
        @keydown="onCardKeydown($event, ROUTE_PATHS.ALERTAS)"
      >
        <span class="text-[10px] font-bold uppercase tracking-wider text-t-4">
          Alertas activas
        </span>
        <div
          class="text-2xl font-extrabold leading-none tracking-tight text-danger"
          data-testid="kpi-alertas-activas-value"
        >
          {{ alertasActivasCount }}
        </div>
        <div class="text-[11px] text-t-4">Nuevas y en revisión</div>
      </div>

      <div
        role="button"
        tabindex="0"
        data-testid="kpi-inbox-pendientes"
        class="flex cursor-pointer flex-col gap-1.5 rounded-xl border border-b-2 bg-card-2 p-5 hover:border-b-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        @click="navigateTo(ROUTE_PATHS.INBOX)"
        @keydown="onCardKeydown($event, ROUTE_PATHS.INBOX)"
      >
        <span class="text-[10px] font-bold uppercase tracking-wider text-t-4">
          Inbox pendientes
        </span>
        <div
          class="text-2xl font-extrabold leading-none tracking-tight text-warning"
          data-testid="kpi-inbox-pendientes-value"
        >
          {{ inboxPendientesCount }}
        </div>
        <div class="text-[11px] text-t-4">Solicitudes pendientes o en proceso</div>
      </div>

      <div
        role="button"
        tabindex="0"
        data-testid="kpi-reportes-prox-vencer"
        class="flex cursor-pointer flex-col gap-1.5 rounded-xl border border-b-2 bg-card-2 p-5 hover:border-b-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        @click="navigateTo(ROUTE_PATHS.REPORTES)"
        @keydown="onCardKeydown($event, ROUTE_PATHS.REPORTES)"
      >
        <span class="text-[10px] font-bold uppercase tracking-wider text-t-4">
          Reportes próx. a vencer
        </span>
        <div
          class="text-2xl font-extrabold leading-none tracking-tight text-info"
          data-testid="kpi-reportes-prox-vencer-value"
        >
          {{ reportesProxVencer }}
        </div>
        <div class="text-[11px] text-t-4">
          {{ reportesVencidos }} vencido<span v-if="reportesVencidos !== 1">s</span>
        </div>
      </div>

      <div
        class="flex flex-col gap-1.5 rounded-xl border border-b-2 bg-card-2 p-5"
        data-testid="kpi-posicion-consolidada"
      >
        <span class="text-[10px] font-bold uppercase tracking-wider text-t-4">
          Posición consolidada
        </span>
        <div
          class="font-mono text-2xl font-extrabold leading-none tracking-tight text-t-1"
          data-testid="kpi-posicion-consolidada-value"
        >
          USD {{ posicionConsolidadaUsdM.toFixed(1) }}M
        </div>
        <div class="text-[11px] text-t-4">
          equivalente · {{ sociedadCount }} sociedades · FX pendiente
        </div>
      </div>
    </section>

    <!-- Row A · Tendencia Posición consolidada (2/3) + Alertas activas (1/3) -->
    <section class="grid grid-cols-1 gap-4 lg:grid-cols-3" data-testid="dashboard-row-a">
      <!-- Tendencia Posición consolidada -->
      <div
        class="flex flex-col gap-3 rounded-xl border border-b-2 bg-card-2 p-5 lg:col-span-2"
        data-testid="dashboard-posicion-trend"
      >
        <div class="flex items-center justify-between">
          <div class="flex flex-col gap-0.5">
            <div class="flex items-center gap-2">
              <TrendingUp class="h-4 w-4 text-brand" />
              <h2 class="text-sm font-bold text-t-1">Posición consolidada</h2>
              <Badge
                v-if="trendDelta"
                :variant="trendDelta.positive ? 'success' : 'danger'"
                class="font-mono text-[10px]"
              >
                {{ trendDelta.positive ? '+' : '' }}{{ trendDelta.pct.toFixed(1) }}%
              </Badge>
            </div>
            <span class="text-[11px] text-t-4">
              USD-equivalente · serie diaria · FX rates pendientes
            </span>
          </div>
          <button
            type="button"
            class="text-[11px] text-t-3 hover:text-t-1"
            @click="navigateTo(ROUTE_PATHS.DISPONIBILIDADES)"
          >
            Ir a Tesorería →
          </button>
        </div>
        <div class="h-[220px] w-full" data-testid="dashboard-posicion-trend-chart">
          <LineChart
            :data="posicionTrend as unknown as Array<Record<string, unknown>>"
            :x-accessor="(d) => Date.parse((d as unknown as PosicionTrendPoint).date)"
            :y-accessor="(d) => (d as unknown as PosicionTrendPoint).value"
            :colors="['info']"
            title="Posición consolidada USD-equivalente"
            description="Serie diaria de la posición consolidada del grupo, convertida a USD vía Tipos de Cambio (catálogo pendiente)."
            empty-message="Sin datos en el período seleccionado"
          />
        </div>
      </div>

      <!-- Alertas activas -->
      <div
        class="flex flex-col gap-3 rounded-xl border border-b-2 bg-card-2 p-5"
        data-testid="dashboard-alertas-activas"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <BellRing class="h-4 w-4 text-danger" />
            <h2 class="text-sm font-bold text-t-1">Alertas activas</h2>
          </div>
          <button
            type="button"
            class="text-[11px] text-t-3 hover:text-t-1"
            @click="navigateTo(ROUTE_PATHS.ALERTAS)"
          >
            Ver todas →
          </button>
        </div>
        <div v-if="alertasActivas.length === 0" class="py-6 text-center text-[12px] text-t-4">
          Sin alertas activas
        </div>
        <ul v-else class="flex flex-col divide-y divide-b-1">
          <li
            v-for="a in alertasActivas"
            :key="a.id"
            :data-testid="`dashboard-alerta-${a.id}`"
            class="flex cursor-pointer items-start gap-3 py-2.5 transition-colors hover:bg-white/[0.02]"
            @click="navigateTo(ROUTE_PATHS.ALERTAS)"
          >
            <AlertTriangle :class="cn('mt-0.5 h-4 w-4 shrink-0', severityDotClass(a.severity))" />
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <div class="truncate text-[13px] font-semibold text-t-1">{{ a.title }}</div>
              <div class="text-[11px] text-t-4">
                {{ a.type }} · {{ timeAgo(a.detected_at) }}
              </div>
            </div>
            <Badge :variant="alertStateVariant(a.state)">
              {{ ALERT_STATE_LABELS[a.state] ?? a.state }}
            </Badge>
          </li>
        </ul>
      </div>
    </section>

    <!-- Row B · Próximos vencimientos (2/3) + Actividad reciente (1/3) -->
    <section class="grid grid-cols-1 gap-4 lg:grid-cols-3" data-testid="dashboard-row-b">
      <!-- Próximos vencimientos -->
      <div
        class="flex flex-col gap-3 rounded-xl border border-b-2 bg-card-2 p-5 lg:col-span-2"
        data-testid="dashboard-proximos-vencimientos"
      >
        <div class="flex items-center justify-between">
          <div class="flex flex-col gap-0.5">
            <div class="flex items-center gap-2">
              <Clock class="h-4 w-4 text-brand" />
              <h2 class="text-sm font-bold text-t-1">Próximos vencimientos · Reportes</h2>
            </div>
            <span class="text-[11px] text-t-4">Reportes con emisión próxima o vencida</span>
          </div>
          <button
            type="button"
            class="text-[11px] text-t-3 hover:text-t-1"
            @click="navigateTo(ROUTE_PATHS.REPORTES)"
          >
            Ver catálogo →
          </button>
        </div>
        <div
          v-if="proximosVencimientos.length === 0"
          class="py-6 text-center text-[12px] text-t-4"
        >
          Sin reportes próximos a emitirse
        </div>
        <table v-else class="w-full border-collapse">
          <thead>
            <tr class="border-b border-b-1">
              <th class="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">
                Reporte
              </th>
              <th class="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">
                Categoría
              </th>
              <th class="px-2 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">
                Próx. emisión
              </th>
              <th class="px-2 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">
                Estado
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in proximosVencimientos"
              :key="item.id"
              :data-testid="`dashboard-vencimiento-${item.id}`"
              class="cursor-pointer border-b border-b-1 last:border-b-0 hover:bg-white/[0.02]"
              @click="navigateTo(ROUTE_PATHS.REPORTES)"
            >
              <td class="px-2 py-2.5 text-[13px] font-semibold text-t-1">{{ item.name }}</td>
              <td class="px-2 py-2.5">
                <Badge :variant="CATEGORY_VARIANT[item.categoryKey] ?? 'neutral'">
                  {{ CATEGORY_LABEL[item.categoryKey] ?? item.categoryKey }}
                </Badge>
              </td>
              <td class="px-2 py-2.5 text-xs text-t-3">{{ fmtDateIso(item.iso) }}</td>
              <td class="px-2 py-2.5 text-right">
                <Badge :variant="dueChipVariant(item.days)">{{ dueChipLabel(item) }}</Badge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Actividad reciente -->
      <div
        class="flex flex-col gap-3 rounded-xl border border-b-2 bg-card-2 p-5"
        data-testid="dashboard-actividad-reciente"
      >
        <div class="flex items-center gap-2">
          <Plus class="h-4 w-4 text-brand" />
          <h2 class="text-sm font-bold text-t-1">Actividad reciente</h2>
        </div>
        <ul class="flex flex-col divide-y divide-b-1">
          <li
            v-for="entry in DASHBOARD_ACTIVITY"
            :key="entry.id"
            :data-testid="`dashboard-activity-${entry.id}`"
            class="flex items-start gap-3 py-2.5"
          >
            <span
              :class="
                cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                  ACTIVITY_ICON_BG[entry.kind],
                )
              "
            >
              <component :is="ACTIVITY_ICON[entry.kind]" class="h-3.5 w-3.5" />
            </span>
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <div class="text-[12px] leading-snug text-t-2">{{ entry.text }}</div>
              <div class="text-[10px] text-t-4">{{ entry.time }}</div>
            </div>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
