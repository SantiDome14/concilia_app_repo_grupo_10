<script setup lang="ts">
import { ref } from 'vue';
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
  createInstructionWithAttributes,
  retrySaveAttributes,
} from '@/api/modules/instructions';
import type { InstructionFormData, InstructionId } from './types';

// ════════════════════════════════════════════════════════════════════
// CreateInstructionModal — implements ops-instructions Requirement 6
// ────────────────────────────────────────────────────────────────────
// Owns the two-phase save orchestrator: phase A creates the record,
// phase B saves attributes. Partial failure (phase B after phase A
// success) renders a persistent retry banner.
// ════════════════════════════════════════════════════════════════════

interface CurrencyOption {
  value: string;
  label: string;
}

const props = defineProps<{
  open: boolean;
  currencies: CurrencyOption[];
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  /** Fired when the create succeeded (phase A + B). The page invalidates the cache. */
  created: [];
}>();

const formState = ref<{ values: InstructionFormData; isValid: boolean } | null>(null);
const externalErrors = ref<Partial<Record<keyof InstructionFormData, string>>>({});
const isSubmitting = ref(false);

// Phase-B retry banner state.
const retryState = ref<{
  instructionId: InstructionId;
  pendingAttributes: InstructionFormData['attributes'];
  message: string;
} | null>(null);

const canSubmit = (): boolean =>
  Boolean(formState.value?.isValid) && !isSubmitting.value;

function close(): void {
  if (isSubmitting.value) return;
  emit('update:open', false);
  // Reset state on close.
  formState.value = null;
  externalErrors.value = {};
  retryState.value = null;
}

async function onSubmit(): Promise<void> {
  if (!formState.value || !canSubmit()) return;
  isSubmitting.value = true;
  externalErrors.value = {};

  const result = await createInstructionWithAttributes(formState.value.values);

  if (result.status === 'ok') {
    isSubmitting.value = false;
    toast.success('Instrucción creada');
    emit('created');
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

  // phase-b-failed → persistent retry banner.
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
    toast.success('Instrucción creada');
    emit('created');
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
        <DialogTitle>Crear instrucción</DialogTitle>
        <DialogDescription>
          Define un template de routing de pago. Los atributos pueden ser personalizados.
        </DialogDescription>
      </DialogHeader>

      <!-- Persistent retry banner (Requirement 6 phase-b-failed) -->
      <div
        v-if="retryState"
        class="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning"
        role="alert"
      >
        Instrucción creada pero los atributos no se pudieron guardar — {{ retryState.message }}.
        Reintentá sin cerrar el modal o los atributos quedarán pendientes.
      </div>

      <InstructionForm
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
          :disabled="!canSubmit()"
          @click="onSubmit"
        >
          {{ isSubmitting ? 'Guardando…' : 'Guardar' }}
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
