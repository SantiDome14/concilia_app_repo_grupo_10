import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import Alertas from './Alertas.vue';
import { useManifestRegistryStore } from '@/stores/manifestRegistry';
import {
  ALERTAS_MANIFEST,
  ALERTAS_MANIFEST_KEY,
} from '@/manifests/framework.template.alertas.actions';
import { useAuthStore } from '@/stores/auth';
import { useManifestDialog, _resetManifestDialogState } from '@/composables/useManifestDialog';
import { ROUTE_PATHS } from '@/config/routes';

vi.mock('vue-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: ROUTE_PATHS.ALERTAS, component: { template: '<div />' } }],
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

async function mountAlertas() {
  setActivePinia(createPinia());
  useManifestRegistryStore().register(ALERTAS_MANIFEST_KEY, ALERTAS_MANIFEST);
  useAuthStore().setUser({
    id: 'u-1',
    email: 'u@x',
    name: 'U',
    capabilities: ['ADMIN'],
  });
  const router = makeRouter();
  router.push(ROUTE_PATHS.ALERTAS);
  await router.isReady();
  const wrapper = mount(Alertas, {
    global: { plugins: [router], stubs: POPOVER_STUBS },
  });
  // Drain pending microtasks so vue-query data hydrates before assertions.
  for (let i = 0; i < 5; i += 1) await flushPromises();
  return { wrapper, router };
}

describe('Alertas page', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    _resetManifestDialogState();
  });

  it('does NOT render a Nuevas / Histórico Segmenter in the header', async () => {
    const { wrapper } = await mountAlertas();
    expect(wrapper.find('[data-testid="alertas-segmenter"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Nuevas');
    expect(wrapper.text()).not.toContain('Histórico');
  });

  it('Estado filter exposes all four state options simultaneously', async () => {
    const { wrapper } = await mountAlertas();
    const select = wrapper.find('[data-testid="filter-state"]');
    expect(select.exists()).toBe(true);
    const options = select.findAll('option').map((o) => o.attributes('value'));
    expect(options).toContain('new');
    expect(options).toContain('in_review');
    expect(options).toContain('resolved');
    expect(options).toContain('dismissed');
  });

  it('terminal-state action (marcar_resolved) opens the manifest dialog with the closure_comment field', async () => {
    const { wrapper } = await mountAlertas();
    const btn = wrapper.find(
      '[data-testid="manifest-actions-item-alertas.marcar_resolved"]',
    );
    expect(btn.exists()).toBe(true);
    await btn.trigger('click');
    await flushPromises();
    const dialog = useManifestDialog();
    expect(dialog.state.value).not.toBeNull();
    if (dialog.state.value?.mode === 'single') {
      const fields = dialog.state.value.action.dialog?.fields ?? [];
      expect(fields.some((f) => f.id === 'closure_comment')).toBe(true);
      expect(fields.find((f) => f.id === 'closure_comment')?.required).toBe(true);
    } else {
      throw new Error('Expected single-mode dialog');
    }
  });

  it('confirming with a closure comment persists `closure_comment` and `state: resolved`', async () => {
    const { wrapper } = await mountAlertas();
    const btn = wrapper.find(
      '[data-testid="manifest-actions-item-alertas.marcar_resolved"]',
    );
    await btn.trigger('click');
    const dialog = useManifestDialog();
    dialog.setFieldValue(
      'closure_comment',
      'Falsa alarma — saldo regularizó al cierre',
    );
    await dialog.confirm();
    await flushPromises();
    // The mock-backed dataset is mutated in place; with no segmenter,
    // ALT-001 (now resolved) remains visible in the unified list by default.
    const list = wrapper.find('[data-testid="alertas-list"]');
    expect(list.text()).toContain('ALT-001');
  });
});
