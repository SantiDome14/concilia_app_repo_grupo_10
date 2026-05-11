import { computed, ref, watch, type ComputedRef, type Ref } from 'vue';
import type {
  PersistedWizardState,
  UseWizardOptions,
  WizardStep,
  WizardStepVisualState,
} from '@/types/wizard';

// ════════════════════════════════════════════════════════════════════
// useWizard — multi-step form orchestrator
// ────────────────────────────────────────────────────────────────────
// Implements the contract defined by `core-multi-step-form`. Each
// `useWizard()` call is its own instance — there is NO module-level
// singleton, because multiple wizards (e.g. Create Quote and Create
// Liquidity Op) can coexist in the same app.
// ════════════════════════════════════════════════════════════════════

const STORAGE_PREFIX = 'wizard:';

function persistedKey(wizardId: string): string {
  return `${STORAGE_PREFIX}${wizardId}`;
}

function safeReadPersisted<TState>(wizardId: string): PersistedWizardState<TState> | null {
  if (typeof window === 'undefined' || !window.sessionStorage) return null;
  try {
    const raw = window.sessionStorage.getItem(persistedKey(wizardId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedWizardState<TState>;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.currentStepId !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function safeWritePersisted<TState>(
  wizardId: string,
  payload: PersistedWizardState<TState>,
): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(persistedKey(wizardId), JSON.stringify(payload));
  } catch {
    // Ignore quota / serialization failures — persistence is best-effort.
  }
}

function safeClearPersisted(wizardId: string): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.removeItem(persistedKey(wizardId));
  } catch {
    // ignore
  }
}

export interface UseWizardApi<TState> {
  steps: ComputedRef<WizardStep<TState>[]>;
  visibleSteps: ComputedRef<WizardStep<TState>[]>;
  currentStep: ComputedRef<WizardStep<TState>>;
  currentStepIndex: ComputedRef<number>;
  formState: Ref<TState>;
  isFirst: ComputedRef<boolean>;
  isLast: ComputedRef<boolean>;
  errors: Ref<Record<string, string>>;
  isSubmitting: Ref<boolean>;
  next(): Promise<boolean>;
  back(): boolean;
  goTo(stepId: string): Promise<boolean>;
  submit(): Promise<boolean>;
  reset(): void;
  visualState(stepId: string): WizardStepVisualState;
}

export function useWizard<TState extends Record<string, unknown>>(
  steps: WizardStep<TState>[],
  options: UseWizardOptions<TState> = {},
): UseWizardApi<TState> {
  if (steps.length === 0) {
    throw new Error('[wizard] At least one step is required');
  }

  const initial = (options.initialState ?? ({} as TState)) as TState;

  // Restore from sessionStorage if persistence is on.
  const restored = options.wizardId ? safeReadPersisted<TState>(options.wizardId) : null;

  const stepsRef = computed<WizardStep<TState>[]>(() => steps);
  const formState = ref(restored ? restored.formState : { ...initial }) as Ref<TState>;

  const visibleSteps = computed<WizardStep<TState>[]>(() =>
    steps.filter((s) => (s.enabledWhen ? s.enabledWhen(formState.value) : true)),
  );

  // Keep `currentStepId` aligned with a visible step at all times.
  const initialStepId = (() => {
    if (restored) {
      const stillVisible = visibleSteps.value.some((s) => s.id === restored.currentStepId);
      if (stillVisible) return restored.currentStepId;
    }
    return visibleSteps.value[0]?.id ?? steps[0]?.id ?? '';
  })();
  const currentStepId = ref<string>(initialStepId);

  // Track which steps the user has advanced past (for `revisitable: false`
  // back-navigation handling and for indicator `completed` state).
  const visitedPast = ref<Set<string>>(new Set<string>());

  const errors = ref<Record<string, string>>({});
  const isSubmitting = ref(false);

  const currentStep = computed<WizardStep<TState>>(() => {
    const found =
      visibleSteps.value.find((s) => s.id === currentStepId.value) ??
      visibleSteps.value[0];
    if (!found) {
      // Should be impossible — visibleSteps has at least one element when
      // any step is unconditionally visible. Fall back to the first step
      // in the registry.
      return steps[0] as WizardStep<TState>;
    }
    return found;
  });

  const currentStepIndex = computed<number>(() =>
    visibleSteps.value.findIndex((s) => s.id === currentStepId.value),
  );

  const isFirst = computed<boolean>(() => currentStepIndex.value <= 0);
  const isLast = computed<boolean>(
    () => currentStepIndex.value === visibleSteps.value.length - 1,
  );

  // ── Reactive realignment when visibility changes ──────────────────
  // If the current step becomes hidden by a state change upstream, we
  // pick the next visible step (or the previous one if no later steps
  // are visible). Data of the hidden step is preserved.
  watch(visibleSteps, (next) => {
    const stillVisible = next.some((s) => s.id === currentStepId.value);
    if (stillVisible) return;
    if (next.length === 0) return;
    const stableIds = next.map((s) => s.id);
    const previouslyAt = currentStepId.value;
    // Find the original position; pick the first visible step that
    // comes after the previous one in the original `steps` array.
    const origIndex = steps.findIndex((s) => s.id === previouslyAt);
    const candidate =
      steps.slice(origIndex + 1).find((s) => stableIds.includes(s.id)) ??
      steps.slice(0, origIndex).reverse().find((s) => stableIds.includes(s.id)) ??
      next[0];
    if (candidate) currentStepId.value = candidate.id;
  });

  // ── Persistence ───────────────────────────────────────────────────

  function persistNow(): void {
    if (!options.wizardId) return;
    safeWritePersisted<TState>(options.wizardId, {
      currentStepId: currentStepId.value,
      formState: formState.value,
    });
  }

  watch([currentStepId, formState], () => persistNow(), { deep: true });

  // ── Navigation helpers ────────────────────────────────────────────

  function visitedPastIds(): Set<string> {
    return visitedPast.value;
  }

  async function runValidation(stepId: string): Promise<boolean> {
    if (!options.validateStep) return true;
    let result: boolean | string;
    try {
      result = await options.validateStep(stepId, formState.value);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      errors.value = { ...errors.value, [stepId]: message };
      return false;
    }
    if (result === true) {
      const nextErrors = { ...errors.value };
      delete nextErrors[stepId];
      errors.value = nextErrors;
      return true;
    }
    const message = typeof result === 'string' ? result : 'Campo inválido';
    errors.value = { ...errors.value, [stepId]: message };
    return false;
  }

  async function next(): Promise<boolean> {
    if (isLast.value) return false;
    const ok = await runValidation(currentStepId.value);
    if (!ok) return false;
    const idx = currentStepIndex.value;
    const target = visibleSteps.value[idx + 1];
    if (!target) return false;
    visitedPast.value = new Set(visitedPastIds()).add(currentStepId.value);
    currentStepId.value = target.id;
    return true;
  }

  function back(): boolean {
    if (isFirst.value) return false;
    const idx = currentStepIndex.value;
    // Walk backwards to the nearest revisitable step.
    for (let i = idx - 1; i >= 0; i -= 1) {
      const candidate = visibleSteps.value[i];
      if (!candidate) continue;
      const isRevisitable = candidate.revisitable !== false;
      if (isRevisitable) {
        currentStepId.value = candidate.id;
        return true;
      }
    }
    return false;
  }

  async function goTo(stepId: string): Promise<boolean> {
    const target = visibleSteps.value.find((s) => s.id === stepId);
    if (!target) return false;
    const targetIdx = visibleSteps.value.indexOf(target);
    const currentIdx = currentStepIndex.value;
    if (targetIdx === currentIdx) return true;

    if (targetIdx > currentIdx) {
      // Forward: validate every step in between (inclusive of current,
      // exclusive of target).
      for (let i = currentIdx; i < targetIdx; i += 1) {
        const stepId = visibleSteps.value[i]?.id;
        if (!stepId) continue;
        const ok = await runValidation(stepId);
        if (!ok) return false;
        visitedPast.value = new Set(visitedPastIds()).add(stepId);
      }
      currentStepId.value = target.id;
      return true;
    }

    // Backward: the target itself must be revisitable, AND every step
    // between target and current must be revisitable.
    if (target.revisitable === false) return false;
    for (let i = targetIdx + 1; i <= currentIdx; i += 1) {
      const candidate = visibleSteps.value[i];
      if (!candidate) continue;
      if (candidate.revisitable === false) return false;
    }
    currentStepId.value = target.id;
    return true;
  }

  async function submit(): Promise<boolean> {
    const ok = await runValidation(currentStepId.value);
    if (!ok) return false;
    if (!options.onSubmit) {
      // Nothing to invoke — treat as success and clear persistence.
      if (options.wizardId) safeClearPersisted(options.wizardId);
      return true;
    }
    isSubmitting.value = true;
    try {
      await options.onSubmit(formState.value);
      if (options.wizardId) safeClearPersisted(options.wizardId);
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      errors.value = { ...errors.value, [currentStepId.value]: message };
      return false;
    } finally {
      isSubmitting.value = false;
    }
  }

  function reset(): void {
    formState.value = { ...initial } as TState;
    currentStepId.value = visibleSteps.value[0]?.id ?? steps[0]?.id ?? '';
    errors.value = {};
    visitedPast.value = new Set<string>();
    if (options.wizardId) safeClearPersisted(options.wizardId);
  }

  function visualState(stepId: string): WizardStepVisualState {
    const isVisible = visibleSteps.value.some((s) => s.id === stepId);
    if (!isVisible) return 'disabled';
    if (errors.value[stepId]) return 'error';
    if (currentStepId.value === stepId) return 'current';
    if (visitedPast.value.has(stepId)) return 'completed';
    return 'upcoming';
  }

  return {
    steps: stepsRef,
    visibleSteps,
    currentStep,
    currentStepIndex,
    formState,
    isFirst,
    isLast,
    errors,
    isSubmitting,
    next,
    back,
    goTo,
    submit,
    reset,
    visualState,
  };
}
