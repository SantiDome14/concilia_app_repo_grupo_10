import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import Clients from './Clients.vue';
import { ROUTE_PATHS, ROUTE_NAMES } from '@/config/routes';

// ════════════════════════════════════════════════════════════════════
// Clients page — integration via MSW
// ────────────────────────────────────────────────────────────────────
// Mounts the page with an in-memory router + the MSW node server
// already booted by tests/setup.ts. Uses `vi.waitFor` to poll the
// DOM rather than fixed `flushPromises` counts — vue-query + the
// 300ms refDebounced timer race in unpredictable ways under jsdom.
// ════════════════════════════════════════════════════════════════════

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: ROUTE_PATHS.CLIENTS, name: ROUTE_NAMES.CLIENTS, component: { template: '<div />' } },
      {
        path: ROUTE_PATHS.CLIENT_DETAIL,
        name: ROUTE_NAMES.CLIENT_DETAIL,
        component: { template: '<div data-testid="detail-stub" />' },
      },
    ],
  });
}

async function mountClients(initialUrl: string = ROUTE_PATHS.CLIENTS) {
  setActivePinia(createPinia());
  if (typeof localStorage !== 'undefined') localStorage.clear();
  const router = makeRouter();
  await router.push(initialUrl);
  await router.isReady();
  const wrapper = mount(Clients, { global: { plugins: [router] } });
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

describe('Clients page', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders the L1 header with the Clientes title', async () => {
    const { wrapper } = await mountClients();
    expect(wrapper.find('h1').text()).toBe('Clientes');
    expect(wrapper.find('[data-testid="clients-page"]').exists()).toBe(true);
  });

  it('renders the search input with the canonical placeholder', async () => {
    const { wrapper } = await mountClients();
    const input = wrapper.find('[data-testid="clients-search"]');
    expect(input.exists()).toBe(true);
    expect(input.attributes('placeholder')).toBe('Buscar por nombre o legajo...');
  });

  it('renders the table with the canonical columns and 25 rows by default', async () => {
    const { wrapper } = await mountClients();
    await waitForRender(wrapper, '[data-testid="clients-table"]');
    const headers = wrapper.findAll('th').map((h) => h.text());
    expect(headers).toEqual(['Nombre', 'Legajo Ardua', 'Estado']);
    expect(wrapper.findAll('tbody tr').length).toBe(25);
    const tableText = wrapper.find('[data-testid="clients-table"]').text();
    expect(tableText).toContain('Activo');
    expect(tableText).toContain('Inactivo');
  });

  it('reads initial q / page / pageSize from the URL on cold load', async () => {
    const { wrapper } = await mountClients(
      `${ROUTE_PATHS.CLIENTS}?q=acme&page=1&pageSize=10`,
    );
    const input = wrapper.find('[data-testid="clients-search"]')
      .element as HTMLInputElement;
    expect(input.value).toBe('acme');
    await waitForRender(wrapper, '[data-testid="clients-table"]');
    expect(wrapper.findAll('tbody tr').length).toBeGreaterThanOrEqual(1);
  });

  it('clicking a row navigates to the detail route with the client id', async () => {
    const { wrapper, router } = await mountClients();
    await waitForRender(wrapper, 'tbody tr');
    const firstRow = wrapper.find('tbody tr');
    const testid = firstRow.attributes('data-testid') ?? '';
    const expectedId = testid.replace(/^row-/, '');
    await firstRow.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.name).toBe(ROUTE_NAMES.CLIENT_DETAIL);
    expect(router.currentRoute.value.params.id).toBe(expectedId);
  });

  it('shows the empty state when q matches nothing', async () => {
    const { wrapper } = await mountClients(`${ROUTE_PATHS.CLIENTS}?q=zzzzzz`);
    await waitForRender(wrapper, '[data-testid="clients-empty"]');
    expect(wrapper.find('[data-testid="clients-table"]').exists()).toBe(false);
  });

  it('persists pageSize selection in localStorage', async () => {
    await mountClients(`${ROUTE_PATHS.CLIENTS}?pageSize=50`);
    expect(localStorage.getItem('trd.clients.pageSize')).toBe('50');
  });
});
