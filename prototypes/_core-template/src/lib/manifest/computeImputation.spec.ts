import { describe, it, expect } from 'vitest';
import { computeImputation } from './computeImputation';
import type { Manifest } from '@/types/manifest';

const finManifest: Manifest = {
  app: 'fin',
  module: 'operaciones',
  required_imputations: ['fin.sociedad_id', 'fin.cuenta_id'],
  required_by_type: {
    DEPOSIT: ['fin.sociedad_id', 'fin.cuenta_id', 'fin.cliente_id'],
    '*': ['fin.sociedad_id'],
  },
  kanban_axes: [
    {
      axis_id: 'fin.imput',
      dimension: 'imputacion',
      states: ['PEND', 'PARC', 'IMP'],
    },
  ],
};

const defaultManifest: Manifest = {
  app: 'demo',
  module: 'test',
  required_imputations: ['responsable_id', 'estado_aprobacion'],
};

describe('computeImputation', () => {
  describe('default state vocabulary', () => {
    it('returns "imputado" when no required fields are declared', () => {
      const r = {};
      expect(computeImputation(r, { app: 'a', module: 'b' })).toBe('imputado');
    });

    it('returns "pendiente" when none filled', () => {
      const r = {};
      expect(computeImputation(r, defaultManifest)).toBe('pendiente');
    });

    it('returns "en_proceso" when partial', () => {
      const r = { responsable_id: 'U-1' };
      expect(computeImputation(r, defaultManifest)).toBe('en_proceso');
    });

    it('returns "imputado" when all filled', () => {
      const r = { responsable_id: 'U-1', estado_aprobacion: 'Aprobado' };
      expect(computeImputation(r, defaultManifest)).toBe('imputado');
    });

    it('treats null/empty/false as not filled', () => {
      expect(
        computeImputation(
          { responsable_id: '', estado_aprobacion: false },
          defaultManifest,
        ),
      ).toBe('pendiente');
    });
  });

  describe('FIN state vocabulary', () => {
    it('PEND when nothing assigned (DEPOSIT requires 3 fields)', () => {
      const r = { _record_type: 'DEPOSIT' };
      expect(computeImputation(r, finManifest)).toBe('PEND');
    });

    it('PARC when partial', () => {
      const r = { _record_type: 'DEPOSIT', fin: { sociedad_id: 'S-1' } };
      expect(computeImputation(r, finManifest)).toBe('PARC');
    });

    it('IMP when all required filled', () => {
      const r = {
        _record_type: 'DEPOSIT',
        fin: {
          sociedad_id: 'S-1',
          cuenta_id: 'C-1',
          cliente_id: 'CL-1',
        },
      };
      expect(computeImputation(r, finManifest)).toBe('IMP');
    });
  });

  describe('record_type fallback chain', () => {
    it('uses record_type-specific list when present', () => {
      const r = {
        _record_type: 'DEPOSIT',
        fin: { sociedad_id: 'S-1', cuenta_id: 'C-1' },
      };
      // DEPOSIT requires 3 fields → still partial
      expect(computeImputation(r, finManifest)).toBe('PARC');
    });

    it('falls back to "*" wildcard when type is not in map', () => {
      // OTH not in required_by_type; falls to '*' which lists ['fin.sociedad_id']
      const r = { _record_type: 'OTH', fin: { sociedad_id: 'S-1' } };
      expect(computeImputation(r, finManifest)).toBe('IMP');
    });

    it('falls back to required_imputations when no by_type entry matches', () => {
      const m: Manifest = {
        app: 'a',
        module: 'b',
        required_imputations: ['x'],
        required_by_type: { DEPOSIT: ['y'] },
      };
      const r = { _record_type: 'OTH', x: 'set' };
      expect(computeImputation(r, m)).toBe('imputado');
    });

    it('honours tipo when _record_type is absent', () => {
      const r = { tipo: 'DEPOSIT', fin: { sociedad_id: 'S-1' } };
      expect(computeImputation(r, finManifest)).toBe('PARC');
    });
  });
});
