import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AppearanceToggle from './AppearanceToggle.vue';

describe('AppearanceToggle', () => {
  it('renders three options with the active one marked', () => {
    const wrapper = mount(AppearanceToggle, { props: { modelValue: 'dark' } });
    const buttons = wrapper.findAll('[role="radio"]');
    expect(buttons).toHaveLength(3);
    const active = wrapper.find('[aria-checked="true"]');
    expect(active.attributes('data-testid')).toBe('appearance-dark');
  });

  it('emits update:modelValue when a non-active option is clicked', async () => {
    const wrapper = mount(AppearanceToggle, { props: { modelValue: 'dark' } });
    await wrapper.find('[data-testid="appearance-light"]').trigger('click');
    const events = wrapper.emitted('update:modelValue');
    expect(events).toBeTruthy();
    expect(events?.[0]).toEqual(['light']);
  });

  it('does NOT emit when the active option is clicked', async () => {
    const wrapper = mount(AppearanceToggle, { props: { modelValue: 'system' } });
    await wrapper.find('[data-testid="appearance-system"]').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });
});
