import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ReporteDetailModal from './ReporteDetailModal.vue';
import type { Report, ReportRun } from '@/types/genericos';

const TODAY = new Date(2026, 3, 29, 12, 0, 0).getTime();

const REPORT: Report = {
  id: 'rpt_test',
  name: 'Reporte Test',
  description: 'Desc',
  category: 'INTERNO',
  periodicity: 'Mensual',
  format: 'PDF',
  cron_enabled: true,
  cron_active: true,
  retention: '5 años',
  next: '2026-05-10',
};

const RUNS: ReportRun[] = [
  {
    id: 'r1',
    report_id: 'rpt_test',
    requested_at: '2026-04-10T10:00:00Z',
    completed_at: '2026-04-10T10:01:00Z',
    status: 'completed',
    requested_by_name: 'CRON',
    trigger: { type: 'cron' },
    output_url: 'https://x/r1.pdf',
    params: 'P: M',
  },
  {
    id: 'r2',
    report_id: 'rpt_test',
    requested_at: '2026-04-12T10:00:00Z',
    status: 'failed',
    requested_by_name: 'CRON',
    trigger: { type: 'cron' },
    error_message: 'oops',
    params: 'P: M',
  },
  {
    id: 'r3',
    report_id: 'rpt_test',
    requested_at: '2026-04-15T10:00:00Z',
    completed_at: '2026-04-15T10:02:00Z',
    status: 'completed',
    requested_by_name: 'Sistema',
    trigger: { type: 'cron' },
    output_url: 'https://x/r3.pdf',
    params: 'P: M',
  },
  {
    id: 'r4-other',
    report_id: 'other_id',
    requested_at: '2026-04-20T10:00:00Z',
    status: 'completed',
    requested_by_name: 'Sistema',
    trigger: { type: 'cron' },
    output_url: 'https://x/r4.pdf',
    params: 'P: M',
  },
];

const STUBS = {
  Dialog: {
    template: '<div class="stub-dlg" v-if="open"><slot /></div>',
    props: ['open'],
  },
  DialogContent: {
    template: '<div class="stub-content" v-bind="$attrs"><slot /></div>',
    inheritAttrs: false,
  },
  DialogHeader: { template: '<div><slot /></div>' },
  DialogTitle: { template: '<div><slot /></div>' },
  DialogDescription: { template: '<div><slot /></div>' },
  DialogFooter: { template: '<div><slot /></div>' },
};

const CATEGORY_BY_KEY = {
  INTERNO: { key: 'INTERNO', label: 'Internos', badgeClass: 'border-success/30 text-success' },
  OPERATIVO: { key: 'OPERATIVO', label: 'Operativos', badgeClass: 'border-info/30 text-info' },
};

function mountModal(opts: {
  open?: boolean;
  report?: Report | null;
  runs?: ReportRun[];
} = {}) {
  return mount(ReporteDetailModal, {
    props: {
      open: opts.open ?? true,
      report: opts.report ?? REPORT,
      runs: opts.runs ?? RUNS,
      categoryByKey: CATEGORY_BY_KEY,
      now: TODAY,
    },
    global: { stubs: STUBS },
  });
}

describe('ReporteDetailModal', () => {
  it('renders with the report name + category label', () => {
    const w = mountModal();
    expect(w.find('[data-testid="reporte-detail-modal"]').exists()).toBe(true);
    expect(w.text()).toContain('Reporte Test');
    expect(w.text()).toContain('Internos');
  });

  it('emits update:open=false when Cerrar is clicked', async () => {
    const w = mountModal();
    await w.find('[data-testid="reporte-detail-close"]').trigger('click');
    expect(w.emitted('update:open')).toBeTruthy();
    expect(w.emitted('update:open')![0]).toEqual([false]);
  });

  it('renders the deps section only when the report has dependencies', () => {
    const noDeps = mountModal();
    expect(noDeps.find('[data-testid="reporte-detail-deps"]').exists()).toBe(false);
    const withDeps = mountModal({
      report: {
        ...REPORT,
        dependencies: [
          {
            app: 'OPS',
            module: 'M',
            task: 'T',
            owner_role: 'R',
            sla_days_before: 1,
            completed: false,
          },
        ],
      },
    });
    expect(withDeps.find('[data-testid="reporte-detail-deps"]').exists()).toBe(true);
    expect(withDeps.text()).toContain('OPS · M');
  });

  it('mini-table shows the latest 3 runs for this report (most recent first) and excludes other reports', () => {
    const w = mountModal();
    const table = w.find('[data-testid="reporte-detail-mini-table"]');
    expect(table.exists()).toBe(true);
    // Ordered by requested_at desc → r3 (Apr 15), r2 (Apr 12), r1 (Apr 10).
    // The DOM rows render the date prefix for each.
    const rowDates = table.findAll('tbody tr').map((row) =>
      row.text().replace(/\s+/g, ' ').trim(),
    );
    expect(rowDates).toHaveLength(3);
    expect(rowDates[0]).toContain('15/04/2026');
    expect(rowDates[1]).toContain('12/04/2026');
    expect(rowDates[2]).toContain('10/04/2026');
    // r4-other belongs to a different report → must NOT appear.
    expect(table.html()).not.toContain('20/04/2026');
  });

  it('does not render anything when open is false', () => {
    const w = mountModal({ open: false });
    expect(w.find('[data-testid="reporte-detail-modal"]').exists()).toBe(false);
  });
});
