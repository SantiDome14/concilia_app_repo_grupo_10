<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { useRoute, useRouter } from 'vue-router';
import { ShieldCheck } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { useCapabilities } from '@/composables/useCapabilities';
import {
  getCoinagHealth,
  getReconciliation,
  listAccounts,
  listMovements,
  listSponsorBalances,
} from '@/ops/psp/api';
import { activeSponsors } from '@/ops/psp/sponsor-catalog';
import SponsorBalanceCard from '@/ops/psp/SponsorBalanceCard.vue';
import ReconciliationBanner from '@/ops/psp/ReconciliationBanner.vue';
import CoinagHealthIndicator from '@/ops/psp/CoinagHealthIndicator.vue';
import MovementsFilters from '@/ops/psp/MovementsFilters.vue';
import MovementsTable from '@/ops/psp/MovementsTable.vue';
import AccountsTable from '@/ops/psp/AccountsTable.vue';
import SwiftTransactionsDrawer from '@/ops/psp/SwiftTransactionsDrawer.vue';
import WhitelistAccountModal from '@/ops/clients/WhitelistAccountModal.vue';
import { listCurrencies } from '@/ops/clients/api';
import type { PspAccount, PspTab, SponsorCode } from '@/ops/psp/types';

// ════════════════════════════════════════════════════════════════════
// Psp page — implements ops-psp Requirements 1, 2, 3, 4, 5, 6, 7, 8,
// 9, 10. Type-A page with 3 internal tabs over the Banco Sponsor
// abstraction. v1 read-only at the data-mutation level (per
// design.md Decision 3); the only mutation surface is the reused
// <WhitelistAccountModal> from ops-clients.
// ════════════════════════════════════════════════════════════════════

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const { can } = useCapabilities();

const canRead = computed(() => can('psp:read') || can('OPS_ADMIN'));
const canWhitelist = computed(() => can('psp:whitelist') || can('OPS_ADMIN'));

// ─── Tab state with URL + localStorage persistence (Requirement 1) ──
const VALID_TABS: PspTab[] = ['disponibilidad', 'movimientos', 'cuentas'];
const LAST_TAB_KEY = 'ops:psp:lastTab';

function readSavedTab(): PspTab | null {
  try {
    const v = window.localStorage.getItem(LAST_TAB_KEY);
    return VALID_TABS.includes(v as PspTab) ? (v as PspTab) : null;
  } catch {
    return null;
  }
}

function writeSavedTab(tab: PspTab): void {
  try {
    window.localStorage.setItem(LAST_TAB_KEY, tab);
  } catch {
    // ignore
  }
}

const initialTab: PspTab = (() => {
  const fromQuery = route.query.tab;
  if (typeof fromQuery === 'string' && VALID_TABS.includes(fromQuery as PspTab)) {
    return fromQuery as PspTab;
  }
  return readSavedTab() ?? 'disponibilidad';
})();

const activeTab = ref<PspTab>(initialTab);

// ─── Cross-tab sponsor filter + per-tab query state ─────────────────
const sponsorFilter = ref<SponsorCode | null>(
  typeof route.query.sponsor === 'string' ? route.query.sponsor : null,
);

// Movements filter state
const movSearch = ref<string>(typeof route.query.search === 'string' ? route.query.search : '');
const movType = ref<string>(typeof route.query.type === 'string' ? route.query.type : '');
const movStatus = ref<string>(typeof route.query.status === 'string' ? route.query.status : '');
const movOrigin = ref<string>(typeof route.query.origin === 'string' ? route.query.origin : '');
const movPage = ref<number>(Number(route.query.page) || 1);
const movPageSize = ref<number>(25);

// Accounts filter state (sponsor + search shared with movements via cross-tab filter)
const accSearch = ref<string>('');
const accPage = ref<number>(1);
const accPageSize = ref<number>(25);

// ─── URL sync ───────────────────────────────────────────────────────
watch(
  [activeTab, sponsorFilter, movSearch, movType, movStatus, movOrigin, movPage],
  ([tab, sponsor, search, type, status, origin, page]) => {
    const next: Record<string, string> = { tab };
    if (sponsor) next.sponsor = sponsor;
    if (tab === 'movimientos') {
      if (search) next.search = search;
      if (type) next.type = type;
      if (status) next.status = status;
      if (origin) next.origin = origin;
      if (page > 1) next.page = String(page);
    }
    // Preserve account drill-down deep-link if currently open.
    if (typeof route.query.account === 'string') next.account = route.query.account;
    void router.replace({ query: next });
    writeSavedTab(tab);
  },
);

function setTab(tab: PspTab): void {
  activeTab.value = tab;
}

// ─── Coinag health (Requirement 8 — polled every 60 s) ──────────────
const healthQuery = useQuery({
  queryKey: ['ops', 'psp', 'health'],
  queryFn: getCoinagHealth,
  refetchInterval: 60_000,
  enabled: canRead,
});

const consecutiveHealthFailures = ref(0);

watch(healthQuery.data, (h) => {
  if (!h) return;
  if (h.status === 'down') {
    consecutiveHealthFailures.value += 1;
  } else {
    consecutiveHealthFailures.value = 0;
  }
});

const isHealthStale = computed(() => Boolean(healthQuery.isError.value));

// ─── Reconciliation snapshot (Requirement 3) ────────────────────────
const reconciliationQuery = useQuery({
  queryKey: ['ops', 'psp', 'reconciliation'],
  queryFn: getReconciliation,
  refetchInterval: 60_000,
  enabled: canRead,
});

const mismatches = computed(() => reconciliationQuery.data.value?.mismatches ?? []);

// ─── Sponsor balances (Requirement 4 — auto-refresh 60 s) ───────────
const balancesQuery = useQuery({
  queryKey: ['ops', 'psp', 'sponsor-balances'],
  queryFn: listSponsorBalances,
  refetchInterval: 60_000,
  enabled: canRead,
});

const balances = computed(() => balancesQuery.data.value ?? []);

function balanceForSponsor(code: SponsorCode) {
  return balances.value.find((b) => b.sponsor === code) ?? null;
}

// ─── Movements query (Requirement 5) ────────────────────────────────
const movQueryParams = computed(() => ({
  ...(sponsorFilter.value ? { sponsor: sponsorFilter.value } : {}),
  ...(movSearch.value ? { search: movSearch.value } : {}),
  ...(movType.value ? { type: movType.value } : {}),
  ...(movStatus.value ? { status: movStatus.value } : {}),
  ...(movOrigin.value ? { origin: movOrigin.value } : {}),
  page: movPage.value,
  pageSize: movPageSize.value,
}));

const movementsQuery = useQuery({
  queryKey: computed(() => ['ops', 'psp', 'movements', movQueryParams.value] as const),
  queryFn: () => listMovements(movQueryParams.value),
  enabled: computed(() => canRead.value && activeTab.value === 'movimientos'),
});

const movements = computed(() => movementsQuery.data.value?.data ?? []);
const movementsTotal = computed(() => movementsQuery.data.value?.total ?? 0);

const hasActiveMovementsFilters = computed(
  () =>
    Boolean(sponsorFilter.value) ||
    Boolean(movSearch.value) ||
    Boolean(movType.value) ||
    Boolean(movStatus.value) ||
    Boolean(movOrigin.value),
);

// Derive per-sponsor counts from the current movements view (best-effort UI signal).
const movementsCountsBySponsor = computed<Record<SponsorCode, number>>(() => {
  const counts: Record<SponsorCode, number> = {};
  for (const m of movements.value) {
    if (!m.sponsor) continue;
    counts[m.sponsor] = (counts[m.sponsor] ?? 0) + 1;
  }
  return counts;
});

// ─── Accounts query (Requirement 6) ─────────────────────────────────
const accQueryParams = computed(() => ({
  ...(sponsorFilter.value ? { sponsor: sponsorFilter.value } : {}),
  ...(accSearch.value ? { search: accSearch.value } : {}),
  page: accPage.value,
  pageSize: accPageSize.value,
}));

const accountsQuery = useQuery({
  queryKey: computed(() => ['ops', 'psp', 'accounts', accQueryParams.value] as const),
  queryFn: () => listAccounts(accQueryParams.value),
  enabled: computed(() => canRead.value && activeTab.value === 'cuentas'),
});

const accounts = computed(() => accountsQuery.data.value?.data ?? []);

const hasActiveAccountsFilters = computed(
  () => Boolean(sponsorFilter.value) || Boolean(accSearch.value),
);

// ─── Swift drawer (Requirement 6) ───────────────────────────────────
const drawerOpen = ref(false);
const drawerAccount = ref<PspAccount | null>(null);

function openDrawer(account: PspAccount): void {
  drawerAccount.value = account;
  drawerOpen.value = true;
  void router.replace({ query: { ...route.query, account: account.id } });
}

function onDrawerOpenChange(value: boolean): void {
  drawerOpen.value = value;
  if (!value) {
    const next = { ...route.query };
    delete next.account;
    void router.replace({ query: next });
    drawerAccount.value = null;
  }
}

// Auto-open the drawer from a deep-link `?account=` after the accounts list loads.
watch(
  () => [accounts.value, route.query.account] as const,
  ([list, accountId]) => {
    if (typeof accountId !== 'string' || !accountId) return;
    if (drawerOpen.value) return;
    const match = list.find((a) => a.id === accountId);
    if (match) {
      drawerAccount.value = match;
      drawerOpen.value = true;
    }
  },
  { immediate: true },
);

// ─── Whitelist modal (Requirement 7 — REUSE from ops-clients) ───────
const whitelistOpen = ref(false);
function openWhitelist(): void {
  whitelistOpen.value = true;
}

function onWhitelistCreated(): void {
  void queryClient.invalidateQueries({ queryKey: ['ops', 'psp', 'accounts'] });
  void queryClient.invalidateQueries({ queryKey: ['ops', 'psp', 'sponsor-balances'] });
}

// Currencies needed by the whitelist modal.
const currenciesQuery = useQuery({
  queryKey: ['ops', 'currencies'],
  queryFn: listCurrencies,
  enabled: canRead,
});
const currencies = computed(() => currenciesQuery.data.value ?? []);

// Filter option lists for Movimientos (sourced from the current view).
const typeOptions = computed(() =>
  Array.from(new Set(movements.value.map((m) => m.type).filter(Boolean))).sort(),
);
const statusOptions = computed(() =>
  Array.from(new Set(movements.value.map((m) => m.status).filter(Boolean))).sort(),
);
const originOptions = computed(() => ['MANUAL', 'SWIFT', 'AUTO']); // placeholder while the backend confirms

function clearMovementsFilters(): void {
  sponsorFilter.value = null;
  movSearch.value = '';
  movType.value = '';
  movStatus.value = '';
  movOrigin.value = '';
  movPage.value = 1;
}

function clearAccountsFilters(): void {
  sponsorFilter.value = null;
  accSearch.value = '';
  accPage.value = 1;
}

const TAB_LABELS: Record<PspTab, string> = {
  disponibilidad: 'Disponibilidad',
  movimientos: 'Movimientos',
  cuentas: 'Cuentas',
};
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <!-- L1 page header -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-t-1">PSP</h1>
        <p class="text-xs text-t-4">
          Disponibilidad, movimientos y cuentas operativas por banco sponsor.
        </p>
      </div>
      <CoinagHealthIndicator
        :health="healthQuery.data.value ?? null"
        :is-stale="isHealthStale"
      />
    </div>

    <!-- Reconciliation banner area -->
    <ReconciliationBanner :mismatches="mismatches" />

    <!-- Tab indicator -->
    <div
      class="flex items-center gap-1 border-b border-b-1"
      role="tablist"
      data-testid="psp-tabs"
    >
      <button
        v-for="tab in (['disponibilidad', 'movimientos', 'cuentas'] as PspTab[])"
        :key="tab"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab"
        :class="
          cn(
            '-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
            activeTab === tab
              ? 'border-brand text-t-1'
              : 'border-transparent text-t-4 hover:text-t-2',
          )
        "
        :data-testid="`psp-tab-${tab}`"
        @click="setTab(tab)"
      >
        {{ TAB_LABELS[tab] }}
      </button>
    </div>

    <!-- Tab body -->

    <!-- ─── Disponibilidad ────────────────────────────────────────── -->
    <section
      v-if="activeTab === 'disponibilidad'"
      class="flex flex-col gap-4"
      data-testid="psp-tab-body-disponibilidad"
    >
      <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SponsorBalanceCard
          v-for="sponsor in activeSponsors()"
          :key="sponsor.code"
          :sponsor="sponsor"
          :balance="balanceForSponsor(sponsor.code)"
          :is-active-filter="sponsorFilter === sponsor.code"
          :is-clickable="true"
          @select="(code: string) => (sponsorFilter = sponsorFilter === code ? null : code)"
        />
      </div>
    </section>

    <!-- ─── Movimientos ──────────────────────────────────────────── -->
    <section
      v-else-if="activeTab === 'movimientos'"
      class="flex flex-col gap-4"
      data-testid="psp-tab-body-movimientos"
    >
      <MovementsFilters
        :search="movSearch"
        :sponsor="sponsorFilter"
        :type="movType"
        :status="movStatus"
        :origin="movOrigin"
        :counts-by-sponsor="movementsCountsBySponsor"
        :has-active-filters="hasActiveMovementsFilters"
        :type-options="typeOptions"
        :status-options="statusOptions"
        :origin-options="originOptions"
        @update:search="(v: string) => { movSearch = v; movPage = 1; }"
        @update:sponsor="(v: string | null) => { sponsorFilter = v; movPage = 1; }"
        @update:type="(v: string) => { movType = v; movPage = 1; }"
        @update:status="(v: string) => { movStatus = v; movPage = 1; }"
        @update:origin="(v: string) => { movOrigin = v; movPage = 1; }"
        @clear-filters="clearMovementsFilters"
      />
      <MovementsTable
        :rows="movements"
        :is-loading="movementsQuery.isPending.value"
        :has-active-filters="hasActiveMovementsFilters"
        @clear-filters="clearMovementsFilters"
      />
      <div
        v-if="!movementsQuery.isPending.value && movements.length > 0"
        class="flex items-center justify-between text-xs text-t-4"
      >
        <div>{{ movementsTotal }} movimiento{{ movementsTotal === 1 ? '' : 's' }}</div>
        <div class="flex gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            :disabled="movPage <= 1"
            data-testid="movements-pagination-prev"
            @click="movPage = Math.max(1, movPage - 1)"
          >
            Anterior
          </Button>
          <Button
            variant="ghost"
            size="sm"
            :disabled="movements.length < movPageSize"
            data-testid="movements-pagination-next"
            @click="movPage += 1"
          >
            Siguiente
          </Button>
        </div>
      </div>
    </section>

    <!-- ─── Cuentas ──────────────────────────────────────────────── -->
    <section
      v-else
      class="flex flex-col gap-4"
      data-testid="psp-tab-body-cuentas"
    >
      <div class="flex items-center justify-between">
        <p class="text-sm text-t-3">{{ accounts.length }} cuenta{{ accounts.length === 1 ? '' : 's' }}</p>
        <Button
          v-if="canWhitelist"
          variant="primary"
          data-testid="psp-whitelist-cta"
          @click="openWhitelist"
        >
          <ShieldCheck class="h-3.5 w-3.5" />
          Habilitar cuenta
        </Button>
      </div>
      <AccountsTable
        :rows="accounts"
        :is-loading="accountsQuery.isPending.value"
        :has-active-filters="hasActiveAccountsFilters"
        @row-click="openDrawer"
        @clear-filters="clearAccountsFilters"
      />
    </section>

    <!-- Drawer (mounted always; visibility controlled by open) -->
    <SwiftTransactionsDrawer
      :open="drawerOpen"
      :account="drawerAccount"
      @update:open="onDrawerOpenChange"
    />

    <!-- Whitelist modal (REUSED from ops-clients) — picker prefix
         since PSP page doesn't have a client context (Decision 5). -->
    <WhitelistAccountModal
      v-model:open="whitelistOpen"
      :client-id="null"
      :currencies="currencies"
      @created="onWhitelistCreated"
    />
  </div>
</template>
