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
  listClients,
  validateCvu as validateCvuApi,
  whitelistAccount,
  type WhitelistResult,
} from './api';
import ClientFilters from './ClientFilters.vue';
import type {
  Client,
  ClientId,
  CurrencyEntry,
  ValidatedCvuAccount,
  WhitelistModalStep,
} from './types';

// ════════════════════════════════════════════════════════════════════
// WhitelistAccountModal — implements Requirement 8.
//
// One <Dialog> with an internal state machine. Two flow shapes:
//
//   - With clientId pre-bound (canonical ops-clients flow):
//       'input' → 'review' → POST → success | inline error
//
//   - Without clientId pre-bound (ops-psp Habilitar cuenta flow per
//     `add-ops-psp` Decision 5):
//       'pick-client' → 'input' → 'review' → POST → success | inline error
//
// The transition out of `'pick-client'` is "operator picked a client
// from the autocomplete"; the modal then advances to `'input'` and
// the rest of the flow is identical.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  /**
   * Pre-bound client id. When `null`, the modal mounts with a
   * `'pick-client'` step prefix (used by `ops-psp`).
   */
  clientId: ClientId | null;
  currencies: CurrencyEntry[];
}>();

const emit = defineEmits<{
  /**
   * Emitted after a successful whitelist. Consumers (e.g. `ops-psp`)
   * use this to invalidate their own query caches in addition to the
   * `['ops', 'clients', clientId]` invalidation the modal does
   * internally. Component-API extension per `add-ops-psp` Decision 5.
   */
  created: [clientId: ClientId];
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

// ─── Client picker (only when clientId prop is null) ────────────────
const pickedClient = ref<Client | null>(null);
const clientSuggestions = ref<Client[]>([]);
const isSearchingClients = ref(false);

const effectiveClientId = computed<ClientId | null>(
  () => props.clientId ?? pickedClient.value?.id ?? null,
);

async function runClientSearch(query: string): Promise<void> {
  isSearchingClients.value = true;
  try {
    const params: Parameters<typeof listClients>[0] = { page: 1, pageSize: 50 };
    if (query) params.name = query;
    const res = await listClients(params);
    clientSuggestions.value = res.clients;
  } catch {
    clientSuggestions.value = [];
  } finally {
    isSearchingClients.value = false;
  }
}

function onClientPicked(client: Client): void {
  pickedClient.value = client;
  step.value = 'input';
}

function changeClient(): void {
  pickedClient.value = null;
  step.value = 'pick-client';
}

// ─── Reset on each open + default currency = ARS ────────────────────
watch(open, (isOpen) => {
  if (!isOpen) return;
  // Step depends on whether a clientId is pre-bound.
  step.value = props.clientId ? 'input' : 'pick-client';
  pickedClient.value = null;
  clientSuggestions.value = [];
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
  if (!canConfirm.value || !validated.value || !effectiveClientId.value) return;
  isConfirming.value = true;
  inlineError.value = null;
  try {
    const result = await whitelistAccount(effectiveClientId.value, {
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
    if (effectiveClientId.value) {
      void queryClient.invalidateQueries({
        queryKey: ['ops', 'clients', effectiveClientId.value],
      });
      emit('created', effectiveClientId.value);
    }
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

      <!-- Step: pick-client (only when clientId prop is null) ──── -->
      <div
        v-if="step === 'pick-client'"
        class="flex flex-col gap-3"
        data-testid="whitelist-step-pick-client"
      >
        <Label>Cliente</Label>
        <ClientFilters
          mode="picker"
          :model-value="''"
          :suggestions="clientSuggestions"
          :is-searching="isSearchingClients"
          :has-active-filters="false"
          placeholder="Buscar cliente por nombre o legajo…"
          @search="runClientSearch"
          @pick="onClientPicked"
        />
        <p class="text-xs text-t-4">
          Una vez seleccionado el cliente, podrás validar el CVU/CBU para habilitarle una cuenta.
        </p>
      </div>

      <!-- Step: input ─────────────────────────────────────────────── -->
      <div v-else-if="step === 'input'" class="flex flex-col gap-3" data-testid="whitelist-step-input">
        <!-- Pre-bound client chip when picker prefix was used -->
        <div
          v-if="!props.clientId && pickedClient"
          class="flex items-center justify-between rounded-lg border border-b-1 bg-card-2 p-2.5"
          data-testid="whitelist-client-chip"
        >
          <div class="text-xs">
            <div class="text-t-4">Cliente</div>
            <div class="text-t-1">
              {{ pickedClient.name || 'Sin nombre' }}
              <span v-if="pickedClient.tax_number" class="text-t-4">· {{ pickedClient.tax_number }}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" data-testid="whitelist-change-client" @click="changeClient">
            Cambiar
          </Button>
        </div>
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
        <template v-if="step === 'pick-client'">
          <Button variant="ghost" @click="close">Cancelar</Button>
        </template>
        <template v-else-if="step === 'input'">
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
