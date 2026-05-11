import { describe, it, expect } from 'vitest';
import { groupByDay } from './groupByDay';
import type { TimelineEvent } from '@/types/drawer';

function ev(id: string, at: string, kind: TimelineEvent['kind'] = 'system'): TimelineEvent {
  return {
    id,
    at,
    actor_id: 'u1',
    actor_name: 'Alice',
    kind,
    label: `event ${id}`,
  };
}

describe('groupByDay', () => {
  // 2026-04-29 14:00 local time
  const now = new Date(2026, 3, 29, 14, 0, 0);

  it('returns an empty array for empty input', () => {
    expect(groupByDay([], now)).toEqual([]);
  });

  it('buckets events into Hoy / Ayer / older days', () => {
    const events = [
      ev('e1', '2026-04-29T10:00:00'),
      ev('e2', '2026-04-29T08:00:00'),
      ev('e3', '2026-04-28T18:00:00'),
      ev('e4', '2026-04-25T12:00:00'),
    ];

    const groups = groupByDay(events, now);

    expect(groups).toHaveLength(3);

    const [today, yesterday, older] = groups;

    expect(today!.label).toBe('Hoy');
    expect(today!.events.map((e) => e.id)).toEqual(['e1', 'e2']);

    expect(yesterday!.label).toBe('Ayer');
    expect(yesterday!.events.map((e) => e.id)).toEqual(['e3']);

    // Older day uses 'DD MMM' Spanish-locale format.
    expect(older!.label).toMatch(/^25\s/);
    expect(older!.label.toLowerCase()).toContain('abr');
    expect(older!.events.map((e) => e.id)).toEqual(['e4']);
  });

  it('sorts day buckets DESC (most recent first)', () => {
    const events = [
      ev('a', '2026-04-20T10:00:00'),
      ev('b', '2026-04-29T10:00:00'),
      ev('c', '2026-04-25T10:00:00'),
      ev('d', '2026-04-28T10:00:00'),
    ];

    const groups = groupByDay(events, now);
    expect(groups.map((g) => g.day)).toEqual([
      '2026-04-29',
      '2026-04-28',
      '2026-04-25',
      '2026-04-20',
    ]);
  });

  it('preserves the input order of events within a single day bucket', () => {
    // Input order is intentionally not chronological — the function
    // contract is "preserve insertion order"; the consuming Timeline
    // pre-sorts events DESC before passing them in.
    const events = [
      ev('first', '2026-04-29T08:00:00'),
      ev('second', '2026-04-29T11:00:00'),
      ev('third', '2026-04-29T09:00:00'),
    ];

    const groups = groupByDay(events, now);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.events.map((e) => e.id)).toEqual(['first', 'second', 'third']);
  });

  it('drops events with non-parseable timestamps', () => {
    const events = [
      ev('good', '2026-04-29T10:00:00'),
      ev('bad', 'not-a-date'),
    ];
    const groups = groupByDay(events, now);
    expect(groups).toHaveLength(1);
    expect(groups[0]!.events.map((e) => e.id)).toEqual(['good']);
  });

  it('uses Hoy/Ayer relative to the provided now (not the system clock)', () => {
    // now is reset two days earlier; what was "Hoy" before is now "older".
    const earlierNow = new Date(2026, 3, 27, 12, 0, 0);
    const events = [
      ev('e1', '2026-04-27T10:00:00'),
      ev('e2', '2026-04-26T10:00:00'),
    ];
    const groups = groupByDay(events, earlierNow);
    expect(groups[0]!.label).toBe('Hoy');
    expect(groups[1]!.label).toBe('Ayer');
  });
});
