<script setup lang="ts">
import { computed, h, reactive, ref, watch } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { Loader2 } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { Account, Client } from '@/ops/clients/types';
import {
  createAccountInstruction,
  getTemplateAttributes,
  listInstructionTemplates,
  listRails,
} from '@/api/modules/accountInstructions';
import { hydrateInitialFormValues } from './interpolation';
import { saveDraft, loadDraft, clearDraft } from './draft-storage';
import AccountTemplateStep from './AccountTemplateStep.vue';
import FieldValuesStep from './FieldValuesStep.vue';
import RailsStep from './RailsStep.vue';
import AccountInstructionPreviewCard from './AccountInstructionPreviewCard.vue';
import type {
  AccountInstructionFormState,
  AccountInstructionRequest,
  WizardStepId,
} from './types';

// ════════════════════════════════════════════════════════════════════
// CreateAccountInstructionModal — orchestrates Requirements 1, 2, 8,
// 9, 10, 12. Renders one Dialog with a 3-step state machine inside.
//
// We do NOT use the canonical <Wizard> component because:
//   - Its built-in footer (Volver/Siguiente/Confirmar) doesn't support
//     the cancel-during-submit swap required by Decision 7d.
//   - Its built-in sessionStorage persistence is wired with a fixed
//     key — we need per-client localStorage (Decision 7e).
//
// We DO use `useWizard`-style step gating logic, but inlined here for
// the per-modal control.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  client: Client;
  /** Pre-hydrated accounts from the detail page (avoids a duplicate fetch). */
  accounts: Account[];
}>();

const open = defineModel<boolean>('open', { required: true });

const queryClient = useQueryClient();

// ─── Form state (shared across steps) ───────────────────────────────
const formState = reactive<AccountInstructionFormState>({
  clientId: props.client.id,
  accounts: props.accounts,
  selectedAccountId: null,
  selectedTemplateId: null,
  templateAttributes: [],
  formValues: {},
  fieldErrors: {},
  selectedRailIds: [],
});

// ─── Wizard step machine ────────────────────────────────────────────
const step = ref<WizardStepId>('account-template');

const STEPS: { id: WizardStepId; title: string }[] = [
  { id: 'account-template', title: 'Cuenta y Template' },
  { id: 'values', title: 'Datos' },
  { id: 'rails', title: 'Rails' },
];

const stepIndex = computed(() => STEPS.findIndex((s) => s.id === step.value));

// ─── Templates query (Requirement 4) ────────────────────────────────
const templatesQuery = useQuery({
  queryKey: ['ops', 'instructions', 'list', 'all'],
  queryFn: listInstructionTemplates,
  enabled: open,
});

const templates = computed(() => templatesQuery.data.value ?? []);

// ─── Template attributes query (Requirement 5) ──────────────────────
const templateAttributesQuery = useQuery({
  queryKey: computed(() => ['ops', 'instruction-attributes', formState.selectedTemplateId] as const),
  queryFn: () => getTemplateAttributes(formState.selectedTemplateId!),
  enabled: computed(() => Boolean(formState.selectedTemplateId)),
});

// Sync hydrated attributes into formState + initial values once they arrive.
watch(
  () => templateAttributesQuery.data.value,
  (attrs) => {
    if (!attrs || !formState.selectedTemplateId) return;
    formState.templateAttributes = attrs;
    const template = templates.value.find((t) => t.id === formState.selectedTemplateId);
    if (template && Object.keys(formState.formValues).length === 0) {
      // Only hydrate when formValues is empty — otherwise we'd clobber
      // a draft restoration or in-progress edits on backtrack.
      formState.formValues = hydrateInitialFormValues(attrs, template, props.client);
    }
  },
);

// ─── Rails query (Requirement 7) ────────────────────────────────────
const railsQuery = useQuery({
  queryKey: ['ops', 'rails'],
  queryFn: listRails,
  enabled: open,
  staleTime: 5 * 60_000, // rails are effectively immutable per design.md open question 3
});

const rails = computed(() => railsQuery.data.value ?? []);

// ─── Step gating ────────────────────────────────────────────────────
const canAdvanceFromAccountTemplate = computed(
  () => Boolean(formState.selectedAccountId && formState.selectedTemplateId),
);

const canAdvanceFromValues = computed(
  () =>
    formState.templateAttributes.length > 0 &&
    formState.templateAttributes.every((a) => {
      const v = formState.formValues[a.key];
      return v && String(v).trim().length > 0;
    }),
);

const canSubmit = computed(
  () => formState.selectedRailIds.length >= 1 && !isSubmitting.value,
);

const selectedTemplate = computed(
  () => templates.value.find((t) => t.id === formState.selectedTemplateId) ?? null,
);

// ─── Submit lifecycle (Requirement 8 + Decision 7d) ─────────────────
const isSubmitting = ref(false);
const cancelNotice = ref(false);
let abortController: AbortController | null = null;

async function onSubmit(): Promise<void> {
  if (!canSubmit.value || !formState.selectedAccountId || !formState.selectedTemplateId)
    return;
  cancelNotice.value = false;
  formState.fieldErrors = {};
  isSubmitting.value = true;
  abortController = new AbortController();
  const payload: AccountInstructionRequest = {
    instruction_id: formState.selectedTemplateId,
    account_id: formState.selectedAccountId,
    metadata: { ...formState.formValues },
    rail_ids: [...formState.selectedRailIds],
  };
  const result = await createAccountInstruction(payload, abortController.signal);
  isSubmitting.value = false;
  abortController = null;

  if (result.status === 'ok') {
    toast.success('Instrucción de cuenta creada');
    clearDraft(props.client.id);
    void queryClient.invalidateQueries({ queryKey: ['ops', 'clients', props.client.id] });
    open.value = false;
    return;
  }
  if (result.status === 'aborted') {
    cancelNotice.value = true;
    setTimeout(() => {
      cancelNotice.value = false;
    }, 3000);
    return;
  }
  if (result.status === 'cvu-already-exists') {
    toast.error('CVU ya existe — el CVU ingresado ya está registrado en el sistema');
    return;
  }
  if (result.status === 'validation-error') {
    // Decision 7b — map errors[] to inline fieldErrors and navigate back to step 2.
    const mapped: Record<string, string> = {};
    for (const err of result.errors) {
      if (err.field) mapped[err.field] = err.message;
    }
    formState.fieldErrors = mapped;
    step.value = 'values';
    toast.error(`${result.errors.length} campo${result.errors.length === 1 ? '' : 's'} con errores de validación`);
    return;
  }
  // status === 'failed'
  toast.error(result.message || 'Error al crear la instrucción de cuenta');
}

function onCancelSubmit(): void {
  if (!isSubmitting.value || !abortController) return;
  abortController.abort();
}

// ─── Step transitions ──────────────────────────────────────────────
function next(): void {
  if (step.value === 'account-template' && canAdvanceFromAccountTemplate.value) {
    step.value = 'values';
    return;
  }
  if (step.value === 'values' && canAdvanceFromValues.value) {
    step.value = 'rails';
    return;
  }
}

function back(): void {
  if (step.value === 'rails') {
    step.value = 'values';
    return;
  }
  if (step.value === 'values') {
    step.value = 'account-template';
    return;
  }
}

// ─── Open / close lifecycle (incl. Decision 7e draft persistence) ──
let draftDebounce: ReturnType<typeof setTimeout> | null = null;

function persistDraft(): void {
  if (draftDebounce !== null) clearTimeout(draftDebounce);
  draftDebounce = setTimeout(() => {
    saveDraft(props.client.id, {
      step: step.value,
      accountId: formState.selectedAccountId,
      templateId: formState.selectedTemplateId,
      formValues: { ...formState.formValues },
      railIds: [...formState.selectedRailIds],
    });
  }, 500);
}

watch(
  [
    () => formState.selectedAccountId,
    () => formState.selectedTemplateId,
    () => formState.selectedRailIds.slice(),
    () => ({ ...formState.formValues }),
    step,
  ],
  () => {
    if (!open.value) return;
    persistDraft();
  },
  { deep: true },
);

watch(open, (isOpen) => {
  if (!isOpen) {
    // Cancel any in-flight submit (the modal controls the AbortController).
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    isSubmitting.value = false;
    cancelNotice.value = false;
    return;
  }
  // Open path: try to restore the draft; otherwise reset to a clean form.
  const draft = loadDraft(props.client.id);
  if (draft) {
    step.value = draft.step;
    formState.selectedAccountId = draft.accountId;
    formState.selectedTemplateId = draft.templateId;
    formState.formValues = { ...draft.formValues };
    formState.selectedRailIds = [...draft.railIds];
    formState.fieldErrors = {};
  } else {
    step.value = 'account-template';
    formState.selectedAccountId = null;
    formState.selectedTemplateId = null;
    formState.templateAttributes = [];
    formState.formValues = {};
    formState.fieldErrors = {};
    formState.selectedRailIds = [];
  }
});

// ─── Step indicator helpers ────────────────────────────────────────
type IndicatorState = 'completed' | 'current' | 'upcoming';

function indicatorState(idx: number): IndicatorState {
  if (idx < stepIndex.value) return 'completed';
  if (idx === stepIndex.value) return 'current';
  return 'upcoming';
}

const indicatorClass: Record<IndicatorState, string> = {
  completed: 'bg-success text-white',
  current: 'bg-brand text-white ring-2 ring-brand/30',
  upcoming: 'bg-card-2 text-t-4 border border-b-2',
};

// ─── Footer "next vs submit" gating ────────────────────────────────
const isLast = computed(() => step.value === 'rails');
const isFirst = computed(() => step.value === 'account-template');
const nextEnabled = computed(() =>
  step.value === 'account-template' ? canAdvanceFromAccountTemplate.value : canAdvanceFromValues.value,
);

function close(): void {
  if (isSubmitting.value) return;
  open.value = false;
}

// ─── Mutators called from step components (canonical emit pattern) ─
function setAccountId(value: string | null): void {
  formState.selectedAccountId = value;
}

function setTemplateId(value: string | null): void {
  formState.selectedTemplateId = value;
}

function setFormValue(key: string, value: string): void {
  formState.formValues = { ...formState.formValues, [key]: value };
  if (formState.fieldErrors[key]) {
    const next = { ...formState.fieldErrors };
    delete next[key];
    formState.fieldErrors = next;
  }
}

function toggleRailId(railId: string): void {
  const idx = formState.selectedRailIds.indexOf(railId);
  if (idx > -1) {
    formState.selectedRailIds = formState.selectedRailIds.filter((_, i) => i !== idx);
  } else {
    formState.selectedRailIds = [...formState.selectedRailIds, railId];
  }
}

// Provide a tiny render helper to keep SFC linter happy when it wants a default export.
// (Some toolchains flag h-only files; we don't ship a render prop here.)
void h;
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="sm:max-w-4xl"
      data-testid="create-account-instruction-modal"
      @open-auto-focus="(e: Event) => e.preventDefault()"
    >
      <DialogHeader>
        <DialogTitle>Crear instrucción de cuenta</DialogTitle>
        <DialogDescription>
          Asociá un template de instrucción a una cuenta del cliente seleccionando los datos y rails.
        </DialogDescription>
      </DialogHeader>

      <!-- Step indicator -->
      <ol class="flex items-center gap-2" role="list">
        <li
          v-for="(s, idx) in STEPS"
          :key="s.id"
          class="flex flex-1 items-center gap-2"
        >
          <div
            :class="
              cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors',
                indicatorClass[indicatorState(idx)],
              )
            "
            :aria-current="indicatorState(idx) === 'current' ? 'step' : undefined"
          >
            {{ idx + 1 }}
          </div>
          <div class="min-w-0 flex-1 truncate text-sm font-medium text-t-1">
            {{ s.title }}
          </div>
        </li>
      </ol>

      <!-- Step body -->
      <div>
        <AccountTemplateStep
          v-if="step === 'account-template'"
          :form-state="formState"
          :templates="templates"
          :is-loading-templates="templatesQuery.isPending.value"
          @update:account-id="setAccountId"
          @update:template-id="setTemplateId"
        />
        <FieldValuesStep
          v-else-if="step === 'values'"
          :form-state="formState"
          :client="props.client"
          :template="selectedTemplate"
          :attributes="formState.templateAttributes"
          :is-loading="templateAttributesQuery.isPending.value"
          :has-fetch-error="templateAttributesQuery.isError.value"
          @update:value="setFormValue"
          @retry="() => void templateAttributesQuery.refetch()"
        />
        <template v-else>
          <RailsStep
            :form-state="formState"
            :rails="rails"
            :is-loading="railsQuery.isPending.value"
            :has-fetch-error="railsQuery.isError.value"
            @toggle-rail="toggleRailId"
            @retry="() => void railsQuery.refetch()"
          />
          <div class="mt-4">
            <AccountInstructionPreviewCard
              :form-state="formState"
              :template="selectedTemplate"
              :attributes="formState.templateAttributes"
              :rails="rails"
            />
          </div>
        </template>
      </div>

      <p
        v-if="cancelNotice"
        class="text-xs text-warning"
        data-testid="ai-cancel-notice"
      >
        Creación cancelada. Volvé a hacer click en Crear para reintentar.
      </p>

      <DialogFooter>
        <Button
          v-if="!isFirst"
          variant="ghost"
          :disabled="isSubmitting"
          data-testid="ai-back"
          @click="back"
        >
          Atrás
        </Button>
        <Button v-else variant="ghost" :disabled="isSubmitting" @click="close">
          Cancelar
        </Button>

        <template v-if="!isLast">
          <Button
            variant="primary"
            :disabled="!nextEnabled"
            data-testid="ai-next"
            @click="next"
          >
            Continuar
          </Button>
        </template>
        <template v-else>
          <!-- Submit / Cancel swap during in-flight submit -->
          <Button
            v-if="!isSubmitting"
            variant="primary"
            :disabled="!canSubmit"
            data-testid="ai-submit"
            @click="onSubmit"
          >
            Crear
          </Button>
          <Button
            v-else
            variant="danger"
            data-testid="ai-cancel-submit"
            @click="onCancelSubmit"
          >
            <Loader2 class="h-3.5 w-3.5 animate-spin" />
            Cancelar
          </Button>
        </template>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
