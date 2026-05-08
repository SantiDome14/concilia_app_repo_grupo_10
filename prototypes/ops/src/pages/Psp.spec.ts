import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query';
import Psp from './Psp.vue';
import WhitelistAccountModal from '@/ops/clients/WhitelistAccountModal.vue';
import { useAuthStore } from '@/stores/auth';
import { ROUTE_PATHS } from '@/config/routes';

// ════════════════════════════════════════════════════════════════════
// Psp page — verifies the contract from
// `refine-ops-psp-tab-aware-header-and-multi-sponsor`:
// (1) Posición tab → no main CTA, no <ViewToggle>.
// (2) Movimientos tab → <ViewToggle> + `Crear Movimiento`.
// (3) Cuentas tab → <ViewToggle> + `Crear Cuenta`.
// ════════════════════════════════════════════════════════════════════

vi.mock('vue-sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/ops/psp/api', () => ({
  getCoinagHealth: vi.fn().mockResolvedValue({
    status: 'healthy',
    message: null,
    checked_at: new Date().toISOString(),
  }),
  getReconciliation: vi.fn().mockResolvedValue({ mismatches: [] }),
  listSponsorBalances: vi.fn().mockResolvedValue([]),
  listMovements: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  listAccounts: vi.fn().mockResolvedValue({ data: [], total: 0 }),
}));

vi.mock('@/ops/clients/api', () => ({
  listCurrencies: vi.fn().mockResolvedValue([]),
}));

function makeRouter(initialPath: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: ROUTE_PATHS.PSP, component: { template: '<div />' } }],
  });
  router.push(initialPath);
  return router;
}

async function mountPsp(initialPath = `${ROUTE_PATHS.PSP}?tab=posicion`) {
  setActivePinia(createPinia());
  useAuthStore().setUser({
    id: 'u-1',
    email: 'u@x',
    name: 'U',
    capabilities: ['OPS_ADMIN'],
  });
  const router = makeRouter(initialPath);
  await router.isReady();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = mount(Psp, {
    global: {
      plugins: [router, [VueQueryPlugin, { queryClient }]],
    },
  });
  // Allow vue-query to settle initial fetches.
  await new Promise((resolve) => setTimeout(resolve, 0));
  await wrapper.vm.$nextTick();
  return { wrapper, router };
}

describe('Psp page — tab-aware page-header right-actions', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('Posición tab shows no main CTA and no ViewToggle', async () => {
    const { wrapper } = await mountPsp(`${ROUTE_PATHS.PSP}?tab=posicion`);
    const actions = wrapper.find('[data-testid="psp-header-actions"]');
    expect(actions.exists()).toBe(false);
    expect(wrapper.find('[data-testid="psp-create-movement-cta"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="psp-create-account-cta"]').exists()).toBe(false);
  });

  it('Movimientos tab shows ViewToggle + Crear Movimiento (no Crear Cuenta)', async () => {
    const { wrapper } = await mountPsp(`${ROUTE_PATHS.PSP}?tab=movimientos`);
    const actions = wrapper.find('[data-testid="psp-header-actions"]');
    expect(actions.exists()).toBe(true);
    expect(wrapper.find('[data-testid="psp-create-movement-cta"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="psp-create-account-cta"]').exists()).toBe(false);
  });

  it('Cuentas tab shows ViewToggle + Crear Cuenta (no Crear Movimiento)', async () => {
    const { wrapper } = await mountPsp(`${ROUTE_PATHS.PSP}?tab=cuentas`);
    const actions = wrapper.find('[data-testid="psp-header-actions"]');
    expect(actions.exists()).toBe(true);
    expect(wrapper.find('[data-testid="psp-create-account-cta"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="psp-create-movement-cta"]').exists()).toBe(false);
  });

  it('Crear Cuenta opens <WhitelistAccountModal> (rename of the previous body-level Habilitar cuenta CTA)', async () => {
    const { wrapper } = await mountPsp(`${ROUTE_PATHS.PSP}?tab=cuentas`);
    // Body-level legacy CTA is gone (replaced by the page-header CTA).
    expect(wrapper.find('[data-testid="psp-whitelist-cta"]').exists()).toBe(false);
    // The whitelist modal component is mounted with `open=false`.
    const modalBefore = wrapper.findComponent(WhitelistAccountModal);
    expect(modalBefore.exists()).toBe(true);
    expect(modalBefore.props('open')).toBe(false);
    // Clicking the page-header Crear Cuenta flips `open` to true.
    await wrapper.find('[data-testid="psp-create-account-cta"]').trigger('click');
    await wrapper.vm.$nextTick();
    const modalAfter = wrapper.findComponent(WhitelistAccountModal);
    expect(modalAfter.props('open')).toBe(true);
  });

  it('the Coinag health indicator is NOT mounted in the page header (it lives inside the Posición tree per-sponsor row)', async () => {
    const { wrapper } = await mountPsp(`${ROUTE_PATHS.PSP}?tab=posicion`);
    // The page-header right-actions slot is empty on Posición; the indicator,
    // if present at all, is mounted INSIDE the COINAG row of <PosicionTree>.
    // Asserting against the page header specifically:
    const headerArea = wrapper.find('[data-testid="psp-header-actions"]');
    expect(headerArea.exists()).toBe(false);
  });
});
