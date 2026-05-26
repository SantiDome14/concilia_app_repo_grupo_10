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
import { useCancelQuote } from '@/composables/useQuotes';
import type { Quote } from '@/types/quote';

// ════════════════════════════════════════════════════════════════════
// <CancelQuoteConfirm> — destructive confirmation per core-modals
// ────────────────────────────────────────────────────────────────────
// Danger-accented header + verb-specific action label ("Cancelar").
// Cancel of the dialog itself is rendered as "Volver" to avoid the
// ambiguity of two "Cancelar" labels (one for the quote, one for
// the dialog).
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{ open: boolean; quote: Quote | null }>();
const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const mutation = useCancelQuote();
const inFlight = ref(false);

async function confirm(): Promise<void> {
  if (!props.quote) return;
  inFlight.value = true;
  try {
    await mutation.mutateAsync(props.quote.id);
    toast.success('Cotización cancelada');
    emit('update:open', false);
  } catch (err) {
    toast.error('No se pudo cancelar la cotización');
    console.error('[quotes] cancel error', err);
  } finally {
    inFlight.value = false;
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v: boolean) => emit('update:open', v)">
    <DialogContent class="max-w-[440px]" data-testid="cancel-quote-modal">
      <DialogHeader>
        <DialogTitle class="text-danger">Cancelar cotización</DialogTitle>
        <DialogDescription>
          Esta acción cambia el estado de la cotización
          <span v-if="quote" class="font-mono text-t-2">{{ quote.id }}</span>
          a <strong class="text-t-2">CANCELLED</strong>. La operación no se
          ejecuta y queda registrada en el historial.
        </DialogDescription>
      </DialogHeader>

      <DialogFooter>
        <Button
          type="button"
          variant="ghost"
          :disabled="inFlight"
          @click="emit('update:open', false)"
        >
          Volver
        </Button>
        <Button
          type="button"
          variant="danger"
          :disabled="inFlight"
          data-testid="cancel-quote-confirm"
          @click="confirm"
        >
          {{ inFlight ? 'Cancelando...' : 'Cancelar cotización' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
