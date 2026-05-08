<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { useRoute, useRouter } from 'vue-router';
import { ArrowLeft, ShieldCheck, FileText } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Skeleton from '@/components/feedback/Skeleton.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { useCapabilities } from '@/composables/useCapabilities';
import { getClient, listCurrencies } from '@/ops/clients/api';
import AccountCard from '@/ops/clients/AccountCard.vue';
import RecentMovementsTable from '@/ops/clients/RecentMovementsTable.vue';
import WhitelistAccountModal from '@/ops/clients/WhitelistAccountModal.vue';
import GenerateStatementModal from '@/ops/statements/GenerateStatementModal.vue';
import { derivePortalStatus } from '@/ops/clients/portal-status';
import type { Client, ClientWithAccounts } from '@/ops/clients/types';

// ════════════════════════════════════════════════════════════════════
// ClientDetail page — implements ops-clients Requirements 6, 7, 8, 9,
// 10. Type-B detail page with info card + accounts list + recent
// movements (read-only in v1 per Decision 6). The `Create Instruction`
// CTA is intentionally NOT rendered (Decision 7 — hidden, not disabled,
// until the wizard follow-up lands).
// ════════════════════════════════════════════════════════════════════

const route = useRoute();
const router = useRouter();
const { can } = useCapabilities();

const canWhitelistByRole = computed(() => can('clients:whitelist') || can('OPS_ADMIN'));
const canGenerateStatement = computed(() => can('clients:statement') || can('OPS_ADMIN'));

const clientId = computed(() => String(route.params.id));

// ─── Detail query ───────────────────────────────────────────────────
const {
  data,
  isPending,
  isError,
  error,
} = useQuery<ClientWithAccounts, Error>({
  queryKey: computed(() => ['ops', 'clients', clientId.value] as const),
  queryFn: () => getClient(clientId.value),
  retry: false,
});

const client = computed<ClientWithAccounts | null>(() => data.value ?? null);
const isNotFound = computed(
  () => isError.value && error.value?.message?.includes('404'),
);

// ─── Currencies (used by the whitelist modal) ───────────────────────
const { data: currenciesData } = useQuery({
  queryKey: ['ops', 'currencies'],
  queryFn: listCurrencies,
});
const currencies = computed(() => currenciesData.value ?? []);

// ─── Whitelisting CTA gating (Requirement 8) ───────────────────────
const hasCoinagInstruction = computed(() => {
  if (!client.value) return false;
  return client.value.accounts.some((a) =>
    a.instructions.some(
      (i) => i.operations_provider_name?.toUpperCase() === 'COINAG',
    ),
  );
});

const canShowWhitelistCta = computed(
  () => canWhitelistByRole.value && hasCoinagInstruction.value,
);

const whitelistOpen = ref(false);

// ─── Generate Statement (pre-populates the current client) ──────────
const statementOpen = ref(false);
const preselectedClient = computed<Client | null>(() => client.value);
function openStatement(): void {
  statementOpen.value = true;
}

function goBack(): void {
  void router.push('/clients');
}

const portalInfo = computed(() => (client.value ? derivePortalStatus(client.value) : null));
</script>

<template>
  <div class="flex flex-col gap-4 p-6">
    <!-- Back link -->
    <button
      type="button"
      class="inline-flex items-center gap-1.5 self-start text-sm text-t-4 transition-colors hover:text-t-1"
      data-testid="client-detail-back"
      @click="goBack"
    >
      <ArrowLeft class="h-3.5 w-3.5" />
      Volver a Clientes
    </button>

    <!-- L1 header CTA row (anchored to the back-link area, before the main sections) -->
    <div v-if="!isPending && !isError && client" class="-mt-2 flex justify-end">
      <Button
        v-if="canGenerateStatement"
        variant="secondary"
        data-testid="client-detail-statement-cta"
        @click="openStatement"
      >
        <FileText class="h-3.5 w-3.5" />
        Generar Statement
      </Button>
    </div>

    <!-- Loading -->
    <template v-if="isPending">
      <Skeleton class="h-24 w-full" />
      <Skeleton class="h-40 w-full" />
      <Skeleton class="h-32 w-full" />
    </template>

    <!-- Not Found -->
    <EmptyState
      v-else-if="isNotFound"
      title="Cliente no encontrado"
      description="El cliente solicitado no existe o fue eliminado"
      data-testid="client-detail-not-found"
    />

    <!-- Generic error -->
    <EmptyState
      v-else-if="isError"
      title="No se pudo cargar el cliente"
      description="Reintentá en unos segundos"
    />

    <!-- Content -->
    <template v-else-if="client">
      <!-- Info card -->
      <div class="rounded-lg border border-b-2 bg-card p-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h1 class="mb-2.5 bg-clip-text text-lg font-bold text-t-1">
              {{ client.name || 'Cliente sin nombre' }}
            </h1>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
              <div class="flex items-center gap-1.5">
                <span class="text-t-4">CUIT/CUIL</span>
                <span class="rounded bg-card-2 px-1.5 py-0.5 font-mono text-t-2">
                  {{ client.tax_number || '—' }}
                </span>
              </div>
              <span class="h-3 w-px bg-b-1" aria-hidden="true" />
              <div class="flex items-center gap-1.5">
                <span class="text-t-4">Legajo</span>
                <span class="rounded bg-card-2 px-1.5 py-0.5 font-mono text-t-2">
                  {{ client.docket || '—' }}
                </span>
              </div>
              <template v-if="client.email">
                <span class="h-3 w-px bg-b-1" aria-hidden="true" />
                <span class="text-t-3">{{ client.email }}</span>
              </template>
            </div>
          </div>
          <div class="flex shrink-0 items-center gap-2 text-xs">
            <Badge :variant="client.is_active ? 'success' : 'danger'">
              {{ client.is_active ? 'Activo' : 'Inactivo' }}
            </Badge>
            <Badge v-if="portalInfo" :variant="portalInfo.tone">
              {{ portalInfo.label }}
            </Badge>
          </div>
        </div>
      </div>

      <!-- Accounts section -->
      <div class="flex flex-col gap-2.5">
        <div class="flex items-center justify-between">
          <h3 class="text-base font-semibold text-t-1">Cuentas e instrucciones</h3>
          <Button
            v-if="canShowWhitelistCta"
            variant="primary"
            data-testid="whitelist-cta"
            @click="whitelistOpen = true"
          >
            <ShieldCheck class="h-3.5 w-3.5" />
            Habilitar cuenta
          </Button>
        </div>

        <div
          v-if="client.accounts.length === 0"
          class="rounded-lg border border-b-1 bg-card p-10 text-center text-sm text-t-4"
        >
          No hay cuentas asociadas a este cliente.
        </div>
        <div v-else class="flex flex-col gap-2">
          <AccountCard
            v-for="account in client.accounts"
            :key="account.id"
            :account="account"
          />
        </div>
      </div>

      <!-- Recent movements (read-only — Decision 6) -->
      <div v-if="client.movements.length > 0" class="flex flex-col gap-2.5">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-semibold text-t-1">Movimientos recientes</h3>
          <Badge variant="neutral">{{ client.movements.length }}</Badge>
        </div>
        <RecentMovementsTable :movements="client.movements" />
      </div>

      <!-- Whitelist modal -->
      <WhitelistAccountModal
        v-model:open="whitelistOpen"
        :client-id="client.id"
        :currencies="currencies"
      />

      <!-- Generate Statement modal (pre-populates the current client) -->
      <GenerateStatementModal
        v-model:open="statementOpen"
        :preselected-client="preselectedClient"
      />
    </template>
  </div>
</template>
