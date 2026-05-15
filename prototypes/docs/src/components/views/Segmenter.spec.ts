import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Segmenter from './Segmenter.vue';

type Segment = 'active' | 'history';

const baseOptions = [
  { value: 'active' as const, label: 'Activos', count: 12 },
  { value: 'history' as const, label: 'Histórico' },
];

function mountSegmenter(modelValue: Segment = 'active') {
  return mount(Segmenter<Segment>, {
    props: {
      modelValue,
      options: baseOptions,
    },
  });
}

describe('Segmenter', () => {
  it('renders one pill per option with the label', () => {
    const wrapper = mountSegmenter();
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs).toHaveLength(2);
    expect(tabs[0].text()).toContain('Activos');
    expect(tabs[1].text()).toContain('Histórico');
  });

  it('renders the count chip when count is provided', () => {
    const wrapper = mountSegmenter();
    const firstPill = wrapper.findAll('[role="tab"]')[0];
    expect(firstPill.text()).toContain('12');
  });

  it('marks the active option with aria-selected and brand styling', () => {
    const wrapper = mountSegmenter('active');
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs[0].attributes('aria-selected')).toBe('true');
    expect(tabs[1].attributes('aria-selected')).toBe('false');
    expect(tabs[0].classes().some((c) => c.includes('brand'))).toBe(true);
  });

  it('uses role="tablist" on the container', () => {
    const wrapper = mountSegmenter();
    expect(wrapper.attributes('role')).toBe('tablist');
  });

  it('emits update:modelValue when a pill is clicked', async () => {
    const wrapper = mountSegmenter('active');
    await wrapper.findAll('[role="tab"]')[1].trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['history']);
  });

  it('cycles selection with ArrowRight', async () => {
    const wrapper = mountSegmenter('active');
    await wrapper.findAll('[role="tab"]')[0].trigger('keydown', { key: 'ArrowRight' });
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['history']);
  });

  it('cycles selection with ArrowLeft (wraps to last)', async () => {
    const wrapper = mountSegmenter('active');
    await wrapper.findAll('[role="tab"]')[0].trigger('keydown', { key: 'ArrowLeft' });
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['history']);
  });

  it('activates the focused tab on Enter', async () => {
    const wrapper = mountSegmenter('active');
    await wrapper.findAll('[role="tab"]')[1].trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['history']);
  });

  it('renders the trailing slot', () => {
    const wrapper = mount(Segmenter<Segment>, {
      props: { modelValue: 'active', options: baseOptions },
      slots: { trailing: '<span data-test="trail">extra</span>' },
    });
    expect(wrapper.find('[data-test="trail"]').exists()).toBe(true);
  });
});
