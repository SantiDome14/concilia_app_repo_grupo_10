<script setup lang="ts" generic="TState extends Record<string, unknown>">
import { computed } from 'vue';
import { Check, AlertCircle } from 'lucide-vue-next';
import type { UseWizardApi } from '@/composables/useWizard';
import type { WizardStepVisualState } from '@/types/wizard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

// ════════════════════════════════════════════════════════════════════
// Wizard — canonical multi-step form shell
// ────────────────────────────────────────────────────────────────────
// Renders the progress indicator above and the current step's
// component below, with Back / Next / Submit buttons in the footer.
// State and orchestration live in the parent's `useWizard()` instance.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  /** The composable instance returned by `useWizard(steps, options)`. */
  wizard: UseWizardApi<TState>;
  /** Override the default Back / Next / Submit labels. */
  labels?: {
    back?: string;
    next?: string;
    submit?: string;
  };
}>();

const labels = computed(() => ({
  back: props.labels?.back ?? 'Volver',
  next: props.labels?.next ?? 'Siguiente',
  submit: props.labels?.submit ?? 'Confirmar',
}));

const visualClass: Record<WizardStepVisualState, string> = {
  completed: 'bg-success text-white',
  current: 'bg-brand text-white ring-2 ring-brand/30',
  upcoming: 'bg-card-2 text-t-4 border border-b-2',
  disabled: 'bg-card-2 text-t-4 opacity-40',
  error: 'bg-danger text-white',
};

async function onNext(): Promise<void> {
  await props.wizard.next();
}
function onBack(): void {
  props.wizard.back();
}
async function onSubmit(): Promise<void> {
  await props.wizard.submit();
}
</script>

<template>
  <div class="space-y-6">
    <!-- Progress indicator -->
    <ol class="flex items-center gap-2" role="list">
      <li
        v-for="(step, idx) in props.wizard.visibleSteps.value"
        :key="step.id"
        class="flex flex-1 items-center gap-2"
      >
        <div
          :class="
            cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
              visualClass[props.wizard.visualState(step.id)],
            )
          "
          :aria-current="props.wizard.visualState(step.id) === 'current' ? 'step' : undefined"
        >
          <Check v-if="props.wizard.visualState(step.id) === 'completed'" class="h-4 w-4" />
          <AlertCircle v-else-if="props.wizard.visualState(step.id) === 'error'" class="h-4 w-4" />
          <span v-else>{{ idx + 1 }}</span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-medium text-t-1">{{ step.title }}</div>
          <div v-if="step.description" class="truncate text-xs text-t-4">
            {{ step.description }}
          </div>
        </div>
      </li>
    </ol>

    <!-- Current step body. The step component is responsible for
         reading/writing `props.wizard.formState.value` directly (it is
         a Ref shared via the wizard prop). -->
    <div>
      <component :is="props.wizard.currentStep.value.component" />
      <p
        v-if="props.wizard.errors.value[props.wizard.currentStep.value.id]"
        class="mt-2 text-xs text-danger"
        role="alert"
      >
        {{ props.wizard.errors.value[props.wizard.currentStep.value.id] }}
      </p>
    </div>

    <!-- Footer buttons -->
    <div class="flex items-center justify-between gap-2 border-t border-b-2 pt-4">
      <Button
        v-if="!props.wizard.isFirst.value"
        variant="ghost"
        :disabled="props.wizard.isSubmitting.value"
        @click="onBack"
      >
        {{ labels.back }}
      </Button>
      <span v-else />
      <div class="flex items-center gap-2">
        <Button
          v-if="!props.wizard.isLast.value"
          variant="primary"
          :disabled="props.wizard.isSubmitting.value"
          @click="onNext"
        >
          {{ labels.next }}
        </Button>
        <Button
          v-else
          variant="primary"
          :disabled="props.wizard.isSubmitting.value"
          @click="onSubmit"
        >
          {{ labels.submit }}
        </Button>
      </div>
    </div>
  </div>
</template>
