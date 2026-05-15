import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import TriggeredActionsPanel from './TriggeredActionsPanel.vue';
import type { TriggeredAction } from '@/types/genericos';

describe('TriggeredActionsPanel', () => {
  it('renders nothing when entries is undefined', () => {
    const wrapper = mount(TriggeredActionsPanel, { props: { entries: undefined } });
    expect(wrapper.find('[data-testid="triggered-actions-panel"]').exists()).toBe(false);
  });

  it('renders nothing when entries is an empty array', () => {
    const wrapper = mount(TriggeredActionsPanel, { props: { entries: [] } });
    expect(wrapper.find('[data-testid="triggered-actions-panel"]').exists()).toBe(false);
  });

  it('renders one row per entry with the action_ref and the status badge', () => {
    const entries: TriggeredAction[] = [
      { action_ref: 'demo.ok', status: 'ok', result_ref: 'FACT-001', at: 1 },
      { action_ref: 'demo.pending', status: 'pending', at: 2 },
    ];
    const wrapper = mount(TriggeredActionsPanel, { props: { entries } });
    const panel = wrapper.find('[data-testid="triggered-actions-panel"]');
    expect(panel.exists()).toBe(true);
    const rows = wrapper.findAll('[data-testid^="triggered-action-"]');
    expect(rows.length).toBe(2);
    expect(rows[0]!.text()).toContain('demo.ok');
    expect(rows[0]!.text()).toContain('OK');
    expect(rows[0]!.text()).toContain('FACT-001');
    expect(rows[1]!.text()).toContain('demo.pending');
    expect(rows[1]!.text()).toContain('Pendiente');
  });

  it('surfaces error_message when status is error', () => {
    const entries: TriggeredAction[] = [
      {
        action_ref: 'demo.broken',
        status: 'error',
        error_message: 'Service unavailable',
        at: 1,
      },
    ];
    const wrapper = mount(TriggeredActionsPanel, { props: { entries } });
    expect(wrapper.text()).toContain('demo.broken');
    expect(wrapper.text()).toContain('Error');
    expect(wrapper.text()).toContain('Service unavailable');
  });

  it('omits error_message text when status is not error', () => {
    const entries: TriggeredAction[] = [
      {
        action_ref: 'demo.ok',
        status: 'ok',
        error_message: 'should-be-ignored', // not surfaced when status is ok
        at: 1,
      },
    ];
    const wrapper = mount(TriggeredActionsPanel, { props: { entries } });
    expect(wrapper.text()).not.toContain('should-be-ignored');
  });
});
