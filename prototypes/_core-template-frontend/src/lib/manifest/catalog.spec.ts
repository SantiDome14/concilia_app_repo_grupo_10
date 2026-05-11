import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerCatalog,
  unregisterCatalog,
  resolveCatalog,
  resolveCatalogFilter,
  listCatalogs,
  UNFILTERED_CATALOG_FILTER,
  _clearCatalogRegistry,
} from './catalog';
import type { DialogFieldLookup } from '@/types/manifest';

const cuentas = [
  { value: 'C-1', label: 'Caja', sociedad_id: 'S-1' },
  { value: 'C-2', label: 'Banco', sociedad_id: 'S-1' },
  { value: 'C-3', label: 'Activo', sociedad_id: 'S-2' },
];

beforeEach(() => {
  _clearCatalogRegistry();
});

describe('catalog', () => {
  describe('registerCatalog / resolveCatalog', () => {
    it('registers a resolver and resolves with a non-empty filter', () => {
      registerCatalog('fin.cuentas', (filter) =>
        cuentas
          .filter((c) => c.sociedad_id === filter)
          .map((c) => ({ value: c.value, label: c.label })),
      );
      const out = resolveCatalog('fin.cuentas', 'S-1');
      expect(out).toEqual([
        { value: 'C-1', label: 'Caja' },
        { value: 'C-2', label: 'Banco' },
      ]);
    });

    it('returns [] when the filter is null', () => {
      registerCatalog('fin.cuentas', () => cuentas as never);
      expect(resolveCatalog('fin.cuentas', null)).toEqual([]);
    });

    it('returns [] when the filter is empty string', () => {
      registerCatalog('fin.cuentas', () => cuentas as never);
      expect(resolveCatalog('fin.cuentas', '')).toEqual([]);
    });

    it('returns [] when no resolver is registered', () => {
      expect(resolveCatalog('does.not.exist', 'X')).toEqual([]);
    });

    it('listCatalogs reflects registrations and unregistrations', () => {
      registerCatalog('a', () => []);
      registerCatalog('b', () => []);
      expect(listCatalogs().sort()).toEqual(['a', 'b']);
      unregisterCatalog('a');
      expect(listCatalogs()).toEqual(['b']);
    });
  });

  describe('resolveCatalogFilter', () => {
    const baseField = (
      cf: DialogFieldLookup['catalog_filter'],
    ): DialogFieldLookup => ({
      id: 'cuenta_id',
      label: 'Cuenta',
      type: 'lookup',
      catalog: 'fin.cuentas',
      catalog_filter: cf,
    });

    it('reads from_record by dot-path', () => {
      const f = baseField({ field: 'sociedad_id', from_record: 'sociedad_id' });
      const out = resolveCatalogFilter(f, {
        record: { sociedad_id: 'S-9' },
        formValues: {},
      });
      expect(out).toBe('S-9');
    });

    it('returns null when from_record antecedent is null', () => {
      const f = baseField({ field: 'sociedad_id', from_record: 'sociedad_id' });
      const out = resolveCatalogFilter(f, {
        record: { sociedad_id: null },
        formValues: {},
      });
      expect(out).toBeNull();
    });

    it('reads from_form by field id', () => {
      const f = baseField({ field: 'sociedad_id', from_form: 'sociedad_id' });
      const out = resolveCatalogFilter(f, {
        record: undefined,
        formValues: { sociedad_id: 'S-2' },
      });
      expect(out).toBe('S-2');
    });

    it('returns null when from_form value is empty string', () => {
      const f = baseField({ field: 'sociedad_id', from_form: 'sociedad_id' });
      const out = resolveCatalogFilter(f, {
        record: undefined,
        formValues: { sociedad_id: '' },
      });
      expect(out).toBeNull();
    });

    it('returns the literal value verbatim', () => {
      const f = baseField({ field: 'tipo', value: 'CASH' });
      const out = resolveCatalogFilter(f, {
        record: undefined,
        formValues: {},
      });
      expect(out).toBe('CASH');
    });

    it('returns the UNFILTERED sentinel when no catalog_filter is declared', () => {
      const f: DialogFieldLookup = {
        id: 'x',
        label: 'X',
        type: 'lookup',
        catalog: 'fin.cuentas',
      };
      const out = resolveCatalogFilter(f, {
        record: { x: 'y' },
        formValues: {},
      });
      expect(out).toBe(UNFILTERED_CATALOG_FILTER);
    });

    it('UNFILTERED sentinel resolves to the full catalog (no filter applied)', () => {
      registerCatalog('fin.unfiltered', () => [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ]);
      const f: DialogFieldLookup = {
        id: 'x',
        label: 'X',
        type: 'lookup',
        catalog: 'fin.unfiltered',
      };
      const filter = resolveCatalogFilter(f, { record: undefined, formValues: {} });
      expect(filter).toBe(UNFILTERED_CATALOG_FILTER);
      const out = resolveCatalog(f.catalog, filter);
      expect(out).toEqual([
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ]);
    });

    it('caller renders empty-state when filter is null (resolveCatalog returns [])', () => {
      registerCatalog('fin.cuentas', () => cuentas as never);
      const f = baseField({ field: 'sociedad_id', from_record: 'sociedad_id' });
      const filter = resolveCatalogFilter(f, {
        record: { sociedad_id: null },
        formValues: {},
      });
      expect(filter).toBeNull();
      expect(resolveCatalog(f.catalog, filter)).toEqual([]);
    });
  });
});
