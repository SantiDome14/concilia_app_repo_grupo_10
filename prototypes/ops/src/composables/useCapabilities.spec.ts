import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCapabilities } from './useCapabilities';
import { useAuthStore } from '@/stores/auth';

// ════════════════════════════════════════════════════════════════════
// useCapabilities — verifies the wildcard `'*'` convention plus the
// classic explicit-string semantics.
// ════════════════════════════════════════════════════════════════════

function setUserWithCapabilities(capabilities: string[]): void {
  useAuthStore().setUser({
    id: 'u-1',
    email: 'u@x',
    name: 'U',
    capabilities,
  });
}

describe('useCapabilities — explicit capability semantics', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('can() returns true only when the explicit capability is present', () => {
    setUserWithCapabilities(['psp:read', 'OPS_ADMIN']);
    const { can } = useCapabilities();
    expect(can('psp:read')).toBe(true);
    expect(can('OPS_ADMIN')).toBe(true);
    expect(can('psp:create-movement')).toBe(false);
  });

  it('canAny() returns true when at least one capability matches', () => {
    setUserWithCapabilities(['psp:read']);
    const { canAny } = useCapabilities();
    expect(canAny(['psp:read', 'psp:create-movement'])).toBe(true);
    expect(canAny(['psp:create-movement', 'psp:create-account'])).toBe(false);
  });

  it('canAll() returns true only when every capability matches', () => {
    setUserWithCapabilities(['psp:read', 'psp:create-movement']);
    const { canAll } = useCapabilities();
    expect(canAll(['psp:read', 'psp:create-movement'])).toBe(true);
    expect(canAll(['psp:read', 'psp:create-account'])).toBe(false);
  });

  it('returns false when the user is null (logged out)', () => {
    useAuthStore().setUser(null);
    const { can, canAny, canAll } = useCapabilities();
    expect(can('psp:read')).toBe(false);
    expect(canAny(['psp:read'])).toBe(false);
    expect(canAll(['psp:read'])).toBe(false);
  });
});

describe('useCapabilities — wildcard `*` convention', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('a user holding `*` passes every can() check', () => {
    setUserWithCapabilities(['*']);
    const { can } = useCapabilities();
    expect(can('psp:read')).toBe(true);
    expect(can('psp:create-movement')).toBe(true);
    expect(can('lex:something:totally-new')).toBe(true);
    expect(can('OPS_ADMIN')).toBe(true);
  });

  it('a user holding `*` passes every canAny() check', () => {
    setUserWithCapabilities(['*']);
    const { canAny } = useCapabilities();
    expect(canAny(['nope:1', 'nope:2'])).toBe(true);
    expect(canAny([])).toBe(true);
  });

  it('a user holding `*` passes every canAll() check', () => {
    setUserWithCapabilities(['*']);
    const { canAll } = useCapabilities();
    expect(canAll(['nope:1', 'nope:2'])).toBe(true);
  });

  it('the wildcard does not require additional named roles', () => {
    setUserWithCapabilities(['*']);
    const { can } = useCapabilities();
    // No `ADMIN`, `OPS_ADMIN`, etc. in the array; `*` alone unlocks everything.
    expect(can('OPS_ADMIN')).toBe(true);
    expect(can('any:future:gate-that-doesnt-exist-yet')).toBe(true);
  });
});
