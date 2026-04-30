<script setup lang="ts">
import { computed } from 'vue';
import {
  Edit3,
  Clock,
  Zap,
  Lock,
  Check,
  AlertTriangle,
  Info,
} from 'lucide-vue-next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { depsStatus } from '@/lib/reportes/depsStatus';
import {
  REPORT_CATEGORY_BY_KEY,
  type ReportCategoryDef,
} from '@/mocks/genericos/reportes';
import type { Report } from '@/types/genericos';

// ════════════════════════════════════════════════════════════════════
// ReporteCard — Catálogo card matching the prototype's `.rcard`
// ────────────────────────────────────────────────────────────────────
// Two layouts:
//   - normal: meta + tags + (deps block?) + footer (próxima emisión +
//     Editar / CRON / Generar buttons)
//   - locked: minimal (header + locked tag + meta + locked_reason)
//
// All action buttons stop propagation so card click (which opens the
// detail modal) doesn't fire when buttons are clicked.
// ════════════════════════════════════════════════════════════════════

interface Props {
  report: Report;
  /** Optional override for testing the date math. */
  now?: number;
}

const props = withDefaults(defineProps<Props>(), {
  now: () => Date.now(),
});

const emit = defineEmits<{
  click: [report: Report];
  editar: [report: Report];
  cron: [report: Report];
  generar: [report: Report];
}>();

const cat = computed<ReportCategoryDef | undefined>(
  () => REPORT_CATEGORY_BY_KEY[props.report.category],
);

const status = computed(() => depsStatus(props.report, props.now));

const generarDisabled = computed(
  () => !!status.value && !status.value.ready,
);

interface NextChip {
  text: string;
  variant: 'success' | 'warning' | 'danger' | 'neutral';
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function fmtDateIso(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function daysUntilFromNow(iso: string): number {
  const parts = iso.split('-').map(Number);
  const target = new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, parts[2] ?? 1).getTime();
  const today = new Date(
    new Date(props.now).getFullYear(),
    new Date(props.now).getMonth(),
    new Date(props.now).getDate(),
  ).getTime();
  return Math.round((target - today) / MS_PER_DAY);
}

const nextChip = computed<NextChip>(() => {
  const r = props.report;
  if (!r.next) {
    return { text: `N/A · ${r.periodicity}`, variant: 'neutral' };
  }
  const d = daysUntilFromNow(r.next);
  if (d < 0) {
    return { text: `${fmtDateIso(r.next)} · vencido`, variant: 'danger' };
  }
  if (d < 7) {
    return {
      text: `${fmtDateIso(r.next)} · a ${d} día${d === 1 ? '' : 's'}`,
      variant: 'danger',
    };
  }
  if (d <= 30) {
    return {
      text: `${fmtDateIso(r.next)} · a ${d} días`,
      variant: 'warning',
    };
  }
  return { text: `${fmtDateIso(r.next)} · a ${d} días`, variant: 'success' };
});

function onCardClick() {
  emit('click', props.report);
}

function onEditar(e: MouseEvent) {
  e.stopPropagation();
  emit('editar', props.report);
}

function onCron(e: MouseEvent) {
  e.stopPropagation();
  emit('cron', props.report);
}

function onGenerar(e: MouseEvent) {
  e.stopPropagation();
  if (generarDisabled.value) return;
  emit('generar', props.report);
}
</script>

<template>
  <div
    v-if="report.locked"
    class="flex flex-col gap-2 rounded-[10px] border border-b-2 bg-card-2/40 p-4 opacity-80"
    :data-testid="`reporte-card-${report.id}`"
    data-locked="true"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="text-[15px] font-bold text-t-2">{{ report.name }}</div>
      <span
        class="inline-flex items-center gap-1 rounded border border-b-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-t-3"
        data-testid="reporte-card-locked-tag"
      >
        <Lock class="h-3 w-3" />
        Bloqueado
      </span>
    </div>
    <div class="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-t-3">
      <span><b>Categoría:</b> {{ cat?.label ?? report.category }}</span>
      <span><b>Periodicidad:</b> {{ report.periodicity }}</span>
      <span class="italic text-t-4">{{ report.locked_reason ?? '' }}</span>
    </div>
  </div>

  <div
    v-else
    class="flex cursor-pointer flex-col gap-2.5 rounded-[10px] border border-b-2 bg-card-2 p-4 transition-colors hover:border-b-3"
    :data-testid="`reporte-card-${report.id}`"
    @click="onCardClick"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="text-[15px] font-bold text-t-1">{{ report.name }}</div>
    </div>
    <div class="text-[12px] text-t-3">
      <b>Formato:</b> {{ report.format }}<template v-if="report.retention">
        · <b>Retención:</b> {{ report.retention }}</template>
    </div>
    <div class="flex flex-wrap gap-1.5">
      <Badge
        :variant="'neutral'"
        :class="cn('border', cat?.badgeClass ?? 'border-b-2')"
      >
        {{ cat?.label ?? report.category }}
      </Badge>
      <Badge variant="neutral">{{ report.periodicity }}</Badge>
      <Badge v-if="report.cron_enabled" variant="brand">
        <Clock class="mr-1 h-3 w-3" />
        CRON
      </Badge>
    </div>

    <!-- Dependencies block -->
    <div
      v-if="status"
      :class="
        cn(
          'flex flex-col gap-1.5 rounded-md border p-2.5',
          status.blocked ? 'border-danger/40 bg-danger/[0.04]'
          : status.ready ? 'border-success/40 bg-success/[0.04]'
          : 'border-warning/40 bg-warning/[0.04]',
        )
      "
      data-testid="reporte-card-deps-block"
    >
      <div class="flex items-center gap-1.5 text-[12px] font-semibold">
        <Check v-if="status.ready" class="h-3.5 w-3.5 text-success" />
        <AlertTriangle
          v-else
          :class="
            cn(
              'h-3.5 w-3.5',
              status.blocked ? 'text-danger' : 'text-warning',
            )
          "
        />
        <span
          :class="
            status.ready
              ? 'text-success'
              : status.blocked
                ? 'text-danger'
                : 'text-warning'
          "
        >
          {{
            status.ready
              ? `Dependencias OK (${status.done}/${status.total})`
              : status.blocked
                ? `Bloqueado · ${status.done}/${status.total} dependencias completadas`
                : `Pendiente · ${status.done}/${status.total} dependencias completadas`
          }}
        </span>
      </div>
      <div class="flex flex-col gap-1">
        <div
          v-for="(d, i) in report.dependencies"
          :key="`${d.app}-${d.module}-${i}`"
          class="flex items-start gap-1.5 text-[11px] text-t-2"
        >
          <Check v-if="d.completed" class="mt-0.5 h-3 w-3 shrink-0 text-success" />
          <Info v-else class="mt-0.5 h-3 w-3 shrink-0 text-warning" />
          <span>
            <b>{{ d.app }} · {{ d.module }}</b>
            — {{ d.task }}
            <span class="font-mono text-[10px] text-t-3">
              (SLA: {{ d.sla_days_before }}d)
            </span>
          </span>
        </div>
      </div>
    </div>

    <!-- Footer — stacked: próxima emisión row, then actions row -->
    <div class="mt-auto flex flex-col gap-2.5 pt-1">
      <div class="flex flex-col gap-0.5">
        <div class="text-[9px] font-bold uppercase tracking-wider text-t-4">
          Próxima emisión
        </div>
        <Badge :variant="nextChip.variant" data-testid="reporte-card-next-chip" class="self-start">
          {{ nextChip.text }}
        </Badge>
      </div>
      <div class="flex flex-wrap items-center justify-end gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          :data-testid="`reporte-card-${report.id}-editar`"
          @click="onEditar"
        >
          <Edit3 class="h-3 w-3" />
          Editar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          :data-testid="`reporte-card-${report.id}-cron`"
          @click="onCron"
        >
          <Clock class="h-3 w-3" />
          CRON
        </Button>
        <Button
          variant="primary"
          size="sm"
          :disabled="generarDisabled"
          :title="generarDisabled ? 'Hay dependencias pendientes' : 'Iniciar corrida'"
          :data-testid="`reporte-card-${report.id}-generar`"
          @click="onGenerar"
        >
          <Zap class="h-3 w-3" />
          Generar
        </Button>
      </div>
    </div>
  </div>
</template>
