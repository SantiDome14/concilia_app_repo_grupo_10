import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import Cotizaciones from './Cotizaciones.vue';
import { ROUTE_PATHS } from '@/config/routes';
import { useManifestRegistryStore } from '@/stores/manifestRegistry';
import {
  FIN_COTIZACIONES_MANIFEST,
  FIN_COTIZACIONES_MANIFEST_KEY,
} from '@/manifests/fin.cotizaciones.actions';

vi.mock('vue-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: ROUTE_PATHS.COTIZACIONES, component: { template: '<div />' } },
    ],
  });
}

async function mountPage() {
  setActivePinia(createPinia());
  useManifestRegistryStore().register(
    FIN_COTIZACIONES_MANIFEST_KEY,
    FIN_COTIZACIONES_MANIFEST,
  );
  const router = makeRouter();
  router.push(ROUTE_PATHS.COTIZACIONES);
  await router.isReady();
  return mount(Cotizaciones, {
    global: { plugins: [router] },
  });
}

describe('Cotizaciones page', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders the L1/L2/L3 skeleton', async () => {
    const wrapper = await mountPage();
    expect(wrapper.find('[data-testid="cotizaciones-page"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="cotizaciones-kpis"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="cotizaciones-section-header"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="cotizaciones-body"]').exists()).toBe(true);
  });

  it('exposes Período + Status filters in L3', async () => {
    const wrapper = await mountPage();
    expect(wrapper.find('[data-testid="filter-periodo"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="filter-status"]').exists()).toBe(true);
  });

  it('renders the list table by default with at least one row', async () => {
    const wrapper = await mountPage();
    expect(wrapper.find('[data-testid="cotizaciones-list"]').exists()).toBe(true);
    expect(wrapper.findAll('tbody tr').length).toBeGreaterThan(0);
  });

  it('narrows the dataset when status=cancelled', async () => {
    const wrapper = await mountPage();
    const before = wrapper.findAll('tbody tr').length;
    await wrapper.find('[data-testid="filter-status"]').setValue('cancelled');
    const after = wrapper.findAll('tbody tr').length;
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(0);
  });
});
