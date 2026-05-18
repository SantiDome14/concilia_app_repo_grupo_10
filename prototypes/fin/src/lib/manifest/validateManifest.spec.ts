import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ManifestError, type Manifest } from '@/types/manifest';
import { validateManifest } from './validateManifest';
import {
  FIN_DISPONIBILIDADES_MOVIMIENTOS_MANIFEST,
  FIN_DISPONIBILIDADES_MOVIMIENTOS_MANIFEST_KEY,
} from '@/manifests/fin.disponibilidades.movimientos.actions';
import {
  FIN_COTIZACIONES_MANIFEST,
  FIN_COTIZACIONES_MANIFEST_KEY,
} from '@/manifests/fin.cotizaciones.actions';
import {
  FIN_DISPONIBILIDADES_MANIFEST,
  FIN_DISPONIBILIDADES_MANIFEST_KEY,
} from '@/manifests/fin.disponibilidades.actions';
import {
  FIN_DISPONIBILIDADES_BANCOS_CUENTAS_MANIFEST,
  FIN_DISPONIBILIDADES_BANCOS_CUENTAS_MANIFEST_KEY,
} from '@/manifests/fin.disponibilidades.bancos_cuentas.actions';

const minimalManifest = (): Manifest => ({
  app: 'demo',
  module: 'test',
  actions: [
    {
      id: 'demo.test.imp.x',
      dimension: 'imputacion',
      label: 'X',
    },
  ],
});

describe('validateManifest', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('happy path', () => {
    it('accepts a minimal manifest', () => {
      const result = validateManifest(minimalManifest(), 'demo.test');
      expect(result.ok).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('accepts the FIN.Disponibilidades.Movimientos manifest with zero warnings', () => {
      // FIN.Disponibilidades.Movimientos is the largest predicate-heavy
      // manifest in core-fin (6 actions, 6 kanban axes, NOSTRO_OR_MANUAL
      // composite predicate). Best stress test for the validator.
      const result = validateManifest(
        FIN_DISPONIBILIDADES_MOVIMIENTOS_MANIFEST,
        FIN_DISPONIBILIDADES_MOVIMIENTOS_MANIFEST_KEY,
      );
      expect(result.warnings).toEqual([]);
      expect(result.ok).toBe(true);
    });

    it('accepts the FIN.Cotizaciones manifest with zero warnings', () => {
      const result = validateManifest(
        FIN_COTIZACIONES_MANIFEST,
        FIN_COTIZACIONES_MANIFEST_KEY,
      );
      expect(result.warnings).toEqual([]);
      expect(result.ok).toBe(true);
    });

    it('accepts the FIN.Disponibilidades module-scope manifest with zero warnings', () => {
      const result = validateManifest(
        FIN_DISPONIBILIDADES_MANIFEST,
        FIN_DISPONIBILIDADES_MANIFEST_KEY,
      );
      expect(result.warnings).toEqual([]);
      expect(result.ok).toBe(true);
    });

    it('accepts the FIN.Disponibilidades · Bancos / Cuentas manifest with zero warnings', () => {
      const result = validateManifest(
        FIN_DISPONIBILIDADES_BANCOS_CUENTAS_MANIFEST,
        FIN_DISPONIBILIDADES_BANCOS_CUENTAS_MANIFEST_KEY,
      );
      expect(result.warnings).toEqual([]);
      expect(result.ok).toBe(true);
    });
  });

  describe('top-level required fields', () => {
    it('rejects missing app', () => {
      const m = { module: 'test' };
      const result = validateManifest(m, 'k');
      expect(result.ok).toBe(false);
      expect(result.warnings.some((w) => w.includes('"app"'))).toBe(true);
    });

    it('rejects missing module', () => {
      const m = { app: 'demo' };
      const result = validateManifest(m, 'k');
      expect(result.ok).toBe(false);
      expect(result.warnings.some((w) => w.includes('"module"'))).toBe(true);
    });

    it('rejects non-object input', () => {
      const result = validateManifest(null, 'k');
      expect(result.ok).toBe(false);
    });
  });

  describe('action validation', () => {
    it('rejects invalid dimension', () => {
      const m = {
        app: 'demo',
        module: 'test',
        actions: [
          { id: 'a', label: 'A', dimension: 'fiscalizacion' as never },
        ],
      };
      const result = validateManifest(m, 'k');
      expect(result.ok).toBe(false);
      expect(result.warnings.some((w) => w.includes('canonical six'))).toBe(
        true,
      );
    });

    it('rejects missing required action fields', () => {
      const m = {
        app: 'demo',
        module: 'test',
        actions: [{ label: 'A' } as never],
      };
      const result = validateManifest(m, 'k');
      expect(result.ok).toBe(false);
      expect(result.warnings.some((w) => w.includes('"id"'))).toBe(true);
      expect(result.warnings.some((w) => w.includes('"dimension"'))).toBe(true);
    });
  });

  describe('dialog field validation', () => {
    it('rejects lookup without catalog', () => {
      const m: Manifest = {
        app: 'demo',
        module: 'test',
        actions: [
          {
            id: 'a',
            label: 'A',
            dimension: 'imputacion',
            dialog: {
              title: 'T',
              fields: [{ id: 'x', label: 'X', type: 'lookup' } as never],
            },
          },
        ],
      };
      const result = validateManifest(m, 'k');
      expect(result.ok).toBe(false);
      expect(result.warnings.some((w) => w.includes('catalog'))).toBe(true);
    });

    it('rejects select with empty options', () => {
      const m: Manifest = {
        app: 'demo',
        module: 'test',
        actions: [
          {
            id: 'a',
            label: 'A',
            dimension: 'imputacion',
            dialog: {
              title: 'T',
              fields: [
                { id: 'x', label: 'X', type: 'select', options: [] } as never,
              ],
            },
          },
        ],
      };
      const result = validateManifest(m, 'k');
      expect(result.ok).toBe(false);
      expect(result.warnings.some((w) => w.includes('select'))).toBe(true);
    });

    it('rejects unknown field type', () => {
      const m: Manifest = {
        app: 'demo',
        module: 'test',
        actions: [
          {
            id: 'a',
            label: 'A',
            dimension: 'imputacion',
            dialog: {
              title: 'T',
              fields: [
                { id: 'x', label: 'X', type: 'invented' as never },
              ],
            },
          },
        ],
      };
      const result = validateManifest(m, 'k');
      expect(result.ok).toBe(false);
    });
  });

  describe('capabilities', () => {
    it('rejects required_role_all_of', () => {
      const m: Manifest = {
        app: 'demo',
        module: 'test',
        actions: [
          {
            id: 'a',
            label: 'A',
            dimension: 'imputacion',
            capabilities: { required_role_all_of: ['A', 'B'] } as never,
          },
        ],
      };
      const result = validateManifest(m, 'k');
      expect(result.ok).toBe(false);
      expect(
        result.warnings.some((w) =>
          w.includes('required_role_all_of is REMOVED'),
        ),
      ).toBe(true);
    });
  });

  describe('JSON-strict serializability', () => {
    it('rejects function values', () => {
      const m = {
        app: 'demo',
        module: 'test',
        actions: [
          {
            id: 'a',
            label: 'A',
            dimension: 'imputacion',
            on_confirm: { custom_handler: (() => {}) as unknown },
          },
        ],
      };
      const result = validateManifest(m, 'k');
      expect(result.ok).toBe(false);
      expect(
        result.warnings.some((w) =>
          w.includes('not JSON-strict serializable'),
        ),
      ).toBe(true);
    });

    it('rejects Date instances', () => {
      const m = {
        app: 'demo',
        module: 'test',
        actions: [
          {
            id: 'a',
            label: 'A',
            dimension: 'imputacion',
            on_confirm: { set_fields: { now: new Date() } },
          },
        ],
      };
      const result = validateManifest(m, 'k');
      expect(result.ok).toBe(false);
      expect(
        result.warnings.some((w) => w.includes('Date instance')),
      ).toBe(true);
    });

    it('rejects undefined values', () => {
      const m = {
        app: 'demo',
        module: 'test',
        record_type: undefined,
        actions: [],
      };
      const result = validateManifest(m, 'k');
      expect(result.ok).toBe(false);
      expect(
        result.warnings.some((w) => w.includes('undefined value')),
      ).toBe(true);
    });
  });

  describe('recompute tokens', () => {
    it('warns on unknown recompute token', () => {
      const m: Manifest = {
        app: 'demo',
        module: 'test',
        actions: [
          {
            id: 'a',
            label: 'A',
            dimension: 'imputacion',
            on_confirm: { recompute: ['imputacion', 'invented'] },
          },
        ],
      };
      const result = validateManifest(m, 'k');
      expect(result.ok).toBe(false);
      expect(
        result.warnings.some((w) => w.includes('unknown token "invented"')),
      ).toBe(true);
    });

    it('respects knownRecomputeTokens override', () => {
      const m: Manifest = {
        app: 'demo',
        module: 'test',
        actions: [
          {
            id: 'a',
            label: 'A',
            dimension: 'imputacion',
            on_confirm: { recompute: ['conciliacion'] },
          },
        ],
      };
      const result = validateManifest(m, 'k', {
        knownRecomputeTokens: ['imputacion', 'conciliacion'],
      });
      expect(result.ok).toBe(true);
    });
  });

  describe('homogeneity_check tokens', () => {
    it('accepts canonical tokens', () => {
      const m: Manifest = {
        app: 'demo',
        module: 'test',
        actions: [
          {
            id: 'a',
            label: 'A',
            dimension: 'imputacion',
            batch: {
              homogeneity_check: [
                'all_records_pass_show_when',
                'all_records_have_field_null:cliente_id',
              ],
            },
          },
        ],
      };
      expect(validateManifest(m, 'k').ok).toBe(true);
    });

    it('warns on unknown tokens', () => {
      const m: Manifest = {
        app: 'demo',
        module: 'test',
        actions: [
          {
            id: 'a',
            label: 'A',
            dimension: 'imputacion',
            batch: { homogeneity_check: ['all_records_have_invented_token'] },
          },
        ],
      };
      const result = validateManifest(m, 'k');
      expect(result.ok).toBe(false);
    });
  });

  describe('strict mode', () => {
    it('throws on the first violation', () => {
      const m = { module: 'test' };
      expect(() => validateManifest(m, 'k', 'strict')).toThrow(ManifestError);
    });

    it('does not throw for valid manifests', () => {
      expect(() =>
        validateManifest(minimalManifest(), 'k', 'strict'),
      ).not.toThrow();
    });
  });

  describe('module CTAs and kanban axes', () => {
    it('rejects CTA missing id/label', () => {
      const m: Manifest = {
        app: 'demo',
        module: 'test',
        module_ctas: [{ label: 'L' } as never],
      };
      const result = validateManifest(m, 'k');
      expect(result.ok).toBe(false);
    });

    it('rejects kanban axis missing axis_id', () => {
      const m: Manifest = {
        app: 'demo',
        module: 'test',
        kanban_axes: [{ dimension: 'imputacion' } as never],
      };
      const result = validateManifest(m, 'k');
      expect(result.ok).toBe(false);
    });
  });
});
