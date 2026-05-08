<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';
import { CheckCircle2, ArrowLeft, Loader2 } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiError } from '@/types/api';
import {
  validateCvu as validateCvuApi,
  whitelistAccount,
  type WhitelistResult,
} from './api';
import type {
  ClientId,
  CurrencyEntry,
  ValidatedCvuAccount,
  WhitelistModalStep,
} from './types';

// ════════════════════════════════════════════════════════════════════
// WhitelistAccountModal — implements Requirement 8.
//
// One <Dialog> with an internal `step: 'input' | 'review'` state machine
// per design.md Decision 3. The transition is `input → review` after a
// successful validateCvu(); on `Confirmar` failure with the localised
// error codes, the modal stays at `'review'` showing the inline message.
// On success, the `vue-query` cache for `['clients', clientId]` is
// invalidated so the new account renders in the accounts list.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  clientId: ClientId;
  currencies: CurrencyEntry[];
}>();

const open = defineModel<boolean>('open', { required: true });

const queryClient = useQueryClient();

// ─── State machine ──────────────────────────────────────────────────
const step = ref<WhitelistModalStep>('input');
const cvuInput = ref('');
const currencyId = ref('');
const validated = ref<ValidatedCvuAccount | null>(null);
const isValidating = ref(false);
const isConfirming = ref(false);
const inlineError = ref<string | null>(null);

// ─── Reset on each open + default currency = ARS ────────────────────
watch(open, (isOpen) => {
  if (!isOpen) return;
  step.value = 'input';
  cvuInput.value = '';
  validated.value = null;
  isValidating.value = false;
  isConfirming.value = false;
  inlineError.value = null;
  const ars = props.currencies.find((c) => c.code?.toUpperCase() === 'ARS');
  currencyId.value = ars?.id ?? props.currencies[0]?.id ?? '';
});

const canValidate = computed(() => cvuInput.value.length >= 10 && !isValidating.value);
const canConfirm = computed(() => Boolean(validated.value && currencyId.value && !isConfirming.value));

async function onValidate(): Promise<void> {
  if (!canValidate.value) return;
  isValidating.value = true;
  inlineError.value = null;
  try {
    validated.value = await validateCvuApi(cvuInput.value);
    step.value = 'review';
  } catch (e) {
    validated.value = null;
    inlineError.value = mapValidationError(e);
  } finally {
    isValidating.value = false;
  }
}

function backToInput(): void {
  step.value = 'input';
  inlineError.value = null;
}

async function onConfirm(): Promise<void> {
  if (!canConfirm.value || !validated.value) return;
  isConfirming.value = true;
  inlineError.value = null;
  try {
    const result = await whitelistAccount(props.clientId, {
      name: validated.value.holder,
      tax_number: validated.value.cuit,
      account_number: validated.value.account,
      currency_id: currencyId.value,
    });
    handleResult(result);
  } finally {
    isConfirming.value = false;
  }
}

function handleResult(result: WhitelistResult): void {
  if (result.status === 'ok') {
    toast.success('Cuenta habilitada correctamente');
    void queryClient.invalidateQueries({ queryKey: ['ops', 'clients', props.clientId] });
    open.value = false;
    return;
  }
  if (result.status === 'already_whitelisted') {
    inlineError.value = 'Esta cuenta ya se encuentra habilitada para este cliente';
    return;
  }
  if (result.status === 'exist_internal_route') {
    inlineError.value = 'No se puede habilitar una cuenta interna';
    return;
  }
  // status === 'failed'
  inlineError.value = 'Error al habilitar la cuenta';
  toast.error(result.message || 'Error al habilitar la cuenta');
}

function mapValidationError(e: unknown): string {
  if (e instanceof ApiError && e.status >= 500) {
    return 'Error del proveedor PSP. Reintentá en unos segundos.';
  }
  return 'No se puede habilitar una cuenta interna o inexistente.';
}

function close(): void {
  if (isValidating.value || isConfirming.value) return;
  open.value = false;
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="sm:max-w-lg"
      data-testid="whitelist-modal"
      @open-auto-focus="(e: Event) => e.preventDefault()"
    >
      <DialogHeader>
        <DialogTitle>Habilitar cuenta</DialogTitle>
        <DialogDescription>
          Validá el CVU/CBU contra el proveedor PSP, revisá los datos y confirmá la habilitación.
        </DialogDescription>
      </DialogHeader>

      <!-- Step: input ─────────────────────────────────────────────── -->
      <div v-if="step === 'input'" class="flex flex-col gap-3" data-testid="whitelist-step-input">
        <div class="flex flex-col gap-1.5">
          <Label for="whitelist-cvu">CVU / CBU</Label>
          <Input
            id="whitelist-cvu"
            v-model="cvuInput"
            placeholder="22 dígitos"
            autocomplete="off"
            data-testid="whitelist-cvu-input"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <Label for="whitelist-currency">Moneda</Label>
          <Select v-model="currencyId">
            <SelectTrigger id="whitelist-currency" data-testid="whitelist-currency-trigger">
              <SelectValue placeholder="Seleccioná una moneda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="c in props.currencies"
                :key="c.id"
                :value="c.id"
              >
                {{ c.code }} · {{ c.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p v-if="inlineError" class="text-xs text-danger" data-testid="whitelist-inline-error">
          {{ inlineError }}
        </p>
      </div>

      <!-- Step: review ────────────────────────────────────────────── -->
      <div v-else class="flex flex-col gap-3" data-testid="whitelist-step-review">
        <div class="flex items-start gap-2 rounded-lg border border-b-2 bg-success-bg p-3 text-success">
          <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0" />
          <p class="text-xs">
            CVU/CBU validado. Revisá los datos antes de confirmar.
          </p>
        </div>
        <dl class="rounded-lg border border-b-1 bg-card-2 p-3 text-xs">
          <div v-if="validated" class="grid grid-cols-[120px_1fr] gap-y-1.5">
            <dt class="text-t-4">Tipo</dt>
            <dd class="font-mono text-t-2">{{ validated.account_type }}</dd>
            <dt class="text-t-4">Cuenta</dt>
            <dd class="font-mono text-t-2">{{ validated.account }}</dd>
            <dt class="text-t-4">Alias</dt>
            <dd class="font-mono text-t-2">{{ validated.alias || '—' }}</dd>
            <dt class="text-t-4">CUIT</dt>
            <dd class="font-mono text-t-2">{{ validated.cuit }}</dd>
            <dt class="text-t-4">Titular</dt>
            <dd class="text-t-2">{{ validated.holder }}</dd>
            <template v-if="validated.holders.length > 1">
              <dt class="text-t-4">Cotitulares</dt>
              <dd class="text-t-2">{{ validated.holders.slice(1).join(', ') }}</dd>
            </template>
            <dt class="text-t-4">Moneda</dt>
            <dd class="font-mono text-t-2">
              {{ props.currencies.find((c) => c.id === currencyId)?.code ?? currencyId }}
            </dd>
          </div>
        </dl>
        <p v-if="inlineError" class="text-xs text-danger" data-testid="whitelist-inline-error">
          {{ inlineError }}
        </p>
      </div>

      <DialogFooter>
        <template v-if="step === 'input'">
          <Button variant="ghost" :disabled="isValidating" @click="close">Cancelar</Button>
          <Button
            variant="primary"
            :disabled="!canValidate"
            data-testid="whitelist-validate"
            @click="onValidate"
          >
            <Loader2 v-if="isValidating" class="h-3.5 w-3.5 animate-spin" />
            Validar
          </Button>
        </template>
        <template v-else>
          <Button variant="ghost" :disabled="isConfirming" @click="backToInput">
            <ArrowLeft class="h-3.5 w-3.5" />
            Volver
          </Button>
          <Button
            variant="primary"
            :disabled="!canConfirm"
            data-testid="whitelist-confirm"
            @click="onConfirm"
          >
            <Loader2 v-if="isConfirming" class="h-3.5 w-3.5 animate-spin" />
            Confirmar
          </Button>
        </template>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
