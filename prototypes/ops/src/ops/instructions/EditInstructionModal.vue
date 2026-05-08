<script setup lang="ts">
import { ref, watch } from 'vue';
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
import InstructionForm from './InstructionForm.vue';
import {
  updateInstructionWithAttributes,
  retrySaveAttributes,
} from './api';
import type {
  InstructionFormData,
  InstructionId,
  InstructionWithAttributes,
} from './types';

// ════════════════════════════════════════════════════════════════════
// EditInstructionModal — same two-phase save shape as Create with
// pre-population of the existing instruction's data per Requirement 5.
// ════════════════════════════════════════════════════════════════════

interface CurrencyOption {
  value: string;
  label: string;
}

const props = defineProps<{
  open: boolean;
  instruction: InstructionWithAttributes | null;
  currencies: CurrencyOption[];
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  updated: [];
}>();

const formState = ref<{ values: InstructionFormData; isValid: boolean } | null>(null);
const externalErrors = ref<Partial<Record<keyof InstructionFormData, string>>>({});
const isSubmitting = ref(false);

const retryState = ref<{
  instructionId: InstructionId;
  pendingAttributes: InstructionFormData['attributes'];
  message: string;
} | null>(null);

const initialValues = ref<Partial<InstructionFormData> | undefined>(undefined);

// Re-seed the form whenever the instruction prop changes.
watch(
  () => props.instruction,
  (instruction) => {
    if (!instruction) {
      initialValues.value = undefined;
      return;
    }
    initialValues.value = {
      name: instruction.name,
      currency_id: instruction.currency_id,
      description: instruction.description ?? '',
      attributes: instruction.attributes
        .slice()
        .sort((a, b) => a.index_order - b.index_order)
        .map((a, idx) => ({ key: a.key, value: a.value, index: idx })),
    };
    formState.value = null;
    externalErrors.value = {};
    retryState.value = null;
  },
  { immediate: true },
);

function close(): void {
  if (isSubmitting.value) return;
  emit('update:open', false);
  formState.value = null;
  externalErrors.value = {};
  retryState.value = null;
}

async function onSubmit(): Promise<void> {
  if (!formState.value || !props.instruction || isSubmitting.value) return;
  if (!formState.value.isValid) return;
  isSubmitting.value = true;
  externalErrors.value = {};

  const result = await updateInstructionWithAttributes(
    props.instruction.id,
    formState.value.values,
  );

  if (result.status === 'ok') {
    isSubmitting.value = false;
    toast.success('Instrucción actualizada');
    emit('updated');
    close();
    return;
  }
  if (result.status === 'phase-a-failed') {
    isSubmitting.value = false;
    if (result.error.field) {
      externalErrors.value = { [result.error.field]: result.error.message };
    } else {
      toast.error(result.error.message);
    }
    return;
  }
  isSubmitting.value = false;
  retryState.value = {
    instructionId: result.instructionId,
    pendingAttributes: formState.value.values.attributes,
    message: result.error.message,
  };
}

async function onRetryPhaseB(): Promise<void> {
  if (!retryState.value) return;
  isSubmitting.value = true;
  const result = await retrySaveAttributes(
    retryState.value.instructionId,
    retryState.value.pendingAttributes,
  );
  isSubmitting.value = false;
  if (result.status === 'ok') {
    toast.success('Instrucción actualizada');
    emit('updated');
    close();
  } else {
    retryState.value = { ...retryState.value, message: result.message };
  }
}
</script>

<template>
  <Dialog :open="props.open" @update:open="(v) => (v ? null : close())">
    <DialogContent class="max-w-xl">
      <DialogHeader>
        <DialogTitle>Editar instrucción</DialogTitle>
        <DialogDescription v-if="props.instruction">
          {{ props.instruction.name }} · {{ props.instruction.currency_id }}
        </DialogDescription>
      </DialogHeader>

      <div
        v-if="retryState"
        class="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning"
        role="alert"
      >
        Cambios guardados pero los atributos no se pudieron guardar — {{ retryState.message }}.
        Reintentá sin cerrar el modal o los atributos quedarán desactualizados.
      </div>

      <InstructionForm
        v-if="initialValues"
        :initial-values="initialValues"
        :currencies="props.currencies"
        :external-errors="externalErrors"
        @update:form-state="(v) => (formState = v)"
      />

      <DialogFooter>
        <Button variant="ghost" :disabled="isSubmitting" @click="close">
          Cancelar
        </Button>
        <Button
          v-if="!retryState"
          variant="primary"
          :disabled="!formState?.isValid || isSubmitting"
          @click="onSubmit"
        >
          {{ isSubmitting ? 'Guardando…' : 'Guardar cambios' }}
        </Button>
        <Button
          v-else
          variant="primary"
          :disabled="isSubmitting"
          @click="onRetryPhaseB"
        >
          {{ isSubmitting ? 'Reintentando…' : 'Reintentar atributos' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
