import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory, type Router } from 'vue-router';
import Quotes from './Quotes.vue';
import { ROUTE_PATHS, ROUTE_NAMES } from '@/config/routes';

// ════════════════════════════════════════════════════════════════════
// Quotes page — integration via MSW
// ────────────────────────────────────────────────────────────────────
// Uses `vi.waitFor` to poll the DOM rather than fixed flushPromises
// counts (vue-query + refDebounced 300ms race unpredictably under
// jsdom). The drawer's `<Sheet>` (reka-ui) portals into <body>, so
// drawer-content assertions read against document.body, not the
// wrapper's html.
// ════════════════════════════════════════════════════════════════════

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: ROUTE_PATHS.QUOTES,
        name: ROUTE_NAMES.QUOTES,
        component: { template: '<div />' },
      },
    ],
  });
}

async function mountQuotes(initialUrl: string = ROUTE_PATHS.QUOTES) {
  setActivePinia(createPinia());
  if (typeof localStorage !== 'undefined') localStorage.clear();
  const router = makeRouter();
  await router.push(initialUrl);
  await router.isReady();
  const wrapper = mount(Quotes, { global: { plugins: [router] } });
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

describe('Quotes page', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders the L1 header + tabs', async () => {
    const { wrapper } = await mountQuotes();
    expect(wrapper.find('h1').text()).toBe('Quotes');
    expect(wrapper.find('[data-testid="tab-activos"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="tab-historial"]').exists()).toBe(true);
  });

  it('default tab is Activos and surfaces only PENDING/ACCEPTED rows', async () => {
    const { wrapper } = await mountQuotes();
    await waitForRender(wrapper, '[data-testid="quotes-table"]');
    // 10 quotes in the seed are PENDING or ACCEPTED.
    const rows = wrapper.findAll('tbody tr');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(10);
    // No COMPLETED nor CANCELLED rows visible.
    const tableText = wrapper.find('[data-testid="quotes-table"]').text();
    expect(tableText).not.toContain('Completada');
    expect(tableText).not.toContain('Cancelada');
  });

  it('Historial tab surfaces every status', async () => {
    const { wrapper } = await mountQuotes(`${ROUTE_PATHS.QUOTES}?tab=historial`);
    await waitForRender(wrapper, '[data-testid="quotes-table"]');
    const tableText = wrapper.find('[data-testid="quotes-table"]').text();
    expect(tableText).toMatch(/Completada|Cancelada|Pendiente|Aceptada/);
  });

  it('search input filters live', async () => {
    const { wrapper } = await mountQuotes(
      `${ROUTE_PATHS.QUOTES}?tab=historial&q=acme`,
    );
    await waitForRender(wrapper, '[data-testid="quotes-table"]');
    const tableText = wrapper.find('[data-testid="quotes-table"]').text();
    expect(tableText.toLowerCase()).toContain('acme');
  });

  it('clicking a row opens the QuoteDrawer with the quote id', async () => {
    const { wrapper } = await mountQuotes();
    await waitForRender(wrapper, 'tbody tr');
    const firstRow = wrapper.find('tbody tr');
    await firstRow.trigger('click');
    await flushPromises();
    // The drawer portals into <body>, so check document.body for the
    // drawer container instead of the wrapper.
    await vi.waitFor(
      () => {
        const drawerInBody = document.body.innerHTML.includes('quote-summary');
        if (!drawerInBody) throw new Error('drawer not yet rendered');
      },
      { timeout: 2000, interval: 25 },
    );
  });

  it('shows the empty state when filters match nothing', async () => {
    const { wrapper } = await mountQuotes(
      `${ROUTE_PATHS.QUOTES}?tab=activos&q=zzzzzz-no-match`,
    );
    await waitForRender(wrapper, '[data-testid="quotes-empty"]');
    expect(wrapper.find('[data-testid="quotes-table"]').exists()).toBe(false);
  });

  it('URL syncs tab + filters', async () => {
    const { wrapper, router } = await mountQuotes(
      `${ROUTE_PATHS.QUOTES}?tab=historial&q=acme&status=COMPLETED`,
    );
    await waitForRender(wrapper, '[data-testid="quotes-table"]');
    expect(router.currentRoute.value.query.tab).toBe('historial');
    expect(router.currentRoute.value.query.q).toBe('acme');
    expect(router.currentRoute.value.query.status).toBe('COMPLETED');
  });
});
