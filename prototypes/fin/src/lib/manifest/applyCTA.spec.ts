import { describe, it, expect } from 'vitest';
import { applyCTA } from './applyCTA';
import type { ApplyDeps } from './applyTypes';
import { ManifestError, type AuditEntry, type ModuleCTA } from '@/types/manifest';

function makeDeps(): { deps: ApplyDeps; audit: AuditEntry[] } {
  const audit: AuditEntry[] = [];
  return {
    audit,
    deps: {
      auditAppend: (e) => audit.push(e),
      toast: { success: () => {}, error: () => {} },
      afterMutation: () => {},
      recompute: () => undefined,
      devWarn: () => {},
    },
  };
}

describe('applyCTA', () => {
  it('throws ManifestError when creator is missing AND creates_record_type is set', () => {
    const cta: ModuleCTA = {
      id: 'demo.crear',
      label: 'Crear',
      is_module_cta: true,
      creates_record_type: 'movimiento_manual',
    };
    const { deps } = makeDeps();
    expect(() =>
      applyCTA(
        {
          cta,
          manifestKey: 'demo.test',
          formValues: { name: 'X' },
          creator: null,
          userId: 'U-1',
        },
        deps,
      ),
    ).toThrow(ManifestError);
  });

  it('runs the creator and applies on_confirm.set_fields with $now', () => {
    const cta: ModuleCTA = {
      id: 'demo.crear',
      label: 'Crear',
      is_module_cta: true,
      creates_record_type: 'movimiento_manual',
      on_confirm: { set_fields: { 'fin.created_at': '$now' } },
    };
    const { deps } = makeDeps();
    const result = applyCTA(
      {
        cta,
        manifestKey: 'demo.test',
        formValues: { name: 'X' },
        creator: (_cta, fv) => ({ id: 'M-9001', name: fv.name }),
        userId: 'U-1',
      },
      deps,
    );
    expect(result.created).toMatchObject({ id: 'M-9001', name: 'X' });
    const created = result.created as Record<string, unknown>;
    const fin = created.fin as Record<string, unknown>;
    expect(typeof fin.created_at).toBe('number');
  });

  it('emits one audit entry with kind:"cta" + is_module_cta:true', () => {
    const cta: ModuleCTA = {
      id: 'demo.crear',
      label: 'Crear',
      is_module_cta: true,
      creates_record_type: 'movimiento_manual',
    };
    const { deps, audit } = makeDeps();
    applyCTA(
      {
        cta,
        manifestKey: 'demo.test',
        formValues: { name: 'X' },
        creator: () => ({ id: 'M-9001' }),
        userId: 'U-1',
      },
      deps,
    );
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      kind: 'cta',
      action_id: 'demo.crear',
      record_id: 'M-9001',
      created_record_type: 'movimiento_manual',
      is_module_cta: true,
    });
  });

  it('honors audit:false', () => {
    const cta: ModuleCTA = {
      id: 'demo.crear',
      label: 'Crear',
      is_module_cta: true,
      creates_record_type: 'movimiento_manual',
      on_confirm: { audit: false },
    };
    const { deps, audit } = makeDeps();
    applyCTA(
      {
        cta,
        manifestKey: 'demo.test',
        formValues: {},
        creator: () => ({ id: 'M-1' }),
        userId: 'U-1',
      },
      deps,
    );
    expect(audit).toHaveLength(0);
  });

  it('does not require a creator when creates_record_type is absent', () => {
    const cta: ModuleCTA = {
      id: 'demo.export',
      label: 'Export',
      is_module_cta: true,
    };
    const { deps, audit } = makeDeps();
    applyCTA(
      {
        cta,
        manifestKey: 'demo.test',
        formValues: {},
        creator: null,
        userId: 'U-1',
      },
      deps,
    );
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      kind: 'cta',
      action_id: 'demo.export',
      record_id: undefined,
      created_record_type: null,
    });
  });
});
