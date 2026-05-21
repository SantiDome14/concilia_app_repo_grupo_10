import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyAction } from './applyAction';
import { computeImputation } from './computeImputation';
import type { ApplyDeps } from './applyTypes';
import type { Action, AuditEntry, Manifest } from '@/types/manifest';

type DispatchCall = {
  kind: 'update' | 'create';
  recordId?: string;
  patch?: Record<string, unknown>;
  record?: Record<string, unknown>;
};

function makeDeps(over: Partial<ApplyDeps> = {}): {
  deps: ApplyDeps;
  audit: AuditEntry[];
  toasts: { success: { title: string; description?: string }[]; error: { title: string; description?: string }[] };
  dispatched: DispatchCall[];
  warns: { ch: string; m: string }[];
} {
  const audit: AuditEntry[] = [];
  const toasts = {
    success: [] as { title: string; description?: string }[],
    error: [] as { title: string; description?: string }[],
  };
  const dispatched: DispatchCall[] = [];
  const warns: { ch: string; m: string }[] = [];
  const deps: ApplyDeps = {
    auditAppend: (e) => audit.push(e),
    toast: {
      success: (title, description) => toasts.success.push({ title, description }),
      error: (title, description) => toasts.error.push({ title, description }),
    },
    dispatch: {
      update: (recordId, patch) =>
        dispatched.push({ kind: 'update', recordId, patch }),
      create: (record) => dispatched.push({ kind: 'create', record }),
    },
    recompute: (token) => {
      if (token === 'imputacion') return computeImputation;
      return undefined;
    },
    devWarn: (ch, m) => warns.push({ ch, m }),
    ...over,
  };
  return { deps, audit, toasts, dispatched, warns };
}

function patchFor(dispatched: DispatchCall[], recordId: string): Record<string, unknown> {
  const found = dispatched.find((d) => d.kind === 'update' && d.recordId === recordId);
  return (found?.patch ?? {}) as Record<string, unknown>;
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
    const { deps, dispatched } = makeDeps();
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
    // Engine does NOT mutate the input record.
    expect(record.cliente_id).toBeUndefined();
    // The dispatched patch contains only the declared update_field.
    const patch = patchFor(dispatched, 'R-1');
    expect(patch).toEqual({ cliente_id: 'C-1' });
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
    const { deps, dispatched } = makeDeps();
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
    const patch = patchFor(dispatched, 'R-1');
    expect(patch['fin.intercompany']).toBe(true);
    expect(patch['fin.intercompany_at']).toBe(1_700_000_000_000);
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
    const { deps, dispatched } = makeDeps();
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
    const patch = patchFor(dispatched, 'R-1');
    expect(patch.state).toBe('en_proceso');
    expect(patch.owner).toBe('U-42');
  });

  it('runs the imputacion recompute and stores the result in the patch', () => {
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
    const { deps, dispatched } = makeDeps();
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
    const patch = patchFor(dispatched, 'R-1');
    expect(patch._imputacion_state).toBe('imputado');
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
    const { deps, warns, dispatched } = makeDeps();
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
    const patch = patchFor(dispatched, 'R-1');
    expect(patch._imputacion_state).toBeDefined();
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
    const { deps, audit, dispatched } = makeDeps();
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
    // One dispatch call per record.
    expect(dispatched.filter((d) => d.kind === 'update')).toHaveLength(3);
  });

  it('toasts on success and dispatches the patch', () => {
    const action: Action = {
      id: 'demo.test.imp.assign',
      dimension: 'imputacion',
      label: 'Assign',
      on_confirm: { update_fields: ['cliente_id'], toast: 'Cliente asignado' },
    };
    const record: Record<string, unknown> = { id: 'R-9', nombre: 'Mov 9' };
    const { deps, toasts, dispatched } = makeDeps();
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
    expect(dispatched.filter((d) => d.kind === 'update')).toHaveLength(1);
  });
});
