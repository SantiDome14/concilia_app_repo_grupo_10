import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import Inbox from './Inbox.vue';
import { useManifestRegistryStore } from '@/stores/manifestRegistry';
import {
  INBOX_MANIFEST,
  INBOX_MANIFEST_KEY,
} from '@/manifests/fin.inbox.actions';
import { useAuthStore } from '@/stores/auth';
import { ROUTE_PATHS } from '@/config/routes';

vi.mock('vue-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: ROUTE_PATHS.INBOX, component: { template: '<div />' } },
    ],
  });
}

const POPOVER_STUBS = {
  Popover: { template: '<div class="stub-pop"><slot /></div>' },
  PopoverTrigger: {
    template: '<button class="stub-trigger" v-bind="$attrs"><slot /></button>',
    inheritAttrs: false,
  },
  PopoverContent: {
    template: '<div class="stub-content" v-bind="$attrs"><slot /></div>',
    inheritAttrs: false,
  },
};

async function mountInbox() {
  setActivePinia(createPinia());
  // Register the manifest so resolveActionsFor can find actions.
  useManifestRegistryStore().register(INBOX_MANIFEST_KEY, INBOX_MANIFEST);
  // Permissive role list so capabilities don't block visibility.
  useAuthStore().setUser({
    id: 'u-1',
    email: 'u@x',
    name: 'U',
    capabilities: ['ADMIN'],
  });
  const router = makeRouter();
  router.push(ROUTE_PATHS.INBOX);
  await router.isReady();
  const wrapper = mount(Inbox, {
    global: { plugins: [router], stubs: POPOVER_STUBS },
  });
  return { wrapper, router };
}

describe('Inbox page', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('does NOT render an Activos / Histórico Segmenter in the header', async () => {
    const { wrapper } = await mountInbox();
    expect(wrapper.find('[data-testid="inbox-segmenter"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Activos');
    expect(wrapper.text()).not.toContain('Histórico');
  });

  it('renders all Solicitudes (active and terminal) by default; Estado filter narrows them', async () => {
    const { wrapper } = await mountInbox();
    // Mock dataset has SOL-001 (pendiente) and SOL-004 (completed).
    const list = wrapper.find('[data-testid="inbox-list"]');
    expect(list.exists()).toBe(true);
    expect(list.text()).toContain('SOL-001');
    expect(list.text()).toContain('SOL-004');
  });

  it('Estado filter exposes all four state options simultaneously', async () => {
    const { wrapper } = await mountInbox();
    const select = wrapper.find('[data-testid="filter-state"]');
    expect(select.exists()).toBe(true);
    const options = select.findAll('option').map((o) => o.attributes('value'));
    expect(options).toContain('pendiente');
    expect(options).toContain('en_proceso');
    expect(options).toContain('completed');
    expect(options).toContain('rejected');
  });

  it('clicking a row opens the Drawer with the Solicitud title', async () => {
    const { wrapper } = await mountInbox();
    const row = wrapper.find('[data-testid="row-SOL-001"]');
    await row.trigger('click');
    // Drawer mounts via Reka-UI Sheet which portals into <body>.
    expect(wrapper.html()).toContain('Aprobar pago a proveedor #4521');
  });

  it('renders a ManifestActionsMenu trigger on each active row', async () => {
    const { wrapper } = await mountInbox();
    const trigger = wrapper.find('[data-testid="row-SOL-001-actions"]');
    expect(trigger.exists()).toBe(true);
  });

  it('the per-row menu surfaces the cerrar_solicitud action enabled for an active record', async () => {
    const { wrapper } = await mountInbox();
    const item = wrapper.find(
      '[data-testid="manifest-actions-item-inbox.cerrar_solicitud"]',
    );
    expect(item.exists()).toBe(true);
    expect(item.attributes('disabled')).toBeUndefined();
  });
});
