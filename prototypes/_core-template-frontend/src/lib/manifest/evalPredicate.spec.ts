import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { evalPredicate } from './evalPredicate';

describe('evalPredicate', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  describe('null & array short-circuits', () => {
    it('returns true on null', () => {
      expect(evalPredicate(null, {})).toBe(true);
    });

    it('returns true on undefined', () => {
      expect(evalPredicate(undefined, {})).toBe(true);
    });

    it('treats array as implicit AND', () => {
      const r = { a: 1, b: null };
      expect(
        evalPredicate(
          [{ field_is_not_null: 'a' }, { field_is_null: 'b' }],
          r,
        ),
      ).toBe(true);
      expect(
        evalPredicate(
          [{ field_is_not_null: 'a' }, { field_is_not_null: 'b' }],
          r,
        ),
      ).toBe(false);
    });
  });

  describe('record_concept_in / record_concept_not_in', () => {
    it('matches via concept', () => {
      const r = { concept: 'DEP' };
      expect(evalPredicate({ record_concept_in: ['DEP', 'RET'] }, r)).toBe(true);
      expect(evalPredicate({ record_concept_in: ['RET'] }, r)).toBe(false);
    });

    it('record_concept_not_in inverts', () => {
      const r = { concept: 'DEP' };
      expect(evalPredicate({ record_concept_not_in: ['DEP'] }, r)).toBe(false);
      expect(evalPredicate({ record_concept_not_in: ['RET'] }, r)).toBe(true);
    });
  });

  describe('field_is_null / field_is_not_null', () => {
    it('matches null and undefined alike', () => {
      const r = { a: null, b: undefined };
      expect(evalPredicate({ field_is_null: 'a' }, r)).toBe(true);
      expect(evalPredicate({ field_is_null: 'b' }, r)).toBe(true);
      expect(evalPredicate({ field_is_null: 'missing' }, r)).toBe(true);
    });

    it('field_is_not_null is the inverse', () => {
      const r = { a: 'x', b: null };
      expect(evalPredicate({ field_is_not_null: 'a' }, r)).toBe(true);
      expect(evalPredicate({ field_is_not_null: 'b' }, r)).toBe(false);
    });

    it('supports dot-paths', () => {
      const r = { fin: { sociedad_id: null } };
      expect(evalPredicate({ field_is_null: 'fin.sociedad_id' }, r)).toBe(true);
    });
  });

  describe('field_equals / field_in', () => {
    it('field_equals uses strict equality', () => {
      const r = { a: 'X', b: 1 };
      expect(
        evalPredicate({ field_equals: { field: 'a', value: 'X' } }, r),
      ).toBe(true);
      expect(
        evalPredicate({ field_equals: { field: 'b', value: '1' } }, r),
      ).toBe(false);
    });

    it('field_in checks membership', () => {
      const r = { a: 'X' };
      expect(
        evalPredicate(
          { field_in: { field: 'a', values: ['X', 'Y'] } },
          r,
        ),
      ).toBe(true);
      expect(
        evalPredicate(
          { field_in: { field: 'a', values: ['Z'] } },
          r,
        ),
      ).toBe(false);
    });
  });

  describe('all / any', () => {
    it('all is AND', () => {
      const r = { a: 1, b: null };
      expect(
        evalPredicate(
          {
            all: [
              { field_is_not_null: 'a' },
              { field_is_null: 'b' },
            ],
          },
          r,
        ),
      ).toBe(true);
      expect(
        evalPredicate(
          {
            all: [
              { field_is_not_null: 'a' },
              { field_is_not_null: 'b' },
            ],
          },
          r,
        ),
      ).toBe(false);
    });

    it('any is OR', () => {
      const r = { a: 1, b: null };
      expect(
        evalPredicate(
          {
            any: [
              { field_is_null: 'a' },
              { field_is_null: 'b' },
            ],
          },
          r,
        ),
      ).toBe(true);
      expect(
        evalPredicate(
          {
            any: [
              { field_is_null: 'a' },
              { field_is_not_null: 'b' },
            ],
          },
          r,
        ),
      ).toBe(false);
    });
  });

  describe('multi-key AND-merge', () => {
    it('AND-merges keys on the same object', () => {
      const r = { concept: 'DEP', cliente_id: null };
      expect(
        evalPredicate(
          { record_concept_in: ['DEP'], field_is_null: 'cliente_id' },
          r,
        ),
      ).toBe(true);
      expect(
        evalPredicate(
          { record_concept_in: ['RET'], field_is_null: 'cliente_id' },
          r,
        ),
      ).toBe(false);
    });
  });

  describe('unknown keys', () => {
    it('warns and resolves to true (do-not-block)', () => {
      const r = { a: 1 };
      expect(
        evalPredicate(
          { not_a_real_key: 'X', field_is_not_null: 'a' } as never,
          r,
        ),
      ).toBe(true);
      expect(warnSpy).toHaveBeenCalledWith(
        '[PREDICATES] unknown key: not_a_real_key',
      );
    });
  });
});
