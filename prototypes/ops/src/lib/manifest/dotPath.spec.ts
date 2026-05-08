import { describe, it, expect } from 'vitest';
import { resolveField, setField } from './dotPath';

describe('dotPath', () => {
  describe('resolveField', () => {
    it('reads a top-level field', () => {
      expect(resolveField({ id: 'R-1' }, 'id')).toBe('R-1');
    });

    it('reads a nested dot-path', () => {
      const obj = { fin: { sociedad_id: 'S-1', cuenta_id: null } };
      expect(resolveField(obj, 'fin.sociedad_id')).toBe('S-1');
      expect(resolveField(obj, 'fin.cuenta_id')).toBeNull();
    });

    it('returns undefined for missing intermediate', () => {
      expect(resolveField({}, 'fin.sociedad_id')).toBeUndefined();
    });

    it('returns undefined when intermediate is a primitive', () => {
      expect(resolveField({ a: 5 }, 'a.b')).toBeUndefined();
    });

    it('returns undefined for empty path', () => {
      expect(resolveField({ a: 1 }, '')).toBeUndefined();
    });

    it('treats null intermediates as terminal', () => {
      expect(resolveField({ a: null }, 'a')).toBeNull();
      expect(resolveField({ a: null }, 'a.b')).toBeUndefined();
    });
  });

  describe('setField', () => {
    it('sets a top-level field', () => {
      const obj: Record<string, unknown> = {};
      setField(obj, 'id', 'R-1');
      expect(obj).toEqual({ id: 'R-1' });
    });

    it('creates nested intermediates as needed', () => {
      const obj: Record<string, unknown> = {};
      setField(obj, 'fin.sociedad_id', 'S-1');
      expect(obj).toEqual({ fin: { sociedad_id: 'S-1' } });
    });

    it('mutates in place without dropping siblings', () => {
      const obj: Record<string, unknown> = { fin: { cuenta_id: 'C-1' } };
      setField(obj, 'fin.sociedad_id', 'S-1');
      expect(obj).toEqual({ fin: { cuenta_id: 'C-1', sociedad_id: 'S-1' } });
    });

    it('throws when an intermediate is a non-object truthy value', () => {
      const obj: Record<string, unknown> = { a: 5 };
      expect(() => setField(obj, 'a.b', 1)).toThrow(
        /cannot descend into non-object intermediate/,
      );
    });

    it('throws on empty path', () => {
      expect(() => setField({}, '', 1)).toThrow();
    });
  });
});
