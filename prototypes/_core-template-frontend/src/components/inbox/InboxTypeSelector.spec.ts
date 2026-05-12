import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import InboxTypeSelector from './InboxTypeSelector.vue';
import type { InboxTypeConfig } from '@/types/genericos';

const SOLICITUD: InboxTypeConfig = {
  concept: 'aprobacion_pago',
  type: 'solicitud',
  label: 'Aprobación de pago',
  target_app: 'CORE',
  target_role: 'FIN_OFFICER',
  payload_schema: [],
  closeActions: [
    { id: 'ok', label: 'OK', terminal_state: 'completed' },
  ],
};

const TAREA: InboxTypeConfig = {
  concept: 'baja_usuario',
  type: 'tarea',
  label: 'Baja de usuario',
  target_app: 'CORE',
  payload_schema: [],
  closeActions: [
    { id: 'done', label: 'Hecha', terminal_state: 'completed' },
  ],
};

describe('InboxTypeSelector', () => {
  it('renders one entry per type with type-badge + label + target_app', () => {
    const wrapper = mount(InboxTypeSelector, { props: { types: [SOLICITUD, TAREA] } });
    const items = wrapper.findAll('[data-testid^="inbox-type-"]');
    expect(items.length).toBe(2);
    expect(items[0]!.text()).toContain('Solicitud');
    expect(items[0]!.text()).toContain('Aprobación de pago');
    expect(items[0]!.text()).toContain('CORE');
    expect(items[1]!.text()).toContain('Tarea');
    expect(items[1]!.text()).toContain('Baja de usuario');
  });

  it('emits `select` with the matching InboxTypeConfig on click', async () => {
    const wrapper = mount(InboxTypeSelector, { props: { types: [SOLICITUD, TAREA] } });
    await wrapper.find('[data-testid="inbox-type-baja_usuario"]').trigger('click');
    expect(wrapper.emitted('select')).toBeTruthy();
    expect(wrapper.emitted('select')![0]![0]).toEqual(TAREA);
  });

  it('renders empty list (no items) when types is empty', () => {
    const wrapper = mount(InboxTypeSelector, { props: { types: [] } });
    expect(wrapper.findAll('[data-testid^="inbox-type-"]').length).toBe(0);
  });
});
