import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import Dashboard from './Dashboard.vue';
import { ROUTE_PATHS } from '@/config/routes';

vi.mock('vue-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: ROUTE_PATHS.DASHBOARD, component: { template: '<div />' } },
      { path: ROUTE_PATHS.INBOX, name: 'inbox', component: { template: '<div />' } },
      { path: ROUTE_PATHS.ALERTAS, name: 'alertas', component: { template: '<div />' } },
      { path: ROUTE_PATHS.REPORTES, name: 'reportes', component: { template: '<div />' } },
      { path: ROUTE_PATHS.MOVIMIENTOS, component: { template: '<div />' } },
      { path: ROUTE_PATHS.COTIZACIONES, component: { template: '<div />' } },
      { path: ROUTE_PATHS.TESORERIA, component: { template: '<div />' } },
    ],
  });
}

async function mountDashboard() {
  setActivePinia(createPinia());
  const router = makeRouter();
  router.push(ROUTE_PATHS.DASHBOARD);
  await router.isReady();
  const wrapper = mount(Dashboard, {
    global: { plugins: [router] },
  });
  return { wrapper, router };
}

describe('Dashboard page · FIN', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders the four FIN-specific KPIs', async () => {
    const { wrapper } = await mountDashboard();
    expect(wrapper.find('[data-testid="dashboard-kpis"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="kpi-mov-pendientes"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="kpi-quotes-pend"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="kpi-reportes-vencidos"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Posición consolidada');
  });

  it('KPI counter values are non-negative integers', async () => {
    const { wrapper } = await mountDashboard();
    for (const id of [
      'kpi-mov-pendientes-value',
      'kpi-quotes-pend-value',
      'kpi-reportes-vencidos-value',
    ]) {
      const el = wrapper.find(`[data-testid="${id}"]`);
      const n = Number(el.text());
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
    }
  });

  it('clicking the Movimientos KPI navigates to /movimientos', async () => {
    const { wrapper, router } = await mountDashboard();
    await wrapper.find('[data-testid="kpi-mov-pendientes"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe(ROUTE_PATHS.MOVIMIENTOS);
  });

  it('renders Posición por sociedad with a card per sociedad in POS_TREE', async () => {
    const { wrapper } = await mountDashboard();
    const panel = wrapper.find('[data-testid="dashboard-posicion-sociedad"]');
    expect(panel.exists()).toBe(true);
    const cells = panel.findAll('[data-testid^="dashboard-soc-"]');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('renders Alertas activas + Próximos vencimientos + Actividad reciente panels', async () => {
    const { wrapper } = await mountDashboard();
    expect(wrapper.find('[data-testid="dashboard-alertas-activas"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="dashboard-proximos-vencimientos"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="dashboard-actividad-reciente"]').exists()).toBe(true);
  });

  it('does NOT use the L1/L2/L3 pattern (no <Segmenter> or filter dropdowns)', async () => {
    const { wrapper } = await mountDashboard();
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="filter-type"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="filter-state"]').exists()).toBe(false);
  });
});
