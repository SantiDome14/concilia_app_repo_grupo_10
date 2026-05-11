import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ViewToggle, { type ViewMode } from './ViewToggle.vue';

function mountToggle(views: ViewMode[], modelValue: ViewMode) {
  return mount(ViewToggle, { props: { modelValue, views } });
}

describe('ViewToggle', () => {
  it('hides itself when only one view is declared', () => {
    const wrapper = mountToggle(['list'], 'list');
    expect(wrapper.find('[role="group"]').exists()).toBe(false);
  });

  it('renders one button per declared view', () => {
    const wrapper = mountToggle(['list', 'cards', 'kanban'], 'list');
    expect(wrapper.findAll('button')).toHaveLength(3);
  });

  it('renders only declared views (omits undeclared ones)', () => {
    const wrapper = mountToggle(['list', 'cards'], 'list');
    const buttons = wrapper.findAll('button');
    expect(buttons).toHaveLength(2);
    const labels = buttons.map((b) => b.attributes('title'));
    expect(labels).toEqual(['Lista', 'Tarjetas']);
    expect(labels).not.toContain('Tablero');
  });

  it('marks the active button with aria-pressed=true', () => {
    const wrapper = mountToggle(['list', 'cards'], 'cards');
    const buttons = wrapper.findAll('button');
    expect(buttons[0].attributes('aria-pressed')).toBe('false');
    expect(buttons[1].attributes('aria-pressed')).toBe('true');
  });

  it('emits update:modelValue when a non-active button is clicked', async () => {
    const wrapper = mountToggle(['list', 'cards', 'kanban'], 'list');
    await wrapper.findAll('button')[2].trigger('click');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['kanban']);
  });

  it('does not emit when the active button is clicked again', async () => {
    const wrapper = mountToggle(['list', 'cards'], 'list');
    await wrapper.findAll('button')[0].trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('exposes a title attribute on every button for accessibility', () => {
    const wrapper = mountToggle(['list', 'cards', 'kanban'], 'list');
    const titles = wrapper.findAll('button').map((b) => b.attributes('title'));
    expect(titles).toEqual(['Lista', 'Tarjetas', 'Tablero']);
  });
});
