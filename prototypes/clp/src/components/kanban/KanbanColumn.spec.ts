import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import KanbanColumn from './KanbanColumn.vue';
import type { KanbanRecord, KanbanState } from '@/types/kanban';

const state: KanbanState = {
  id: 'PENDING',
  label: 'Pending',
  column_label: 'Pendientes',
  order: 1,
};

function makeRecords(): KanbanRecord[] {
  return [
    { id: 'R-1', severity: 'low' },
    { id: 'R-2', severity: 'critical' },
    { id: 'R-3', severity: 'medium' },
  ];
}

describe('KanbanColumn', () => {
  it('renders the column_label in the header (falls back to label)', () => {
    const wrapper = mount(KanbanColumn, {
      props: { state, records: [], axisReadOnly: false },
    });
    expect(wrapper.text()).toContain('Pendientes');
  });

  it('falls back to state.label when column_label is missing', () => {
    const wrapper = mount(KanbanColumn, {
      props: {
        state: { id: 'X', label: 'Bare', order: 1 },
        records: [],
        axisReadOnly: false,
      },
    });
    expect(wrapper.text()).toContain('Bare');
  });

  it('renders the count chip with the number of records', () => {
    const wrapper = mount(KanbanColumn, {
      props: { state, records: makeRecords(), axisReadOnly: false },
    });
    const chip = wrapper.find('[data-testid="kanban-column-count"]');
    expect(chip.exists()).toBe(true);
    expect(chip.text()).toBe('3');
  });

  it('renders cards via the named "card" slot in severity-sorted order', () => {
    const wrapper = mount(KanbanColumn, {
      props: { state, records: makeRecords(), axisReadOnly: false },
      slots: {
        card: `<template #card="{ record }"><div class="card" :data-id="record.id">{{ record.id }}</div></template>`,
      },
    });
    const cards = wrapper.findAll('.card');
    expect(cards.map((c) => c.attributes('data-id'))).toEqual(['R-2', 'R-3', 'R-1']);
  });

  it('applies the success outline class when dropFeedback="valid"', () => {
    const wrapper = mount(KanbanColumn, {
      props: { state, records: [], axisReadOnly: false, dropFeedback: 'valid' },
    });
    const cls = (wrapper.element as HTMLElement).className;
    expect(cls).toContain('outline-dashed');
    expect(cls).toContain('outline-success');
  });

  it('applies the danger outline class when dropFeedback="invalid"', () => {
    const wrapper = mount(KanbanColumn, {
      props: { state, records: [], axisReadOnly: false, dropFeedback: 'invalid' },
    });
    const cls = (wrapper.element as HTMLElement).className;
    expect(cls).toContain('outline-dashed');
    expect(cls).toContain('outline-danger');
  });

  it('emits dragover with the column state on dragover', async () => {
    const wrapper = mount(KanbanColumn, {
      props: { state, records: [], axisReadOnly: false },
    });
    await wrapper.trigger('dragover');
    const events = wrapper.emitted('dragover');
    expect(events).toBeTruthy();
    expect(events?.[0]?.[1]).toEqual(state);
  });

  it('emits drop with the column state on drop', async () => {
    const wrapper = mount(KanbanColumn, {
      props: { state, records: [], axisReadOnly: false },
    });
    await wrapper.trigger('drop');
    const events = wrapper.emitted('drop');
    expect(events).toBeTruthy();
    expect(events?.[0]?.[1]).toEqual(state);
  });
});
