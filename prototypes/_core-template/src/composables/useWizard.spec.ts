import { describe, it, expect, beforeEach } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { useWizard } from './useWizard';
import type { WizardStep } from '@/types/wizard';

interface FormState extends Record<string, unknown> {
  side?: 'BUY' | 'SELL';
  amount?: number;
  notes?: string;
  [key: string]: unknown;
}

const Stub = defineComponent({
  name: 'StepStub',
  setup: () => () => h('div'),
});

function makeSteps(): WizardStep<FormState>[] {
  return [
    { id: 'side', title: 'Lado', component: Stub },
    {
      id: 'amount',
      title: 'Monto',
      component: Stub,
    },
    {
      id: 'ccc-leg',
      title: 'Leg intermedia',
      component: Stub,
      enabledWhen: (s) => s.side === 'BUY',
    },
    { id: 'preview', title: 'Vista previa', component: Stub },
    { id: 'confirm', title: 'Confirmar', component: Stub, revisitable: false },
  ];
}

beforeEach(() => {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    window.sessionStorage.clear();
  }
});

describe('useWizard — step registry & visibility', () => {
  it('throws when no steps are provided', () => {
    expect(() => useWizard([])).toThrow();
  });

  it('starts at the first visible step', () => {
    const wizard = useWizard(makeSteps(), { initialState: {} });
    expect(wizard.currentStep.value.id).toBe('side');
    expect(wizard.isFirst.value).toBe(true);
  });

  it('hides conditional steps reactively when the predicate fails', () => {
    const wizard = useWizard(makeSteps(), { initialState: { side: 'SELL' } });
    const visibleIds = wizard.visibleSteps.value.map((s) => s.id);
    expect(visibleIds).not.toContain('ccc-leg');
    expect(visibleIds).toEqual(['side', 'amount', 'preview', 'confirm']);
  });

  it('shows conditional step reactively when state changes', async () => {
    const wizard = useWizard(makeSteps(), { initialState: { side: 'SELL' } });
    expect(wizard.visibleSteps.value.map((s) => s.id)).not.toContain('ccc-leg');
    wizard.formState.value.side = 'BUY';
    await nextTick();
    expect(wizard.visibleSteps.value.map((s) => s.id)).toContain('ccc-leg');
  });

  it('advances current step when the active step becomes hidden', async () => {
    const wizard = useWizard(makeSteps(), { initialState: { side: 'BUY' } });
    await wizard.next(); // side → amount
    await wizard.next(); // amount → ccc-leg
    expect(wizard.currentStep.value.id).toBe('ccc-leg');
    wizard.formState.value.side = 'SELL';
    await nextTick();
    expect(wizard.currentStep.value.id).toBe('preview');
  });
});

describe('useWizard — forward / backward navigation', () => {
  it('advances and tracks progression', async () => {
    const wizard = useWizard(makeSteps(), { initialState: { side: 'SELL' } });
    expect(wizard.currentStep.value.id).toBe('side');
    expect(await wizard.next()).toBe(true);
    expect(wizard.currentStep.value.id).toBe('amount');
    expect(await wizard.next()).toBe(true);
    expect(wizard.currentStep.value.id).toBe('preview');
  });

  it('back returns to the previous visible step preserving formState', async () => {
    const wizard = useWizard(makeSteps(), { initialState: { side: 'SELL' } });
    await wizard.next();
    wizard.formState.value.amount = 100;
    await wizard.next();
    expect(wizard.currentStep.value.id).toBe('preview');
    wizard.back();
    expect(wizard.currentStep.value.id).toBe('amount');
    expect(wizard.formState.value.amount).toBe(100);
  });

  it('skips non-revisitable steps when going back', async () => {
    // Build a sequence where step 2 is non-revisitable.
    const steps: WizardStep<FormState>[] = [
      { id: 's1', title: 'S1', component: Stub },
      { id: 's2', title: 'S2', component: Stub, revisitable: false },
      { id: 's3', title: 'S3', component: Stub },
    ];
    const wizard = useWizard(steps);
    await wizard.next(); // s1 → s2
    await wizard.next(); // s2 → s3
    expect(wizard.currentStep.value.id).toBe('s3');
    wizard.back();
    expect(wizard.currentStep.value.id).toBe('s1');
  });

  it('goTo blocks backward navigation across non-revisitable steps', async () => {
    const steps: WizardStep<FormState>[] = [
      { id: 's1', title: 'S1', component: Stub },
      { id: 's2', title: 'S2', component: Stub, revisitable: false },
      { id: 's3', title: 'S3', component: Stub },
    ];
    const wizard = useWizard(steps);
    await wizard.next();
    await wizard.next();
    const ok = await wizard.goTo('s2');
    expect(ok).toBe(false);
    expect(wizard.currentStep.value.id).toBe('s3');
  });
});

describe('useWizard — validation gating', () => {
  it('blocks forward navigation when validateStep returns false and records the error', async () => {
    const wizard = useWizard(makeSteps(), {
      initialState: { side: 'SELL' },
      validateStep: (stepId, state) => {
        if (stepId === 'amount' && !state.amount) return 'Falta monto';
        return true;
      },
    });
    await wizard.next(); // side → amount
    expect(wizard.currentStep.value.id).toBe('amount');
    const ok = await wizard.next();
    expect(ok).toBe(false);
    expect(wizard.currentStep.value.id).toBe('amount');
    expect(wizard.errors.value.amount).toBe('Falta monto');
  });

  it('clears the error when validation succeeds on retry', async () => {
    const wizard = useWizard(makeSteps(), {
      initialState: { side: 'SELL' },
      validateStep: (stepId, state) => {
        if (stepId === 'amount' && !state.amount) return 'Falta monto';
        return true;
      },
    });
    await wizard.next();
    await wizard.next(); // first attempt fails
    expect(wizard.errors.value.amount).toBeDefined();
    wizard.formState.value.amount = 100;
    const ok = await wizard.next();
    expect(ok).toBe(true);
    expect(wizard.errors.value.amount).toBeUndefined();
  });
});

describe('useWizard — sessionStorage persistence', () => {
  it('persists currentStepId and formState on every transition', async () => {
    const wizard = useWizard(makeSteps(), {
      wizardId: 'trd-quote-create',
      initialState: { side: 'SELL' },
    });
    wizard.formState.value.amount = 250;
    await nextTick();
    await wizard.next(); // side → amount
    await nextTick();
    const persisted = JSON.parse(
      window.sessionStorage.getItem('wizard:trd-quote-create') ?? 'null',
    );
    expect(persisted.currentStepId).toBe('amount');
    expect(persisted.formState.amount).toBe(250);
  });

  it('restores currentStepId and formState on remount', async () => {
    window.sessionStorage.setItem(
      'wizard:trd-quote-create',
      JSON.stringify({
        currentStepId: 'preview',
        formState: { side: 'SELL', amount: 999 },
      }),
    );
    const wizard = useWizard(makeSteps(), { wizardId: 'trd-quote-create' });
    expect(wizard.currentStep.value.id).toBe('preview');
    expect(wizard.formState.value.amount).toBe(999);
  });

  it('clears persistence on submit success', async () => {
    let invoked = 0;
    const wizard = useWizard(makeSteps(), {
      wizardId: 'trd-quote-create',
      initialState: { side: 'SELL' },
      onSubmit: () => {
        invoked += 1;
      },
    });
    // Advance to last visible step.
    while (!wizard.isLast.value) {
      const ok = await wizard.next();
      if (!ok) break;
    }
    const ok = await wizard.submit();
    expect(ok).toBe(true);
    expect(invoked).toBe(1);
    expect(window.sessionStorage.getItem('wizard:trd-quote-create')).toBeNull();
  });

  it('reset clears persistence and rewinds to the first step', async () => {
    const wizard = useWizard(makeSteps(), {
      wizardId: 'trd-quote-create',
      initialState: { side: 'SELL' },
    });
    wizard.formState.value.amount = 250;
    await wizard.next();
    await nextTick();
    expect(window.sessionStorage.getItem('wizard:trd-quote-create')).not.toBeNull();
    wizard.reset();
    expect(wizard.currentStep.value.id).toBe('side');
    expect(wizard.formState.value.amount).toBeUndefined();
    expect(window.sessionStorage.getItem('wizard:trd-quote-create')).toBeNull();
  });

  it('does not persist when wizardId is omitted', async () => {
    const wizard = useWizard(makeSteps(), { initialState: { side: 'SELL' } });
    await wizard.next();
    expect(window.sessionStorage.length).toBe(0);
    expect(wizard).toBeDefined();
  });
});

describe('useWizard — visualState', () => {
  it('marks current as `current`, past as `completed`, future as `upcoming`', async () => {
    const wizard = useWizard(makeSteps(), { initialState: { side: 'SELL' } });
    await wizard.next();
    expect(wizard.visualState('side')).toBe('completed');
    expect(wizard.visualState('amount')).toBe('current');
    expect(wizard.visualState('preview')).toBe('upcoming');
    expect(wizard.visualState('ccc-leg')).toBe('disabled');
  });

  it('marks a step as `error` when validation has populated an error', async () => {
    const wizard = useWizard(makeSteps(), {
      initialState: { side: 'SELL' },
      validateStep: (stepId, state) =>
        stepId === 'amount' && !state.amount ? 'Falta' : true,
    });
    await wizard.next();
    await wizard.next(); // fails
    expect(wizard.visualState('amount')).toBe('error');
  });
});
