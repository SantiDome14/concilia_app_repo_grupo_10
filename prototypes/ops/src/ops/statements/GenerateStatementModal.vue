<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { Edit2, FileText, Loader2 } from 'lucide-vue-next';
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
import ClientFilters from '@/ops/clients/ClientFilters.vue';
import { listClients, getClient } from '@/api/modules/clients';
import type { Account, Client } from '@/ops/clients/types';
import StatementAccountStep from './StatementAccountStep.vue';
import StatementDateStep from './StatementDateStep.vue';
import StatementPreviewCard from './StatementPreviewCard.vue';
import { requestStatement, toApiPayload } from '@/api/modules/statements';
import { resolveQuickFilter, findChipKeyForRange } from './quick-filters';
import { loadRange, saveRange } from './range-storage';
import type { DateRange, StatementQuickFilterKey } from './types';

// ════════════════════════════════════════════════════════════════════
// GenerateStatementModal — implements ops-statements Requirements
// 1, 2, 5, 7, 8 (Requirements 3 / 4 are owned by the step components).
//
// State machine: progressive 3-step layout inside one Dialog (per
// Requirement 2). Steps gate by selection presence.
//
// Sophistications (Decision 7):
//   - 7a Smart single-account default: implemented in `onAccountsLoaded`.
//   - 7b localStorage persistence: implemented in `loadInitialRange()`
//       + `onRangePicked()`.
//   - 7c Preview card: rendered when all three selections are set.
//   - 7d Cancel during submit: AbortController in `onSubmit()`.
//   - 7e Re-open success toast: action button in the success toast.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  /** Pre-populated client (when opened from the detail page header). */
  preselectedClient?: Client | null;
}>();

const open = defineModel<boolean>('open', { required: true });

// ─── Selections ─────────────────────────────────────────────────────
const selectedClient = ref<Client | null>(null);
const selectedAccount = ref<Account | null>(null);
const dateRange = ref<DateRange | null>(null);
const activeChipKey = ref<StatementQuickFilterKey | null>(null);

// ─── Submit lifecycle ──────────────────────────────────────────────
const isSubmitting = ref(false);
const cancelNotice = ref(false);
let abortController: AbortController | null = null;

// ─── Client picker (autocomplete) ───────────────────────────────────
const clientSuggestions = ref<Client[]>([]);
const isSearchingClients = ref(false);

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
  selectedClient.value = client;
  selectedAccount.value = null;
  // Don't reset dateRange — preserve across client changes per Requirement 2 scenario "Backtracking does NOT clear deeper-step selections".
}

function onClientChange(): void {
  selectedClient.value = null;
  selectedAccount.value = null;
}

// ─── Accounts hydration (vue-query, scoped to the picked client) ───
const clientDetailQuery = useQuery({
  queryKey: computed(() => ['ops', 'clients', selectedClient.value?.id ?? '__none__'] as const),
  queryFn: () => getClient(selectedClient.value!.id),
  enabled: computed(() => Boolean(selectedClient.value?.id)),
});

const accounts = computed<Account[] | null>(
  () => clientDetailQuery.data.value?.accounts ?? null,
);
const isLoadingAccounts = computed(
  () => Boolean(selectedClient.value && clientDetailQuery.isPending.value),
);

// 7a — Smart single-account default.
watch(accounts, (next) => {
  if (next && next.length === 1 && !selectedAccount.value) {
    selectedAccount.value = next[0]!;
  }
});

function onAccountPicked(account: Account): void {
  selectedAccount.value = account;
}

function onAccountChange(): void {
  selectedAccount.value = null;
}

// ─── Date range (chips + calendar + persistence) ────────────────────
function onChipPicked(key: StatementQuickFilterKey): void {
  const range = resolveQuickFilter(key);
  dateRange.value = range;
  activeChipKey.value = key;
}

function onRangePicked(range: DateRange | null): void {
  dateRange.value = range;
  if (range) {
    activeChipKey.value = findChipKeyForRange(range);
  } else {
    activeChipKey.value = null;
  }
}

// ─── Open lifecycle ────────────────────────────────────────────────
watch(open, (isOpen) => {
  if (!isOpen) {
    // Reset everything on close so the next opening starts fresh
    // (Requirement 2 scenario: "Closing the modal without submit
    // discards all selections"). EXCEPTION: dateRange persistence is
    // NOT reset to null here — it's reloaded on next open.
    selectedClient.value = null;
    selectedAccount.value = null;
    dateRange.value = null;
    activeChipKey.value = null;
    cancelNotice.value = false;
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    isSubmitting.value = false;
    return;
  }
  // Pre-populate the client if opened from the detail page header.
  if (props.preselectedClient) {
    selectedClient.value = props.preselectedClient;
  }
  // 7b — Restore the last-chosen range (chip or literal) from localStorage.
  const loaded = loadRange();
  if (loaded) {
    dateRange.value = loaded.range;
    activeChipKey.value = loaded.chipKey;
  }
});

// ─── Step computations ─────────────────────────────────────────────
const showAccountStep = computed(() => Boolean(selectedClient.value));
const showDateStep = computed(() => Boolean(selectedAccount.value));
const showPreview = computed(
  () => Boolean(selectedClient.value && selectedAccount.value && dateRange.value),
);
const canSubmit = computed(() => showPreview.value && !isSubmitting.value);

// ─── Submit + cancel ────────────────────────────────────────────────
async function onSubmit(): Promise<void> {
  if (!canSubmit.value || !selectedClient.value || !selectedAccount.value || !dateRange.value)
    return;
  cancelNotice.value = false;
  isSubmitting.value = true;
  abortController = new AbortController();
  const payload = toApiPayload(
    selectedClient.value.id,
    selectedAccount.value.id,
    dateRange.value,
  );
  const result = await requestStatement(payload, abortController.signal);
  isSubmitting.value = false;
  abortController = null;

  if (result.status === 'ok') {
    const url = result.url;
    const clientName = selectedClient.value.name ?? 'el cliente';
    // 7b — Persist the range that just succeeded.
    saveRange(dateRange.value, activeChipKey.value);
    // Open the URL + show the toast with re-open action (7e).
    window.open(url, '_blank');
    toast.success(`Statement generado exitosamente para ${clientName}`, {
      duration: 10_000,
      action: {
        label: 'Volver a abrir',
        onClick: () => window.open(url, '_blank'),
      },
    });
    open.value = false;
    return;
  }
  if (result.status === 'aborted') {
    cancelNotice.value = true;
    setTimeout(() => {
      cancelNotice.value = false;
    }, 3000);
    return;
  }
  if (result.status === 'business-error') {
    toast.error(result.message);
    return;
  }
  // status === 'failed'
  toast.error(result.message || 'Error al generar el statement');
}

function onCancel(): void {
  if (!isSubmitting.value || !abortController) return;
  abortController.abort();
}

function onClose(): void {
  if (isSubmitting.value) return;
  open.value = false;
}
</script>

<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="sm:max-w-2xl"
      data-testid="statement-modal"
      @open-auto-focus="(e: Event) => e.preventDefault()"
    >
      <DialogHeader>
        <DialogTitle>Generar Statement</DialogTitle>
        <DialogDescription>
          Seleccioná un cliente, una cuenta y el rango de fechas. El statement se abrirá en una nueva pestaña.
        </DialogDescription>
      </DialogHeader>

      <div class="flex flex-col gap-4">
        <!-- Step 1 — Cliente -->
        <section class="flex flex-col gap-1.5" data-testid="statement-client-step">
          <label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
            Cliente
          </label>
          <div
            v-if="selectedClient"
            class="flex items-center justify-between rounded-lg border border-b-2 bg-card p-3"
            data-testid="statement-client-chip"
          >
            <div>
              <div class="text-sm font-semibold text-t-1">
                {{ selectedClient.name || 'Cliente sin nombre' }}
              </div>
              <div class="text-xs text-t-4">
                {{ selectedClient.tax_number || '—' }}
                <span v-if="selectedClient.email"> · {{ selectedClient.email }}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              data-testid="statement-client-change"
              @click="onClientChange"
            >
              <Edit2 class="h-3.5 w-3.5" />
              Cambiar
            </Button>
          </div>
          <ClientFilters
            v-else
            mode="picker"
            :model-value="''"
            :suggestions="clientSuggestions"
            :is-searching="isSearchingClients"
            :has-active-filters="false"
            placeholder="Buscar por nombre o legajo…"
            @search="runClientSearch"
            @pick="onClientPicked"
          />
        </section>

        <!-- Step 2 — Cuenta -->
        <section
          v-if="showAccountStep"
          class="flex flex-col gap-1.5"
          data-testid="statement-account-step"
        >
          <label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
            Cuenta
          </label>
          <StatementAccountStep
            :accounts="accounts"
            :is-loading="isLoadingAccounts"
            :selected="selectedAccount"
            @pick="onAccountPicked"
            @reset="onAccountChange"
          />
        </section>

        <!-- Step 3 — Rango -->
        <section
          v-if="showDateStep"
          class="flex flex-col gap-1.5"
          data-testid="statement-date-step"
        >
          <label class="text-[10px] font-bold uppercase tracking-wider text-t-3">
            Período
          </label>
          <StatementDateStep
            :range="dateRange"
            :active-chip-key="activeChipKey"
            @pick-chip="onChipPicked"
            @pick-range="onRangePicked"
          />
        </section>

        <!-- 8 — Preview card -->
        <StatementPreviewCard
          v-if="showPreview && selectedClient && selectedAccount && dateRange"
          :client="selectedClient"
          :account="selectedAccount"
          :range="dateRange"
        />

        <!-- 7d — Cancel notice -->
        <p
          v-if="cancelNotice"
          class="text-xs text-warning"
          data-testid="statement-cancel-notice"
        >
          Generación cancelada. Volvé a hacer click en Generar para reintentar.
        </p>
      </div>

      <DialogFooter>
        <Button variant="ghost" :disabled="isSubmitting" @click="onClose">
          Cerrar
        </Button>
        <!-- Generar / Cancelar swap (Decision 7d) -->
        <Button
          v-if="!isSubmitting"
          variant="primary"
          :disabled="!canSubmit"
          data-testid="statement-submit"
          @click="onSubmit"
        >
          <FileText class="h-3.5 w-3.5" />
          Generar
        </Button>
        <Button
          v-else
          variant="danger"
          data-testid="statement-cancel"
          @click="onCancel"
        >
          <Loader2 class="h-3.5 w-3.5 animate-spin" />
          Cancelar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
