import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import Dashboard from './Dashboard.vue';
import { ROUTE_PATHS } from '@/config/routes';

// Stub vue-sonner globally so the page's downstream imports don't blow up.
vi.mock('vue-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function makeRouter() {
  const router = createRouter({
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
  return router;
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

describe('Dashboard page', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders the three counter cards (Inbox / Alertas / Reportes)', async () => {
    const { wrapper } = await mountDashboard();
    expect(wrapper.find('[data-testid="inbox-counter"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="alertas-counter"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="reportes-counter"]').exists()).toBe(true);
  });

  it('counter values reflect the mock dataset shape (numbers ≥ 0)', async () => {
    const { wrapper } = await mountDashboard();
    const values = wrapper.findAll('[data-testid="counter-value"]');
    expect(values).toHaveLength(3);
    for (const v of values) {
      const n = Number(v.text());
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(0);
    }
  });

  it('clicking a counter card navigates to the relevant module route', async () => {
    const { wrapper, router } = await mountDashboard();
    const inboxCard = wrapper.find('[data-testid="inbox-counter"]');
    expect(inboxCard.exists()).toBe(true);
    await inboxCard.trigger('click');
    // router.push is async — flush all pending microtasks so the
    // navigation settles before we read currentRoute.
    await flushPromises();
    expect(router.currentRoute.value.path).toBe(ROUTE_PATHS.INBOX);
  });

  it('renders the KPI tiles section when DASHBOARD_KPIS has entries', async () => {
    const { wrapper } = await mountDashboard();
    const kpis = wrapper.find('[data-testid="dashboard-kpis"]');
    expect(kpis.exists()).toBe(true);
  });

  it('does NOT use the L1/L2/L3 pattern (no <Segmenter> or filter dropdowns)', async () => {
    const { wrapper } = await mountDashboard();
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="filter-type"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="filter-state"]').exists()).toBe(false);
  });
});
