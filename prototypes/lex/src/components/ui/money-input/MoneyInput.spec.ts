import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MoneyInput from './MoneyInput.vue';

describe('MoneyInput', () => {
  it('renders the currency symbol prefix', () => {
    const wrapper = mount(MoneyInput, { props: { currency: 'USD' } });
    expect(wrapper.text()).toMatch(/US\$|\$/);
  });

  it('formats the modelValue with es-AR conventions on initial render', () => {
    const wrapper = mount(MoneyInput, {
      props: { currency: 'ARS', modelValue: 1234567.89 },
    });
    const input = wrapper.find('input');
    expect(input.element.value).toMatch(/1\.234\.567,89|1234567,89/);
  });

  it('emits a number on blur after parsing the user input', async () => {
    const wrapper = mount(MoneyInput, { props: { currency: 'ARS' } });
    const input = wrapper.find('input');
    await input.setValue('1.234,56');
    await input.trigger('blur');
    const events = wrapper.emitted('update:modelValue');
    const last = events?.at(-1)?.[0];
    expect(typeof last).toBe('number');
    expect(last).toBeCloseTo(1234.56);
  });

  it('strips the negative sign when allowNegative is false (default)', async () => {
    const wrapper = mount(MoneyInput, { props: { currency: 'ARS' } });
    const input = wrapper.find('input');
    await input.setValue('-100');
    await input.trigger('blur');
    const last = wrapper.emitted('update:modelValue')?.at(-1)?.[0];
    expect(last).toBe(100);
  });

  it('preserves the negative sign when allowNegative is true', async () => {
    const wrapper = mount(MoneyInput, {
      props: { currency: 'ARS', allowNegative: true },
    });
    const input = wrapper.find('input');
    await input.setValue('-100');
    await input.trigger('blur');
    const last = wrapper.emitted('update:modelValue')?.at(-1)?.[0];
    expect(last).toBe(-100);
  });
});
