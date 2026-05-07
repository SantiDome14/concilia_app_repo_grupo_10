import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import Carousel from './Carousel.vue';

// Embla touches the DOM heavily; minimal smoke tests cover the
// declarative rendering surface (slots, dots, arrows, ARIA).
vi.mock('embla-carousel-vue', () => ({
  default: () => [
    { value: null }, // ref to the carousel container
    { value: { selectedScrollSnap: () => 0, scrollTo: () => {}, scrollPrev: () => {}, scrollNext: () => {}, canScrollNext: () => true, on: () => {}, off: () => {} } },
  ],
}));

const slides = ['a', 'b', 'c'];

describe('Carousel — rendering surface', () => {
  it('renders one tab per slide via the #slide slot', () => {
    const wrapper = mount(Carousel, {
      props: { slides },
      slots: {
        slide: ({ slide }: { slide: string }) => `<div class="slide-text">${slide}</div>`,
      },
    });
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs.length).toBeGreaterThanOrEqual(slides.length);
  });

  it('renders dots when showDots is true (default)', () => {
    const wrapper = mount(Carousel, {
      props: { slides },
      slots: { slide: () => 'x' },
    });
    const dots = wrapper.findAll('button[aria-label^="Ir al slide"]');
    expect(dots).toHaveLength(slides.length);
  });

  it('hides dots when showDots is false', () => {
    const wrapper = mount(Carousel, {
      props: { slides, showDots: false },
      slots: { slide: () => 'x' },
    });
    expect(wrapper.findAll('button[aria-label^="Ir al slide"]')).toHaveLength(0);
  });

  it('renders both arrows when showArrows is true (default)', () => {
    const wrapper = mount(Carousel, {
      props: { slides },
      slots: { slide: () => 'x' },
    });
    expect(wrapper.find('button[aria-label="Anterior"]').exists()).toBe(true);
    expect(wrapper.find('button[aria-label="Siguiente"]').exists()).toBe(true);
  });

  it('hides arrows when showArrows is false', () => {
    const wrapper = mount(Carousel, {
      props: { slides, showArrows: false },
      slots: { slide: () => 'x' },
    });
    expect(wrapper.find('button[aria-label="Anterior"]').exists()).toBe(false);
    expect(wrapper.find('button[aria-label="Siguiente"]').exists()).toBe(false);
  });

  it('exposes role="region" and tabindex="0" on the root container', () => {
    const wrapper = mount(Carousel, {
      props: { slides },
      slots: { slide: () => 'x' },
    });
    const root = wrapper.find('[role="region"]');
    expect(root.exists()).toBe(true);
    expect(root.attributes('tabindex')).toBe('0');
  });
});
