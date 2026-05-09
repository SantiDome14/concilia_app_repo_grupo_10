import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { computed, defineComponent, h, ref } from 'vue';
import Sidebar from './Sidebar.vue';

vi.mock('vue-router', () => ({
  useRoute: () => ({ name: 'home' }),
  RouterLink: defineComponent({
    name: 'RouterLink',
    props: { to: { type: String, required: true } },
    setup: (_, { slots }) => () => h('a', { href: '#' }, slots.default?.()),
  }),
}));

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    user: computed(() => ({ name: 'Test User', email: 'test@example.com' })),
    logout: vi.fn(async () => {}),
  }),
}));

vi.mock('@/composables/useSettingsDialog', () => ({
  useSettingsDialog: () => ({
    isOpen: ref(false),
    open: vi.fn(),
    close: vi.fn(),
    set: vi.fn(),
  }),
}));

describe('Sidebar — block structure', () => {
  it('renders three blocks in the canonical order: Operaciones → Custodia → Catálogos', () => {
    const text = mount(Sidebar).text();
    const i = (s: string) => text.indexOf(s);
    expect(i('Operaciones')).toBeGreaterThan(-1);
    expect(i('Custodia')).toBeGreaterThan(i('Operaciones'));
    expect(i('Catálogos')).toBeGreaterThan(i('Custodia'));
  });

  it('places Movimientos and Cotizaciones (in that order) under Operaciones', () => {
    const text = mount(Sidebar).text();
    expect(text.indexOf('Movimientos')).toBeGreaterThan(text.indexOf('Operaciones'));
    expect(text.indexOf('Cotizaciones')).toBeGreaterThan(text.indexOf('Movimientos'));
    expect(text.indexOf('Cotizaciones')).toBeLessThan(text.indexOf('Custodia'));
  });

  it('places PSP as the only entry under Custodia', () => {
    const text = mount(Sidebar).text();
    expect(text.indexOf('PSP')).toBeGreaterThan(text.indexOf('Custodia'));
    expect(text.indexOf('PSP')).toBeLessThan(text.indexOf('Catálogos'));
  });

  it('places Clientes, Instrucciones, and Bancos / Cuentas under Catálogos in that order', () => {
    const text = mount(Sidebar).text();
    expect(text.indexOf('Clientes')).toBeGreaterThan(text.indexOf('Catálogos'));
    expect(text.indexOf('Instrucciones')).toBeGreaterThan(text.indexOf('Clientes'));
    expect(text.indexOf('Bancos / Cuentas')).toBeGreaterThan(text.indexOf('Instrucciones'));
  });

  it('does not place Clientes or PSP under Operaciones any longer', () => {
    const text = mount(Sidebar).text();
    expect(text.indexOf('Clientes')).toBeGreaterThan(text.indexOf('Custodia'));
    expect(text.indexOf('PSP')).toBeGreaterThan(text.indexOf('Operaciones'));
    expect(text.indexOf('PSP')).toBeLessThan(text.indexOf('Catálogos'));
  });
});
