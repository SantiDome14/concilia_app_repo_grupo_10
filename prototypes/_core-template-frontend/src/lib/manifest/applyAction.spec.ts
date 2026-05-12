import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyAction } from './applyAction';
import { computeImputation } from './computeImputation';
import type { ApplyDeps } from './applyTypes';
import type { Action, AuditEntry, Manifest } from '@/types/manifest';

function makeDeps(over: Partial<ApplyDeps> = {}): {
  deps: ApplyDeps;
  audit: AuditEntry[];
  toasts: { success: { title: string; description?: string }[]; error: { title: string; description?: string }[] };
  afterMutationCount: { n: number };
  warns: { ch: string; m: string }[];
} {
  const audit: AuditEntry[] = [];
  const toasts = {
    success: [] as { title: string; description?: string }[],
    error: [] as { title: string; description?: string }[],
  };
  const afterMutationCount = { n: 0 };
  const warns: { ch: string; m: string }[] = [];
  const deps: ApplyDeps = {
    auditAppend: (e) => audit.push(e),
    toast: {
      success: (title, description) => toasts.success.push({ title, description }),
      error: (title, description) => toasts.error.push({ title, description }),
    },
    afterMutation: () => {
      afterMutationCount.n += 1;
    },
    recompute: (token) => {
      if (token === 'imputacion') return computeImputation;
      return undefined;
    },
    devWarn: (ch, m) => warns.push({ ch, m }),
    ...over,
  };
  return { deps, audit, toasts, afterMutationCount, warns };
}

const baseManifest: Manifest = {
  app: 'demo',
  module: 'test',
  required_imputations: ['cliente_id'],
};

beforeEach(() => {
  vi.useRealTimers();
});

describe('applyAction', () => {
  it('writes update_fields from formValues; ignores undeclared values', () => {
    const action: Action = {
      id: 'demo.test.imp.assign',
      dimension: 'imputacion',
      label: 'Assign',
      on_confirm: { update_fields: ['cliente_id'] },
    };
    const record: Record<string, unknown> = { id: 'R-1' };
    const { deps } = makeDeps();
    applyAction(
      {
        action,
        manifestKey: 'demo.test',
        manifest: baseManifest,
        records: [record],
        formValues: { cliente_id: 'C-1', other_field: 'X' },
        isBatch: false,
        userId: 'U-1',
      },
      deps,
    );
    expect(record.cliente_id).toBe('C-1');
    expect(record.other_field).toBeUndefined();
  });

  it('substitutes "$now" in set_fields with Date.now()', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    const action: Action = {
      id: 'demo.test.gov.confirm',
      dimension: 'governance',
      label: 'Confirm',
      on_confirm: {
        set_fields: { 'fin.intercompany': true, 'fin.intercompany_at': '$now' },
      },
    };
    const record: Record<string, unknown> = { id: 'R-1' };
    const { deps } = makeDeps();
    applyAction(
      {
        action,
        manifestKey: 'demo.test',
        manifest: baseManifest,
        records: [record],
        formValues: {},
        isBatch: false,
        userId: 'U-1',
      },
      deps,
    );
    const fin = record.fin as Record<string, unknown>;
    expect(fin.intercompany).toBe(true);
    expect(fin.intercompany_at).toBe(1_700_000_000_000);
  });

  it('substitutes "$current_user" in set_fields with the invoker userId', () => {
    const action: Action = {
      id: 'demo.test.gov.tomar',
      dimension: 'governance',
      label: 'Tomar',
      on_confirm: {
        set_fields: { state: 'en_proceso', owner: '$current_user' },
      },
    };
    const record: Record<string, unknown> = { id: 'R-1', state: 'pendiente', owner: null };
    const { deps } = makeDeps();
    applyAction(
      {
        action,
        manifestKey: 'demo.test',
        manifest: baseManifest,
        records: [record],
        formValues: {},
        isBatch: false,
        userId: 'U-42',
      },
      deps,
    );
    expect(record.state).toBe('en_proceso');
    expect(record.owner).toBe('U-42');
  });

  it('runs the imputacion recompute and stores the result on the record', () => {
    const action: Action = {
      id: 'demo.test.imp.assign',
      dimension: 'imputacion',
      label: 'Assign',
      on_confirm: {
        update_fields: ['cliente_id'],
        recompute: ['imputacion'],
      },
    };
    const record: Record<string, unknown> = { id: 'R-1' };
    const { deps } = makeDeps();
    applyAction(
      {
        action,
        manifestKey: 'demo.test',
        manifest: baseManifest,
        records: [record],
        formValues: { cliente_id: 'C-1' },
        isBatch: false,
        userId: 'U-1',
      },
      deps,
    );
    expect(record._imputacion_state).toBe('imputado');
  });

  it('warns and skips unknown recompute tokens', () => {
    const action: Action = {
      id: 'demo.test.gov.confirm',
      dimension: 'governance',
      label: 'Confirm',
      on_confirm: {
        recompute: ['imputacion', 'inexistente'],
      },
    };
    const record: Record<string, unknown> = { id: 'R-1' };
    const { deps, warns } = makeDeps();
    applyAction(
      {
        action,
        manifestKey: 'demo.test',
        manifest: baseManifest,
        records: [record],
        formValues: {},
        isBatch: false,
        userId: 'U-1',
      },
      deps,
    );
    expect(warns).toEqual([
      { ch: 'MANIFEST', m: 'unknown recompute token: inexistente' },
    ]);
    expect(record._imputacion_state).toBeDefined();
  });

  it('emits a single audit entry with kind:"single" and changes', () => {
    const action: Action = {
      id: 'demo.test.imp.assign',
      dimension: 'imputacion',
      label: 'Assign',
      on_confirm: { update_fields: ['cliente_id'] },
    };
    const record: Record<string, unknown> = { id: 'R-9' };
    const { deps, audit } = makeDeps();
    applyAction(
      {
        action,
        manifestKey: 'demo.test',
        manifest: baseManifest,
        records: [record],
        formValues: { cliente_id: 'C-7' },
        isBatch: false,
        userId: 'U-1',
      },
      deps,
    );
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      kind: 'single',
      action_id: 'demo.test.imp.assign',
      record_id: 'R-9',
      user_id: 'U-1',
      changes: { cliente_id: 'C-7' },
    });
  });

  it('honors audit:false (no entry appended)', () => {
    const action: Action = {
      id: 'demo.test.imp.assign',
      dimension: 'imputacion',
      label: 'Assign',
      on_confirm: { update_fields: ['cliente_id'], audit: false },
    };
    const record: Record<string, unknown> = { id: 'R-9' };
    const { deps, audit } = makeDeps();
    applyAction(
      {
        action,
        manifestKey: 'demo.test',
        manifest: baseManifest,
        records: [record],
        formValues: { cliente_id: 'C-7' },
        isBatch: false,
        userId: 'U-1',
      },
      deps,
    );
    expect(audit).toHaveLength(0);
  });

  it('batch mode emits ONE entry with kind:"batch" and all record_ids', () => {
    const action: Action = {
      id: 'demo.test.imp.assign',
      dimension: 'imputacion',
      label: 'Assign',
      on_confirm: { update_fields: ['cliente_id'] },
    };
    const records = [
      { id: 'R-1' } as Record<string, unknown>,
      { id: 'R-2' } as Record<string, unknown>,
      { id: 'R-3' } as Record<string, unknown>,
    ];
    const { deps, audit } = makeDeps();
    applyAction(
      {
        action,
        manifestKey: 'demo.test',
        manifest: baseManifest,
        records,
        formValues: { cliente_id: 'C-1' },
        isBatch: true,
        userId: 'U-1',
      },
      deps,
    );
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      kind: 'batch',
      action_id: 'demo.test.imp.assign',
      record_ids: ['R-1', 'R-2', 'R-3'],
    });
  });

  it('toasts on success and runs afterMutation', () => {
    const action: Action = {
      id: 'demo.test.imp.assign',
      dimension: 'imputacion',
      label: 'Assign',
      on_confirm: { update_fields: ['cliente_id'], toast: 'Cliente asignado' },
    };
    const record: Record<string, unknown> = { id: 'R-9', nombre: 'Mov 9' };
    const { deps, toasts, afterMutationCount } = makeDeps();
    applyAction(
      {
        action,
        manifestKey: 'demo.test',
        manifest: baseManifest,
        records: [record],
        formValues: { cliente_id: 'C-1' },
        isBatch: false,
        userId: 'U-1',
      },
      deps,
    );
    expect(toasts.success).toEqual([
      { title: 'Cliente asignado', description: 'R-9 — Mov 9' },
    ]);
    expect(afterMutationCount.n).toBe(1);
  });
});
