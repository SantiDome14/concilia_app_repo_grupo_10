import { describe, it, expect, beforeEach } from 'vitest';
import { nextTick } from 'vue';
import {
  usePersistedPageSize,
  isAllowedPageSize,
  ALLOWED_PAGE_SIZES,
} from './usePersistedPageSize';

describe('usePersistedPageSize', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns the default when localStorage has no value', () => {
    const ref = usePersistedPageSize('test.key', 25);
    expect(ref.value).toBe(25);
  });

  it('reads the stored value when present', () => {
    localStorage.setItem('test.key', '50');
    const ref = usePersistedPageSize('test.key', 25);
    expect(ref.value).toBe(50);
  });

  it('falls back to default for non-allowed stored values', () => {
    localStorage.setItem('test.key', '7'); // 7 is not in ALLOWED_PAGE_SIZES
    const ref = usePersistedPageSize('test.key', 10);
    expect(ref.value).toBe(10);
  });

  it('falls back to default for non-integer stored values', () => {
    localStorage.setItem('test.key', 'banana');
    const ref = usePersistedPageSize('test.key', 25);
    expect(ref.value).toBe(25);
  });

  it('persists the value on change', async () => {
    const ref = usePersistedPageSize('test.key', 25);
    ref.value = 100;
    await nextTick();
    expect(localStorage.getItem('test.key')).toBe('100');
  });
});

describe('isAllowedPageSize', () => {
  it('accepts the four canonical sizes', () => {
    for (const size of ALLOWED_PAGE_SIZES) {
      expect(isAllowedPageSize(size)).toBe(true);
    }
  });

  it('rejects non-canonical sizes', () => {
    expect(isAllowedPageSize(20)).toBe(false);
    expect(isAllowedPageSize(0)).toBe(false);
    expect(isAllowedPageSize(-10)).toBe(false);
  });
});
