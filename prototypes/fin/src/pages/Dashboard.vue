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
} from 'lucide-vue-next';
import { Badge, type BadgeVariants } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ROUTE_PATHS } from '@/config/routes';
import { ALERTS } from '@/mocks/genericos/alertas';
import { REPORTS_CATALOG } from '@/mocks/genericos/reportes';
import { MOVIMIENTOS } from '@/mocks/fin/movimientos';
import { QUOTES } from '@/mocks/fin/quotes';
import { POSICION_TREE } from '@/mocks/fin/disponibilidades';
import { DASHBOARD_ACTIVITY } from '@/mocks/fin/dashboard-activity';
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

// ─── L2 · KPIs ───────────────────────────────────────────────────────
const movPendientes = computed(
  () => MOVIMIENTOS.filter((m) => m.fin.imput !== 'IMP').length,
);

const quotesPendFactura = computed(
  () =>
    QUOTES.filter(
      (q) =>
        q.fin.facturaState === 'pendiente' &&
        (q.status === 'executed' || q.status === 'settled'),
    ).length,
);

const reportesVencidos = computed(() => {
  let n = 0;
  for (const r of REPORTS_CATALOG) {
    if (!r.next) continue;
    const d = daysUntilDate(r.next);
    if (d !== null && d < 0) n++;
  }
  return n;
});

const reportesProxVencer = computed(() => {
  let n = 0;
  for (const r of REPORTS_CATALOG) {
    if (!r.next) continue;
    const d = daysUntilDate(r.next);
    if (d !== null && d >= 0 && d <= 7) n++;
  }
  return n;
});

// ─── Posición por sociedad — derived from POSICION_TREE ─────────────────
// Map each POSICION_TREE entry to a single dashboard cell. The legacy
// prototype hardcoded the canonical 4 sociedades; we surface whatever
// POSICION_TREE declares so the dashboard tracks the live mock dataset.
interface SociedadCell {
  id: string;
  name: string;
  sub: string;
  primaryAmount: string;
  secondary?: string;
  detail: string;
  accent: string;
}

const SOC_ACCENTS: Record<string, string> = {
  hp: 'bg-success',
  cp: 'bg-info',
  asc: 'bg-[#A78BFA]',
  av: 'bg-warning',
};

const sociedadCells = computed<SociedadCell[]>(() =>
  POSICION_TREE.map((s) => {
    const totals = s.totals ?? [];
    const [primary, ...rest] = totals;
    const primaryAmount = primary ? `${primary.lbl} ${primary.val}` : '—';
    const secondary = rest.map((t) => `${t.lbl} ${t.val}`).join(' · ') || undefined;
    const cuentasCount = s.cuentas.length;
    return {
      id: s.id,
      name: s.name,
      sub: s.sub,
      primaryAmount,
      secondary,
      detail: `${cuentasCount} cuenta${cuentasCount === 1 ? '' : 's'}`,
      accent: SOC_ACCENTS[s.id] ?? 'bg-t-3',
    };
  }),
);

// ─── Alertas activas widget ──────────────────────────────────────────
const ACTIVE_ALERT_STATES: AlertaState[] = ['new', 'in_review'];
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

    <!-- L2 · KPIs (4 FIN-specific tiles) -->
    <section
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      data-testid="dashboard-kpis"
    >
      <div class="flex flex-col gap-1.5 rounded-xl border border-b-2 bg-card-2 p-5">
        <span class="text-[10px] font-bold uppercase tracking-wider text-t-4">
          Posición consolidada
        </span>
        <div class="font-mono text-2xl font-extrabold leading-none tracking-tight text-t-1">
          USD 28.4M
        </div>
        <div class="text-[11px] text-t-4">equivalente · 4 sociedades</div>
      </div>

      <div
        role="button"
        tabindex="0"
        data-testid="kpi-mov-pendientes"
        class="flex cursor-pointer flex-col gap-1.5 rounded-xl border border-b-2 bg-card-2 p-5 hover:border-b-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        @click="navigateTo(ROUTE_PATHS.DISPONIBILIDADES + '?tab=movimientos')"
        @keydown="onCardKeydown($event, ROUTE_PATHS.DISPONIBILIDADES + '?tab=movimientos')"
      >
        <span class="text-[10px] font-bold uppercase tracking-wider text-t-4">
          Mov. pendientes de imputar
        </span>
        <div
          class="text-2xl font-extrabold leading-none tracking-tight text-warning"
          data-testid="kpi-mov-pendientes-value"
        >
          {{ movPendientes }}
        </div>
        <div class="text-[11px] text-t-4">Movimientos OPS sin contabilizar</div>
      </div>

      <div
        role="button"
        tabindex="0"
        data-testid="kpi-quotes-pend"
        class="flex cursor-pointer flex-col gap-1.5 rounded-xl border border-b-2 bg-card-2 p-5 hover:border-b-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        @click="navigateTo(ROUTE_PATHS.VENTAS)"
        @keydown="onCardKeydown($event, ROUTE_PATHS.VENTAS)"
      >
        <span class="text-[10px] font-bold uppercase tracking-wider text-t-4">
          Quotes pend. facturación
        </span>
        <div
          class="text-2xl font-extrabold leading-none tracking-tight text-info"
          data-testid="kpi-quotes-pend-value"
        >
          {{ quotesPendFactura }}
        </div>
        <div class="text-[11px] text-t-4">Quotes ejecutadas sin factura</div>
      </div>

      <div
        role="button"
        tabindex="0"
        data-testid="kpi-reportes-vencidos"
        class="flex cursor-pointer flex-col gap-1.5 rounded-xl border border-b-2 bg-card-2 p-5 hover:border-b-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        @click="navigateTo(ROUTE_PATHS.REPORTES)"
        @keydown="onCardKeydown($event, ROUTE_PATHS.REPORTES)"
      >
        <span class="text-[10px] font-bold uppercase tracking-wider text-t-4">
          Reportes vencidos
        </span>
        <div
          class="text-2xl font-extrabold leading-none tracking-tight text-danger"
          data-testid="kpi-reportes-vencidos-value"
        >
          {{ reportesVencidos }}
        </div>
        <div class="text-[11px] text-t-4">
          {{ reportesProxVencer }} próximos a vencer
        </div>
      </div>
    </section>

    <!-- Row A · Posición por sociedad (2/3) + Alertas activas (1/3) -->
    <section class="grid grid-cols-1 gap-4 lg:grid-cols-3" data-testid="dashboard-row-a">
      <!-- Posición por sociedad -->
      <div
        class="flex flex-col gap-3 rounded-xl border border-b-2 bg-card-2 p-5 lg:col-span-2"
        data-testid="dashboard-posicion-sociedad"
      >
        <div class="flex items-center justify-between">
          <div class="flex flex-col gap-0.5">
            <h2 class="text-sm font-bold text-t-1">Posición por sociedad</h2>
            <span class="text-[11px] text-t-4">Saldos vivos · al cierre del día</span>
          </div>
          <button
            type="button"
            class="text-[11px] text-t-3 hover:text-t-1"
            @click="navigateTo(ROUTE_PATHS.DISPONIBILIDADES)"
          >
            Ir a Tesorería →
          </button>
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div
            v-for="cell in sociedadCells"
            :key="cell.id"
            :data-testid="`dashboard-soc-${cell.id}`"
            class="flex cursor-pointer flex-col gap-1.5 rounded-lg border border-b-1 bg-card p-3 transition-colors hover:border-b-2"
            @click="navigateTo(ROUTE_PATHS.DISPONIBILIDADES)"
          >
            <div class="flex items-center gap-2">
              <span :class="cn('h-2 w-2 rounded-full', cell.accent)" aria-hidden="true" />
              <span class="text-[13px] font-semibold text-t-1">{{ cell.name }}</span>
            </div>
            <div class="font-mono text-base font-bold text-t-1">{{ cell.primaryAmount }}</div>
            <div class="text-[11px] text-t-4">
              <span v-if="cell.secondary">{{ cell.secondary }} · </span>
              {{ cell.detail }}
            </div>
          </div>
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
