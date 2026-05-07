import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import type * as vueModule from 'vue';

// ─── Auth0 mock — must be hoisted ────────────────────────────────────
vi.mock('@auth0/auth0-vue', () => ({
  useAuth0: vi.fn(),
}));

// Force the composable to take the "Auth0 registered" path during tests.
vi.mock('vue', async () => {
  type VueModule = typeof vueModule;
  const actual = await vi.importActual<VueModule>('vue');
  return {
    ...actual,
    getCurrentInstance: () => ({
      appContext: { config: { globalProperties: { $auth0: {} } } },
    }),
  };
});

// Imports happen AFTER the mocks above so the composable picks the mocked deps.
import { useAuth0 } from '@auth0/auth0-vue';
import {
  useStepUp,
  StepUpBlockedError,
  StepUpCancelledError,
  StepUpNetworkError,
  StepUpRejectedError,
  _internals,
} from './useStepUp';

const useAuth0Mock = useAuth0 as unknown as Mock;

interface FakeAuth0 {
  loginWithPopup: Mock;
  loginWithRedirect: Mock;
}

function setupFakeAuth0(): FakeAuth0 {
  const fake: FakeAuth0 = {
    loginWithPopup: vi.fn().mockResolvedValue(undefined),
    loginWithRedirect: vi.fn().mockResolvedValue(undefined),
  };
  useAuth0Mock.mockReturnValue(fake);
  return fake;
}

beforeEach(() => {
  _internals.reset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  _internals.reset();
});

describe('useStepUp — successful elevation via popup', () => {
  it('transitions isElevated to true and sets elevatedUntil', async () => {
    const fake = setupFakeAuth0();
    const stepup = useStepUp();
    expect(stepup.isElevated.value).toBe(false);

    await stepup.requestStepUp({ ttlSeconds: 60 });

    expect(fake.loginWithPopup).toHaveBeenCalledWith({
      authorizationParams: { prompt: 'login' },
    });
    expect(stepup.isElevated.value).toBe(true);
    expect(stepup.elevatedUntil.value).toBeInstanceOf(Date);
  });

  it('forwards acrValues into authorizationParams', async () => {
    const fake = setupFakeAuth0();
    const stepup = useStepUp();
    await stepup.requestStepUp({ acrValues: 'urn:mace:incommon:iap:silver' });
    expect(fake.loginWithPopup).toHaveBeenCalledWith({
      authorizationParams: {
        prompt: 'login',
        acr_values: 'urn:mace:incommon:iap:silver',
      },
    });
  });
});

describe('useStepUp — auto-expiration', () => {
  it('flips isElevated back to false when the TTL elapses', async () => {
    setupFakeAuth0();
    const stepup = useStepUp();
    await stepup.requestStepUp({ ttlSeconds: 5 });
    expect(stepup.isElevated.value).toBe(true);

    vi.advanceTimersByTime(5_000);
    expect(stepup.isElevated.value).toBe(false);
    expect(stepup.elevatedUntil.value).toBeNull();
  });

  it('clearElevation revokes immediately', async () => {
    setupFakeAuth0();
    const stepup = useStepUp();
    await stepup.requestStepUp({ ttlSeconds: 300 });
    expect(stepup.isElevated.value).toBe(true);

    stepup.clearElevation();
    expect(stepup.isElevated.value).toBe(false);
    expect(stepup.elevatedUntil.value).toBeNull();
  });
});

describe('useStepUp — withStepUp wrapper', () => {
  it('skips step-up when already elevated', async () => {
    const fake = setupFakeAuth0();
    _internals.setElevatedNow(120);

    const stepup = useStepUp();
    const op = vi.fn().mockResolvedValue('ok');
    const result = await stepup.withStepUp(op);

    expect(fake.loginWithPopup).not.toHaveBeenCalled();
    expect(op).toHaveBeenCalledTimes(1);
    expect(result).toBe('ok');
  });

  it('triggers step-up first, then runs the operation', async () => {
    const fake = setupFakeAuth0();
    const stepup = useStepUp();
    const op = vi.fn().mockResolvedValue(42);

    const result = await stepup.withStepUp(op);

    expect(fake.loginWithPopup).toHaveBeenCalledTimes(1);
    expect(op).toHaveBeenCalledTimes(1);
    expect(result).toBe(42);
  });

  it('does NOT run the operation when step-up rejects', async () => {
    const fake = setupFakeAuth0();
    fake.loginWithPopup.mockRejectedValue(new Error('user_closed: popup cancelled'));
    const stepup = useStepUp();
    const op = vi.fn();

    await expect(stepup.withStepUp(op)).rejects.toBeInstanceOf(StepUpCancelledError);
    expect(op).not.toHaveBeenCalled();
  });
});

describe('useStepUp — typed error classification', () => {
  it('cancellation maps to StepUpCancelledError', async () => {
    const fake = setupFakeAuth0();
    fake.loginWithPopup.mockRejectedValue(new Error('Popup was cancelled by the user'));
    const stepup = useStepUp();
    await expect(stepup.requestStepUp()).rejects.toBeInstanceOf(StepUpCancelledError);
    expect(stepup.isElevated.value).toBe(false);
  });

  it('network failure maps to StepUpNetworkError', async () => {
    const fake = setupFakeAuth0();
    fake.loginWithPopup.mockRejectedValue(new Error('Failed to fetch'));
    const stepup = useStepUp();
    await expect(stepup.requestStepUp()).rejects.toBeInstanceOf(StepUpNetworkError);
  });

  it('Auth0-shaped rejection maps to StepUpRejectedError with auth0Code', async () => {
    const fake = setupFakeAuth0();
    const auth0Err = Object.assign(new Error('mfa required'), {
      error: 'mfa_required',
      error_description: 'Multi-factor required',
    });
    fake.loginWithPopup.mockRejectedValue(auth0Err);
    const stepup = useStepUp();

    let captured: unknown;
    try {
      await stepup.requestStepUp();
    } catch (e) {
      captured = e;
    }
    expect(captured).toBeInstanceOf(StepUpRejectedError);
    expect((captured as StepUpRejectedError).auth0Code).toBe('mfa_required');
  });

  it('popup blocked + redirect available falls back to redirect (no error)', async () => {
    const fake = setupFakeAuth0();
    fake.loginWithPopup.mockRejectedValue(new Error('Popup window.open blocked'));
    fake.loginWithRedirect.mockResolvedValue(undefined);

    const stepup = useStepUp();
    await stepup.requestStepUp();

    expect(fake.loginWithPopup).toHaveBeenCalled();
    expect(fake.loginWithRedirect).toHaveBeenCalled();
    // After a "successful" redirect call (mocked to resolve immediately), the
    // composable considers elevation acquired (in real life the page would
    // navigate away and the post-redirect callback re-establishes state).
    expect(stepup.isElevated.value).toBe(true);
  });

  it('popup blocked AND redirect throws maps to StepUpBlockedError', async () => {
    const fake = setupFakeAuth0();
    fake.loginWithPopup.mockRejectedValue(new Error('Popup blocked'));
    fake.loginWithRedirect.mockRejectedValue(new Error('redirect not allowed'));

    const stepup = useStepUp();
    await expect(stepup.requestStepUp()).rejects.toBeInstanceOf(StepUpBlockedError);
  });
});

describe('useStepUp — singleton state across calls', () => {
  it('elevation acquired in one composable call is visible from another', async () => {
    setupFakeAuth0();
    const a = useStepUp();
    const b = useStepUp();
    expect(a.isElevated.value).toBe(false);
    expect(b.isElevated.value).toBe(false);

    await a.requestStepUp({ ttlSeconds: 60 });
    expect(a.isElevated.value).toBe(true);
    expect(b.isElevated.value).toBe(true);
  });
});
