import { describe, it, expect } from 'vitest';
import { depsStatus } from './depsStatus';
import type { Report } from '@/types/genericos';

const BASE: Report = {
  id: 'rpt_x',
  name: 'X',
  category: 'INTERNO',
  periodicity: 'Mensual',
  format: 'PDF',
  cron_enabled: false,
};

// 2026-04-29 noon local — anchor for daysUntil math.
const TODAY = new Date(2026, 3, 29, 12, 0, 0).getTime();

describe('depsStatus', () => {
  it('returns null when the Report has no dependencies', () => {
    expect(depsStatus(BASE, TODAY)).toBeNull();
    expect(depsStatus({ ...BASE, dependencies: [] }, TODAY)).toBeNull();
  });

  it('returns ready: true when all dependencies are completed', () => {
    const r: Report = {
      ...BASE,
      next: '2026-05-10',
      dependencies: [
        { app: 'OPS', module: 'M', task: 'T1', owner_role: 'R', sla_days_before: 2, completed: true },
        { app: 'LEX', module: 'A', task: 'T2', owner_role: 'R', sla_days_before: 1, completed: true },
      ],
    };
    expect(depsStatus(r, TODAY)).toEqual({ total: 2, done: 2, ready: true, blocked: false });
  });

  it('returns ready: false, blocked: false when partial and SLA window is not yet reached', () => {
    const r: Report = {
      ...BASE,
      next: '2026-05-30', // 31 days away
      dependencies: [
        { app: 'OPS', module: 'M', task: 'T1', owner_role: 'R', sla_days_before: 2, completed: false },
        { app: 'LEX', module: 'A', task: 'T2', owner_role: 'R', sla_days_before: 1, completed: true },
      ],
    };
    expect(depsStatus(r, TODAY)).toEqual({ total: 2, done: 1, ready: false, blocked: false });
  });

  it('returns blocked: true when partial and a pending dep is within its SLA window', () => {
    const r: Report = {
      ...BASE,
      next: '2026-05-01', // 2 days away
      dependencies: [
        { app: 'OPS', module: 'M', task: 'T1', owner_role: 'R', sla_days_before: 5, completed: false },
        { app: 'LEX', module: 'A', task: 'T2', owner_role: 'R', sla_days_before: 1, completed: true },
      ],
    };
    expect(depsStatus(r, TODAY)).toEqual({ total: 2, done: 1, ready: false, blocked: true });
  });

  it('returns blocked: false when partial but `next` is null (on-demand)', () => {
    const r: Report = {
      ...BASE,
      next: null,
      dependencies: [
        { app: 'OPS', module: 'M', task: 'T1', owner_role: 'R', sla_days_before: 2, completed: false },
      ],
    };
    expect(depsStatus(r, TODAY)).toEqual({ total: 1, done: 0, ready: false, blocked: false });
  });
});
