import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import Dashboard from './Dashboard.vue';
import { ROUTE_PATHS } from '@/config/routes';
import type * as DataDisplayModule from '@/components/data-display';

vi.mock('vue-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// Unovis uses ResizeObserver which JSDOM does not implement. We stub
// the LineChart wrapper to a no-op so the page renders deterministically
// without pulling the SVG canvas into the test environment.
vi.mock('@/components/data-display', async () => {
  const actual =
    await vi.importActual<typeof DataDisplayModule>('@/components/data-display');
  return {
    ...actual,
    LineChart: {
      name: 'LineChartStub',
      template: '<div data-testid="line-chart-stub" />',
    },
  };
});

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: ROUTE_PATHS.DASHBOARD, component: { template: '<div />' } },
      { path: ROUTE_PATHS.INBOX, name: 'inbox', component: { template: '<div />' } },
      { path: ROUTE_PATHS.ALERTAS, name: 'alertas', component: { template: '<div />' } },
      { path: ROUTE_PATHS.REPORTES, name: 'reportes', component: { template: '<div />' } },
      { path: ROUTE_PATHS.VENTAS, component: { template: '<div />' } },
      { path: ROUTE_PATHS.DISPONIBILIDADES, component: { template: '<div />' } },
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

  it('renders the 4 canonical KPI tiles (Alertas / Inbox / Reportes / Posición consolidada)', async () => {
    const { wrapper } = await mountDashboard();
    expect(wrapper.find('[data-testid="dashboard-kpis"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="kpi-alertas-activas"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="kpi-inbox-pendientes"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="kpi-reportes-prox-vencer"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="kpi-posicion-consolidada"]').exists()).toBe(true);
  });

  it('Alertas / Inbox / Reportes KPI values are non-negative integers', async () => {
    const { wrapper } = await mountDashboard();
    for (const id of [
      'kpi-alertas-activas-value',
      'kpi-inbox-pendientes-value',
      'kpi-reportes-prox-vencer-value',
    ]) {
      const el = wrapper.find(`[data-testid="${id}"]`);
      const n = Number(el.text());
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
    }
  });

  it('Posición consolidada KPI renders an USD figure annotated with the FX pendiente note', async () => {
    const { wrapper } = await mountDashboard();
    const tile = wrapper.find('[data-testid="kpi-posicion-consolidada"]');
    expect(tile.exists()).toBe(true);
    expect(tile.text()).toMatch(/USD\s+\d+/);
    expect(tile.text()).toContain('FX pendiente');
  });

  it('clicking the Alertas KPI navigates to /alertas', async () => {
    const { wrapper, router } = await mountDashboard();
    await wrapper.find('[data-testid="kpi-alertas-activas"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe(ROUTE_PATHS.ALERTAS);
  });

  it('clicking the Inbox KPI navigates to /inbox', async () => {
    const { wrapper, router } = await mountDashboard();
    await wrapper.find('[data-testid="kpi-inbox-pendientes"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe(ROUTE_PATHS.INBOX);
  });

  it('renders the Posición consolidada trend chart panel in Row A', async () => {
    const { wrapper } = await mountDashboard();
    const panel = wrapper.find('[data-testid="dashboard-posicion-trend"]');
    expect(panel.exists()).toBe(true);
    expect(panel.text()).toContain('USD-equivalente');
    expect(panel.find('[data-testid="dashboard-posicion-trend-chart"]').exists()).toBe(true);
    // The chart is stubbed in this test env.
    expect(panel.find('[data-testid="line-chart-stub"]').exists()).toBe(true);
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
