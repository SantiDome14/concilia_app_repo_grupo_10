import { describe, it, expect, vi } from 'vitest';
import type { KanbanAxis, KanbanRecord } from '@/types/kanban';
import {
  applyFreeTransition,
  evaluateDrop,
  findTransition,
  kanbanSort,
} from './transitions';

// ────────────────────────────────────────────────────────────────────
// Test fixtures
// ────────────────────────────────────────────────────────────────────

function makeAxis(overrides: Partial<KanbanAxis> = {}): KanbanAxis {
  return {
    axis_id: 'workflow',
    label: 'Workflow',
    state_field: 'state',
    states: [
      { id: 'PENDING', label: 'Pending', order: 1 },
      { id: 'IN_PROGRESS', label: 'In progress', order: 2 },
      { id: 'COMPLETED', label: 'Completed', order: 3, terminal: true },
      { id: 'REJECTED', label: 'Rejected', order: 4, terminal: true },
    ],
    transitions: [
      { from: 'PENDING', to: 'IN_PROGRESS', mode: 'free' },
      { from: 'IN_PROGRESS', to: 'COMPLETED', mode: 'modal' },
      { from: 'PENDING', to: 'REJECTED', mode: 'blocked' },
    ],
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────────────
// applyFreeTransition
// ────────────────────────────────────────────────────────────────────

describe('applyFreeTransition', () => {
  it('writes the axis state_field on a top-level field', () => {
    const record: Record<string, unknown> = { id: 'R-1', state: 'PENDING' };
    const ok = applyFreeTransition(record, makeAxis(), 'IN_PROGRESS');
    expect(ok).toBe(true);
    expect(record.state).toBe('IN_PROGRESS');
  });

  it('writes the axis state_field on a nested dot-path', () => {
    const record: Record<string, unknown> = {
      id: 'R-1',
      fin: { imput: 'PEND' },
    };
    const axis = makeAxis({
      axis_id: 'fin.imput',
      state_field: 'fin.imput',
      states: [
        { id: 'PEND', label: 'Pendiente', order: 1 },
        { id: 'IMP', label: 'Imputado', order: 2, terminal: true },
      ],
      transitions: [{ from: 'PEND', to: 'IMP', mode: 'free' }],
    });
    const ok = applyFreeTransition(record, axis, 'IMP');
    expect(ok).toBe(true);
    expect((record.fin as Record<string, unknown>).imput).toBe('IMP');
  });

  it('returns false and does not mutate when the transition is mode:modal', () => {
    const record: Record<string, unknown> = { id: 'R-1', state: 'IN_PROGRESS' };
    const ok = applyFreeTransition(record, makeAxis(), 'COMPLETED');
    expect(ok).toBe(false);
    expect(record.state).toBe('IN_PROGRESS');
  });

  it('returns false and does not mutate when the axis is read-only', () => {
    const record: Record<string, unknown> = { id: 'R-1', state: 'PENDING' };
    const axis = makeAxis({
      read_only: true,
      transitions: [{ from: 'PENDING', to: 'IN_PROGRESS', mode: 'free' }],
    });
    const ok = applyFreeTransition(record, axis, 'IN_PROGRESS');
    expect(ok).toBe(false);
    expect(record.state).toBe('PENDING');
  });

  it('returns false and does not mutate when the transition is undeclared', () => {
    const record: Record<string, unknown> = { id: 'R-1', state: 'PENDING' };
    const ok = applyFreeTransition(record, makeAxis(), 'COMPLETED');
    expect(ok).toBe(false);
    expect(record.state).toBe('PENDING');
  });

  it('runs the named side_effect on the axis after a successful free write', () => {
    const sideEffect = vi.fn();
    const record: Record<string, unknown> = { id: 'R-1', state: 'PENDING' };
    const axis = makeAxis({
      transitions: [
        {
          from: 'PENDING',
          to: 'IN_PROGRESS',
          mode: 'free',
          side_effect: 'log',
        },
      ],
      side_effects: { log: sideEffect },
    });
    applyFreeTransition(record, axis, 'IN_PROGRESS');
    expect(sideEffect).toHaveBeenCalledWith(record);
  });
});

// ────────────────────────────────────────────────────────────────────
// findTransition
// ────────────────────────────────────────────────────────────────────

describe('findTransition', () => {
  it('returns the matching transition when declared', () => {
    const axis = makeAxis();
    const t = findTransition(axis, 'PENDING', 'IN_PROGRESS');
    expect(t).not.toBeNull();
    expect(t?.mode).toBe('free');
  });

  it('returns null when no transition matches', () => {
    const axis = makeAxis();
    expect(findTransition(axis, 'PENDING', 'COMPLETED')).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────────
// evaluateDrop
// ────────────────────────────────────────────────────────────────────

describe('evaluateDrop', () => {
  it('allows a declared free transition', () => {
    const result = evaluateDrop(makeAxis(), 'PENDING', 'IN_PROGRESS');
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.mode).toBe('free');
    }
  });

  it('returns mode=modal for a declared modal transition', () => {
    const result = evaluateDrop(makeAxis(), 'IN_PROGRESS', 'COMPLETED');
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.mode).toBe('modal');
    }
  });

  it('blocks an undeclared transition with reason=undeclared', () => {
    const result = evaluateDrop(makeAxis(), 'PENDING', 'IN_PROGRESS_NEW');
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.mode).toBe('blocked');
      expect(result.reason).toBe('undeclared');
    }
  });

  it('blocks a declared blocked transition with reason=undeclared', () => {
    const result = evaluateDrop(makeAxis(), 'PENDING', 'REJECTED');
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('undeclared');
    }
  });

  it('blocks drags out of terminal states', () => {
    const result = evaluateDrop(makeAxis(), 'COMPLETED', 'IN_PROGRESS');
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('terminal-origin');
    }
  });

  it('blocks drops onto terminal destinations when not declared', () => {
    const axis = makeAxis({
      transitions: [{ from: 'PENDING', to: 'IN_PROGRESS', mode: 'free' }],
    });
    const result = evaluateDrop(axis, 'PENDING', 'COMPLETED');
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('terminal-destination');
    }
  });

  it('blocks every drop on a read-only axis with reason=read-only-axis', () => {
    const axis = makeAxis({ read_only: true });
    const result = evaluateDrop(axis, 'PENDING', 'IN_PROGRESS');
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.reason).toBe('read-only-axis');
    }
  });

  it('still allows mode=modal transitions even out of terminal origin', () => {
    // Some axes (e.g. reopen flow) explicitly declare a modal exit from
    // a terminal column; guard the runtime against accidental block.
    const axis = makeAxis({
      transitions: [
        ...makeAxis().transitions,
        { from: 'COMPLETED', to: 'IN_PROGRESS', mode: 'modal' },
      ],
    });
    const result = evaluateDrop(axis, 'COMPLETED', 'IN_PROGRESS');
    expect(result.allowed).toBe(true);
    if (result.allowed) {
      expect(result.mode).toBe('modal');
    }
  });
});

// ────────────────────────────────────────────────────────────────────
// kanbanSort
// ────────────────────────────────────────────────────────────────────

describe('kanbanSort', () => {
  it('orders by severity rank first', () => {
    const records: KanbanRecord[] = [
      { id: 'A', severity: 'low' },
      { id: 'B', severity: 'critical' },
      { id: 'C', severity: 'high' },
      { id: 'D', severity: 'medium' },
    ];
    const sorted = [...records].sort(kanbanSort);
    expect(sorted.map((r) => r.id)).toEqual(['B', 'C', 'D', 'A']);
  });

  it('breaks severity ties by updated_at desc', () => {
    const records: KanbanRecord[] = [
      { id: 'OLD', severity: 'high', updated_at: '2026-01-01T00:00:00Z' },
      { id: 'NEW', severity: 'high', updated_at: '2026-04-01T00:00:00Z' },
    ];
    const sorted = [...records].sort(kanbanSort);
    expect(sorted.map((r) => r.id)).toEqual(['NEW', 'OLD']);
  });

  it('falls back to created_at when updated_at is absent', () => {
    const records: KanbanRecord[] = [
      { id: 'OLD', severity: 'medium', created_at: '2026-01-01T00:00:00Z' },
      { id: 'NEW', severity: 'medium', created_at: '2026-03-01T00:00:00Z' },
    ];
    const sorted = [...records].sort(kanbanSort);
    expect(sorted.map((r) => r.id)).toEqual(['NEW', 'OLD']);
  });

  it('preserves input order when neither severity nor recency differs', () => {
    const records: KanbanRecord[] = [{ id: 'A' }, { id: 'B' }, { id: 'C' }];
    const sorted = [...records].sort(kanbanSort);
    expect(sorted.map((r) => r.id)).toEqual(['A', 'B', 'C']);
  });
});
