<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';
import { toast } from 'vue-sonner';
import { useQuery } from '@tanstack/vue-query';
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
import { useCreateQuote } from '@/composables/useQuotes';
import { listClients } from '@/api/modules/clients';
import {
  CURRENCIES_CATALOG,
  findCurrency,
} from '@/trd/quotes/currencies-catalog';
import type { QuoteTerm } from '@/types/quote';

// ════════════════════════════════════════════════════════════════════
// <CreateQuoteModal> — Single-leg OTC quote creation
// ────────────────────────────────────────────────────────────────────
// Lean v1: one modal, one submit. The legacy QuoteForm (3,048 LOC)
// covered live FX-rate lookup + per-client limits display + 3-step
// wizard + bidirectional amount calc — those land as named
// extensions: `extend-trd-quote-create-fx-live`,
// `extend-trd-quote-create-limits`, `extend-trd-quote-create-multi-step`,
// `extend-trd-quote-create-bidirectional`.
//
// destination_amount is computed live from origin_amount × exchange_rate.
// The user types only the rate; the destination cell renders the result.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

// Clients — fetch a wide page so the dropdown carries the seed set.
// Switch to an autocomplete-style combobox in a follow-up when the
// client roster outgrows ~50 entries.
const clientsQuery = useQuery({
  queryKey: ['clients', 'list', { q: undefined, page: 1, pageSize: 100 }] as const,
  queryFn: () => listClients({ page: 1, pageSize: 100 }),
  staleTime: 60_000,
});

const decimalString = z
  .string()
  .min(1, 'Requerido')
  .refine((v) => {
    const num = Number(v);
    return Number.isFinite(num) && num > 0;
  }, 'Debe ser un número positivo');

const schema = toTypedSchema(
  z.object({
    client_id: z.string().min(1, 'Requerido'),
    operation: z.enum(['BUY', 'SELL']),
    origin_currency: z.string().min(1, 'Requerido'),
    destination_currency: z.string().min(1, 'Requerido'),
    origin_amount: decimalString,
    exchange_rate: decimalString,
    term: z.enum(['T0', 'T+1', 'T+2']),
    notes: z.string().max(500, 'Máximo 500 caracteres'),
    liquidate_date: z.string().refine((v) => {
      if (v === '') return true;
      return /^\d{4}-\d{2}-\d{2}$/.test(v);
    }, 'Formato inválido (yyyy-mm-dd)'),
  }),
);

const { handleSubmit, errors, defineField, resetForm, meta, values } = useForm({
  validationSchema: schema,
  initialValues: {
    client_id: '',
    operation: 'BUY' as const,
    origin_currency: 'ARS',
    destination_currency: 'USD',
    origin_amount: '',
    exchange_rate: '',
    term: 'T0' as QuoteTerm,
    notes: '',
    liquidate_date: '',
  },
});

const [client_id] = defineField('client_id');
const [operation] = defineField('operation');
const [origin_currency] = defineField('origin_currency');
const [destination_currency] = defineField('destination_currency');
const [origin_amount, originAmountAttrs] = defineField('origin_amount');
const [exchange_rate, rateAttrs] = defineField('exchange_rate');
const [term] = defineField('term');
const [notes, notesAttrs] = defineField('notes');
const [liquidate_date, liquidateAttrs] = defineField('liquidate_date');

// Live calculation: destination_amount = origin_amount × exchange_rate.
const destinationAmount = computed(() => {
  const orig = Number(values.origin_amount);
  const rate = Number(values.exchange_rate);
  if (!Number.isFinite(orig) || !Number.isFinite(rate) || orig <= 0 || rate <= 0) {
    return '—';
  }
  const dest = orig * rate;
  const decimals = findCurrency(values.destination_currency ?? '')?.decimals ?? 2;
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(dest);
});

const mutation = useCreateQuote();
const inFlight = ref(false);

// Origin and destination currency must differ — enforce by clearing
// destination if the user picks the same as origin.
watch(origin_currency, (next) => {
  if (next && next === values.destination_currency) {
    destination_currency.value = '';
  }
});

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) resetForm();
  },
);

const onSubmit = handleSubmit(async (vals) => {
  if (vals.origin_currency === vals.destination_currency) {
    toast.error('La moneda origen y destino deben ser distintas');
    return;
  }
  const orig = Number(vals.origin_amount);
  const rate = Number(vals.exchange_rate);
  const dest = orig * rate;
  const decimals = findCurrency(vals.destination_currency)?.decimals ?? 2;

  inFlight.value = true;
  try {
    await mutation.mutateAsync({
      client_id: vals.client_id,
      operation: vals.operation,
      origin_currency: vals.origin_currency,
      destination_currency: vals.destination_currency,
      origin_amount: String(orig),
      exchange_rate: vals.exchange_rate,
      destination_amount: dest.toFixed(decimals),
      term: vals.term,
      notes: vals.notes && vals.notes.trim() !== '' ? vals.notes.trim() : null,
      liquidate_date: vals.liquidate_date
        ? `${vals.liquidate_date}T18:00:00Z`
        : null,
    });
    toast.success('Cotización creada');
    emit('update:open', false);
  } catch (err) {
    toast.error('No se pudo crear la cotización');
    console.error('[quotes] create error', err);
  } finally {
    inFlight.value = false;
  }
});

const clientOptions = computed(() =>
  (clientsQuery.data.value?.data ?? []).filter((c) => c.is_active),
);
</script>

<template>
  <Dialog :open="open" @update:open="(v: boolean) => emit('update:open', v)">
    <DialogContent class="max-w-[560px]" data-testid="create-quote-modal">
      <DialogHeader>
        <DialogTitle>Nueva cotización</DialogTitle>
        <DialogDescription>
          Crea una cotización OTC para un cliente. El resultado entra en
          estado PENDING y queda visible en la pestaña Activos.
        </DialogDescription>
      </DialogHeader>

      <form class="flex flex-col gap-4 pt-2" @submit="onSubmit">
        <!-- Client + Operation -->
        <div class="grid grid-cols-[1fr_140px] gap-3">
          <div class="flex flex-col gap-1.5">
            <Label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
              Cliente <span class="text-danger">*</span>
            </Label>
            <Select v-model="client_id">
              <SelectTrigger data-testid="cq-client">
                <SelectValue placeholder="Seleccioná un cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="c in clientOptions"
                  :key="c.id"
                  :value="c.id"
                >
                  {{ c.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errors.client_id" class="text-xs text-danger">
              {{ errors.client_id }}
            </p>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
              Operación <span class="text-danger">*</span>
            </Label>
            <Select v-model="operation">
              <SelectTrigger data-testid="cq-operation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BUY">BUY</SelectItem>
                <SelectItem value="SELL">SELL</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <!-- Currency pair -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <Label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
              Moneda origen <span class="text-danger">*</span>
            </Label>
            <Select v-model="origin_currency">
              <SelectTrigger data-testid="cq-origin-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="c in CURRENCIES_CATALOG"
                  :key="c.code"
                  :value="c.code"
                >
                  {{ c.code }} — {{ c.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
              Moneda destino <span class="text-danger">*</span>
            </Label>
            <Select v-model="destination_currency">
              <SelectTrigger data-testid="cq-destination-currency">
                <SelectValue placeholder="Elegí una moneda" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="c in CURRENCIES_CATALOG.filter((c) => c.code !== origin_currency)"
                  :key="c.code"
                  :value="c.code"
                >
                  {{ c.code }} — {{ c.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errors.destination_currency" class="text-xs text-danger">
              {{ errors.destination_currency }}
            </p>
          </div>
        </div>

        <!-- Amounts -->
        <div class="grid grid-cols-3 gap-3">
          <div class="flex flex-col gap-1.5">
            <Label
              for="cq-amount"
              class="text-[10px] font-bold uppercase tracking-wider text-t-3"
            >
              Monto origen <span class="text-danger">*</span>
            </Label>
            <Input
              id="cq-amount"
              v-model="origin_amount"
              v-bind="originAmountAttrs"
              type="number"
              step="any"
              min="0"
              placeholder="0"
              data-testid="cq-amount"
            />
            <p v-if="errors.origin_amount" class="text-xs text-danger">
              {{ errors.origin_amount }}
            </p>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label
              for="cq-rate"
              class="text-[10px] font-bold uppercase tracking-wider text-t-3"
            >
              Tipo de cambio <span class="text-danger">*</span>
            </Label>
            <Input
              id="cq-rate"
              v-model="exchange_rate"
              v-bind="rateAttrs"
              type="number"
              step="any"
              min="0"
              placeholder="0"
              data-testid="cq-rate"
            />
            <p v-if="errors.exchange_rate" class="text-xs text-danger">
              {{ errors.exchange_rate }}
            </p>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
              Contravalor
            </Label>
            <div
              class="flex h-9 items-center rounded-md border border-b-2 bg-card px-3 font-mono text-[13px] text-t-3"
              data-testid="cq-destination-amount"
            >
              {{ destinationAmount }}
            </div>
          </div>
        </div>

        <!-- Term -->
        <div class="flex flex-col gap-1.5">
          <Label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
            Plazo <span class="text-danger">*</span>
          </Label>
          <Select v-model="term">
            <SelectTrigger data-testid="cq-term">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="T0">T0 — Mismo día</SelectItem>
              <SelectItem value="T+1">T+1</SelectItem>
              <SelectItem value="T+2">T+2</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Liquidate date + Notes -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <Label
              for="cq-liquidate"
              class="text-[10px] font-bold uppercase tracking-wider text-t-3"
            >
              Fecha liquidación
            </Label>
            <Input
              id="cq-liquidate"
              v-model="liquidate_date"
              v-bind="liquidateAttrs"
              type="date"
              data-testid="cq-liquidate"
            />
            <p v-if="errors.liquidate_date" class="text-xs text-danger">
              {{ errors.liquidate_date }}
            </p>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <Label
            for="cq-notes"
            class="text-[10px] font-bold uppercase tracking-wider text-t-3"
          >
            Notas
          </Label>
          <textarea
            id="cq-notes"
            v-model="notes"
            v-bind="notesAttrs"
            rows="2"
            class="rounded-md border border-b-2 bg-card px-3 py-2 text-[13px] text-t-2 outline-none focus:border-b-3"
            placeholder="Observaciones internas de la operación..."
            data-testid="cq-notes"
          />
          <p v-if="errors.notes" class="text-xs text-danger">
            {{ errors.notes }}
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
            data-testid="cq-submit"
          >
            {{ inFlight ? 'Creando...' : 'Crear cotización' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
