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
import { useDeletePriceAlert } from '@/composables/usePriceAlerts';
import type { PriceAlert } from '@/types/priceAlert';

// ════════════════════════════════════════════════════════════════════
// <DeletePriceAlertConfirm> — destructive-action dialog
// ────────────────────────────────────────────────────────────────────
// Per core-modals Confirmation dialog pattern: danger-accented,
// verb-specific action label ("Eliminar"), ghost cancel on the left.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{ open: boolean; alert: PriceAlert | null }>();
const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const mutation = useDeletePriceAlert();
const inFlight = ref(false);

async function confirm(): Promise<void> {
  if (!props.alert) return;
  inFlight.value = true;
  try {
    await mutation.mutateAsync(props.alert.id);
    toast.success('Alerta eliminada');
    emit('update:open', false);
  } catch (err) {
    toast.error('No se pudo eliminar la alerta');
     
    console.error('[price-alerts] delete error', err);
  } finally {
    inFlight.value = false;
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="(v: boolean) => emit('update:open', v)">
    <DialogContent class="max-w-[420px]" data-testid="delete-price-alert-modal">
      <DialogHeader>
        <DialogTitle class="text-danger">Eliminar alerta de precio</DialogTitle>
        <DialogDescription>
          Esta acción es irreversible. La regla
          <span v-if="alert" class="font-mono text-t-2">{{ alert.name }}</span>
          será eliminada permanentemente.
        </DialogDescription>
      </DialogHeader>

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
          type="button"
          variant="danger"
          :disabled="inFlight"
          data-testid="pa-delete-confirm"
          @click="confirm"
        >
          {{ inFlight ? 'Eliminando...' : 'Eliminar' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
