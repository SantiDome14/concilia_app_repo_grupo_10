import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import KanbanCard from './KanbanCard.vue';
import type { KanbanRecord } from '@/types/kanban';

const baseRecord: KanbanRecord = { id: 'R-001' };

describe('KanbanCard', () => {
  it('renders the default slot', () => {
    const wrapper = mount(KanbanCard, {
      props: { record: baseRecord, draggable: true },
      slots: { default: '<div data-test="body">card body</div>' },
    });
    expect(wrapper.find('[data-test="body"]').exists()).toBe(true);
  });

  it('is draggable when draggable prop is true and the card is non-terminal', () => {
    const wrapper = mount(KanbanCard, {
      props: { record: baseRecord, draggable: true },
    });
    expect(wrapper.attributes('draggable')).toBe('true');
    const cls = (wrapper.element as HTMLElement).className;
    expect(cls).toContain('cursor-grab');
  });

  it('is NOT draggable for terminal cards regardless of draggable prop', () => {
    const wrapper = mount(KanbanCard, {
      props: { record: baseRecord, draggable: true, terminal: true },
    });
    expect(wrapper.attributes('draggable')).toBe('false');
    const cls = (wrapper.element as HTMLElement).className;
    expect(cls).toContain('opacity-70');
    expect(cls).toContain('cursor-not-allowed');
  });

  it('is NOT draggable when the parent column declares draggable=false', () => {
    const wrapper = mount(KanbanCard, {
      props: { record: baseRecord, draggable: false },
    });
    expect(wrapper.attributes('draggable')).toBe('false');
  });

  it('applies the critical severity left-border via --danger', () => {
    const wrapper = mount(KanbanCard, {
      props: { record: baseRecord, draggable: true, severity: 'critical' },
    });
    const cls = (wrapper.element as HTMLElement).className;
    expect(cls).toContain('border-l-[3px]');
    expect(cls).toContain('border-l-[hsl(var(--danger))]');
  });

  it('applies the high severity left-border via --warning', () => {
    const wrapper = mount(KanbanCard, {
      props: { record: baseRecord, draggable: true, severity: 'high' },
    });
    const cls = (wrapper.element as HTMLElement).className;
    expect(cls).toContain('border-l-[hsl(var(--warning))]');
  });

  it('applies the medium severity left-border via --info', () => {
    const wrapper = mount(KanbanCard, {
      props: { record: baseRecord, draggable: true, severity: 'medium' },
    });
    const cls = (wrapper.element as HTMLElement).className;
    expect(cls).toContain('border-l-[hsl(var(--info))]');
  });

  it('applies the low severity left-border via --t-3', () => {
    const wrapper = mount(KanbanCard, {
      props: { record: baseRecord, draggable: true, severity: 'low' },
    });
    const cls = (wrapper.element as HTMLElement).className;
    expect(cls).toContain('border-l-[hsl(var(--t-3))]');
  });

  it('exposes data-record-id and data-terminal attributes', () => {
    const wrapper = mount(KanbanCard, {
      props: { record: baseRecord, draggable: true, terminal: true },
    });
    expect(wrapper.attributes('data-record-id')).toBe('R-001');
    expect(wrapper.attributes('data-terminal')).toBe('true');
  });
});
