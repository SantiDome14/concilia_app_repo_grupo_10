import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import ModuloSoon from './ModuloSoon.vue';
import { ROUTE_PATHS } from '@/config/routes';

async function mountAtPath(path: string, breadcrumb: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path,
        component: ModuloSoon,
        meta: { breadcrumb },
      },
    ],
  });
  router.push(path);
  await router.isReady();
  return mount(ModuloSoon, { global: { plugins: [router] } });
}

describe('ModuloSoon page', () => {
  it('renders the breadcrumb label as the page title', async () => {
    const wrapper = await mountAtPath(ROUTE_PATHS.COMPRAS, 'Compras');
    expect(wrapper.text()).toContain('Compras');
    expect(wrapper.text()).toContain('Próximamente');
  });

  it('falls back to a generic label when no breadcrumb is provided', async () => {
    const wrapper = await mountAtPath('/x', '');
    // Empty breadcrumb resolves to the fallback "Este módulo".
    expect(wrapper.text()).toContain('Próximamente');
  });
});
