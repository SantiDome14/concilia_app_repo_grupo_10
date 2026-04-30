import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import Tesoreria from './Tesoreria.vue';
import { ROUTE_PATHS } from '@/config/routes';
import { useManifestRegistryStore } from '@/stores/manifestRegistry';
import {
  FIN_TESORERIA_MANIFEST,
  FIN_TESORERIA_MANIFEST_KEY,
} from '@/manifests/fin.tesoreria.actions';
import {
  FIN_TESORERIA_COLA_ASIGNACION_MANIFEST,
  FIN_TESORERIA_COLA_ASIGNACION_MANIFEST_KEY,
} from '@/manifests/fin.tesoreria.cola_asignacion.actions';

vi.mock('vue-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: ROUTE_PATHS.TESORERIA, component: { template: '<div />' } },
    ],
  });
}

async function mountPage() {
  setActivePinia(createPinia());
  const reg = useManifestRegistryStore();
  reg.register(FIN_TESORERIA_MANIFEST_KEY, FIN_TESORERIA_MANIFEST);
  reg.register(
    FIN_TESORERIA_COLA_ASIGNACION_MANIFEST_KEY,
    FIN_TESORERIA_COLA_ASIGNACION_MANIFEST,
  );
  const router = makeRouter();
  router.push(ROUTE_PATHS.TESORERIA);
  await router.isReady();
  return mount(Tesoreria, {
    global: { plugins: [router] },
  });
}

describe('Tesorería · Disponibilidades page', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders the L1/L2/L3 skeleton with the dataset Segmenter (preserved)', async () => {
    const wrapper = await mountPage();
    expect(wrapper.find('[data-testid="tesoreria-page"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="tesoreria-segmenter"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="tesoreria-kpis"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="tesoreria-body"]').exists()).toBe(true);
  });

  it('starts on the Posición segment by default', async () => {
    const wrapper = await mountPage();
    expect(wrapper.find('[data-testid="tesoreria-posicion"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="tesoreria-cola"]').exists()).toBe(false);
  });

  it('switches to the Cola segment when its tab is selected', async () => {
    const wrapper = await mountPage();
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs.length).toBeGreaterThanOrEqual(3);
    const colaTab = tabs.find((t) => t.text().includes('Cola'));
    expect(colaTab).toBeDefined();
    if (colaTab) {
      await colaTab.trigger('click');
      expect(wrapper.find('[data-testid="tesoreria-cola"]').exists()).toBe(true);
    }
  });
});
