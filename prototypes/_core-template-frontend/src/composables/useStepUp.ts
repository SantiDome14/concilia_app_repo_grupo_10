import { computed, getCurrentInstance, ref, type ComputedRef, type Ref } from 'vue';
import { useAuth0 } from '@auth0/auth0-vue';
import { env } from '@/config/env';
import {
  StepUpBlockedError,
  StepUpCancelledError,
  StepUpNetworkError,
  StepUpRejectedError,
} from '@/types/auth-step-up';

// ════════════════════════════════════════════════════════════════════
// useStepUp — MFA / step-up authentication composable
// ────────────────────────────────────────────────────────────────────
// Implements the `core-auth` extension contracted by the OpenSpec
// capability `add-core-auth-step-up`. Sensitive operations call
// `withStepUp(operation)` instead of interleaving manual checks; the
// wrapper concentrates the lifecycle and centralises error handling.
//
// Singleton state across the app: every `useStepUp()` call shares the
// same `isElevated` / `elevatedUntil` refs (module-level).
// ════════════════════════════════════════════════════════════════════

// ─── Module-level singleton state ────────────────────────────────────
const _isElevated = ref(false);
const _elevatedUntil = ref<Date | null>(null);
let _expirationTimer: ReturnType<typeof setTimeout> | null = null;

function _clearTimer(): void {
  if (_expirationTimer !== null) {
    clearTimeout(_expirationTimer);
    _expirationTimer = null;
  }
}

function _scheduleExpiration(ttlMs: number): void {
  _clearTimer();
  _expirationTimer = setTimeout(() => {
    _isElevated.value = false;
    _elevatedUntil.value = null;
    _expirationTimer = null;
  }, ttlMs);
}

/** Reset internal state. Exposed for tests and manual revocation. */
function _reset(): void {
  _isElevated.value = false;
  _elevatedUntil.value = null;
  _clearTimer();
}

// ─── Error mapping from Auth0 popup / redirect failures ──────────────

const POPUP_BLOCKED_KEYWORDS = ['blocked', 'window.open', 'popup_blocked', 'popup window failed'];
const POPUP_CANCELLED_KEYWORDS = [
  'cancelled',
  'closed',
  'popupcancellederror',
  'user_closed',
];
const NETWORK_KEYWORDS = ['network', 'failed to fetch', 'timeout'];

function isCancelled(message: string): boolean {
  return POPUP_CANCELLED_KEYWORDS.some((k) => message.includes(k));
}
function isBlocked(message: string): boolean {
  return POPUP_BLOCKED_KEYWORDS.some((k) => message.includes(k));
}

function _classifyAuth0Error(error: unknown): StepUpBlockedError | StepUpCancelledError | StepUpNetworkError | StepUpRejectedError {
  const messageRaw = error instanceof Error ? error.message : String(error);
  const message = messageRaw.toLowerCase();

  // Auth0 SDK errors expose `error` and `error_description`.
  const auth0Code =
    error && typeof error === 'object' && 'error' in error
      ? String((error as { error: unknown }).error)
      : '';
  const auth0Description =
    error && typeof error === 'object' && 'error_description' in error
      ? String((error as { error_description: unknown }).error_description)
      : '';

  if (isCancelled(message)) {
    return new StepUpCancelledError(error);
  }
  if (isBlocked(message)) {
    return new StepUpBlockedError(error);
  }
  if (NETWORK_KEYWORDS.some((k) => message.includes(k))) {
    return new StepUpNetworkError(error);
  }
  if (auth0Code) {
    return new StepUpRejectedError(auth0Code, auth0Description || messageRaw, error);
  }
  // Default — treat unknown failure shapes as rejection rather than cancellation
  // so consumers don't silently dismiss them.
  return new StepUpRejectedError('unknown', messageRaw, error);
}

// ─── Public API ─────────────────────────────────────────────────────

export interface RequestStepUpOptions {
  /** Override the global TTL for this elevation only. */
  ttlSeconds?: number;
  /** Forwarded to Auth0 `authorizationParams.acr_values`. */
  acrValues?: string;
}

export interface UseStepUpApi {
  isElevated: ComputedRef<boolean>;
  elevatedUntil: Ref<Date | null>;
  requestStepUp(options?: RequestStepUpOptions): Promise<void>;
  withStepUp<T>(operation: () => Promise<T> | T, options?: RequestStepUpOptions): Promise<T>;
  clearElevation(): void;
}

interface Auth0PopupOptions {
  authorizationParams?: { prompt?: 'login' | 'none'; acr_values?: string };
}

interface Auth0PopupApi {
  loginWithPopup(opts: Auth0PopupOptions): Promise<void>;
  loginWithRedirect(opts: { appState?: { returnTo?: string }; authorizationParams?: { prompt?: 'login' | 'none'; acr_values?: string } }): Promise<void>;
}

function buildAuth0Options(acrValues?: string): Auth0PopupOptions {
  const authorizationParams: { prompt: 'login'; acr_values?: string } = { prompt: 'login' };
  if (acrValues) authorizationParams.acr_values = acrValues;
  return { authorizationParams };
}

async function performPopupOrRedirect(auth0: Auth0PopupApi, acrValues?: string): Promise<void> {
  try {
    await auth0.loginWithPopup(buildAuth0Options(acrValues));
    return;
  } catch (popupErr) {
    const popupMessage = popupErr instanceof Error ? popupErr.message.toLowerCase() : '';
    // Cancellation is final — never fall back to redirect.
    if (isCancelled(popupMessage) || !isBlocked(popupMessage)) {
      // Re-throw cancellation, network, rejection — caller classifies.
      throw popupErr;
    }
    // Popup blocked → try redirect fallback. Note: this navigates away;
    // the promise never resolves in the original page in real life.
    try {
      const returnTo = typeof window !== 'undefined'
        ? window.location.pathname + window.location.search
        : undefined;
      const redirectOpts: { appState?: { returnTo: string }; authorizationParams: { prompt: 'login'; acr_values?: string } } = {
        authorizationParams: buildAuth0Options(acrValues).authorizationParams as { prompt: 'login'; acr_values?: string },
      };
      if (returnTo !== undefined) redirectOpts.appState = { returnTo };
      await auth0.loginWithRedirect(redirectOpts);
    } catch (redirectErr) {
      // Both failed — popup blocked + redirect rejected → blocked.
      throw new StepUpBlockedError(redirectErr);
    }
  }
}

/** Stub returned when Auth0 is not registered on the current app. */
function createStub(): UseStepUpApi {
  return {
    isElevated: computed(() => _isElevated.value),
    elevatedUntil: _elevatedUntil,
    requestStepUp: async () => {
      console.warn('[stepup] Auth0 not configured — requestStepUp() is a no-op');
    },
    withStepUp: async <T>(operation: () => Promise<T> | T) => {
      console.warn('[stepup] Auth0 not configured — running operation without elevation');
      return operation();
    },
    clearElevation: () => {
      _reset();
    },
  };
}

export function useStepUp(): UseStepUpApi {
  const instance = getCurrentInstance();
  const auth0Registered = !!instance?.appContext.config.globalProperties.$auth0;

  if (!auth0Registered) {
    return createStub();
  }

  const auth0 = useAuth0() as unknown as Auth0PopupApi;

  async function requestStepUp(options?: RequestStepUpOptions): Promise<void> {
    try {
      await performPopupOrRedirect(auth0, options?.acrValues);
    } catch (err) {
      // If we already wrapped it (StepUpBlockedError from redirect-fallback path),
      // re-throw as-is.
      if (
        err instanceof StepUpBlockedError ||
        err instanceof StepUpCancelledError ||
        err instanceof StepUpNetworkError ||
        err instanceof StepUpRejectedError
      ) {
        throw err;
      }
      throw _classifyAuth0Error(err);
    }
    const ttlSeconds = options?.ttlSeconds ?? env.VITE_STEPUP_TTL_SECONDS;
    const ttlMs = Math.max(1, ttlSeconds) * 1000;
    _isElevated.value = true;
    _elevatedUntil.value = new Date(Date.now() + ttlMs);
    _scheduleExpiration(ttlMs);
  }

  async function withStepUp<T>(
    operation: () => Promise<T> | T,
    options?: RequestStepUpOptions,
  ): Promise<T> {
    if (!_isElevated.value) {
      await requestStepUp(options);
    }
    return operation();
  }

  function clearElevation(): void {
    _reset();
  }

  return {
    isElevated: computed(() => _isElevated.value),
    elevatedUntil: _elevatedUntil,
    requestStepUp,
    withStepUp,
    clearElevation,
  };
}

// Re-export the canonical error classes for consumer ergonomics.
export {
  StepUpBlockedError,
  StepUpCancelledError,
  StepUpNetworkError,
  StepUpRejectedError,
  isStepUpError,
} from '@/types/auth-step-up';

// Internal — exposed only for tests.
export const _internals = {
  reset: _reset,
  setElevatedNow(ttlSeconds: number): void {
    _isElevated.value = true;
    _elevatedUntil.value = new Date(Date.now() + ttlSeconds * 1000);
    _scheduleExpiration(ttlSeconds * 1000);
  },
};
