import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import Proveedores from './Proveedores.vue';
import { ROUTE_PATHS, ROUTE_NAMES } from '@/config/routes';

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: ROUTE_PATHS.PROVEEDORES,
        name: ROUTE_NAMES.PROVEEDORES,
        component: { template: '<div />' },
      },
    ],
  });
}

async function mountProveedores(initialUrl: string = ROUTE_PATHS.PROVEEDORES) {
  setActivePinia(createPinia());
  if (typeof localStorage !== 'undefined') localStorage.clear();
  const router = makeRouter();
  await router.push(initialUrl);
  await router.isReady();
  const wrapper = mount(Proveedores, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

async function waitForRender(
  wrapper: VueWrapper,
  selector: string,
): Promise<void> {
  await vi.waitFor(
    async () => {
      await flushPromises();
      if (!wrapper.find(selector).exists()) {
        throw new Error(`selector "${selector}" not yet present`);
      }
    },
    { timeout: 2000, interval: 25 },
  );
}

describe('Proveedores page', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders the L1 header + KPI cards', async () => {
    const { wrapper } = await mountProveedores();
    await waitForRender(wrapper, '[data-testid="liquidity-kpi-cards"]');
    expect(wrapper.find('h1').text()).toBe('Proveedores de Liquidez');
    expect(wrapper.find('[data-testid="liquidity-kpi-card-1"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="liquidity-kpi-card-2"]').exists()).toBe(true);
  });

  it('shows server-computed counts in card 1', async () => {
    const { wrapper } = await mountProveedores();
    await waitForRender(wrapper, '[data-testid="kpi-total-ops"]');
    // The full seed (no filters) has 28 operations.
    expect(wrapper.find('[data-testid="kpi-total-ops"]').text()).toBe('28');
    expect(Number(wrapper.find('[data-testid="kpi-pending"]').text())).toBeGreaterThan(0);
    expect(Number(wrapper.find('[data-testid="kpi-received"]').text())).toBeGreaterThan(0);
  });

  it('renders the table with the seeded rows by default', async () => {
    const { wrapper } = await mountProveedores();
    await waitForRender(wrapper, '[data-testid="proveedores-table"]');
    const rows = wrapper.findAll('tbody tr');
    // Default page size 25.
    expect(rows.length).toBe(25);
  });

  it('REQ-35 contravalor only appears when narrowing to a single non-USD-quote pair', async () => {
    const { wrapper } = await mountProveedores();
    await waitForRender(wrapper, '[data-testid="liquidity-kpi-cards"]');
    // No filters → multiple pairs → no secondary badge.
    expect(wrapper.find('[data-testid="kpi-secondary-badge"]').exists()).toBe(false);

    // Narrow to Banco Galicia (USD/ARS-only).
    const { wrapper: w2 } = await mountProveedores(
      `${ROUTE_PATHS.PROVEEDORES}?providerId=prov_galicia`,
    );
    await waitForRender(w2, '[data-testid="kpi-secondary-badge"]');
    expect(w2.find('[data-testid="kpi-secondary-badge"]').text()).toContain('ARS');
    expect(w2.find('[data-testid="kpi-total-secondary"]').exists()).toBe(true);
  });

  it('URL syncs the filters', async () => {
    const { router } = await mountProveedores(
      `${ROUTE_PATHS.PROVEEDORES}?providerId=prov_binance&status=PENDING&term=T0`,
    );
    expect(router.currentRoute.value.query.providerId).toBe('prov_binance');
    expect(router.currentRoute.value.query.status).toBe('PENDING');
    expect(router.currentRoute.value.query.term).toBe('T0');
  });

  it('clicking a row opens the LiquidityDrawer with the operation id', async () => {
    const { wrapper } = await mountProveedores();
    await waitForRender(wrapper, 'tbody tr');
    const firstRow = wrapper.find('tbody tr');
    await firstRow.trigger('click');
    await flushPromises();
    await vi.waitFor(
      () => {
        const drawerInBody = document.body.innerHTML.includes('liquidity-summary');
        if (!drawerInBody) throw new Error('drawer not yet rendered');
      },
      { timeout: 2000, interval: 25 },
    );
  });

  it('shows the empty state when filters match nothing', async () => {
    // Combine a provider that has BUY-only with a SELL filter? Actually
    // simpler: status=CANCELLED filtered to a provider that has no
    // cancellations.
    const { wrapper } = await mountProveedores(
      `${ROUTE_PATHS.PROVEEDORES}?providerId=prov_byma&status=CANCELLED`,
    );
    await waitForRender(wrapper, '[data-testid="proveedores-empty"]');
    expect(wrapper.find('[data-testid="proveedores-table"]').exists()).toBe(false);
  });
});
