import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import DatePicker from './DatePicker.vue';

describe('DatePicker — single mode', () => {
  it('renders the placeholder when modelValue is null', () => {
    const wrapper = mount(DatePicker);
    expect(wrapper.text()).toContain('Seleccionar fecha…');
  });

  it('formats the modelValue with the locale convention (es-AR by default)', () => {
    const wrapper = mount(DatePicker, {
      props: { modelValue: new Date('2026-03-15T00:00:00Z') },
    });
    expect(wrapper.text()).toMatch(/15 mar 2026|14 mar 2026/);
  });

  it('respects the disabled prop on the trigger', () => {
    const wrapper = mount(DatePicker, { props: { disabled: true } });
    const button = wrapper.find('button');
    expect(button.attributes('disabled')).toBeDefined();
  });
});

describe('DatePicker — range mode', () => {
  it('formats the range with an en-dash separator', () => {
    const wrapper = mount(DatePicker, {
      props: {
        mode: 'range',
        modelValue: {
          start: new Date('2026-03-01T00:00:00Z'),
          end: new Date('2026-03-31T00:00:00Z'),
        },
      },
    });
    expect(wrapper.text()).toContain('–');
  });

  it('renders the placeholder when range modelValue is null', () => {
    const wrapper = mount(DatePicker, {
      props: { mode: 'range', placeholder: 'Período…' },
    });
    expect(wrapper.text()).toContain('Período…');
  });
});
