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

  it('shows axis tabs only when axes has more than one entry', () => {
    const single = mount(KanbanBoard, {
      props: {
        axis: makeAxis(),
        axes: { workflow: makeAxis() },
        records: [],
      },
    });
    expect(single.find('[data-testid="kanban-axis-tabs"]').exists()).toBe(false);

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
    const tabs = multi.find('[data-testid="kanban-axis-tabs"]');
    expect(tabs.exists()).toBe(true);
    expect(tabs.findAll('[role="tab"]')).toHaveLength(2);
    const active = tabs.find('[aria-selected="true"]');
    expect(active.exists()).toBe(true);
    expect(active.attributes('data-axis-id')).toBe('workflow');
  });

  it('emits update:axisId when a non-active axis tab is clicked', async () => {
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
    await wrapper.find('[data-testid="kanban-axis-tab-imputacion"]').trigger('click');
    const events = wrapper.emitted('update:axisId');
    expect(events).toBeTruthy();
    expect(events?.[0]).toEqual(['imputacion']);
  });

  it('does NOT emit update:axisId when the active axis tab is clicked', async () => {
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
    await wrapper.find('[data-testid="kanban-axis-tab-workflow"]').trigger('click');
    expect(wrapper.emitted('update:axisId')).toBeUndefined();
  });

  it('emits transition with correct payload when a card is dropped on a valid target column', async () => {
    const axis = makeAxis({
      axis_id: 'fin.conc',
      label: 'Conciliación bancaria (FIN)',
      state_field: 'fin.conc',
      states: [
        { id: 'PEND', label: 'Pendiente', order: 1 },
        { id: 'CONC', label: 'Conciliado', order: 2, terminal: true },
      ],
      transitions: [{ from: 'PEND', to: 'CONC', mode: 'modal' }],
    });
    const record = {
      id: 'M-001',
      fin: { conc: 'PEND' },
    };
    const wrapper = mount(KanbanBoard, {
      props: {
        axis,
        records: [record],
      },
    });

    const sourceCard = wrapper.find('[data-record-id="M-001"]');
    expect(sourceCard.exists()).toBe(true);
    // JSDOM doesn't ship a real DataTransfer; stub the minimal surface
    // used by KanbanCard.handleDragStart and KanbanBoard.handleColumnDrop.
    const store: Record<string, string> = {};
    const dt = {
      getData: (k: string) => store[k] ?? '',
      setData: (k: string, v: string) => {
        store[k] = v;
      },
      effectAllowed: 'move',
      dropEffect: 'move',
    };
    await sourceCard.trigger('dragstart', { dataTransfer: dt });
    const targetColumn = wrapper.find('[data-state-id="CONC"]');
    expect(targetColumn.exists()).toBe(true);
    await targetColumn.trigger('dragover', { dataTransfer: dt });
    await targetColumn.trigger('drop', { dataTransfer: dt });

    const events = wrapper.emitted('transition');
    expect(events).toBeTruthy();
    expect(events?.[0]?.[0]).toMatchObject({
      recordId: 'M-001',
      fromState: 'PEND',
      toState: 'CONC',
      mode: 'modal',
      axisId: 'fin.conc',
    });
  });

  it('marks read-only axis tabs with the RO suffix chip', () => {
    const wrapper = mount(KanbanBoard, {
      props: {
        axis: makeAxis(),
        axes: {
          workflow: makeAxis(),
          ops: makeAxis({ axis_id: 'ops', label: 'OPS', read_only: true }),
        },
        records: [],
      },
    });
    const tab = wrapper.find('[data-testid="kanban-axis-tab-ops"]');
    expect(tab.text()).toContain('RO');
  });

  it('emits "Organizado por: <label>" in the header when axis is set', () => {
    const wrapper = mount(KanbanBoard, {
      props: { axis: makeAxis(), records: [] },
    });
    expect(wrapper.text()).toContain('Organizado por: Workflow');
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
