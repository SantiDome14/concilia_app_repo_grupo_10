import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import Insights from './Insights.vue';
import { ROUTE_PATHS, ROUTE_NAMES } from '@/config/routes';

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: ROUTE_PATHS.INSIGHTS,
        name: ROUTE_NAMES.INSIGHTS,
        component: { template: '<div />' },
      },
    ],
  });
}

async function mountPage(initialUrl: string = ROUTE_PATHS.INSIGHTS) {
  setActivePinia(createPinia());
  const router = makeRouter();
  await router.push(initialUrl);
  await router.isReady();
  const wrapper = mount(Insights, { global: { plugins: [router] } });
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

describe('Insights page', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders the L1 header + three tab triggers', async () => {
    const { wrapper } = await mountPage();
    expect(wrapper.find('h1').text()).toBe('Insights');
    expect(wrapper.find('[data-testid="tab-alertas-precio"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="tab-eventos"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="tab-noticias"]').exists()).toBe(true);
  });

  it('defaults to the Alertas de precio tab and shows seeded rows', async () => {
    const { wrapper } = await mountPage();
    await waitForRender(wrapper, '[data-testid="price-alerts-table"]');
    expect(wrapper.find('[data-testid="insights-price-alerts-tab"]').exists()).toBe(true);
    const rows = wrapper.findAll('tbody tr');
    expect(rows.length).toBeGreaterThanOrEqual(12);
  });

  it('switching to Eventos shows the Próximamente placeholder', async () => {
    const { wrapper } = await mountPage();
    await wrapper.find('[data-testid="tab-eventos"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-testid="insights-soon-tab"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Eventos de mercado');
    expect(wrapper.text()).toContain('Próximamente');
  });

  it('switching to Noticias shows the Próximamente placeholder', async () => {
    const { wrapper } = await mountPage();
    await wrapper.find('[data-testid="tab-noticias"]').trigger('click');
    await flushPromises();
    expect(wrapper.find('[data-testid="insights-soon-tab"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Noticias del sector');
  });

  it('URL syncs the active tab (omits default)', async () => {
    const { wrapper, router } = await mountPage();
    await wrapper.find('[data-testid="tab-eventos"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.query.tab).toBe('eventos');

    // Switching back to the default tab strips the query.
    await wrapper.find('[data-testid="tab-alertas-precio"]').trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.query.tab).toBeUndefined();
  });

  it('reads initial tab from the URL on cold load', async () => {
    const { wrapper } = await mountPage(`${ROUTE_PATHS.INSIGHTS}?tab=noticias`);
    expect(wrapper.find('[data-testid="insights-soon-tab"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Noticias del sector');
  });

  it('Alertas de precio tab — create CTA opens the modal', async () => {
    const { wrapper } = await mountPage();
    await waitForRender(wrapper, '[data-testid="pa-create-trigger"]');
    await wrapper.find('[data-testid="pa-create-trigger"]').trigger('click');
    await flushPromises();
    await vi.waitFor(
      () => {
        if (!document.body.innerHTML.includes('create-price-alert-modal'))
          throw new Error('modal not yet rendered');
      },
      { timeout: 2000, interval: 25 },
    );
  });

  it('Alertas de precio tab — toggle flips active state optimistically', async () => {
    const { wrapper } = await mountPage();
    await waitForRender(wrapper, '[data-testid="row-pa_001-toggle"]');
    const toggle = wrapper.find('[data-testid="row-pa_001-toggle"]');
    expect(toggle.text()).toBe('Pausar');
    await toggle.trigger('click');
    await vi.waitFor(
      () => {
        const t = wrapper.find('[data-testid="row-pa_001-toggle"]').text();
        if (t !== 'Activar') throw new Error('not yet flipped');
      },
      { timeout: 2000, interval: 25 },
    );
  });
});
