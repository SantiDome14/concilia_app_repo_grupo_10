<script setup lang="ts">
import { computed } from 'vue';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, AlertTriangle, Info } from 'lucide-vue-next';
import { cn } from '@/lib/cn';
import { depsStatus } from '@/lib/reportes/depsStatus';
import {
  REPORT_CATEGORY_BY_KEY,
  type ReportCategoryDef,
} from '@/mocks/genericos/reportes';
import type { Report, ReportRun } from '@/types/genericos';

// ════════════════════════════════════════════════════════════════════
// ReporteDetailModal — Catálogo card-click detail (matches the
// prototype's `#ov-rep-detail` modal at lines 1880-1919)
// ════════════════════════════════════════════════════════════════════

interface Props {
  open: boolean;
  report: Report | null;
  /** Full run history; the modal slices the latest 3 by report_id. */
  runs: ReportRun[];
  now?: number;
}

const props = withDefaults(defineProps<Props>(), {
  now: () => Date.now(),
});

const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const cat = computed<ReportCategoryDef | undefined>(
  () => (props.report ? REPORT_CATEGORY_BY_KEY[props.report.category] : undefined),
);

const status = computed(() =>
  props.report ? depsStatus(props.report, props.now) : null,
);

const last3 = computed<ReportRun[]>(() => {
  if (!props.report) return [];
  return props.runs
    .filter((r) => r.report_id === props.report?.id)
    .slice()
    .sort((a, b) => b.requested_at.localeCompare(a.requested_at))
    .slice(0, 3);
});

function fmtDateIso(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function fmtDateTime(iso: string): string {
  // Accept ISO 8601 or "YYYY-MM-DD HH:mm" strings.
  const m = iso.replace('T', ' ');
  const [date, timeFull] = m.split(' ');
  const time = (timeFull ?? '').slice(0, 5);
  return fmtDateIso(date) + (time ? ` ${time}` : '');
}

function close(): void {
  emit('update:open', false);
}

function onOpenChange(v: boolean): void {
  if (!v) close();
}

function triggerLabel(t: ReportRun['trigger']): string {
  if (t.type === 'cron') return 'CRON';
  if (t.type === 'system') return 'Sistema';
  return `Manual · ${t.user_name ?? t.user_id}`;
}
</script>

<template>
  <Dialog :open="props.open" @update:open="onOpenChange">
    <DialogContent
      class="max-w-[640px]"
      data-testid="reporte-detail-modal"
    >
      <DialogHeader>
        <DialogTitle>Detalle del Reporte</DialogTitle>
        <DialogDescription v-if="cat">
          {{ cat.label }}
        </DialogDescription>
      </DialogHeader>

      <div v-if="report" class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div class="col-span-2 rounded-md border border-b-2 bg-card-2 p-3">
            <div class="mb-1 text-[10px] font-bold uppercase tracking-wider text-t-3">Nombre</div>
            <div class="text-[14px] text-t-1">{{ report.name }}</div>
          </div>
          <div class="col-span-2 rounded-md border border-b-2 bg-card-2 p-3">
            <div class="mb-1 text-[10px] font-bold uppercase tracking-wider text-t-3">Descripción</div>
            <div class="text-[14px] text-t-2">{{ report.description ?? '—' }}</div>
          </div>
          <div class="rounded-md border border-b-2 bg-card-2 p-3">
            <div class="mb-1 text-[10px] font-bold uppercase tracking-wider text-t-3">Categoría</div>
            <Badge
              :variant="'neutral'"
              :class="cn('border', cat?.badgeClass ?? 'border-b-2')"
            >
              {{ cat?.label ?? report.category }}
            </Badge>
          </div>
          <div class="rounded-md border border-b-2 bg-card-2 p-3">
            <div class="mb-1 text-[10px] font-bold uppercase tracking-wider text-t-3">Periodicidad</div>
            <Badge variant="neutral">{{ report.periodicity }}</Badge>
          </div>
          <div class="rounded-md border border-b-2 bg-card-2 p-3">
            <div class="mb-1 text-[10px] font-bold uppercase tracking-wider text-t-3">Próxima emisión</div>
            <div class="text-[14px] text-t-1">{{ fmtDateIso(report.next ?? null) }}</div>
          </div>
          <div class="rounded-md border border-b-2 bg-card-2 p-3">
            <div class="mb-1 text-[10px] font-bold uppercase tracking-wider text-t-3">Formato</div>
            <div class="text-[14px] text-t-1">{{ report.format }}</div>
          </div>
          <div class="rounded-md border border-b-2 bg-card-2 p-3">
            <div class="mb-1 text-[10px] font-bold uppercase tracking-wider text-t-3">Soporta CRON</div>
            <div class="text-[14px] text-t-1">
              {{ report.cron_enabled ? 'Sí' : 'No' }}
            </div>
          </div>
          <div class="rounded-md border border-b-2 bg-card-2 p-3">
            <div class="mb-1 text-[10px] font-bold uppercase tracking-wider text-t-3">Estado</div>
            <Badge :variant="report.locked ? 'danger' : 'success'">
              {{ report.locked ? 'Bloqueado' : 'Activo' }}
            </Badge>
          </div>
          <div
            v-if="report.dependencies && report.dependencies.length > 0 && status"
            class="col-span-2 rounded-md border border-b-2 bg-card-2 p-3"
            data-testid="reporte-detail-deps"
          >
            <div class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-t-3">
              Dependencias inter-área
            </div>
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
                      ? `Bloqueado · ${status.done}/${status.total} completadas`
                      : `Pendiente · ${status.done}/${status.total} completadas`
                }}
              </span>
            </div>
            <div class="mt-1.5 flex flex-col gap-1">
              <div
                v-for="(d, i) in report.dependencies"
                :key="`${d.app}-${d.module}-${i}`"
                class="flex items-start gap-1.5 text-[12px] text-t-2"
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
        </div>

        <div class="border-t border-b-1 pt-3">
          <div class="mb-2 text-[11px] font-bold uppercase tracking-wider text-t-3">
            Últimas 3 generaciones
          </div>
          <table
            class="w-full border-collapse text-[12px]"
            data-testid="reporte-detail-mini-table"
          >
            <thead>
              <tr class="border-b border-b-2">
                <th class="px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Fecha</th>
                <th class="px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Trigger</th>
                <th class="px-2 py-1.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Estado</th>
                <th class="px-2 py-1.5 text-right text-[10px] font-bold uppercase tracking-wider text-t-3">Archivo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="last3.length === 0">
                <td colspan="4" class="px-2 py-2 text-center text-t-4">
                  Sin generaciones
                </td>
              </tr>
              <tr
                v-for="run in last3"
                :key="run.id"
                class="border-b border-b-1 last:border-b-0"
              >
                <td class="px-2 py-1.5 text-t-2">{{ fmtDateTime(run.requested_at) }}</td>
                <td class="px-2 py-1.5 text-t-3">{{ triggerLabel(run.trigger) }}</td>
                <td class="px-2 py-1.5">
                  <Badge
                    :variant="run.status === 'completed' ? 'success' : run.status === 'failed' ? 'danger' : 'info'"
                  >
                    {{ run.status === 'completed' ? 'Éxito' : run.status === 'failed' ? 'Error' : run.status }}
                  </Badge>
                </td>
                <td class="px-2 py-1.5 text-right">
                  <a
                    v-if="run.output_url"
                    :href="run.output_url"
                    class="font-mono text-[11px] text-info hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Descargar
                  </a>
                  <span v-else class="text-t-4">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <DialogFooter>
        <Button variant="ghost" data-testid="reporte-detail-close" @click="close">
          Cerrar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
