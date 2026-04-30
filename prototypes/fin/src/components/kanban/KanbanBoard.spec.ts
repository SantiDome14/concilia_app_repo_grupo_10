import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import KanbanBoard from './KanbanBoard.vue';
import type { KanbanAxis, KanbanRecord } from '@/types/kanban';

function makeAxis(overrides: Partial<KanbanAxis> = {}): KanbanAxis {
  return {
    axis_id: 'workflow',
    label: 'Workflow',
    state_field: 'state',
    states: [
      { id: 'PENDING', label: 'Pending', column_label: 'Pendientes', order: 1 },
      { id: 'IN_PROGRESS', label: 'In progress', column_label: 'En curso', order: 2 },
      { id: 'COMPLETED', label: 'Completed', order: 3, terminal: true },
    ],
    transitions: [
      { from: 'PENDING', to: 'IN_PROGRESS', mode: 'free' },
      { from: 'IN_PROGRESS', to: 'COMPLETED', mode: 'modal' },
    ],
    ...overrides,
  };
}

function makeRecords(): KanbanRecord[] {
  return [
    { id: 'R-1', state: 'PENDING' },
    { id: 'R-2', state: 'IN_PROGRESS' },
    { id: 'R-3', state: 'COMPLETED' },
  ];
}

describe('KanbanBoard', () => {
  it('renders one column per state in ascending order', () => {
    const wrapper = mount(KanbanBoard, {
      props: { axis: makeAxis(), records: makeRecords() },
    });
    const columns = wrapper.findAll('[data-state-id]');
    expect(columns).toHaveLength(3);
    expect(columns.map((c) => c.attributes('data-state-id'))).toEqual([
      'PENDING',
      'IN_PROGRESS',
      'COMPLETED',
    ]);
  });

  it('renders the empty-state placeholder when axis is null', () => {
    const wrapper = mount(KanbanBoard, {
      props: { axis: null, records: [] },
    });
    expect(wrapper.find('[data-testid="kanban-no-axis"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-state-id]')).toHaveLength(0);
  });

  it('shows "Cambiar eje" only when axes has more than one entry', () => {
    const single = mount(KanbanBoard, {
      props: {
        axis: makeAxis(),
        axes: { workflow: makeAxis() },
        records: [],
      },
    });
    expect(single.find('[data-testid="kanban-change-axis"]').exists()).toBe(false);

    const multi = mount(KanbanBoard, {
      props: {
        axis: makeAxis(),
        axes: {
          workflow: makeAxis(),
          imputacion: makeAxis({ axis_id: 'imputacion', label: 'Imputación' }),
        },
        records: [],
      },
    });
    expect(multi.find('[data-testid="kanban-change-axis"]').exists()).toBe(true);
  });

  it('emits change-axis when the "Cambiar eje" button is clicked', async () => {
    const wrapper = mount(KanbanBoard, {
      props: {
        axis: makeAxis(),
        axes: {
          workflow: makeAxis(),
          imputacion: makeAxis({ axis_id: 'imputacion', label: 'Imputación' }),
        },
        records: [],
      },
    });
    await wrapper.find('[data-testid="kanban-change-axis"]').trigger('click');
    expect(wrapper.emitted('change-axis')).toBeTruthy();
  });

  it('emits "Organizando por: <label>" in the header when axis is set', () => {
    const wrapper = mount(KanbanBoard, {
      props: { axis: makeAxis(), records: [] },
    });
    expect(wrapper.text()).toContain('Organizando por: Workflow');
  });

  it('orders columns by `order` ascending even when declared out of order', () => {
    const axis = makeAxis({
      states: [
        { id: 'C', label: 'C', order: 3 },
        { id: 'A', label: 'A', order: 1 },
        { id: 'B', label: 'B', order: 2 },
      ],
      transitions: [],
    });
    const wrapper = mount(KanbanBoard, {
      props: { axis, records: [] },
    });
    const ids = wrapper.findAll('[data-state-id]').map((c) => c.attributes('data-state-id'));
    expect(ids).toEqual(['A', 'B', 'C']);
  });
});
