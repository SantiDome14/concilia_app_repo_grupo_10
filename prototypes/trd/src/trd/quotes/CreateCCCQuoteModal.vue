<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import { z } from 'zod';
import { toast } from 'vue-sonner';
import { ArrowRight } from 'lucide-vue-next';
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
import { useCreateCCCQuote } from '@/composables/useQuotes';
import { listClients } from '@/api/modules/clients';
import {
  CURRENCIES_CATALOG,
  findCurrency,
} from '@/trd/quotes/currencies-catalog';
import type { QuoteTerm } from '@/types/quote';

// ════════════════════════════════════════════════════════════════════
// <CreateCCCQuoteModal> — 3-leg Crypto-to-Crypto-to-Crypto
// ────────────────────────────────────────────────────────────────────
// Single-step form for a CCC quote: pick origin / middle /
// destination currencies + the two exchange rates, submit creates
// three quotes sharing the same ccc_group_id (leg 1: origin → middle,
// leg 2: middle → destination, leg 3: consolidated origin →
// destination at the composite rate).
//
// Intentionally minimal: no per-leg notes, no per-leg term override —
// they apply uniformly to the three records. Refinement lands as
// `extend-trd-quote-ccc-per-leg-overrides`.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{
  'update:open': [value: boolean];
}>();

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
    middle_currency: z.string().min(1, 'Requerido'),
    destination_currency: z.string().min(1, 'Requerido'),
    origin_amount: decimalString,
    exchange_rate_1: decimalString,
    exchange_rate_2: decimalString,
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
    origin_currency: 'USD',
    middle_currency: 'USDC',
    destination_currency: 'USDT',
    origin_amount: '',
    exchange_rate_1: '',
    exchange_rate_2: '',
    term: 'T0' as QuoteTerm,
    notes: '',
    liquidate_date: '',
  },
});

const [client_id] = defineField('client_id');
const [operation] = defineField('operation');
const [origin_currency] = defineField('origin_currency');
const [middle_currency] = defineField('middle_currency');
const [destination_currency] = defineField('destination_currency');
const [origin_amount, originAmountAttrs] = defineField('origin_amount');
const [exchange_rate_1, rate1Attrs] = defineField('exchange_rate_1');
const [exchange_rate_2, rate2Attrs] = defineField('exchange_rate_2');
const [term] = defineField('term');
const [notes, notesAttrs] = defineField('notes');
const [liquidate_date, liquidateAttrs] = defineField('liquidate_date');

const middleAmount = computed(() => {
  const o = Number(values.origin_amount);
  const r1 = Number(values.exchange_rate_1);
  if (!Number.isFinite(o) || !Number.isFinite(r1) || o <= 0 || r1 <= 0) {
    return '—';
  }
  const mid = o * r1;
  const decimals = findCurrency(values.middle_currency ?? '')?.decimals ?? 2;
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(mid);
});

const destinationAmount = computed(() => {
  const o = Number(values.origin_amount);
  const r1 = Number(values.exchange_rate_1);
  const r2 = Number(values.exchange_rate_2);
  if (
    !Number.isFinite(o) ||
    !Number.isFinite(r1) ||
    !Number.isFinite(r2) ||
    o <= 0 ||
    r1 <= 0 ||
    r2 <= 0
  ) {
    return '—';
  }
  const dest = o * r1 * r2;
  const decimals = findCurrency(values.destination_currency ?? '')?.decimals ?? 2;
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(dest);
});

const compositeRate = computed(() => {
  const r1 = Number(values.exchange_rate_1);
  const r2 = Number(values.exchange_rate_2);
  if (!Number.isFinite(r1) || !Number.isFinite(r2) || r1 <= 0 || r2 <= 0) {
    return null;
  }
  return r1 * r2;
});

// Enforce all-three-different currencies.
const currenciesAreDistinct = computed(() => {
  const set = new Set(
    [
      values.origin_currency,
      values.middle_currency,
      values.destination_currency,
    ].filter(Boolean),
  );
  return set.size === 3;
});

const mutation = useCreateCCCQuote();
const inFlight = ref(false);

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) resetForm();
  },
);

// Currency cascade: if origin or middle collide, clear destination.
watch([origin_currency, middle_currency], () => {
  if (
    values.destination_currency &&
    (values.destination_currency === values.origin_currency ||
      values.destination_currency === values.middle_currency)
  ) {
    destination_currency.value = '';
  }
});

const onSubmit = handleSubmit(async (vals) => {
  if (!currenciesAreDistinct.value) {
    toast.error('Las tres monedas deben ser distintas');
    return;
  }
  inFlight.value = true;
  try {
    const res = await mutation.mutateAsync({
      client_id: vals.client_id,
      operation: vals.operation,
      origin_currency: vals.origin_currency,
      middle_currency: vals.middle_currency,
      destination_currency: vals.destination_currency,
      origin_amount: vals.origin_amount,
      exchange_rate_1: vals.exchange_rate_1,
      exchange_rate_2: vals.exchange_rate_2,
      term: vals.term,
      notes: vals.notes && vals.notes.trim() !== '' ? vals.notes.trim() : null,
      liquidate_date: vals.liquidate_date
        ? `${vals.liquidate_date}T18:00:00Z`
        : null,
    });
    toast.success(`CCC creada (${res.legs.length} legs · grupo ${res.ccc_group_id})`);
    emit('update:open', false);
  } catch (err) {
    toast.error('No se pudo crear la CCC');
    console.error('[quotes] CCC create error', err);
  } finally {
    inFlight.value = false;
  }
});

const clientOptions = computed(() =>
  (clientsQuery.data.value?.data ?? []).filter((c) => c.is_active),
);

const middleOptions = computed(() =>
  CURRENCIES_CATALOG.filter((c) => c.code !== values.origin_currency),
);
const destinationOptions = computed(() =>
  CURRENCIES_CATALOG.filter(
    (c) =>
      c.code !== values.origin_currency && c.code !== values.middle_currency,
  ),
);
</script>

<template>
  <Dialog :open="open" @update:open="(v: boolean) => emit('update:open', v)">
    <DialogContent class="max-w-[640px]" data-testid="create-ccc-modal">
      <DialogHeader>
        <DialogTitle>Nueva CCC (Crypto-to-Crypto-to-Crypto)</DialogTitle>
        <DialogDescription>
          Genera tres cotizaciones encadenadas: origen → moneda intermedia → destino.
          Las tres comparten el mismo grupo (ccc_group_id) y entran en estado PENDING.
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
              <SelectTrigger data-testid="ccc-client">
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
              <SelectTrigger data-testid="ccc-operation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BUY">BUY</SelectItem>
                <SelectItem value="SELL">SELL</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <!-- Currency chain: origin → middle → destination -->
        <div class="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-end gap-2">
          <div class="flex flex-col gap-1.5">
            <Label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
              Origen <span class="text-danger">*</span>
            </Label>
            <Select v-model="origin_currency">
              <SelectTrigger data-testid="ccc-origin">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="c in CURRENCIES_CATALOG"
                  :key="c.code"
                  :value="c.code"
                >
                  {{ c.code }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ArrowRight class="mb-2 h-4 w-4 text-t-4" />
          <div class="flex flex-col gap-1.5">
            <Label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
              Intermedia <span class="text-danger">*</span>
            </Label>
            <Select v-model="middle_currency">
              <SelectTrigger data-testid="ccc-middle">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="c in middleOptions"
                  :key="c.code"
                  :value="c.code"
                >
                  {{ c.code }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ArrowRight class="mb-2 h-4 w-4 text-t-4" />
          <div class="flex flex-col gap-1.5">
            <Label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
              Destino <span class="text-danger">*</span>
            </Label>
            <Select v-model="destination_currency">
              <SelectTrigger data-testid="ccc-destination">
                <SelectValue placeholder="Elegí" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="c in destinationOptions"
                  :key="c.code"
                  :value="c.code"
                >
                  {{ c.code }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="errors.destination_currency" class="text-xs text-danger">
              {{ errors.destination_currency }}
            </p>
          </div>
        </div>
        <p
          v-if="!currenciesAreDistinct"
          class="text-xs text-danger"
          data-testid="ccc-distinct-error"
        >
          Las tres monedas deben ser distintas entre sí.
        </p>

        <!-- Origin amount + rate 1 -->
        <div class="grid grid-cols-3 gap-3">
          <div class="flex flex-col gap-1.5">
            <Label
              for="ccc-amount"
              class="text-[10px] font-bold uppercase tracking-wider text-t-3"
            >
              Monto origen <span class="text-danger">*</span>
            </Label>
            <Input
              id="ccc-amount"
              v-model="origin_amount"
              v-bind="originAmountAttrs"
              type="number"
              step="any"
              min="0"
              placeholder="0"
              data-testid="ccc-amount"
            />
            <p v-if="errors.origin_amount" class="text-xs text-danger">
              {{ errors.origin_amount }}
            </p>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label
              for="ccc-rate1"
              class="text-[10px] font-bold uppercase tracking-wider text-t-3"
            >
              TC 1 (origen→intermedia) <span class="text-danger">*</span>
            </Label>
            <Input
              id="ccc-rate1"
              v-model="exchange_rate_1"
              v-bind="rate1Attrs"
              type="number"
              step="any"
              min="0"
              placeholder="0"
              data-testid="ccc-rate1"
            />
            <p v-if="errors.exchange_rate_1" class="text-xs text-danger">
              {{ errors.exchange_rate_1 }}
            </p>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
              Monto intermedio
            </Label>
            <div
              class="flex h-9 items-center rounded-md border border-b-2 bg-card px-3 font-mono text-[13px] text-t-3"
              data-testid="ccc-middle-amount"
            >
              {{ middleAmount }}
            </div>
          </div>
        </div>

        <!-- Rate 2 + destination amount -->
        <div class="grid grid-cols-3 gap-3">
          <div class="flex flex-col gap-1.5">
            <Label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
              TC consolidado
            </Label>
            <div
              class="flex h-9 items-center rounded-md border border-b-2 bg-card px-3 font-mono text-[13px] text-t-3"
              data-testid="ccc-composite-rate"
            >
              {{ compositeRate !== null ? compositeRate.toFixed(6) : '—' }}
            </div>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label
              for="ccc-rate2"
              class="text-[10px] font-bold uppercase tracking-wider text-t-3"
            >
              TC 2 (intermedia→destino) <span class="text-danger">*</span>
            </Label>
            <Input
              id="ccc-rate2"
              v-model="exchange_rate_2"
              v-bind="rate2Attrs"
              type="number"
              step="any"
              min="0"
              placeholder="0"
              data-testid="ccc-rate2"
            />
            <p v-if="errors.exchange_rate_2" class="text-xs text-danger">
              {{ errors.exchange_rate_2 }}
            </p>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
              Monto destino
            </Label>
            <div
              class="flex h-9 items-center rounded-md border border-b-2 bg-card px-3 font-mono text-[13px] text-t-3"
              data-testid="ccc-destination-amount"
            >
              {{ destinationAmount }}
            </div>
          </div>
        </div>

        <!-- Term + liquidate date -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <Label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
              Plazo <span class="text-danger">*</span>
            </Label>
            <Select v-model="term">
              <SelectTrigger data-testid="ccc-term">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="T0">T0 — Mismo día</SelectItem>
                <SelectItem value="T+1">T+1</SelectItem>
                <SelectItem value="T+2">T+2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex flex-col gap-1.5">
            <Label
              for="ccc-liquidate"
              class="text-[10px] font-bold uppercase tracking-wider text-t-3"
            >
              Fecha liquidación
            </Label>
            <Input
              id="ccc-liquidate"
              v-model="liquidate_date"
              v-bind="liquidateAttrs"
              type="date"
              data-testid="ccc-liquidate"
            />
            <p v-if="errors.liquidate_date" class="text-xs text-danger">
              {{ errors.liquidate_date }}
            </p>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <Label
            for="ccc-notes"
            class="text-[10px] font-bold uppercase tracking-wider text-t-3"
          >
            Notas (aplican a los 3 legs)
          </Label>
          <textarea
            id="ccc-notes"
            v-model="notes"
            v-bind="notesAttrs"
            rows="2"
            class="rounded-md border border-b-2 bg-card px-3 py-2 text-[13px] text-t-2 outline-none focus:border-b-3"
            placeholder="Observaciones internas..."
            data-testid="ccc-notes"
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
            :disabled="!meta.valid || !currenciesAreDistinct || inFlight"
            data-testid="ccc-submit"
          >
            {{ inFlight ? 'Creando...' : 'Crear CCC' }}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
