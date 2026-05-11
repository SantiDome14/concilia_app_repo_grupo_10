import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DynamicKeyValueFields from './DynamicKeyValueFields.vue';

interface Row {
  key: string;
  value: string;
  index: number;
}

describe('DynamicKeyValueFields', () => {
  it('renders an empty state with the Agregar fila button when no rows', () => {
    const wrapper = mount(DynamicKeyValueFields);
    expect(wrapper.text()).toContain('Agregar fila');
    expect(wrapper.findAll('input')).toHaveLength(0);
  });

  it('appends a new empty row on Agregar fila click', async () => {
    const wrapper = mount(DynamicKeyValueFields, { props: { modelValue: [] } });
    await wrapper.find('button:last-child').trigger('click');
    const events = wrapper.emitted('update:modelValue');
    expect(events).toBeTruthy();
    const last = events?.at(-1)?.[0] as Row[];
    expect(last).toHaveLength(1);
    expect(last[0]?.index).toBe(0);
  });

  it('removes a row and re-indexes remaining rows', async () => {
    const wrapper = mount(DynamicKeyValueFields, {
      props: {
        modelValue: [
          { key: 'a', value: '1', index: 0 },
          { key: 'b', value: '2', index: 1 },
          { key: 'c', value: '3', index: 2 },
        ],
      },
    });
    // Click the remove button on row index 1.
    const removeBtns = wrapper
      .findAll('button')
      .filter((b) => b.attributes('aria-label')?.startsWith('Eliminar fila'));
    await removeBtns[1]!.trigger('click');
    const last = wrapper.emitted('update:modelValue')?.at(-1)?.[0] as Row[];
    expect(last).toHaveLength(2);
    expect(last.map((r) => r.index)).toEqual([0, 1]);
    expect(last.map((r) => r.key)).toEqual(['a', 'c']);
  });

  it('blocks remove when row count equals minRows', async () => {
    const wrapper = mount(DynamicKeyValueFields, {
      props: {
        minRows: 2,
        modelValue: [
          { key: 'a', value: '1', index: 0 },
          { key: 'b', value: '2', index: 1 },
        ],
      },
    });
    const removeBtns = wrapper
      .findAll('button')
      .filter((b) => b.attributes('aria-label')?.startsWith('Eliminar fila'));
    expect(removeBtns[0]!.attributes('disabled')).toBeDefined();
  });

  it('blocks add when row count equals maxRows', async () => {
    const wrapper = mount(DynamicKeyValueFields, {
      props: {
        maxRows: 1,
        modelValue: [{ key: 'a', value: '1', index: 0 }],
      },
    });
    const addBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Agregar fila'));
    expect(addBtn).toBeDefined();
    expect(addBtn!.attributes('disabled')).toBeDefined();
  });
});
