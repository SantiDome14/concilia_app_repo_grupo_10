import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import OtpInput from './OtpInput.vue';

describe('OtpInput', () => {
  it('renders N input slots based on length', () => {
    const wrapper = mount(OtpInput, { props: { length: 6 } });
    expect(wrapper.findAll('input')).toHaveLength(6);
  });

  it('emits the assembled value as a single string after typing', async () => {
    const wrapper = mount(OtpInput, { props: { length: 4 } });
    const inputs = wrapper.findAll('input');
    await inputs[0]!.setValue('1');
    const last1 = wrapper.emitted('update:modelValue')?.at(-1)?.[0];
    expect(last1).toBe('1');
  });

  it('rejects non-digit input in numeric mode', async () => {
    const wrapper = mount(OtpInput, { props: { length: 4, mode: 'numeric' } });
    const inputs = wrapper.findAll('input');
    await inputs[0]!.setValue('a');
    const last = wrapper.emitted('update:modelValue')?.at(-1)?.[0];
    expect(last ?? '').not.toContain('a');
  });

  it('uppercases input in alphanumeric mode', async () => {
    const wrapper = mount(OtpInput, { props: { length: 4, mode: 'alphanumeric' } });
    const inputs = wrapper.findAll('input');
    await inputs[0]!.setValue('a');
    const last = wrapper.emitted('update:modelValue')?.at(-1)?.[0];
    expect(last).toBe('A');
  });

  it('renders dots in mask mode when slots have values', async () => {
    const wrapper = mount(OtpInput, { props: { length: 4, mask: true, modelValue: '12' } });
    const inputs = wrapper.findAll('input');
    expect((inputs[0]!.element as HTMLInputElement).value).toBe('●');
    expect((inputs[1]!.element as HTMLInputElement).value).toBe('●');
    expect((inputs[2]!.element as HTMLInputElement).value).toBe('');
  });
});
