import { describe, it, expect } from 'vitest';
import { applyComposite } from './applyComposite';
import { computeImputation } from './computeImputation';
import type { ApplyDeps } from './applyTypes';
import type { Action, AuditEntry, Manifest } from '@/types/manifest';

type DispatchCall = {
  recordId: string;
  patch: Record<string, unknown>;
};

function makeDeps(): {
  deps: ApplyDeps;
  audit: AuditEntry[];
  warns: { ch: string; m: string }[];
  dispatched: DispatchCall[];
} {
  const audit: AuditEntry[] = [];
  const warns: { ch: string; m: string }[] = [];
  const dispatched: DispatchCall[] = [];
  const deps: ApplyDeps = {
    auditAppend: (e) => audit.push(e),
    toast: { success: () => {}, error: () => {} },
    dispatch: {
      update: (recordId, patch) => dispatched.push({ recordId, patch }),
      create: () => {},
    },
    recompute: (token) => (token === 'imputacion' ? computeImputation : undefined),
    devWarn: (ch, m) => warns.push({ ch, m }),
  };
  return { deps, audit, warns, dispatched };
}

const manifest: Manifest = {
  app: 'demo',
  module: 'test',
  required_imputations: ['cliente_id', 'cuenta_id'],
};

describe('applyComposite', () => {
  it('applies update_fields and set_fields of every enabled action in order', () => {
    const a1: Action = {
      id: 'a1',
      dimension: 'imputacion',
      label: 'A1',
      on_confirm: { update_fields: ['cliente_id'] },
    };
    const a2: Action = {
      id: 'a2',
      dimension: 'imputacion',
      label: 'A2',
      on_confirm: { update_fields: ['cuenta_id'], set_fields: { 'aux.flag': true } },
    };
    const record: Record<string, unknown> = { id: 'R-1' };
    const { deps, dispatched } = makeDeps();
    applyComposite(
      {
        manifestKey: 'demo.test',
        manifest,
        axisId: 'imputacion',
        record,
        enabledActions: [a1, a2],
        formValues: { cliente_id: 'C-1', cuenta_id: 'CU-9' },
        userId: 'U-1',
      },
      deps,
    );
    // Engine doesn't mutate the input record.
    expect(record.cliente_id).toBeUndefined();
    expect(record.cuenta_id).toBeUndefined();
    // The dispatched patch reflects every action's writes.
    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]?.recordId).toBe('R-1');
    expect(dispatched[0]?.patch.cliente_id).toBe('C-1');
    expect(dispatched[0]?.patch.cuenta_id).toBe('CU-9');
    expect(dispatched[0]?.patch['aux.flag']).toBe(true);
  });

  it('substitutes "$current_user" in composite set_fields with the invoker userId', () => {
    const a1: Action = {
      id: 'a1',
      dimension: 'governance',
      label: 'A1',
      on_confirm: { set_fields: { taken_by: '$current_user' } },
    };
    const record: Record<string, unknown> = { id: 'R-1' };
    const { deps, dispatched } = makeDeps();
    applyComposite(
      {
        manifestKey: 'demo.test',
        manifest,
        axisId: 'governance',
        record,
        enabledActions: [a1],
        formValues: {},
        userId: 'U-42',
      },
      deps,
    );
    expect(dispatched[0]?.patch.taken_by).toBe('U-42');
  });

  it('runs ONE recompute even when multiple actions declare it', () => {
    const a1: Action = {
      id: 'a1',
      dimension: 'imputacion',
      label: 'A1',
      on_confirm: { update_fields: ['cliente_id'], recompute: ['imputacion'] },
    };
    const a2: Action = {
      id: 'a2',
      dimension: 'imputacion',
      label: 'A2',
      on_confirm: { update_fields: ['cuenta_id'], recompute: ['imputacion'] },
    };
    const a3: Action = {
      id: 'a3',
      dimension: 'imputacion',
      label: 'A3',
      on_confirm: { recompute: ['imputacion'] },
    };
    const record: Record<string, unknown> = { id: 'R-1' };
    const captured = { count: 0 };
    const dispatched: DispatchCall[] = [];
    const deps: ApplyDeps = {
      auditAppend: () => {},
      toast: { success: () => {}, error: () => {} },
      dispatch: {
        update: (recordId, patch) => dispatched.push({ recordId, patch }),
        create: () => {},
      },
      recompute: (token) =>
        token === 'imputacion'
          ? (rec, m) => {
              captured.count += 1;
              return computeImputation(rec, m);
            }
          : undefined,
      devWarn: () => {},
    };
    applyComposite(
      {
        manifestKey: 'demo.test',
        manifest,
        axisId: 'imputacion',
        record,
        enabledActions: [a1, a2, a3],
        formValues: { cliente_id: 'C-1', cuenta_id: 'CU-1' },
        userId: 'U-1',
      },
      deps,
    );
    expect(captured.count).toBe(1);
    expect(dispatched[0]?.patch._imputacion_state).toBe('imputado');
  });

  it('emits ONE audit entry with kind:"composite" and child_action_ids[]', () => {
    const a1: Action = {
      id: 'a1',
      dimension: 'imputacion',
      label: 'A1',
      on_confirm: { update_fields: ['cliente_id'] },
    };
    const a2: Action = {
      id: 'a2',
      dimension: 'imputacion',
      label: 'A2',
      on_confirm: { update_fields: ['cuenta_id'] },
    };
    const a3: Action = {
      id: 'a3',
      dimension: 'imputacion',
      label: 'A3',
      on_confirm: { set_fields: { 'aux.flag': true } },
    };
    const audit: AuditEntry[] = [];
    const deps: ApplyDeps = {
      auditAppend: (e) => audit.push(e),
      toast: { success: () => {}, error: () => {} },
      dispatch: { update: () => {}, create: () => {} },
      recompute: () => undefined,
      devWarn: () => {},
    };
    const record: Record<string, unknown> = { id: 'R-9' };
    applyComposite(
      {
        manifestKey: 'demo.test',
        manifest,
        axisId: 'imputacion',
        record,
        enabledActions: [a1, a2, a3],
        formValues: { cliente_id: 'C-1', cuenta_id: 'CU-1' },
        userId: 'U-1',
      },
      deps,
    );
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      kind: 'composite',
      action_id: 'composite:imputacion',
      record_id: 'R-9',
      axis_id: 'imputacion',
      child_action_ids: ['a1', 'a2', 'a3'],
    });
  });

  it('warns on unknown recompute token', () => {
    const a1: Action = {
      id: 'a1',
      dimension: 'imputacion',
      label: 'A1',
      on_confirm: { recompute: ['totalmente_inventado'] },
    };
    const warns: { ch: string; m: string }[] = [];
    const deps: ApplyDeps = {
      auditAppend: () => {},
      toast: { success: () => {}, error: () => {} },
      dispatch: { update: () => {}, create: () => {} },
      recompute: () => undefined,
      devWarn: (ch, m) => warns.push({ ch, m }),
    };
    applyComposite(
      {
        manifestKey: 'demo.test',
        manifest,
        axisId: 'imputacion',
        record: { id: 'R-1' },
        enabledActions: [a1],
        formValues: {},
        userId: 'U-1',
      },
      deps,
    );
    expect(warns).toEqual([
      { ch: 'MANIFEST', m: 'unknown recompute token: totalmente_inventado' },
    ]);
  });
});
