import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ReporteCard from './ReporteCard.vue';
import type { Report } from '@/types/genericos';

const TODAY = new Date(2026, 3, 29, 12, 0, 0).getTime(); // 2026-04-29

const BASE: Report = {
  id: 'rpt_x',
  name: 'Reporte X',
  description: 'desc',
  category: 'INTERNO',
  periodicity: 'Mensual',
  format: 'PDF',
  retention: '5 años',
  cron_enabled: true,
  cron_active: true,
  next: '2026-05-30',
};

function mountCard(overrides: Partial<Report> = {}) {
  return mount(ReporteCard, {
    props: { report: { ...BASE, ...overrides }, now: TODAY },
  });
}

describe('ReporteCard', () => {
  it('renders the normal layout with name + footer + action buttons', () => {
    const w = mountCard();
    expect(w.find('[data-testid="reporte-card-rpt_x"]').exists()).toBe(true);
    expect(w.text()).toContain('Reporte X');
    expect(w.find('[data-testid="reporte-card-rpt_x-editar"]').exists()).toBe(true);
    expect(w.find('[data-testid="reporte-card-rpt_x-cron"]').exists()).toBe(true);
    expect(w.find('[data-testid="reporte-card-rpt_x-generar"]').exists()).toBe(true);
  });

  it('renders the CRON button on every non-locked card regardless of cron_enabled', () => {
    const wEnabled = mountCard({ cron_enabled: true });
    expect(wEnabled.find('[data-testid="reporte-card-rpt_x-cron"]').exists()).toBe(true);
    const wDisabled = mountCard({ cron_enabled: false });
    expect(wDisabled.find('[data-testid="reporte-card-rpt_x-cron"]').exists()).toBe(true);
  });

  it('renders a deps block when dependencies are present', () => {
    const w = mountCard({
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
    });
    expect(w.find('[data-testid="reporte-card-deps-block"]').exists()).toBe(true);
    expect(w.text()).toContain('Pendiente');
    expect(w.text()).toContain('OPS · M');
  });

  it('disables Generar when deps are partially completed', () => {
    const w = mountCard({
      dependencies: [
        { app: 'A', module: 'M', task: 'T', owner_role: 'R', sla_days_before: 2, completed: false },
        { app: 'B', module: 'M', task: 'T', owner_role: 'R', sla_days_before: 1, completed: true },
      ],
    });
    const btn = w.find('[data-testid="reporte-card-rpt_x-generar"]');
    expect(btn.attributes('disabled')).toBeDefined();
    expect(btn.attributes('title')).toBe('Hay dependencias pendientes');
  });

  it('renders the locked layout with a Bloqueado pill and no action buttons', () => {
    const w = mountCard({ locked: true, locked_reason: 'En desarrollo' });
    const card = w.find('[data-testid="reporte-card-rpt_x"]');
    expect(card.attributes('data-locked')).toBe('true');
    expect(w.find('[data-testid="reporte-card-locked-tag"]').exists()).toBe(true);
    expect(w.text()).toContain('En desarrollo');
    expect(w.find('[data-testid="reporte-card-rpt_x-generar"]').exists()).toBe(false);
    expect(w.find('[data-testid="reporte-card-rpt_x-editar"]').exists()).toBe(false);
  });

  it('emits "click" when the card body is clicked (non-locked)', async () => {
    const w = mountCard();
    await w.find('[data-testid="reporte-card-rpt_x"]').trigger('click');
    expect(w.emitted('click')).toBeTruthy();
  });

  it('emits "generar" (not "click") when the Generar button is clicked', async () => {
    const w = mountCard();
    await w.find('[data-testid="reporte-card-rpt_x-generar"]').trigger('click');
    expect(w.emitted('generar')).toBeTruthy();
    // stopPropagation prevents the card click handler firing too.
    expect(w.emitted('click')).toBeUndefined();
  });
});
