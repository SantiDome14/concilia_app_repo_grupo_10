import { describe, it, expect } from 'vitest';
import { evalCapabilities } from './evalCapabilities';

describe('evalCapabilities', () => {
  it('returns true when capabilities are undefined', () => {
    expect(evalCapabilities(undefined, 'ADMIN')).toBe(true);
  });

  it('returns true when capabilities are null', () => {
    expect(evalCapabilities(null, 'ADMIN')).toBe(true);
  });

  it('passes when role is in required_role_any_of', () => {
    expect(
      evalCapabilities(
        { required_role_any_of: ['OPS_OFFICER', 'ADMIN_FIN'] },
        'ADMIN_FIN',
      ),
    ).toBe(true);
  });

  it('fails when role is not in required_role_any_of', () => {
    expect(
      evalCapabilities({ required_role_any_of: ['ADMIN_FIN'] }, 'VIEWER'),
    ).toBe(false);
  });

  it('passes when any role from a multi-role user matches', () => {
    expect(
      evalCapabilities(
        { required_role_any_of: ['ADMIN_FIN'] },
        ['VIEWER', 'ADMIN_FIN'],
      ),
    ).toBe(true);
  });

  it('fails when role is null and any_of is non-empty', () => {
    expect(
      evalCapabilities({ required_role_any_of: ['ADMIN_FIN'] }, null),
    ).toBe(false);
  });

  it('passes when any_of is empty (no constraint)', () => {
    expect(evalCapabilities({ required_role_any_of: [] }, 'VIEWER')).toBe(true);
  });

  it('silently ignores required_role_all_of at evaluation time', () => {
    // Validator surfaces this; evaluator just doesn't read it.
    const caps = { required_role_all_of: ['A', 'B'] } as never;
    expect(evalCapabilities(caps, 'A')).toBe(true);
  });
});
