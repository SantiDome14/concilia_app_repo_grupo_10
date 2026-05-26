<script setup lang="ts">
import { ref, watch } from 'vue';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUpdateQuote } from '@/composables/useQuotes';
import type { Quote } from '@/types/quote';

// ════════════════════════════════════════════════════════════════════
// <EditQuoteModal> — Edit notes + liquidate_date
// ────────────────────────────────────────────────────────────────────
// The legacy lets the desk edit ONLY these two fields. Everything
// else (amounts, FX, term) is locked once the quote is created — a
// new quote replaces them.
//
// Liquidate date is rendered as a `<input type="date">` (yyyy-mm-dd);
// the API expects an ISO-8601 string at 18:00:00Z (matching the seed
// convention). An empty value clears the field.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{ open: boolean; quote: Quote | null }>();
const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const schema = toTypedSchema(
  z.object({
    notes: z.string().max(500, 'Máximo 500 caracteres'),
    liquidate_date: z.string().refine((v) => {
      if (v === '') return true;
      return /^\d{4}-\d{2}-\d{2}$/.test(v);
    }, 'Formato inválido (yyyy-mm-dd)'),
  }),
);

const { handleSubmit, errors, defineField, resetForm, meta, setValues } =
  useForm({
    validationSchema: schema,
    initialValues: { notes: '', liquidate_date: '' },
  });

const [notes, notesAttrs] = defineField('notes');
const [liquidate_date, liquidateAttrs] = defineField('liquidate_date');

const mutation = useUpdateQuote();
const inFlight = ref(false);

function isoToDateInput(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

function dateInputToIso(value: string): string | null {
  if (!value) return null;
  return `${value}T18:00:00Z`;
}

// Sync form values to the incoming quote when the dialog opens.
watch(
  () => [props.open, props.quote?.id],
  ([isOpen]) => {
    if (isOpen && props.quote) {
      setValues({
        notes: props.quote.notes ?? '',
        liquidate_date: isoToDateInput(props.quote.liquidate_date),
      });
    }
    if (!isOpen) resetForm();
  },
  { immediate: true },
);

const onSubmit = handleSubmit(async (values) => {
  if (!props.quote) return;
  inFlight.value = true;
  try {
    await mutation.mutateAsync({
      id: props.quote.id,
      patch: {
        notes: values.notes && values.notes.trim() !== '' ? values.notes.trim() : null,
        liquidate_date: dateInputToIso(values.liquidate_date),
      },
    });
    toast.success('Cotización actualizada');
    emit('update:open', false);
  } catch (err) {
    toast.error('No se pudieron guardar los cambios');
    console.error('[quotes] edit error', err);
  } finally {
    inFlight.value = false;
  }
});
</script>

<template>
  <Dialog :open="open" @update:open="(v: boolean) => emit('update:open', v)">
    <DialogContent class="max-w-[480px]" data-testid="edit-quote-modal">
      <DialogHeader>
        <DialogTitle>Editar cotización</DialogTitle>
        <DialogDescription>
          Notas y fecha de liquidación pueden modificarse mientras la cotización
          esté en PENDING o ACCEPTED.
        </DialogDescription>
      </DialogHeader>

      <form class="flex flex-col gap-4 pt-2" @submit="onSubmit">
        <div class="flex flex-col gap-1.5">
          <Label
            for="quote-notes"
            class="text-[10px] font-bold uppercase tracking-wider text-t-3"
          >
            Notas
          </Label>
          <textarea
            id="quote-notes"
            v-model="notes"
            v-bind="notesAttrs"
            rows="4"
            class="rounded-md border border-b-2 bg-card px-3 py-2 text-[13px] text-t-2 outline-none focus:border-b-3"
            placeholder="Observaciones internas de la operación..."
            data-testid="quote-notes"
          />
          <p v-if="errors.notes" class="text-xs text-danger" data-testid="quote-notes-error">
            {{ errors.notes }}
          </p>
        </div>

        <div class="flex flex-col gap-1.5">
          <Label
            for="quote-liquidate-date"
            class="text-[10px] font-bold uppercase tracking-wider text-t-3"
          >
            Fecha de liquidación
          </Label>
          <Input
            id="quote-liquidate-date"
            v-model="liquidate_date"
            v-bind="liquidateAttrs"
            type="date"
            data-testid="quote-liquidate-date"
          />
          <p v-if="errors.liquidate_date" class="text-xs text-danger">
            {{ errors.liquidate_date }}
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            :disabled="inFlight"
            @click="emit('update:open', false)"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            :disabled="!meta.valid || inFlight"
            data-testid="quote-edit-submit"
          >
            {{ inFlight ? 'Guardando...' : 'Guardar cambios' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
