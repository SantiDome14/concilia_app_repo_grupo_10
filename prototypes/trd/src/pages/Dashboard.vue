<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuery } from '@tanstack/vue-query';
import {
  Inbox as InboxIcon,
  BellRing,
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Clock,
  Calendar,
} from 'lucide-vue-next';
import { Badge, type BadgeVariants } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ROUTE_PATHS } from '@/config/routes';
import { listAlertas } from '@/api/modules/alertas';
import { listDashboardKpis } from '@/api/modules/dashboardKpis';
import { listReports } from '@/api/modules/reports';
import { listSolicitudes } from '@/api/modules/solicitudes';
import type { Alerta, AlertaState, Report, Severity } from '@/types/genericos';
import { cn } from '@/lib/cn';

// ─── Data — every list reaches the server (or MSW) via vue-query ─────
const dashboardKpisQuery = useQuery({
  queryKey: ['dashboardKpis'],
  queryFn: listDashboardKpis,
});
const solicitudesQuery = useQuery({
  queryKey: ['solicitudes'],
  queryFn: listSolicitudes,
});
const alertasQuery = useQuery({
  queryKey: ['alertas'],
  queryFn: listAlertas,
});
const reportsQuery = useQuery({
  queryKey: ['reports'],
  queryFn: listReports,
});

const dashboardKpis = computed(() => dashboardKpisQuery.data.value ?? []);
const solicitudes = computed(() => solicitudesQuery.data.value ?? []);
const alertas = computed<Alerta[]>(() => alertasQuery.data.value ?? []);
const reports = computed<Report[]>(() => reportsQuery.data.value ?? []);

// ════════════════════════════════════════════════════════════════════
// Dashboard — consolidated home (card-grid layout, NOT L1/L2/L3)
// ────────────────────────────────────────────────────────────────────
// Mirrors the prototype layout:
//   · Header with period selector ("Últimos 30 días")
//   · Row 1: 4 KPI counters (placeholder / Alertas / Inbox / Reportes).
//             The app-specific "main card" (placeholder) goes FIRST per
//             the Dashboard convention — see CLAUDE.md "Dashboard KPI
//             tile order".
//   · Row 2: Evolución (placeholder chart) + Alertas activas widget
//   · Row 3: Próximos vencimientos (reportes)
// No filters, no sub-tabs, no batch CTAs.
// ════════════════════════════════════════════════════════════════════

const router = useRouter();
const NOW = Date.now();
const MS_HOUR = 3_600_000;
const MS_DAY = MS_HOUR * 24;

// ─── Counter values (the three list-shaped generics) ─────────────────
const ACTIVE_ALERT_STATES: AlertaState[] = ['new', 'in_review'];

const inboxPendingCount = computed(
  () => solicitudes.value.filter((s) => s.state === 'pendiente').length,
);

const alertasActivasCount = computed(
  () => alertas.value.filter((a) => ACTIVE_ALERT_STATES.includes(a.state)).length,
);

const reportesProxVencerCount = computed(() => {
  let n = 0;
  for (const r of reports.value) {
    if (r.locked || !r.next) continue;
    const d = daysUntilDate(r.next);
    if (d !== null && d >= 0 && d <= 7) n++;
  }
  return n;
});

// ─── KPI cards ───────────────────────────────────────────────────────
interface CounterCard {
  id: string;
  testId: string;
  label: string;
  value: number;
  hint: string;
  href: string;
  icon: typeof InboxIcon;
  accent: 'brand' | 'danger' | 'warning';
}

const counterCards = computed<CounterCard[]>(() => [
  {
    id: 'alertas-counter',
    testId: 'alertas-counter',
    label: 'Alertas activas',
    value: alertasActivasCount.value,
    hint: 'requieren atención',
    href: ROUTE_PATHS.ALERTAS,
    icon: BellRing,
    accent: 'danger',
  },
  {
    id: 'inbox-counter',
    testId: 'inbox-counter',
    label: 'Inbox · pendientes',
    value: inboxPendingCount.value,
    hint: 'solicitudes por atender',
    href: ROUTE_PATHS.INBOX,
    icon: InboxIcon,
    accent: 'brand',
  },
  {
    id: 'reportes-counter',
    testId: 'reportes-counter',
    label: 'Reportes próx. vencer',
    value: reportesProxVencerCount.value,
    hint: 'dentro de 7 días',
    href: ROUTE_PATHS.REPORTES,
    icon: FileText,
    accent: 'warning',
  },
]);

// 4th slot — placeholder KPI sourced from app-provided dashboardKpis.
const placeholderKpi = computed(() => dashboardKpis.value[0] ?? null);

// ─── Alertas activas widget — top 4 active alertas ───────────────────
const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const alertasActivas = computed<Alerta[]>(() =>
  alertas.value
    .filter((a) => ACTIVE_ALERT_STATES.includes(a.state))
    .slice()
    .sort((a, b) => {
      const sa = SEVERITY_RANK[a.severity ?? 'low'];
      const sb = SEVERITY_RANK[b.severity ?? 'low'];
      if (sa !== sb) return sa - sb;
      return Date.parse(b.detected_at) - Date.parse(a.detected_at);
    })
    .slice(0, 4),
);

const STATE_LABELS: Record<string, string> = {
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
  const h = Math.floor(diff / MS_HOUR);
  if (h < 1) return 'recién';
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
}

// ─── Próximos vencimientos widget — top 5 reports w/ next date ───────
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

interface UpcomingItem {
  report: Report;
  iso: string;
  days: number;
}

const proximosVencimientos = computed<UpcomingItem[]>(() => {
  const items: UpcomingItem[] = [];
  for (const r of reports.value) {
    if (r.locked || !r.next) continue;
    const d = daysUntilDate(r.next);
    if (d === null || d < 0) continue;
    items.push({ report: r, iso: r.next, days: d });
  }
  return items.sort((a, b) => a.days - b.days).slice(0, 5);
});

function dueChipVariant(days: number): BadgeVariants['variant'] {
  if (days <= 7) return 'danger';
  if (days <= 30) return 'warning';
  return 'success';
}

// ─── Period selector — placeholder until app wires real ranges ───────
const period = ref<string>('30');
const PERIOD_OPTIONS = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
];

// ─── Navigation ──────────────────────────────────────────────────────
function navigateTo(href: string): void {
  void router.push(href);
}

function onCardKeydown(event: KeyboardEvent, href: string): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    navigateTo(href);
  }
}

const ACCENT_CLASSES: Record<CounterCard['accent'], string> = {
  brand: 'text-brand',
  danger: 'text-danger',
  warning: 'text-warning',
};

const TREND_ICON: Record<'up' | 'down' | 'flat', typeof TrendingUp> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

const TREND_CLASSES: Record<'up' | 'down' | 'flat', string> = {
  up: 'text-success',
  down: 'text-danger',
  flat: 'text-t-4',
};
</script>

<template>
  <div class="flex flex-col gap-5" data-testid="dashboard-page">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex flex-col gap-1">
        <h1 class="text-[22px] font-extrabold tracking-tight text-t-1">
          Dashboard
        </h1>
        <p class="text-xs text-t-3">
          Vista consolidada del estado del área que cubre la aplicación
        </p>
      </div>
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
    </header>

    <!-- Row 1 · KPI counters (4 cards: 1 app-specific main + 3 generics).
         Convention: the app-specific KPI ("main card") goes FIRST — it
         is the read-out the user cares about most. The 3 cross-cutting
         counters (Alertas / Inbox / Reportes) follow. -->
    <section
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      data-testid="dashboard-kpis"
    >
      <!-- 1st slot — KPI placeholder (app-provided trend metric) -->
      <div
        v-if="placeholderKpi"
        role="button"
        tabindex="0"
        :data-testid="`kpi-${placeholderKpi.id}`"
        class="flex cursor-pointer flex-col gap-2 rounded-xl border border-b-2 bg-card-2 p-5 transition-colors hover:border-b-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        @click="navigateTo(placeholderKpi.href)"
        @keydown="onCardKeydown($event, placeholderKpi.href)"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-t-4">
            {{ placeholderKpi.label }}
          </span>
          <component
            :is="TREND_ICON[placeholderKpi.trend ?? 'flat']"
            :class="cn('h-3.5 w-3.5', TREND_CLASSES[placeholderKpi.trend ?? 'flat'])"
            aria-hidden="true"
          />
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">
          {{ placeholderKpi.value }}
        </div>
        <div v-if="placeholderKpi.hint" class="text-[11px] text-t-4">
          {{ placeholderKpi.hint }}
        </div>
      </div>

      <div
        v-for="card in counterCards"
        :key="card.id"
        role="button"
        tabindex="0"
        :data-testid="card.testId"
        :class="
          cn(
            'flex cursor-pointer flex-col gap-2 rounded-xl border border-b-2 bg-card-2 p-5 transition-colors hover:border-b-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
          )
        "
        @click="navigateTo(card.href)"
        @keydown="onCardKeydown($event, card.href)"
      >
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wider text-t-4">
            {{ card.label }}
          </span>
          <component
            :is="card.icon"
            :class="cn('h-4 w-4', ACCENT_CLASSES[card.accent])"
            aria-hidden="true"
          />
        </div>
        <div
          :class="
            cn(
              'text-3xl font-extrabold leading-none tracking-tight',
              ACCENT_CLASSES[card.accent],
            )
          "
          data-testid="counter-value"
        >
          {{ card.value }}
        </div>
        <div class="text-[11px] text-t-4">{{ card.hint }}</div>
      </div>
    </section>

    <!-- Row 2 · Evolución (placeholder chart) + Alertas activas widget -->
    <section
      class="grid grid-cols-1 gap-4 lg:grid-cols-3"
      data-testid="dashboard-row-2"
    >
      <!-- Evolución placeholder (2/3) -->
      <div
        class="flex flex-col gap-3 rounded-xl border border-b-2 bg-card-2 p-5 lg:col-span-2"
        data-testid="dashboard-evolution"
      >
        <div class="flex items-center gap-2">
          <BarChart3 class="h-4 w-4 text-brand" />
          <h2 class="text-sm font-bold text-t-1">Evolución (placeholder)</h2>
        </div>
        <div
          class="flex min-h-[240px] flex-1 items-center justify-center rounded-lg border border-dashed border-b-2 bg-card-2/40 text-[11px] text-t-4"
        >
          Espacio reservado para chart específico de la app
        </div>
      </div>

      <!-- Alertas activas (1/3) -->
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
            <BellRing :class="cn('mt-0.5 h-4 w-4 shrink-0', severityDotClass(a.severity))" />
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <div class="truncate text-[13px] font-semibold text-t-1">{{ a.title }}</div>
              <div class="text-[11px] text-t-4">
                {{ a.concept }} · {{ timeAgo(a.detected_at) }}
              </div>
            </div>
            <Badge :variant="alertStateVariant(a.state)">{{ STATE_LABELS[a.state] ?? a.state }}</Badge>
          </li>
        </ul>
      </div>
    </section>

    <!-- Row 3 · Próximos vencimientos (Reportes) -->
    <section
      class="rounded-xl border border-b-2 bg-card-2 p-5"
      data-testid="dashboard-proximos-vencimientos"
    >
      <div class="mb-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Clock class="h-4 w-4 text-brand" />
          <h2 class="text-sm font-bold text-t-1">Próximos vencimientos</h2>
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
      <ul v-else class="flex flex-col divide-y divide-b-1">
        <li
          v-for="item in proximosVencimientos"
          :key="item.report.id"
          :data-testid="`dashboard-vencimiento-${item.report.id}`"
          class="flex cursor-pointer items-center gap-3 py-2.5 transition-colors hover:bg-white/[0.02]"
          @click="navigateTo(ROUTE_PATHS.REPORTES)"
        >
          <FileText class="h-4 w-4 shrink-0 text-t-3" />
          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <div class="truncate text-[13px] font-semibold text-t-1">
              {{ item.report.name }}
            </div>
            <div class="text-[11px] text-t-4">
              {{ item.report.category }} · {{ item.report.periodicity }}
            </div>
          </div>
          <Badge :variant="dueChipVariant(item.days)">
            {{ fmtDateIso(item.iso) }} · a {{ item.days }} día{{ item.days === 1 ? '' : 's' }}
          </Badge>
        </li>
      </ul>
    </section>
  </div>
</template>
