import { describe, it, expect } from 'vitest';
import { resolveActions } from './resolveActions';
import type { Manifest } from '@/types/manifest';

const baseAction = {
  id: 'demo.test.imp.x',
  dimension: 'imputacion' as const,
  label: 'X',
};

function manifest(action: Manifest['actions']): Manifest {
  return {
    app: 'demo',
    module: 'test',
    actions: action,
  };
}

describe('resolveActions', () => {
  describe('show_when gate', () => {
    it('drops actions whose show_when is false', () => {
      const m = manifest([
        {
          ...baseAction,
          show_when: { record_concept_in: ['DEP'] },
        },
      ]);
      const out = resolveActions({ concept: 'RET' }, m, 'ADMIN');
      expect(out).toHaveLength(0);
    });

    it('keeps actions whose show_when passes', () => {
      const m = manifest([
        {
          ...baseAction,
          show_when: { record_concept_in: ['DEP'] },
        },
      ]);
      const out = resolveActions({ concept: 'DEP' }, m, 'ADMIN');
      expect(out).toHaveLength(1);
      expect(out[0]?.enabled).toBe(true);
      expect(out[0]?.tag).toBeNull();
    });
  });

  describe('prerequisites gate', () => {
    it('first failing prerequisite wins; tag defaults to "Prerequisito"', () => {
      const m = manifest([
        {
          ...baseAction,
          prerequisites: [
            { field: 'sociedad_id', message: 'Asigná Estructura primero' },
            { field: 'cuenta_id', message: 'Asigná Cuenta primero' },
          ],
        },
      ]);
      const out = resolveActions(
        { sociedad_id: null, cuenta_id: null },
        m,
        'ADMIN',
      );
      expect(out[0]?.enabled).toBe(false);
      expect(out[0]?.reason).toBe('Asigná Estructura primero');
      expect(out[0]?.tag).toBe('Prerequisito');
      expect(out[0]?.blocking_prereq?.field).toBe('sociedad_id');
    });

    it('respects custom disable_tag for prerequisite failures', () => {
      const m = manifest([
        {
          ...baseAction,
          disable_tag: 'CustomPrereq',
          prerequisites: [
            { field: 'sociedad_id', message: 'msg' },
          ],
        },
      ]);
      const out = resolveActions({ sociedad_id: null }, m, 'ADMIN');
      expect(out[0]?.tag).toBe('CustomPrereq');
    });

    it('passes when prerequisite value matches', () => {
      const m = manifest([
        {
          ...baseAction,
          prerequisites: [
            {
              field: 'estado_aprobacion',
              value: 'Aprobado',
              message: 'Aprobá primero',
            },
          ],
        },
      ]);
      const out = resolveActions(
        { estado_aprobacion: 'Aprobado' },
        m,
        'ADMIN',
      );
      expect(out[0]?.enabled).toBe(true);
    });
  });

  describe('enable_when gate', () => {
    it('disables with default tag "Estado" when no custom tag', () => {
      const m = manifest([
        {
          ...baseAction,
          enable_when: { field_is_null: 'cliente_id' },
        },
      ]);
      const out = resolveActions({ cliente_id: 'C-1' }, m, 'ADMIN');
      expect(out[0]?.enabled).toBe(false);
      expect(out[0]?.tag).toBe('Estado');
      expect(out[0]?.reason).toBe('Acción no disponible para este registro');
    });

    it('uses action.disable_tag and disable_reason when provided', () => {
      const m = manifest([
        {
          ...baseAction,
          enable_when: { field_is_null: 'cliente_id' },
          disable_tag: 'Asignado',
          disable_reason: 'Cliente ya asignado',
        },
      ]);
      const out = resolveActions({ cliente_id: 'C-1' }, m, 'ADMIN');
      expect(out[0]?.tag).toBe('Asignado');
      expect(out[0]?.reason).toBe('Cliente ya asignado');
    });

    it('V2 idiom: never-enabled flag', () => {
      const m = manifest([
        {
          ...baseAction,
          enable_when: { field_equals: { field: '_never', value: true } },
          disable_tag: 'V2',
          disable_reason: 'Disponible en V2',
        },
      ]);
      const out = resolveActions({}, m, 'ADMIN');
      expect(out[0]?.enabled).toBe(false);
      expect(out[0]?.tag).toBe('V2');
      expect(out[0]?.reason).toBe('Disponible en V2');
    });
  });

  describe('capabilities gate', () => {
    it('disables with tag "Permiso" when role mismatch', () => {
      const m = manifest([
        {
          ...baseAction,
          capabilities: { required_role_any_of: ['ADMIN_FIN'] },
        },
      ]);
      const out = resolveActions({}, m, 'VIEWER');
      expect(out[0]?.enabled).toBe(false);
      expect(out[0]?.tag).toBe('Permiso');
      expect(out[0]?.reason).toBe('Tu rol actual no permite esta acción');
    });

    it('Permiso overrides custom disable_tag', () => {
      const m = manifest([
        {
          ...baseAction,
          enable_when: { field_is_null: 'x' }, // passes against {}
          disable_tag: 'Estado',
          capabilities: { required_role_any_of: ['ADMIN_FIN'] },
        },
      ]);
      const out = resolveActions({}, m, 'VIEWER');
      expect(out[0]?.enabled).toBe(false);
      expect(out[0]?.tag).toBe('Permiso');
    });
  });

  describe('gate ordering', () => {
    it('prereq fires before enable_when', () => {
      const m = manifest([
        {
          ...baseAction,
          prerequisites: [{ field: 'a', message: 'fill a' }],
          enable_when: { field_is_null: 'b' }, // would also disable
        },
      ]);
      const out = resolveActions({ a: null, b: 'set' }, m, 'ADMIN');
      expect(out[0]?.tag).toBe('Prerequisito');
      expect(out[0]?.reason).toBe('fill a');
    });

    it('enable_when fires before capabilities', () => {
      const m = manifest([
        {
          ...baseAction,
          enable_when: { field_is_null: 'b' },
          disable_reason: 'Estado fail',
          capabilities: { required_role_any_of: ['ADMIN_FIN'] },
        },
      ]);
      const out = resolveActions({ b: 'set' }, m, 'VIEWER');
      expect(out[0]?.tag).toBe('Estado');
      expect(out[0]?.reason).toBe('Estado fail');
    });
  });
});
