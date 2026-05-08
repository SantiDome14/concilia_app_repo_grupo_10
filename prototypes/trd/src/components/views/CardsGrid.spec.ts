import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CardsGrid from './CardsGrid.vue';

describe('CardsGrid', () => {
  it('renders the default slot content', () => {
    const wrapper = mount(CardsGrid, {
      slots: { default: '<div data-test="card">a card</div>' },
    });
    expect(wrapper.find('[data-test="card"]').exists()).toBe(true);
  });

  it('applies the responsive auto-fill grid template', () => {
    const wrapper = mount(CardsGrid);
    const root = wrapper.element as HTMLElement;
    const classList = root.className;
    expect(classList).toContain('grid');
    expect(classList).toContain('grid-cols-[repeat(auto-fill,minmax(290px,1fr))]');
    expect(classList).toContain('gap-3');
  });

  it('passes through the id prop', () => {
    const wrapper = mount(CardsGrid, { props: { id: 'cards-inbox' } });
    expect(wrapper.attributes('id')).toBe('cards-inbox');
  });

  it('merges a custom class with the grid utilities', () => {
    const wrapper = mount(CardsGrid, { props: { class: 'mt-4' } });
    const classList = (wrapper.element as HTMLElement).className;
    expect(classList).toContain('mt-4');
    expect(classList).toContain('grid-cols-[repeat(auto-fill,minmax(290px,1fr))]');
  });
});
