<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { useRoute, useRouter } from 'vue-router';
import { Plus } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import { ViewToggle, type ViewMode } from '@/components/views';
import { TablePagination } from '@/components/data-display';
import { cn } from '@/lib/cn';
import { useTable } from '@/composables/useTable';
import { useCapabilities } from '@/composables/useCapabilities';
import { useManifestModule } from '@/composables/useManifestModule';
import { PAGE_SIZE_OPTIONS } from '@/constants';
import { CATALOG_QUERY_KEYS } from '@/plugins/catalogs';
import { createMovement } from '@/api/modules/movimientos';
import { OPS_PSP_CUENTAS_MANIFEST_KEY } from '@/manifests/ops.psp.cuentas.actions';
import { OPS_PSP_MOVIMIENTOS_MANIFEST_KEY } from '@/manifests/ops.psp.movimientos.actions';
import type { ModuleCTA } from '@/types/manifest';
import {
  createAccount,
  getCoinagHealth,
  listAccounts,
  listMovements,
  listSponsorBalances,
} from '@/api/modules/psp';
import PosicionKpis from '@/ops/psp/PosicionKpis.vue';
import PosicionTree from '@/ops/psp/PosicionTree.vue';
import MovimientosKpis from '@/ops/psp/MovimientosKpis.vue';
import MovementsFilters from '@/ops/psp/MovementsFilters.vue';
import MovementsTable from '@/ops/psp/MovementsTable.vue';
import AccountsTable from '@/ops/psp/AccountsTable.vue';
import AccountsFilters from '@/ops/psp/AccountsFilters.vue';
import SwiftTransactionsDrawer from '@/ops/psp/SwiftTransactionsDrawer.vue';
import {
  MOVEMENT_TYPE_OPTIONS,
  MOVEMENT_STATUS_OPTIONS,
  MOVEMENT_ORIGIN_OPTIONS,
} from '@/ops/movimientos/catalog';
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
// `Crear Cuenta` is the page-header rename of the previous body-level
// `Habilitar cuenta` CTA — same surface (`<WhitelistAccountModal>`,
// reused from `ops-clients`), same capability gate. In PSP, the
// canonical way to "crear cuenta" IS to whitelist a Coinag account.
const canCreateAccount = computed(
  () => can('psp:whitelist') || can('OPS_ADMIN'),
);
// `Crear Movimiento` ships as a placeholder until
// `extend-ops-psp-create-movement` lands a real mutation surface.
const canCreateMovement = computed(
  () => can('psp:create-movement') || can('OPS_ADMIN'),
);

// ─── Tab state with URL persistence ─────────────────────────────────
//
// Per `extend-ops-psp-partner-rename-default-tab-and-filter` the
// initial tab MUST default to `posicion` whenever no `?tab=` query
// param is set, regardless of any persisted state. We still write
// `localStorage:ops:psp:lastTab` on tab switches (for analytics or
// future re-introduction of saved state) but we DO NOT read it as
// the default-tab source on mount.
const VALID_TABS: PspTab[] = ['posicion', 'movimientos', 'cuentas'];
const LEGACY_TAB_ALIASES: Record<string, PspTab> = {
  // Per `extend-ops-psp-posicion-shape` — the legacy ?tab=disponibilidad
  // bookmark normalises to ?tab=posicion on first visit.
  disponibilidad: 'posicion',
};
const LAST_TAB_KEY = 'ops:psp:lastTab';

function normaliseTab(value: string | undefined): PspTab | null {
  if (!value) return null;
  if (VALID_TABS.includes(value as PspTab)) return value as PspTab;
  if (LEGACY_TAB_ALIASES[value]) return LEGACY_TAB_ALIASES[value]!;
  return null;
}

function writeSavedTab(tab: PspTab): void {
  try {
    window.localStorage.setItem(LAST_TAB_KEY, tab);
  } catch {
    // ignore
  }
}

const initialTab: PspTab =
  normaliseTab(typeof route.query.tab === 'string' ? route.query.tab : undefined) ??
  'posicion';

const activeTab = ref<PspTab>(initialTab);

// Per-page ViewToggle state. Per
// `refine-ops-psp-tab-aware-header-and-multi-sponsor` the toggle is
// rendered structurally on Movimientos and Cuentas tabs; v1 falls
// through to the `list` render for `cards` and `kanban` modes (the
// alt-view bodies are owned by `extend-ops-psp-alternative-views`).
const viewMode = ref<ViewMode>('list');

// ─── Cross-tab sponsor filter + per-tab query state ─────────────────
const sponsorFilter = ref<SponsorCode | null>(
  typeof route.query.sponsor === 'string' ? route.query.sponsor : null,
);

// Movements filter state
const movSearch = ref<string>(typeof route.query.search === 'string' ? route.query.search : '');
const movType = ref<string>(typeof route.query.type === 'string' ? route.query.type : '');
const movStatus = ref<string>(typeof route.query.status === 'string' ? route.query.status : '');
const movOrigin = ref<string>(typeof route.query.origin === 'string' ? route.query.origin : '');
// Pagination state is owned by `movementsTable` (useTable) — server
// returns the full filtered set, the table slices the visible page.

// Accounts filter state (sponsor + search shared with movements via cross-tab filter)
const accSearch = ref<string>('');
const accCurrency = ref<string>('');
const accStatus = ref<string>('');

// Client filter for the PSP Movimientos tab — driven by the
// "Ver movimientos" action on the Cuentas tab (sets the client to
// the row's owner) and also editable manually from the Movimientos
// filter row.
const movClient = ref<string>('');
// Pagination state is owned by `accountsTable` (useTable).

// ─── URL sync ───────────────────────────────────────────────────────
watch(
  [activeTab, sponsorFilter, movSearch, movType, movStatus, movOrigin],
  ([tab, sponsor, search, type, status, origin]) => {
    const next: Record<string, string> = { tab };
    if (sponsor) next.sponsor = sponsor;
    if (tab === 'movimientos') {
      if (search) next.search = search;
      if (type) next.type = type;
      if (status) next.status = status;
      if (origin) next.origin = origin;
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

// The reconciliation banner / mismatches snapshot was removed
// (operator review 2026-05-22). Descuadres between Ardua's ledger and
// each partner's API balance will be surfaced through the Alertas
// module instead — that's the canonical home for actionable
// notifications.

// ─── Sponsor balances (Requirement 4 — auto-refresh 60 s) ───────────
const balancesQuery = useQuery({
  queryKey: ['ops', 'psp', 'sponsor-balances'],
  queryFn: listSponsorBalances,
  refetchInterval: 60_000,
  enabled: canRead,
});

const balances = computed(() => balancesQuery.data.value ?? []);
// `balanceForSponsor` was used by the deprecated `<SponsorBalanceCard>`
// row-of-cards shape; replaced by `<PosicionTree>` which loops over
// `activeSponsors()` and reads `balances` directly.

// ─── Movements query (Requirement 5) ────────────────────────────────
// Fetch the full set (FETCH_PAGE_SIZE = 1000) so filtering AND
// pagination both run client-side. Server-side `page` / `pageSize` are
// not forwarded — they're owned by `useTable` below.
const FETCH_PAGE_SIZE = 1000;

const movQueryParams = computed(() => ({
  ...(sponsorFilter.value ? { sponsor: sponsorFilter.value } : {}),
  ...(movSearch.value ? { search: movSearch.value } : {}),
  ...(movType.value ? { type: movType.value } : {}),
  ...(movStatus.value ? { status: movStatus.value } : {}),
  ...(movOrigin.value ? { origin: movOrigin.value } : {}),
  ...(movClient.value ? { client: movClient.value } : {}),
  page: 1,
  pageSize: FETCH_PAGE_SIZE,
}));

const movementsQuery = useQuery({
  queryKey: computed(() => ['ops', 'psp', 'movements', movQueryParams.value] as const),
  queryFn: () => listMovements(movQueryParams.value),
  enabled: computed(() => canRead.value && activeTab.value === 'movimientos'),
});

// PSP movements are anchored to a CVU, which always belongs to a
// sponsor — so `sponsor === null` rows (the general treasury
// `mov-gen-*` records that share the `/movements` endpoint with the
// OPS Movimientos page) are filtered out here. Operator review
// 2026-05-22.
const movements = computed(() =>
  (movementsQuery.data.value?.data ?? []).filter((m) => m.sponsor !== null),
);

const movementsTable = useTable({ data: movements, pageSize: 10 });

// `sponsorFilter` is intentionally NOT counted here — it lives in the
// Posición / Cuentas filter rows; the Movimientos L3 owns only its
// own filters (search / client / type / status / origin).
const hasActiveMovementsFilters = computed(
  () =>
    Boolean(movSearch.value) ||
    Boolean(movClient.value) ||
    Boolean(movType.value) ||
    Boolean(movStatus.value) ||
    Boolean(movOrigin.value),
);

// ─── Accounts query (Requirement 6) ─────────────────────────────────
// Same pattern as movements: fetch the full filtered set, then let
// `useTable` own the page slice + page size.
const accQueryParams = computed(() => ({
  ...(sponsorFilter.value ? { sponsor: sponsorFilter.value } : {}),
  ...(accSearch.value ? { search: accSearch.value } : {}),
  ...(accCurrency.value ? { currency: accCurrency.value } : {}),
  ...(accStatus.value ? { status: accStatus.value } : {}),
  // Fetch the full set (CBUs + CVUs). The Cuentas table renders only
  // CVUs (filtered client-side via `cvuAccounts`); the CBU records
  // power the Posición tree + the Parent column lookup.
  page: 1,
  pageSize: FETCH_PAGE_SIZE,
}));

const accountsQuery = useQuery({
  queryKey: computed(() => ['ops', 'psp', 'accounts', accQueryParams.value] as const),
  queryFn: () => listAccounts(accQueryParams.value),
  // Posición tab needs the accounts list for the tree drill-down too.
  enabled: computed(
    () =>
      canRead.value &&
      (activeTab.value === 'cuentas' || activeTab.value === 'posicion'),
  ),
});

// Stable catalog query — feeds the `ops.psp.clientes` / `ops.psp.cbus`
// catalog resolvers regardless of which filters the operator has on
// the visible accounts query. Always fetches the full set.
useQuery({
  queryKey: CATALOG_QUERY_KEYS.pspAccountsCatalog,
  queryFn: () => listAccounts({ page: 1, pageSize: 1000 }),
  enabled: canRead,
});

const accounts = computed(() => accountsQuery.data.value?.data ?? []);

// CVU-only view that feeds the Cuentas table. CBUs are excluded
// here — they live in the Posición tab tree and as the Parent
// column on each CVU row.
const cvuAccounts = computed(() =>
  accounts.value.filter((a) => Boolean(a.parent_cbu_id)),
);

// id → account_number lookup for the Parent column.
const cbuParentLookup = computed<Record<string, string>>(() => {
  const out: Record<string, string> = {};
  for (const a of accounts.value) {
    if (!a.parent_cbu_id) out[a.id] = a.account_number;
  }
  return out;
});

const accountsTable = useTable({ data: cvuAccounts, pageSize: 10 });

// Posición also needs a recent movements snapshot to compute DR/CR cumulatives.
// We fetch a wide page (no filters) when the tab is active.
const posicionMovementsQuery = useQuery({
  queryKey: ['ops', 'psp', 'movements', 'posicion-snapshot'],
  queryFn: () => listMovements({ page: 1, pageSize: 200 }),
  refetchInterval: 60_000,
  enabled: computed(() => canRead.value && activeTab.value === 'posicion'),
});

const posicionMovements = computed(
  () =>
    (posicionMovementsQuery.data.value?.data ?? []).filter(
      (m) => m.sponsor !== null,
    ),
);

const hasActiveAccountsFilters = computed(
  () =>
    Boolean(sponsorFilter.value) ||
    Boolean(accSearch.value) ||
    Boolean(accCurrency.value) ||
    Boolean(accStatus.value),
);

// Currency options surface every distinct currency present in the
// CVU set (the table is CVU-only, so the filter mirrors what's
// renderable rather than including CBU-master currencies).
const accountsCurrencyOptions = computed<string[]>(() => {
  const set = new Set<string>();
  for (const a of cvuAccounts.value) set.add(a.currency.toUpperCase());
  return Array.from(set).sort();
});

// L2 KPI tiles — full account set (CBU + CVU) so the operator sees
// the hierarchy at a glance. Active counts only CVUs because CBU
// masters carry status='ACTIVE' as a placeholder.
const accountsKpis = computed(() => {
  const rows = accounts.value;
  let cbu = 0;
  let cvu = 0;
  let active = 0;
  for (const a of rows) {
    if (a.parent_cbu_id) {
      cvu += 1;
      if (a.status.toUpperCase() === 'ACTIVE') active += 1;
    } else {
      cbu += 1;
    }
  }
  return { total: rows.length, cbu, cvu, active };
});

// Distinct client owners across the CVU set — drives the Cliente
// filter Select in the PSP Movimientos tab.
const movClientOptions = computed<string[]>(() => {
  const set = new Set<string>();
  for (const a of cvuAccounts.value) {
    if (a.owner) set.add(a.owner);
  }
  return Array.from(set).sort();
});

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

// ─── Page-level main CTAs ─────────────────────────────────────────
//
// `Crear Movimiento` opens the manifest-engine dialog declared on
// `ops.psp.movimientos`. The creator below derives partner /
// sponsor / currency from the chosen CVU's owner and fires the same
// POST /movements endpoint the OPS Movimientos page uses.

const pspMovimientosMod = useManifestModule(OPS_PSP_MOVIMIENTOS_MANIFEST_KEY);

const createPspMovementMutation = useMutation({
  mutationFn: (payload: Record<string, unknown>) => createMovement(payload),
  onError: (err) => {
    toast.error(
      err instanceof Error ? err.message : 'No se pudo crear el movimiento.',
    );
  },
  onSettled: () => {
    void queryClient.invalidateQueries({ queryKey: ['ops', 'psp', 'movements'] });
  },
});

pspMovimientosMod.registerCreator((cta: ModuleCTA, formValues) => {
  if (cta.id !== 'psp.movimientos.crear') return formValues as Record<string, unknown>;

  // Resolve the CVU the operator picked by client name → derives the
  // partner, sponsor and currency for the new movement.
  const ownerName = String(formValues.client ?? '');
  const cvu = accounts.value.find(
    (a) => a.owner === ownerName && Boolean(a.parent_cbu_id),
  );
  if (!cvu) {
    toast.error('Cliente sin CVU activo — no se puede crear el movimiento.');
    return formValues as Record<string, unknown>;
  }

  const amountRaw = String(formValues.amount ?? '0');

  createPspMovementMutation.mutate({
    type: String(formValues.type ?? ''),
    status: 'PENDING',
    amount: amountRaw,
    currency: cvu.currency,
    rail: 'ARDUA',
    sponsor: cvu.sponsor,
    partner: cvu.sponsor,
    client: ownerName,
    counterparty:
      typeof formValues.counterparty === 'string' && formValues.counterparty !== ''
        ? formValues.counterparty
        : null,
    metadata: {
      cvu_account_id: cvu.id,
      cvu_account_number: cvu.account_number,
    },
  });

  return formValues as Record<string, unknown>;
});

function onCrearMovimiento(): void {
  pspMovimientosMod.openModuleCTA('psp.movimientos.crear');
}

// `Crear Cuenta` now drives the manifest-engine dialog declared in
// `ops.psp.cuentas` (module CTA `psp.cuentas.crear`) — adds the
// Partner + CBU selectors operator review 2026-05-22 asked for.
function onCrearCuenta(): void {
  pspCuentasMod.openModuleCTA('psp.cuentas.crear');
}

// Filter option lists for Movimientos sourced from the closed catalog
// (per `refine-ops-psp-tab-aware-header-and-multi-sponsor`).
const typeOptions = MOVEMENT_TYPE_OPTIONS;
const statusOptions = MOVEMENT_STATUS_OPTIONS;
const originOptions = MOVEMENT_ORIGIN_OPTIONS;

function clearMovementsFilters(): void {
  // `sponsorFilter` is cross-tab — cleared from Posición / Cuentas only.
  movSearch.value = '';
  movClient.value = '';
  movType.value = '';
  movStatus.value = '';
  movOrigin.value = '';
  movementsTable.setPage(1);
}

// Manifest engine for the Cuentas tab actions. The `ver_movimientos`
// action emits `_action: 'ver_movimientos'` via on_confirm; the
// dispatcher below intercepts the marker, looks up the source
// account, and fires the cross-tab navigation + Cliente filter set.
const pspCuentasMod = useManifestModule(OPS_PSP_CUENTAS_MANIFEST_KEY);

pspCuentasMod.registerDispatcher({
  update: (recordId, patch) => {
    if (patch['_action'] === 'ver_movimientos') {
      const account = accounts.value.find((a) => a.id === recordId);
      if (!account) return;
      movClient.value = account.owner ?? '';
      movementsTable.setPage(1);
      setTab('movimientos');
    }
  },
  create: () => {
    // Creators handle the actual POST — this branch stays no-op.
  },
});

// Crear Cuenta — POST /accounts via the api module + invalidate the
// accounts queries so both the table and the catalog refresh.
const createPspAccountMutation = useMutation({
  mutationFn: (payload: Record<string, unknown>) => createAccount(payload),
  onError: (err) => {
    toast.error(
      err instanceof Error ? err.message : 'No se pudo crear la cuenta.',
    );
  },
  onSettled: () => {
    void queryClient.invalidateQueries({ queryKey: ['ops', 'psp', 'accounts'] });
  },
});

pspCuentasMod.registerCreator((cta: ModuleCTA, formValues) => {
  if (cta.id !== 'psp.cuentas.crear') return formValues as Record<string, unknown>;
  const payload = {
    sponsor: String(formValues.sponsor ?? ''),
    parent_cbu_id: String(formValues.parent_cbu_id ?? ''),
    owner: String(formValues.owner ?? ''),
    account_number: String(formValues.account_number ?? ''),
    currency: String(formValues.currency ?? 'ARS'),
    alias:
      typeof formValues.alias === 'string' && formValues.alias !== ''
        ? formValues.alias
        : undefined,
    cvu: String(formValues.account_number ?? ''),
    balance: '0',
    status: 'ACTIVE',
  };
  createPspAccountMutation.mutate(payload);
  return payload as unknown as Record<string, unknown>;
});

function clearAccountsFilters(): void {
  sponsorFilter.value = null;
  accSearch.value = '';
  accCurrency.value = '';
  accStatus.value = '';
  accountsTable.setPage(1);
}

const TAB_LABELS: Record<PspTab, string> = {
  posicion: 'Posición',
  movimientos: 'Movimientos',
  cuentas: 'Cuentas',
};
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <!-- L1 page header — right-actions slot is tab-aware per
         `extend-ops-psp-partner-rename-default-tab-and-filter`:
         · Posición   → Crear Movimiento (no ViewToggle)
         · Movimientos → ViewToggle + Crear Movimiento
         · Cuentas     → ViewToggle + Crear Cuenta -->
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-t-1">PSP</h1>
        <p class="text-xs text-t-4">
          Posición, movimientos y cuentas operativas por partner.
        </p>
      </div>
      <div
        class="flex items-center gap-3"
        data-testid="psp-header-actions"
      >
        <ViewToggle
          v-if="activeTab !== 'posicion'"
          v-model="viewMode"
          :views="['list', 'cards', 'kanban']"
        />
        <Button
          v-if="(activeTab === 'movimientos' || activeTab === 'posicion') && canCreateMovement"
          variant="primary"
          data-testid="psp-create-movement-cta"
          @click="onCrearMovimiento"
        >
          <Plus class="h-3.5 w-3.5" />
          Crear Movimiento
        </Button>
        <Button
          v-if="activeTab === 'cuentas' && canCreateAccount"
          variant="primary"
          data-testid="psp-create-account-cta"
          @click="onCrearCuenta"
        >
          <Plus class="h-3.5 w-3.5" />
          Crear Cuenta
        </Button>
      </div>
    </div>

    <!-- Reconciliation banner area -->

    <!-- Tab indicator -->
    <div
      class="flex items-center gap-1 border-b border-b-1"
      role="tablist"
      data-testid="psp-tabs"
    >
      <button
        v-for="tab in (['posicion', 'movimientos', 'cuentas'] as PspTab[])"
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

    <!-- ─── Posición (strict Módulo B shape) ──────────────────────── -->
    <section
      v-if="activeTab === 'posicion'"
      class="flex flex-col gap-5"
      data-testid="psp-tab-body-posicion"
    >
      <PosicionKpis
        :balances="balances"
        :movements="posicionMovements"
        :accounts="accounts"
      />
      <PosicionTree
        :balances="balances"
        :accounts="accounts"
        :movements="posicionMovements"
        :health="healthQuery.data.value ?? null"
        :is-health-stale="isHealthStale"
      />
    </section>

    <!-- ─── Movimientos ──────────────────────────────────────────── -->
    <section
      v-else-if="activeTab === 'movimientos'"
      class="flex flex-col gap-4"
      data-testid="psp-tab-body-movimientos"
    >
      <MovimientosKpis :movements="movements" />
      <MovementsFilters
        :search="movSearch"
        :client="movClient"
        :type="movType"
        :status="movStatus"
        :origin="movOrigin"
        :has-active-filters="hasActiveMovementsFilters"
        :type-options="typeOptions"
        :status-options="statusOptions"
        :origin-options="originOptions"
        :client-options="movClientOptions"
        @update:search="(v: string) => { movSearch = v; movementsTable.setPage(1); }"
        @update:client="(v: string) => { movClient = v; movementsTable.setPage(1); }"
        @update:type="(v: string) => { movType = v; movementsTable.setPage(1); }"
        @update:status="(v: string) => { movStatus = v; movementsTable.setPage(1); }"
        @update:origin="(v: string) => { movOrigin = v; movementsTable.setPage(1); }"
        @clear-filters="clearMovementsFilters"
      />
      <MovementsTable
        :rows="movementsTable.paged.value"
        :is-loading="movementsQuery.isPending.value"
        :has-active-filters="hasActiveMovementsFilters"
        @clear-filters="clearMovementsFilters"
      />
      <TablePagination
        v-if="!movementsQuery.isPending.value && movementsTable.total.value > 0"
        :page="movementsTable.page.value"
        :page-size="movementsTable.pageSize.value"
        :total="movementsTable.total.value"
        :total-pages="movementsTable.totalPages.value"
        :page-size-options="PAGE_SIZE_OPTIONS"
        data-testid="psp-movements-pagination"
        @update:page="movementsTable.setPage"
        @update:page-size="movementsTable.setPageSize"
      />
    </section>

    <!-- ─── Cuentas ──────────────────────────────────────────────── -->
    <section
      v-else
      class="flex flex-col gap-4"
      data-testid="psp-tab-body-cuentas"
    >
      <!-- L2 KPIs -->
      <section
        class="grid grid-cols-2 gap-3 lg:grid-cols-4"
        data-testid="accounts-kpis"
      >
        <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
          <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
            Total cuentas
          </div>
          <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">
            {{ accountsKpis.total }}
          </div>
          <div class="mt-1 text-[11px] text-t-4">CBU + CVU</div>
        </div>
        <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
          <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
            CBU
          </div>
          <div class="text-2xl font-extrabold leading-none tracking-tight text-info">
            {{ accountsKpis.cbu }}
          </div>
          <div class="mt-1 text-[11px] text-t-4">cuentas globales por partner</div>
        </div>
        <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
          <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
            CVU
          </div>
          <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">
            {{ accountsKpis.cvu }}
          </div>
          <div class="mt-1 text-[11px] text-t-4">sub-cuentas por cliente</div>
        </div>
        <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
          <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
            Cuentas activas
          </div>
          <div class="text-2xl font-extrabold leading-none tracking-tight text-success">
            {{ accountsKpis.active }}
          </div>
          <div class="mt-1 text-[11px] text-t-4">estado ACTIVE</div>
        </div>
      </section>

      <AccountsFilters
        :search="accSearch"
        :sponsor="sponsorFilter"
        :currency="accCurrency"
        :status="accStatus"
        :has-active-filters="hasActiveAccountsFilters"
        :currency-options="accountsCurrencyOptions"
        @update:search="(v: string) => { accSearch = v; accountsTable.setPage(1); }"
        @update:sponsor="(v: SponsorCode | null) => { sponsorFilter = v; accountsTable.setPage(1); }"
        @update:currency="(v: string) => { accCurrency = v; accountsTable.setPage(1); }"
        @update:status="(v: string) => { accStatus = v; accountsTable.setPage(1); }"
        @clear-filters="clearAccountsFilters"
      />
      <AccountsTable
        :rows="accountsTable.paged.value"
        :is-loading="accountsQuery.isPending.value"
        :has-active-filters="hasActiveAccountsFilters"
        :parent-lookup="cbuParentLookup"
        :manifest-key="OPS_PSP_CUENTAS_MANIFEST_KEY"
        @row-click="openDrawer"
        @clear-filters="clearAccountsFilters"
      />
      <TablePagination
        v-if="!accountsQuery.isPending.value && accountsTable.total.value > 0"
        :page="accountsTable.page.value"
        :page-size="accountsTable.pageSize.value"
        :total="accountsTable.total.value"
        :total-pages="accountsTable.totalPages.value"
        :page-size-options="PAGE_SIZE_OPTIONS"
        data-testid="psp-accounts-pagination"
        @update:page="accountsTable.setPage"
        @update:page-size="accountsTable.setPageSize"
      />
    </section>

    <!-- Drawer (mounted always; visibility controlled by open) -->
    <SwiftTransactionsDrawer
      :open="drawerOpen"
      :account="drawerAccount"
      @update:open="onDrawerOpenChange"
    />
  </div>
</template>
