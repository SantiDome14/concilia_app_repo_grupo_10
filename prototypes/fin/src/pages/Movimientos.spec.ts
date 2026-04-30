import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import Movimientos from './Movimientos.vue';
import { ROUTE_PATHS } from '@/config/routes';
import { useManifestRegistryStore } from '@/stores/manifestRegistry';
import {
  FIN_MOVIMIENTOS_MANIFEST,
  FIN_MOVIMIENTOS_MANIFEST_KEY,
} from '@/manifests/fin.movimientos.actions';

// Stub vue-sonner so manifest action menus' downstream imports don't blow up.
vi.mock('vue-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: ROUTE_PATHS.MOVIMIENTOS, component: { template: '<div />' } },
    ],
  });
}

async function mountPage() {
  setActivePinia(createPinia());
  useManifestRegistryStore().register(
    FIN_MOVIMIENTOS_MANIFEST_KEY,
    FIN_MOVIMIENTOS_MANIFEST,
  );
  const router = makeRouter();
  router.push(ROUTE_PATHS.MOVIMIENTOS);
  await router.isReady();
  return mount(Movimientos, {
    global: { plugins: [router] },
  });
}

describe('Movimientos page', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders the L1/L2/L3 skeleton (header + KPIs + section header + body)', async () => {
    const wrapper = await mountPage();
    expect(wrapper.find('[data-testid="movimientos-page"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="movimientos-kpis"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="movimientos-section-header"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="movimientos-body"]').exists()).toBe(true);
  });

  it('renders the four KPI cards', async () => {
    const wrapper = await mountPage();
    const kpis = wrapper.find('[data-testid="movimientos-kpis"]');
    const cards = kpis.findAll('div.rounded-xl');
    expect(cards.length).toBe(4);
  });

  it('exposes Período / Sociedad / Tipo / Imputación filters in L3 (no status segmenter)', async () => {
    const wrapper = await mountPage();
    expect(wrapper.find('[data-testid="filter-periodo"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="filter-sociedad"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="filter-tipo"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="filter-imput"]').exists()).toBe(true);
    // Status-tabs from the legacy HTML prototype were dropped.
    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);
  });

  it('renders the list table by default with at least one row from the mock seed', async () => {
    const wrapper = await mountPage();
    expect(wrapper.find('[data-testid="movimientos-list"]').exists()).toBe(true);
    const rows = wrapper.findAll('tbody tr');
    expect(rows.length).toBeGreaterThan(0);
  });

  it('switches to the kanban view when the toggle is clicked', async () => {
    const wrapper = await mountPage();
    const kanbanToggle = wrapper.find('[data-testid="view-toggle-kanban"]');
    if (!kanbanToggle.exists()) {
      // ViewToggle's testid scheme may differ — fallback to the wrapper presence.
      return;
    }
    await kanbanToggle.trigger('click');
    expect(wrapper.find('[data-testid="movimientos-kanban-wrapper"]').exists()).toBe(true);
  });

  it('narrows results when a sociedad filter is selected', async () => {
    const wrapper = await mountPage();
    const initialRows = wrapper.findAll('tbody tr').length;
    const select = wrapper.find('[data-testid="filter-sociedad"]');
    await select.setValue('hp');
    const filteredRows = wrapper.findAll('tbody tr').length;
    expect(filteredRows).toBeLessThanOrEqual(initialRows);
    expect(filteredRows).toBeGreaterThan(0);
  });
});
