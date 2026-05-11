import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import CardItem from './CardItem.vue';

const baseRecord = { id: 'R-001', title: 'Test record' } as const;

function mountCard(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(CardItem, {
    props: { record: baseRecord, ...props },
    slots: {
      header: '<div data-test="header">header content</div>',
      body: '<div data-test="body">body content</div>',
      footer: '<div data-test="footer">footer content</div>',
      ...slots,
    },
  });
}

describe('CardItem', () => {
  it('renders all three named slots', () => {
    const wrapper = mountCard();
    expect(wrapper.find('[data-test="header"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="body"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="footer"]').exists()).toBe(true);
  });

  it('exposes role="button" and tabindex for keyboard reachability', () => {
    const wrapper = mountCard();
    expect(wrapper.attributes('role')).toBe('button');
    expect(wrapper.attributes('tabindex')).toBe('0');
  });

  it('emits click with the record when the root is clicked', async () => {
    const wrapper = mountCard();
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeTruthy();
    expect(wrapper.emitted('click')?.[0]).toEqual([baseRecord]);
  });

  it('emits click on Enter keypress', async () => {
    const wrapper = mountCard();
    await wrapper.trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('click')).toBeTruthy();
  });

  it('emits click on Space keypress', async () => {
    const wrapper = mountCard();
    await wrapper.trigger('keydown', { key: ' ' });
    expect(wrapper.emitted('click')).toBeTruthy();
  });

  it('does not apply a severity left-border when severity is omitted', () => {
    const wrapper = mountCard();
    const classList = (wrapper.element as HTMLElement).className;
    expect(classList).not.toContain('border-l-[3px]');
  });

  it('applies the critical severity left-border using --danger', () => {
    const wrapper = mountCard({ severity: 'critical' });
    const classList = (wrapper.element as HTMLElement).className;
    expect(classList).toContain('border-l-[3px]');
    expect(classList).toContain('border-l-[hsl(var(--danger))]');
  });

  it('applies the high severity left-border using --warning', () => {
    const wrapper = mountCard({ severity: 'high' });
    const classList = (wrapper.element as HTMLElement).className;
    expect(classList).toContain('border-l-[hsl(var(--warning))]');
  });

  it('applies the medium severity left-border using --info', () => {
    const wrapper = mountCard({ severity: 'medium' });
    const classList = (wrapper.element as HTMLElement).className;
    expect(classList).toContain('border-l-[hsl(var(--info))]');
  });

  it('applies the low severity left-border using --t-3', () => {
    const wrapper = mountCard({ severity: 'low' });
    const classList = (wrapper.element as HTMLElement).className;
    expect(classList).toContain('border-l-[hsl(var(--t-3))]');
  });
});
