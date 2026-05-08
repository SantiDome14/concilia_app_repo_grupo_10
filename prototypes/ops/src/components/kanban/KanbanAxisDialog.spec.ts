import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import KanbanAxisDialog from './KanbanAxisDialog.vue';
import type { KanbanAxis } from '@/types/kanban';

function axis(overrides: Partial<KanbanAxis> = {}): KanbanAxis {
  return {
    axis_id: 'workflow',
    label: 'Workflow',
    state_field: 'state',
    states: [],
    transitions: [],
    ...overrides,
  };
}

const axes: Record<string, KanbanAxis> = {
  workflow: axis({ axis_id: 'workflow', label: 'Workflow', description: 'Flujo principal' }),
  imputacion: axis({
    axis_id: 'imputacion',
    label: 'Imputación',
    description: 'Eje de imputación',
    read_only: true,
  }),
};

async function mountDialog(props: Partial<{ open: boolean; activeAxisId: string | null }> = {}) {
  // The dialog content is teleported by reka-ui; mount with attachTo
  // and await one microtask so the Teleport mounts into document.body.
  const wrapper = mount(KanbanAxisDialog, {
    props: {
      open: true,
      axes,
      activeAxisId: null,
      ...props,
    },
    attachTo: document.body,
  });
  await wrapper.vm.$nextTick();
  return wrapper;
}

describe('KanbanAxisDialog', () => {
  it('lists one card per declared axis', async () => {
    await mountDialog();
    const workflow = document.querySelector('[data-testid="kanban-axis-card-workflow"]');
    const imputacion = document.querySelector('[data-testid="kanban-axis-card-imputacion"]');
    expect(workflow).not.toBeNull();
    expect(imputacion).not.toBeNull();
  });

  it('renders the read-only chip ONLY for axes flagged read_only', async () => {
    await mountDialog();
    const workflowChip = document
      .querySelector('[data-testid="kanban-axis-card-workflow"]')
      ?.querySelector('[data-testid="kanban-axis-readonly-chip"]');
    const imputacionChip = document
      .querySelector('[data-testid="kanban-axis-card-imputacion"]')
      ?.querySelector('[data-testid="kanban-axis-readonly-chip"]');
    expect(workflowChip).toBeFalsy();
    expect(imputacionChip).toBeTruthy();
  });

  it('disables Confirm until the user picks an axis', async () => {
    await mountDialog();
    const confirm = document.querySelector(
      '[data-testid="kanban-axis-confirm"]',
    ) as HTMLButtonElement | null;
    expect(confirm).not.toBeNull();
    expect(confirm?.disabled).toBe(true);
  });

  it('emits select(axis_id) and update:open(false) on Confirm', async () => {
    const wrapper = await mountDialog();
    const card = document.querySelector(
      '[data-testid="kanban-axis-card-imputacion"]',
    ) as HTMLButtonElement;
    card.click();
    await wrapper.vm.$nextTick();

    const confirm = document.querySelector(
      '[data-testid="kanban-axis-confirm"]',
    ) as HTMLButtonElement;
    confirm.click();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('select')).toBeTruthy();
    expect(wrapper.emitted('select')?.[0]).toEqual(['imputacion']);
    expect(wrapper.emitted('update:open')).toBeTruthy();
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false]);
  });

  it('does NOT emit select when Cancel is clicked', async () => {
    const wrapper = await mountDialog();
    const cancel = document.querySelector(
      '[data-testid="kanban-axis-cancel"]',
    ) as HTMLButtonElement;
    cancel.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted('select')).toBeFalsy();
    expect(wrapper.emitted('update:open')).toBeTruthy();
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false]);
  });

  it('pre-selects the activeAxisId when the dialog opens', async () => {
    await mountDialog({ activeAxisId: 'imputacion' });
    const card = document.querySelector(
      '[data-testid="kanban-axis-card-imputacion"]',
    ) as HTMLButtonElement;
    expect(card.getAttribute('aria-checked')).toBe('true');
    const confirm = document.querySelector(
      '[data-testid="kanban-axis-confirm"]',
    ) as HTMLButtonElement;
    expect(confirm.disabled).toBe(false);
  });
});
