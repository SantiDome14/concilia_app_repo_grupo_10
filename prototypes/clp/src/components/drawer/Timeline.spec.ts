import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Timeline from './Timeline.vue';
import type { TimelineEvent } from '@/types/drawer';

function ev(
  id: string,
  at: string,
  kind: TimelineEvent['kind'] = 'system',
  label = `event ${id}`,
): TimelineEvent {
  return { id, at, actor_id: 'u1', actor_name: 'Alice', kind, label };
}

describe('Timeline', () => {
  // 2026-04-29 14:00 local
  const now = new Date(2026, 3, 29, 14, 0, 0);

  it('renders the empty state when there are no events', () => {
    const wrapper = mount(Timeline, {
      props: { events: [], now },
    });
    const empty = wrapper.find('[data-testid="timeline-empty"]');
    expect(empty.exists()).toBe(true);
    expect(empty.text()).toContain('Sin eventos en el timeline');
  });

  it('renders day-group headers with Hoy / Ayer / DD MMM labels', () => {
    const wrapper = mount(Timeline, {
      props: {
        events: [
          ev('e1', '2026-04-29T10:00:00'),
          ev('e2', '2026-04-28T18:00:00'),
          ev('e3', '2026-04-25T12:00:00'),
        ],
        now,
      },
    });

    const labels = wrapper
      .findAll('[data-testid="timeline-group-label"]')
      .map((el) => el.text());

    expect(labels[0]).toBe('Hoy');
    expect(labels[1]).toBe('Ayer');
    expect(labels[2]).toMatch(/^25\s/);
    expect(labels[2]!.toLowerCase()).toContain('abr');
  });

  it('sorts events DESC (most recent first) within day groups', () => {
    const wrapper = mount(Timeline, {
      props: {
        events: [
          ev('older', '2026-04-29T08:00:00', 'system', 'Older'),
          ev('newer', '2026-04-29T13:00:00', 'system', 'Newer'),
          ev('mid', '2026-04-29T11:00:00', 'system', 'Mid'),
        ],
        now,
      },
    });

    const events = wrapper.findAll('[data-testid="timeline-event"]');
    expect(events).toHaveLength(3);
    const labels = events.map((e) =>
      e.find('[data-testid="timeline-label"]').text(),
    );
    expect(labels).toEqual(['Newer', 'Mid', 'Older']);
  });

  it('places newest day group first (DESC across groups)', () => {
    const wrapper = mount(Timeline, {
      props: {
        events: [
          ev('a', '2026-04-25T10:00:00'),
          ev('b', '2026-04-29T10:00:00'),
          ev('c', '2026-04-28T10:00:00'),
        ],
        now,
      },
    });

    const groupLabels = wrapper
      .findAll('[data-testid="timeline-group-label"]')
      .map((el) => el.text());
    expect(groupLabels[0]).toBe('Hoy');
    expect(groupLabels[1]).toBe('Ayer');
  });

  it('applies the correct dot color class per event kind', () => {
    const wrapper = mount(Timeline, {
      props: {
        events: [
          ev('s1', '2026-04-29T13:00:00', 'state_change'),
          ev('f1', '2026-04-29T12:00:00', 'field_update'),
          ev('c1', '2026-04-29T11:00:00', 'comment_added'),
          ev('y1', '2026-04-29T10:00:00', 'system'),
        ],
        now,
      },
    });

    const dots = wrapper.findAll('[data-testid="timeline-dot"]');
    const classes = dots.map((d) => d.classes().join(' '));

    expect(classes[0]).toContain('bg-brand');
    expect(classes[1]).toContain('bg-info');
    expect(classes[2]).toContain('bg-t-3');
    expect(classes[3]).toContain('bg-warning');
  });

  it('exposes the absolute timestamp via title for hover', () => {
    const wrapper = mount(Timeline, {
      props: {
        events: [ev('e1', '2026-04-29T10:00:00')],
        now,
      },
    });
    const rel = wrapper.find('[data-testid="timeline-relative"]');
    const title = rel.attributes('title') ?? '';
    expect(title).toMatch(/29\/04\/2026/);
  });

  it('renders the actor name and event label', () => {
    const wrapper = mount(Timeline, {
      props: {
        events: [ev('e1', '2026-04-29T10:00:00', 'system', 'Estado cambiado a En Proceso')],
        now,
      },
    });
    expect(wrapper.find('[data-testid="timeline-actor"]').text()).toBe('Alice');
    expect(wrapper.find('[data-testid="timeline-label"]').text()).toBe(
      'Estado cambiado a En Proceso',
    );
  });
});
