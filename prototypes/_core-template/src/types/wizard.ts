import type { Component } from 'vue';

// ════════════════════════════════════════════════════════════════════
// Wizard — types for the multi-step form contract
// ────────────────────────────────────────────────────────────────────
// Implements the contract defined in the OpenSpec capability
// `core-multi-step-form`. The composable is the only consumer entry
// point; the canonical <Wizard> component composes against the
// composable's reactive api.
// ════════════════════════════════════════════════════════════════════

/** Canonical visual state for a step in the progress indicator. */
export type WizardStepVisualState =
  | 'completed'
  | 'current'
  | 'upcoming'
  | 'disabled'
  | 'error';

/** Declaration of a single step inside the wizard registry. */
export interface WizardStep<TState = Record<string, unknown>> {
  /** Stable id, unique within the wizard. */
  id: string;
  /** Label shown in the progress indicator. */
  title: string;
  /** Optional sub-label. */
  description?: string;
  /**
   * Predicate evaluated reactively against `formState`. Steps for
   * which this returns `false` are removed from the visible sequence.
   * Default: always visible.
   */
  enabledWhen?: (state: TState) => boolean;
  /** Top-level Vue component that renders the step body. */
  component: Component;
  /**
   * When `false`, the wizard SHALL skip this step on back-navigation
   * once it has been advanced past (one-way checkpoint). Default `true`.
   */
  revisitable?: boolean;
}

/** Options accepted by `useWizard`. */
export interface UseWizardOptions<TState = Record<string, unknown>> {
  /**
   * Persistence key. When set, the wizard's state is saved to
   * `sessionStorage` under `wizard:${wizardId}` after every transition
   * and restored on mount. When omitted, persistence is disabled.
   */
  wizardId?: string;
  /** Initial form state — overrides the empty default. */
  initialState?: TState;
  /**
   * Optional per-step validator. Called by `next()` and `submit()`
   * before advancing / submitting; when it returns `false` (or a
   * rejected promise / error message), navigation is blocked and the
   * step is marked with an error.
   */
  validateStep?: (
    stepId: string,
    state: TState,
  ) => boolean | string | Promise<boolean | string>;
  /** Invoked by `submit()` after the final step validates. */
  onSubmit?: (state: TState) => void | Promise<void>;
}

/** Persisted shape stored in sessionStorage. */
export interface PersistedWizardState<TState = Record<string, unknown>> {
  currentStepId: string;
  formState: TState;
}
