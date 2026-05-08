// ════════════════════════════════════════════════════════════════════
// Step-up authentication — typed error classes
// ────────────────────────────────────────────────────────────────────
// Implements the contract defined in `core-auth` (extended).
// Every step-up failure SHALL surface as one of these four classes —
// generic Error is a contract violation per the spec.
// ════════════════════════════════════════════════════════════════════

abstract class StepUpError extends Error {
  /** Stable code for app-side branching / telemetry. */
  public readonly code: string;
  /** Underlying Auth0 / browser error, when one exists. */
  public readonly cause: unknown;
  /** Safe-to-show user-facing message (no provider internals). */
  public readonly userMessage: string;

  constructor(code: string, message: string, userMessage: string, cause?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.userMessage = userMessage;
    this.cause = cause;
  }
}

/** User dismissed the popup or returned from redirect without completing. */
export class StepUpCancelledError extends StepUpError {
  constructor(cause?: unknown) {
    super(
      'STEPUP_CANCELLED',
      'Step-up was cancelled by the user',
      'Operación cancelada',
      cause,
    );
  }
}

/** Browser blocked the popup AND redirect fallback is unavailable. */
export class StepUpBlockedError extends StepUpError {
  constructor(cause?: unknown) {
    super(
      'STEPUP_BLOCKED',
      'Browser blocked the step-up popup and redirect fallback is unavailable',
      'El navegador bloqueó la verificación. Habilitá ventanas emergentes y reintentá.',
      cause,
    );
  }
}

/** Network failure during the step-up exchange. */
export class StepUpNetworkError extends StepUpError {
  constructor(cause?: unknown) {
    super(
      'STEPUP_NETWORK',
      'Network failure during step-up',
      'No se pudo conectar al servidor de autenticación. Reintentá en unos segundos.',
      cause,
    );
  }
}

/** Auth0 returned an error (mfa_required, account locked, IDP error). */
export class StepUpRejectedError extends StepUpError {
  /** Auth0-specific code (e.g. 'mfa_required', 'access_denied'). */
  public readonly auth0Code: string;

  constructor(auth0Code: string, message: string, cause?: unknown) {
    super(
      'STEPUP_REJECTED',
      `Step-up rejected: ${auth0Code} — ${message}`,
      'No se pudo verificar tu identidad. Si el problema persiste, contactá a soporte.',
      cause,
    );
    this.auth0Code = auth0Code;
  }
}

/** Type guard helper for catch blocks. */
export function isStepUpError(value: unknown): value is StepUpError {
  return (
    value instanceof StepUpCancelledError ||
    value instanceof StepUpBlockedError ||
    value instanceof StepUpNetworkError ||
    value instanceof StepUpRejectedError
  );
}
