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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreatePriceAlert } from '@/composables/usePriceAlerts';
import type { PriceAlertSide } from '@/types/priceAlert';

// ════════════════════════════════════════════════════════════════════
// <CreatePriceAlertModal> — Create dialog per core-modals + core-forms
// ────────────────────────────────────────────────────────────────────
// vee-validate + zod schema. Required-field asterisks rendered in the
// label, submit disabled while invalid or in-flight, field errors
// below the input in `text-danger`. Success → toast + close.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

const decimalString = z
  .string()
  .min(1, 'Requerido')
  .refine((v) => {
    const num = Number(v);
    return Number.isFinite(num) && num > 0;
  }, 'Debe ser un número positivo');

const schema = toTypedSchema(
  z.object({
    name: z.string().min(2, 'Mínimo 2 caracteres').max(80, 'Máximo 80 caracteres'),
    side: z.enum(['BUY', 'SELL']),
    cost_price: decimalString,
    limit_price: decimalString,
    volume: decimalString,
  }),
);

const { handleSubmit, errors, defineField, resetForm, meta } = useForm({
  validationSchema: schema,
  initialValues: {
    name: '',
    side: 'BUY' as PriceAlertSide,
    cost_price: '',
    limit_price: '',
    volume: '',
  },
});

const [name, nameAttrs] = defineField('name');
const [side] = defineField('side');
const [cost_price, costAttrs] = defineField('cost_price');
const [limit_price, limitAttrs] = defineField('limit_price');
const [volume, volumeAttrs] = defineField('volume');

const mutation = useCreatePriceAlert();
const submitInFlight = ref(false);

const onSubmit = handleSubmit(async (values) => {
  submitInFlight.value = true;
  try {
    await mutation.mutateAsync(values);
    toast.success('Alerta de precio creada');
    resetForm();
    emit('update:open', false);
  } catch (err) {
    toast.error('No se pudo crear la alerta');
     
    console.error('[price-alerts] create error', err);
  } finally {
    submitInFlight.value = false;
  }
});

// Reset the form whenever the dialog closes (avoid leaking state).
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) resetForm();
  },
);
</script>

<template>
  <Dialog :open="open" @update:open="(v: boolean) => emit('update:open', v)">
    <DialogContent class="max-w-[480px]" data-testid="create-price-alert-modal">
      <DialogHeader>
        <DialogTitle>Nueva alerta de precio</DialogTitle>
        <DialogDescription>
          Configurá una regla que se dispara cuando un activo cruza un umbral.
        </DialogDescription>
      </DialogHeader>

      <form class="flex flex-col gap-4 pt-2" @submit="onSubmit">
        <!-- Name -->
        <div class="flex flex-col gap-1.5">
          <Label
            for="pa-name"
            class="text-[10px] font-bold uppercase tracking-wider text-t-3"
          >
            Nombre <span class="text-danger">*</span>
          </Label>
          <Input
            id="pa-name"
            v-model="name"
            v-bind="nameAttrs"
            placeholder="USDT/ARS BUY @ 980"
            data-testid="pa-name"
          />
          <p v-if="errors.name" class="text-xs text-danger" data-testid="pa-name-error">
            {{ errors.name }}
          </p>
        </div>

        <!-- Side -->
        <div class="flex flex-col gap-1.5">
          <Label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
            Lado <span class="text-danger">*</span>
          </Label>
          <Select v-model="side">
            <SelectTrigger data-testid="pa-side">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BUY">BUY</SelectItem>
              <SelectItem value="SELL">SELL</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Cost price + Limit price (grid) -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <Label
              for="pa-cost"
              class="text-[10px] font-bold uppercase tracking-wider text-t-3"
            >
              Precio referencia <span class="text-danger">*</span>
            </Label>
            <Input
              id="pa-cost"
              v-model="cost_price"
              v-bind="costAttrs"
              type="number"
              step="any"
              min="0"
              placeholder="980"
              data-testid="pa-cost"
            />
            <p v-if="errors.cost_price" class="text-xs text-danger" data-testid="pa-cost-error">
              {{ errors.cost_price }}
            </p>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label
              for="pa-limit"
              class="text-[10px] font-bold uppercase tracking-wider text-t-3"
            >
              Umbral disparo <span class="text-danger">*</span>
            </Label>
            <Input
              id="pa-limit"
              v-model="limit_price"
              v-bind="limitAttrs"
              type="number"
              step="any"
              min="0"
              placeholder="985"
              data-testid="pa-limit"
            />
            <p v-if="errors.limit_price" class="text-xs text-danger" data-testid="pa-limit-error">
              {{ errors.limit_price }}
            </p>
          </div>
        </div>

        <!-- Volume -->
        <div class="flex flex-col gap-1.5">
          <Label
            for="pa-volume"
            class="text-[10px] font-bold uppercase tracking-wider text-t-3"
          >
            Volumen <span class="text-danger">*</span>
          </Label>
          <Input
            id="pa-volume"
            v-model="volume"
            v-bind="volumeAttrs"
            type="number"
            step="any"
            min="0"
            placeholder="50000"
            data-testid="pa-volume"
          />
          <p v-if="errors.volume" class="text-xs text-danger" data-testid="pa-volume-error">
            {{ errors.volume }}
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            :disabled="submitInFlight"
            @click="emit('update:open', false)"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            :disabled="!meta.valid || submitInFlight"
            data-testid="pa-submit"
          >
            {{ submitInFlight ? 'Creando...' : 'Crear alerta' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
