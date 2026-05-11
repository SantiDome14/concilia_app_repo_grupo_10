import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import ManifestActionsMenu from './ManifestActionsMenu.vue';
import { useManifestRegistryStore } from '@/stores/manifestRegistry';
import { useAuthStore } from '@/stores/auth';
import type { Manifest } from '@/types/manifest';

vi.mock('vue-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const TEST_MANIFEST_KEY = 'test.actions.menu';

const TEST_MANIFEST: Manifest = {
  app: 'test',
  module: 'actions.menu',
  scope: 'module',
  schema_version: '1',
  actions: [
    {
      id: 'menu.assign',
      dimension: 'imputacion',
      label: 'Asignar Responsable',
    },
    {
      id: 'menu.approve',
      dimension: 'governance',
      label: 'Aprobar / Rechazar',
    },
    {
      id: 'menu.confirm',
      dimension: 'governance',
      label: 'Confirmar registro',
      enable_when: { field_equals: { field: 'flag', value: true } },
      disable_reason: 'Falta prerequisito',
      disable_tag: 'PREREQUISITO',
    },
    {
      id: 'menu.cancel',
      dimension: 'governance',
      label: 'Anular registro',
      danger: true,
      enable_when: { field_equals: { field: 'flag', value: 'never' } },
      disable_reason: 'Funcionalidad planificada para la próxima versión',
      disable_tag: 'V2',
    },
    {
      id: 'menu.invoice',
      dimension: 'documentacion',
      label: 'Generar comprobante',
    },
  ],
};

const STUBS = {
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

function mountMenu(
  recordOverrides: Record<string, unknown> = {},
  manifestKey: string = TEST_MANIFEST_KEY,
  manifest: Manifest | null = TEST_MANIFEST,
  variant: 'table' | 'card' = 'table',
) {
  setActivePinia(createPinia());
  if (manifest) {
    useManifestRegistryStore().register(manifestKey, manifest);
  }
  useAuthStore().setUser({
    id: 'u-1',
    email: 'u@x',
    name: 'U',
    capabilities: ['ADMIN'],
  });
  const record = { id: 'rec-1', flag: false, ...recordOverrides };
  return mount(ManifestActionsMenu, {
    props: { manifestKey, record, variant },
    global: { stubs: STUBS },
  });
}

describe('ManifestActionsMenu', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders the table-variant 28×28 trigger by default', () => {
    const w = mountMenu({}, TEST_MANIFEST_KEY, TEST_MANIFEST, 'table');
    const trigger = w.find('[data-testid="manifest-actions-trigger"]');
    expect(trigger.exists()).toBe(true);
    expect(trigger.classes().join(' ')).toMatch(/h-7/);
    expect(trigger.classes().join(' ')).toMatch(/w-7/);
  });

  it('renders the card-variant 24×24 trigger when variant="card"', () => {
    const w = mountMenu({}, TEST_MANIFEST_KEY, TEST_MANIFEST, 'card');
    const trigger = w.find('[data-testid="manifest-actions-trigger"]');
    expect(trigger.classes().join(' ')).toMatch(/h-6/);
    expect(trigger.classes().join(' ')).toMatch(/w-6/);
  });

  it('shows the "Acciones del registro" header in the popover content', () => {
    const w = mountMenu();
    const content = w.find('[data-testid="manifest-actions-menu"]');
    expect(content.exists()).toBe(true);
    expect(content.text()).toContain('Acciones del registro');
  });

  it('groups items by dimension in canonical order (imputacion → cierre)', () => {
    const w = mountMenu();
    const html = w.html();
    const idxImp = html.indexOf('manifest-actions-section-imputacion');
    const idxGov = html.indexOf('manifest-actions-section-governance');
    const idxDoc = html.indexOf('manifest-actions-section-documentacion');
    expect(idxImp).toBeGreaterThan(-1);
    expect(idxGov).toBeGreaterThan(-1);
    expect(idxDoc).toBeGreaterThan(-1);
    expect(idxImp).toBeLessThan(idxGov);
    expect(idxGov).toBeLessThan(idxDoc);
  });

  it('disabled items have disabled attr, title from reason, and chip from tag', () => {
    const w = mountMenu({ flag: false });
    const item = w.find('[data-testid="manifest-actions-item-menu.confirm"]');
    expect(item.exists()).toBe(true);
    expect(item.attributes('disabled')).toBeDefined();
    expect(item.attributes('title')).toBe('Falta prerequisito');
    expect(item.text()).toContain('PREREQUISITO');
  });

  it('danger items render with text-danger class', () => {
    // Make the danger action enabled by satisfying enable_when.
    const w = mountMenu({ flag: 'never' });
    const item = w.find('[data-testid="manifest-actions-item-menu.cancel"]');
    expect(item.exists()).toBe(true);
    expect(item.attributes('disabled')).toBeUndefined();
    expect(item.classes().join(' ')).toMatch(/text-danger/);
  });

  it('clicking an enabled item calls openDialog via the manifest module', async () => {
    const w = mountMenu({ flag: true });
    // Stub openDialog by intercepting useManifestModule via the prop call.
    const item = w.find('[data-testid="manifest-actions-item-menu.assign"]');
    expect(item.exists()).toBe(true);
    expect(item.attributes('disabled')).toBeUndefined();
    // Just make sure clicking does not throw and the dialog state is set
    // via the global composable.
    const { useManifestDialog } = await import(
      '@/composables/useManifestDialog'
    );
    const dlg = useManifestDialog();
    await item.trigger('click');
    expect(dlg.state.value).not.toBeNull();
    if (dlg.state.value && dlg.state.value.mode === 'single') {
      expect(dlg.state.value.action.id).toBe('menu.assign');
    } else {
      throw new Error('Expected single-mode dialog');
    }
    dlg.cancel();
  });

  it('clicking a disabled item is a no-op (no dialog opens)', async () => {
    const w = mountMenu({ flag: false });
    const { useManifestDialog } = await import(
      '@/composables/useManifestDialog'
    );
    const dlg = useManifestDialog();
    dlg.cancel();
    const item = w.find('[data-testid="manifest-actions-item-menu.confirm"]');
    expect(item.attributes('disabled')).toBeDefined();
    await item.trigger('click');
    expect(dlg.state.value).toBeNull();
  });

  it('shows "Sin acciones disponibles" when resolveActions yields nothing', () => {
    // Empty manifest → no actions resolve.
    const emptyManifest: Manifest = {
      app: 'test',
      module: 'empty',
      scope: 'module',
      schema_version: '1',
      actions: [],
    };
    const w = mountMenu({}, 'test.empty', emptyManifest);
    expect(w.find('[data-testid="manifest-actions-empty"]').exists()).toBe(true);
    expect(w.text()).toContain('Sin acciones disponibles');
  });
});
