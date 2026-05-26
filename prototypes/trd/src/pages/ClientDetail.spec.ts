import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import { http, HttpResponse } from 'msw';
import ClientDetail from './ClientDetail.vue';
import { ROUTE_PATHS, ROUTE_NAMES } from '@/config/routes';
import { ENDPOINTS } from '@/api/endpoints';
import { server } from '@/mocks/server';

// ════════════════════════════════════════════════════════════════════
// ClientDetail page — integration via MSW
// ────────────────────────────────────────────────────────────────────
// Mounts the detail page with a parameterized route. Uses MSW handler
// overrides via `server.use(...)` to exercise the 5xx retry surface
// for the limits card without touching the underlying seed.
// ════════════════════════════════════════════════════════════════════

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: ROUTE_PATHS.CLIENTS, name: ROUTE_NAMES.CLIENTS, component: { template: '<div />' } },
      {
        path: ROUTE_PATHS.CLIENT_DETAIL,
        name: ROUTE_NAMES.CLIENT_DETAIL,
        component: { template: '<div />' },
      },
    ],
  });
}

async function mountDetail(id: string) {
  setActivePinia(createPinia());
  const router = makeRouter();
  await router.push({ name: ROUTE_NAMES.CLIENT_DETAIL, params: { id } });
  await router.isReady();
  const wrapper = mount(ClientDetail, { global: { plugins: [router] } });
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

describe('ClientDetail page', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders the three sections for a known client', async () => {
    const { wrapper } = await mountDetail('cl_001');
    await waitForRender(wrapper, '[data-testid="client-info-card"]');

    expect(wrapper.find('[data-testid="client-info-card"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="client-limits-card"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="client-balances-card"]').exists()).toBe(true);

    expect(wrapper.find('[data-testid="client-name"]').text()).toBe('ACME S.A.');
    expect(wrapper.text()).toContain('Activo');
  });

  it('renders Información with ID, Nombre, Legajo Ardua, Legajo Circuit, Estado', async () => {
    const { wrapper } = await mountDetail('cl_001');
    await waitForRender(wrapper, '[data-testid="client-info-card"]');
    const info = wrapper.find('[data-testid="client-info-card"]').text();
    expect(info).toContain('ID');
    expect(info).toContain('cl_001');
    expect(info).toContain('Nombre');
    expect(info).toContain('ACME S.A.');
    expect(info).toContain('Legajo Ardua');
    expect(info).toContain('21548');
    expect(info).toContain('Legajo Circuit');
    expect(info).toContain('CP-21548');
    expect(info).toContain('Estado');
  });

  it('renders em-dash for null Legajo Circuit', async () => {
    // cl_004 has circuit_docket = null in the seed.
    const { wrapper } = await mountDetail('cl_004');
    await waitForRender(wrapper, '[data-testid="client-info-card"]');
    const info = wrapper.find('[data-testid="client-info-card"]').text();
    expect(info).toContain('Legajo Circuit');
    expect(info).toContain('—');
  });

  it('shows the not-found EmptyState for an unknown id', async () => {
    const { wrapper } = await mountDetail('does-not-exist');
    await waitForRender(wrapper, '[data-testid="client-not-found"]');
    expect(wrapper.text()).toContain('Cliente no encontrado');
    expect(wrapper.text()).toContain('Volver a Clientes');
    expect(wrapper.find('[data-testid="client-info-card"]').exists()).toBe(false);
  });

  it('renders Sin límites configurados for a client with no limits', async () => {
    // cl_007 is in the seed but has no entry in initialLimits.
    const { wrapper } = await mountDetail('cl_007');
    await waitForRender(wrapper, '[data-testid="client-limits-empty"]');
    expect(wrapper.find('[data-testid="client-limits-empty"]').text()).toContain(
      'Sin límites configurados',
    );
  });

  it('renders the limits error banner with a Retry button on 5xx', async () => {
    // Override the limits handler to return 500 for cl_001 specifically.
    server.use(
      http.get(`*${ENDPOINTS.clients.limits(':id')}`, async () =>
        HttpResponse.json(
          { message: 'forced 500', code: 'INTERNAL_ERROR' },
          { status: 500 },
        ),
      ),
    );

    const { wrapper } = await mountDetail('cl_001');
    await waitForRender(wrapper, '[data-testid="client-limits-error"]');
    expect(wrapper.find('[data-testid="client-limits-error"]').text()).toContain(
      'Reintentar',
    );
    // Información still renders despite the limits failure.
    expect(wrapper.find('[data-testid="client-info-card"]').exists()).toBe(true);
    // Balances either render normally or surface their own loading/empty,
    // but they should NOT be in error state because of the limits 500.
    expect(wrapper.find('[data-testid="client-balances-error"]').exists()).toBe(
      false,
    );
  });
});
