import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import ResizablePanel from './ResizablePanel.vue';

const SlotStub = defineComponent({
  name: 'SlotStub',
  props: { label: { type: String, required: true } },
  setup: (props) => () => h('div', { class: 'stub' }, props.label),
});

beforeEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
});

describe('ResizablePanel', () => {
  it('renders both panels with the configured initial split', () => {
    const wrapper = mount(ResizablePanel, {
      props: { defaultSize: 40 },
      slots: {
        'panel-1': () => h(SlotStub, { label: 'left' }),
        'panel-2': () => h(SlotStub, { label: 'right' }),
      },
    });
    expect(wrapper.text()).toContain('left');
    expect(wrapper.text()).toContain('right');
    const handle = wrapper.find('[role="separator"]');
    expect(handle.attributes('aria-valuenow')).toBe('40');
  });

  it('exposes ARIA orientation matching the prop', () => {
    const v = mount(ResizablePanel, { props: { orientation: 'vertical' } });
    expect(v.find('[role="separator"]').attributes('aria-orientation')).toBe('vertical');
    const h = mount(ResizablePanel, { props: { orientation: 'horizontal' } });
    expect(h.find('[role="separator"]').attributes('aria-orientation')).toBe('horizontal');
  });

  it('moves the split with arrow keys (5%) and persists', async () => {
    const wrapper = mount(ResizablePanel, {
      props: { defaultSize: 50, min1: 0, min2: 0, storageKey: 'test-key' },
    });
    const handle = wrapper.find('[role="separator"]');
    await handle.trigger('keydown', { key: 'ArrowRight' });
    expect(handle.attributes('aria-valuenow')).toBe('55');
    expect(window.localStorage.getItem('resizable-panel:test-key')).toBe('55');
  });

  it('uses 10% increments when Shift is held', async () => {
    const wrapper = mount(ResizablePanel, {
      props: { defaultSize: 50, min1: 0, min2: 0 },
    });
    const handle = wrapper.find('[role="separator"]');
    await handle.trigger('keydown', { key: 'ArrowRight', shiftKey: true });
    expect(handle.attributes('aria-valuenow')).toBe('60');
  });

  it('restores persisted size on remount', () => {
    window.localStorage.setItem('resizable-panel:remount', '35');
    const wrapper = mount(ResizablePanel, {
      props: { defaultSize: 50, storageKey: 'remount' },
    });
    expect(wrapper.find('[role="separator"]').attributes('aria-valuenow')).toBe('35');
  });
});
