import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import InboxCreateCTA from './InboxCreateCTA.vue';
import { useAuthStore } from '@/stores/auth';

// Mock the registry to control what the CTA sees, so we can exercise
// the visibility / disabled / label-derivation matrix without coupling
// to the template's shipped registry contents.
vi.mock('@/config/inbox-types', () => {
  return {
    INBOX_TYPES_REGISTRY: {},
    getInboxTypeConfig: () => undefined,
    hasAnyCreableType: () => mockHasCreable(),
    listCreableTypes: (caps: readonly string[]) => mockListCreable(caps),
  };
});

let mockHasCreable: () => boolean = () => false;
let mockListCreable: (caps: readonly string[]) => Array<{
  type: string;
  kind: 'solicitud' | 'tarea';
}> = () => [];

vi.mock('vue-sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const DIALOG_STUBS = {
  Dialog: { template: '<div><slot /></div>' },
  DialogContent: { template: '<div><slot /></div>' },
  DialogHeader: { template: '<div><slot /></div>' },
  DialogTitle: { template: '<div><slot /></div>' },
  DialogDescription: { template: '<div><slot /></div>' },
  DialogFooter: { template: '<div><slot /></div>' },
};

function setUser(capabilities: string[]): void {
  useAuthStore().setUser({
    id: 'u-test',
    email: 'u@x',
    name: 'U',
    capabilities,
  });
}

function mountCta() {
  setActivePinia(createPinia());
  return mount(InboxCreateCTA, { global: { stubs: DIALOG_STUBS } });
}

describe('InboxCreateCTA', () => {
  it('renders nothing when the registry declares no creable type', () => {
    mockHasCreable = () => false;
    mockListCreable = () => [];
    setActivePinia(createPinia());
    setUser([]);
    const wrapper = mount(InboxCreateCTA, { global: { stubs: DIALOG_STUBS } });
    expect(wrapper.find('[data-testid="inbox-create-cta"]').exists()).toBe(false);
  });

  it('renders disabled-with-tooltip when registry has creable types but user lacks capability', () => {
    mockHasCreable = () => true;
    mockListCreable = () => []; // no matching capability
    setActivePinia(createPinia());
    setUser([]);
    const wrapper = mount(InboxCreateCTA, { global: { stubs: DIALOG_STUBS } });
    const btn = wrapper.find('[data-testid="inbox-create-cta"]');
    expect(btn.exists()).toBe(true);
    expect(btn.attributes('disabled')).toBeDefined();
    expect(btn.attributes('title')).toBe('Sin permiso para crear');
  });

  it('renders enabled with label "Crear Solicitud" when only solicitud-kind types are creable', () => {
    mockHasCreable = () => true;
    mockListCreable = () => [
      { type: 't1', kind: 'solicitud' },
      { type: 't2', kind: 'solicitud' },
    ];
    setActivePinia(createPinia());
    setUser(['*']);
    const wrapper = mountCta();
    const btn = wrapper.find('[data-testid="inbox-create-cta"]');
    expect(btn.exists()).toBe(true);
    expect(btn.attributes('disabled')).toBeUndefined();
    expect(btn.text()).toContain('Crear Solicitud');
  });

  it('renders label "Crear Tarea" when only tarea-kind types are creable', () => {
    mockHasCreable = () => true;
    mockListCreable = () => [{ type: 't1', kind: 'tarea' }];
    setActivePinia(createPinia());
    setUser(['*']);
    const wrapper = mountCta();
    expect(wrapper.find('[data-testid="inbox-create-cta"]').text()).toContain(
      'Crear Tarea',
    );
  });

  it('renders label "Crear" (generic) when mixed kinds are creable', () => {
    mockHasCreable = () => true;
    mockListCreable = () => [
      { type: 't1', kind: 'solicitud' },
      { type: 't2', kind: 'tarea' },
    ];
    setActivePinia(createPinia());
    setUser(['*']);
    const wrapper = mountCta();
    const btn = wrapper.find('[data-testid="inbox-create-cta"]');
    expect(btn.text().trim()).toBe('Crear');
  });
});
