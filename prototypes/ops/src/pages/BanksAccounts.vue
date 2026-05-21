<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { Plus, FilePlus2, MoreVertical, AlertCircle } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import EmptyState from '@/components/feedback/EmptyState.vue';
import Skeleton from '@/components/feedback/Skeleton.vue';
import ActionsMenu from '@/components/feedback/ActionsMenu.vue';
import { useTable } from '@/composables/useTable';
import { useCapabilities } from '@/composables/useCapabilities';
import { fetchBanksAccounts } from '@/api/modules/banksAccounts';
import CreateStructureModal from '@/ops/banks-accounts/CreateStructureModal.vue';
import CreateAccountModal from '@/ops/banks-accounts/CreateAccountModal.vue';
import EditAccountModal from '@/ops/banks-accounts/EditAccountModal.vue';
import type { BankAccountRecord } from '@/ops/banks-accounts/types';

// ════════════════════════════════════════════════════════════════════
// Bancos / Cuentas — implements ops-banks-accounts (post-refactor):
// Type-A page with header + 2 KPIs + 4 filters + 8 columns + per-row
// Edit-Account action. Accounting metadata is owned by the future `fin`
// app and is NOT exposed on this page.
// ════════════════════════════════════════════════════════════════════

const queryClient = useQueryClient();
const { can } = useCapabilities();

const canCreateStructure = computed(
  () => can('banks-accounts:create-structure') || can('OPS_ADMIN'),
);
const canCreateAccount = computed(
  () => can('banks-accounts:create-account') || can('OPS_ADMIN'),
);
const canEditAccount = computed(
  () => can('banks-accounts:edit-account') || can('OPS_ADMIN'),
);

// ─── Data ────────────────────────────────────────────────────────────
const QUERY_KEY = ['ops', 'banks-accounts', 'list'] as const;

const { data, isPending, isError } = useQuery({
  queryKey: QUERY_KEY,
  queryFn: fetchBanksAccounts,
});

const rows = computed<BankAccountRecord[]>(() => data.value ?? []);

// ─── KPIs (always derived from full dataset) ─────────────────────────
const kpis = computed(() => {
  const r = rows.value;
  return {
    estructuras: new Set(r.map((x) => x.estructura)).size,
    total: r.length,
  };
});

// ─── Filters (client-side) ───────────────────────────────────────────
// `reka-ui` forbids <SelectItem value="">; use sentinel ALL.
const ALL = '__all__';

const search = ref('');
const fSociedad = ref('');
const fTipo = ref('');
const fTipoCuenta = ref('');
const fMoneda = ref('');

function bridge<T extends string>(getter: () => T, setter: (v: T) => void) {
  return computed<string>({
    get: () => getter() || ALL,
    set: (v: string) => setter((v === ALL ? '' : v) as T),
  });
}

const fSociedadModel = bridge(
  () => fSociedad.value,
  (v) => (fSociedad.value = v),
);
const fTipoModel = bridge(
  () => fTipo.value,
  (v) => (fTipo.value = v),
);
const fTipoCuentaModel = bridge(
  () => fTipoCuenta.value,
  (v) => (fTipoCuenta.value = v),
);
const fMonedaModel = bridge(
  () => fMoneda.value,
  (v) => (fMoneda.value = v),
);

const visibleRows = computed<BankAccountRecord[]>(() => {
  const q = search.value.toLowerCase().trim();
  return rows.value.filter((r) => {
    if (q) {
      const haystack = `${r.estructura} ${r.sociedad} ${r.nro}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (fSociedad.value && r.sociedad !== fSociedad.value) return false;
    if (fTipo.value && r.estructuraTipo !== fTipo.value) return false;
    if (fTipoCuenta.value && r.tipoCuenta !== fTipoCuenta.value) return false;
    if (fMoneda.value && r.moneda !== fMoneda.value) return false;
    return true;
  });
});

const table = useTable<BankAccountRecord>({
  data: visibleRows,
  pageSize: 25,
});

// ─── Filter option lists ─────────────────────────────────────────────
const sociedadOptions = computed(() =>
  Array.from(new Set(rows.value.map((r) => r.sociedad))).sort(),
);
const tipoOptions = ['Banco', 'Banco digital', 'ALyC', 'Exchange', 'Custodio', 'PSP', 'Proveedor'];
const tipoCuentaOptions = [
  'Cuenta Corriente',
  'CVU',
  'Wallet Pool',
  'Custodia',
  'Exchange Account',
  'Comitente',
];
const monedaOptions = ['ARS', 'USD', 'USDC', 'USDT', 'BTC'];

// ─── Modal state ─────────────────────────────────────────────────────
const createStructureOpen = ref(false);
const createAccountOpen = ref(false);
const editAccountOpen = ref(false);
const editAccountTarget = ref<BankAccountRecord | null>(null);

function openCreateStructure(): void {
  createStructureOpen.value = true;
}

function openCreateAccount(): void {
  createAccountOpen.value = true;
}

function openEditAccount(row: BankAccountRecord): void {
  editAccountTarget.value = row;
  editAccountOpen.value = true;
  closeActionsMenu();
}

function onMutationSuccess(): void {
  void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
}

// ─── Per-row Actions menu ────────────────────────────────────────────
const openMenuId = ref<string | null>(null);
const menuAnchorRefs = ref<Record<string, HTMLElement | null>>({});

function setMenuAnchor(id: string, el: HTMLElement | null): void {
  menuAnchorRefs.value[id] = el;
}

function toggleActionsMenu(id: string): void {
  openMenuId.value = openMenuId.value === id ? null : id;
}

function closeActionsMenu(): void {
  openMenuId.value = null;
}

// ─── Visual helpers ──────────────────────────────────────────────────
function sociedadShort(name: string): string {
  return name.replace(' SA', '').replace(' Corp', '');
}

function tipoBadgeClass(tipo: string): string {
  switch (tipo) {
    case 'Banco':
    case 'Custodio':
      return 'bg-info-bg text-info';
    case 'Banco digital':
      return 'bg-info-bg text-info';
    case 'ALyC':
    case 'PSP':
      return 'bg-warning-bg text-warning';
    case 'Exchange':
      return 'bg-success-bg text-success';
    case 'Proveedor':
      return 'bg-card text-t-3';
    default:
      return 'bg-card text-t-3';
  }
}

function monedaBadgeClass(moneda: string): string {
  switch (moneda) {
    case 'ARS':
      return 'bg-card text-t-2';
    case 'USD':
      return 'bg-card text-t-2';
    case 'USDC':
      return 'bg-info-bg text-info';
    case 'USDT':
      return 'bg-success-bg text-success';
    case 'BTC':
      return 'bg-warning-bg text-warning';
    default:
      return 'bg-card text-t-3';
  }
}

const isEmpty = computed(() => !isPending.value && rows.value.length === 0);
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <!-- L1 page header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-t-1">Bancos / Cuentas</h1>
        <p class="text-xs text-t-4">
          Catálogo maestro de estructuras y cuentas del grupo Ardua.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button
          v-if="canCreateStructure"
          variant="secondary"
          data-testid="banks-accounts-create-structure-cta"
          @click="openCreateStructure"
        >
          <FilePlus2 class="h-4 w-4" />
          Nueva Estructura
        </Button>
        <Button
          v-if="canCreateAccount"
          variant="primary"
          data-testid="banks-accounts-create-account-cta"
          @click="openCreateAccount"
        >
          <Plus class="h-4 w-4" />
          Nueva Cuenta
        </Button>
      </div>
    </div>

    <!-- L2 KPI grid (2 cards, full-catalog state) -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div class="rounded-lg border border-b-2 bg-card-2 p-4">
        <div class="text-[10px] font-bold uppercase tracking-wider text-t-4">Estructuras</div>
        <div class="mt-2 text-2xl font-bold text-t-1" data-testid="kpi-estructuras">
          {{ kpis.estructuras }}
        </div>
        <div class="mt-1 text-[11px] text-t-4">bancos, exchanges y custodios</div>
      </div>
      <div class="rounded-lg border border-b-2 bg-card-2 p-4">
        <div class="text-[10px] font-bold uppercase tracking-wider text-t-4">Cuentas totales</div>
        <div class="mt-2 text-2xl font-bold text-t-1" data-testid="kpi-total">
          {{ kpis.total }}
        </div>
        <div class="mt-1 text-[11px] text-t-4">activas en el catálogo</div>
      </div>
    </div>

    <!-- Error banner (transient API failures) -->
    <div
      v-if="isError"
      class="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13px] text-danger"
      role="alert"
    >
      <AlertCircle class="mt-0.5 h-4 w-4 flex-shrink-0" />
      <div>No se pudo cargar el catálogo. Reintentá en unos segundos.</div>
    </div>

    <!-- Filter row -->
    <div v-if="!isEmpty || isPending" class="flex flex-wrap items-center gap-2">
      <div class="flex-1 min-w-[200px] max-w-sm">
        <Input
          v-model="search"
          placeholder="Buscar por banco, sociedad o número"
          data-testid="banks-accounts-search"
        />
      </div>
      <div class="h-6 w-px bg-b-2" />
      <Select v-model="fSociedadModel">
        <SelectTrigger class="w-[170px]" data-testid="filter-sociedad">
          <SelectValue placeholder="Sociedad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Todas</SelectItem>
          <SelectItem v-for="o in sociedadOptions" :key="o" :value="o">{{ o }}</SelectItem>
        </SelectContent>
      </Select>
      <Select v-model="fTipoModel">
        <SelectTrigger class="w-[150px]" data-testid="filter-tipo">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Todos</SelectItem>
          <SelectItem v-for="o in tipoOptions" :key="o" :value="o">{{ o }}</SelectItem>
        </SelectContent>
      </Select>
      <Select v-model="fTipoCuentaModel">
        <SelectTrigger class="w-[170px]" data-testid="filter-tipo-cuenta">
          <SelectValue placeholder="Tipo de cuenta" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Todos</SelectItem>
          <SelectItem v-for="o in tipoCuentaOptions" :key="o" :value="o">{{ o }}</SelectItem>
        </SelectContent>
      </Select>
      <Select v-model="fMonedaModel">
        <SelectTrigger class="w-[120px]" data-testid="filter-moneda">
          <SelectValue placeholder="Moneda" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Todas</SelectItem>
          <SelectItem v-for="o in monedaOptions" :key="o" :value="o">{{ o }}</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- EmptyState branch (no inline CTA — operators use the page-header CTA) -->
    <div v-if="isEmpty" data-testid="banks-accounts-empty-state">
      <EmptyState
        title="Sin cuentas en el catálogo"
        description="Comenzá agregando una estructura y luego sus cuentas"
      />
    </div>

    <!-- Table -->
    <div
      v-else
      class="rounded-lg border border-b-2 bg-card-2 overflow-x-auto"
      data-testid="banks-accounts-table"
    >
      <table class="w-full table-auto text-sm">
        <thead
          class="border-b border-b-2 text-[10px] font-bold uppercase tracking-wider text-t-4"
        >
          <tr>
            <th class="px-4 py-3 text-left">Sociedad</th>
            <th class="px-4 py-3 text-left">Banco / Estructura</th>
            <th class="px-4 py-3 text-left">Tipo</th>
            <th class="px-4 py-3 text-left">Tipo de cuenta</th>
            <th class="px-4 py-3 text-left">Moneda</th>
            <th class="px-4 py-3 text-left">Nro. / Address</th>
            <th class="px-4 py-3 text-left">Cuenta padre</th>
            <th class="px-4 py-3 text-left">Estado</th>
            <th class="w-12 px-4 py-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="isPending">
            <tr v-for="i in 5" :key="`skeleton-${i}`">
              <td v-for="c in 8" :key="c" class="px-4 py-3">
                <Skeleton class="h-4 w-24" />
              </td>
              <td class="px-4 py-3" />
            </tr>
          </template>
          <template v-else>
            <tr
              v-for="row in table.paged.value"
              :key="row.id"
              class="border-b border-b-1 last:border-b-0 hover:bg-card"
            >
              <td class="px-4 py-3">
                <span
                  class="inline-block rounded-md bg-card px-2 py-0.5 text-[10px] font-semibold text-t-2"
                >
                  {{ sociedadShort(row.sociedad) }}
                </span>
              </td>
              <td class="px-4 py-3 text-[13px] text-t-2">{{ row.estructura }}</td>
              <td class="px-4 py-3">
                <span
                  :class="`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${tipoBadgeClass(row.estructuraTipo)}`"
                >
                  {{ row.estructuraTipo }}
                </span>
              </td>
              <td class="px-4 py-3 text-[11px] text-t-3">{{ row.tipoCuenta }}</td>
              <td class="px-4 py-3">
                <span
                  :class="`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${monedaBadgeClass(row.moneda)}`"
                >
                  {{ row.moneda }}
                </span>
              </td>
              <td class="px-4 py-3 font-mono text-[11px] text-t-3">{{ row.nro }}</td>
              <td class="px-4 py-3 text-[11px]">
                <span v-if="row.cuentaPadreLabel" class="text-t-3">
                  {{ row.cuentaPadreLabel }}
                </span>
                <span v-else class="text-t-4 opacity-40">—</span>
              </td>
              <td class="px-4 py-3">
                <span
                  :class="`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                    row.status === 'Activa'
                      ? 'bg-success-bg text-success'
                      : 'bg-card text-t-3'
                  }`"
                >
                  {{ row.status }}
                </span>
              </td>
              <td class="px-4 py-3 text-right" data-actions-cell>
                <button
                  v-if="canEditAccount"
                  :ref="(el) => setMenuAnchor(row.id, el as HTMLElement | null)"
                  type="button"
                  class="inline-flex h-7 w-7 items-center justify-center rounded-md text-t-3 transition-colors hover:bg-card hover:text-t-1"
                  :data-testid="`row-actions-${row.id}`"
                  @click="toggleActionsMenu(row.id)"
                >
                  <MoreVertical class="h-4 w-4" />
                </button>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Pagination footer -->
    <div
      v-if="!isPending && rows.length > 0"
      class="flex items-center justify-between text-xs text-t-4"
    >
      <div>
        Página {{ table.page.value }} de {{ table.totalPages.value }} · {{ table.total.value }}
        cuenta{{ table.total.value === 1 ? '' : 's' }} visibles
      </div>
      <div class="flex gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          :disabled="table.page.value <= 1"
          @click="table.setPage(table.page.value - 1)"
        >
          Anterior
        </Button>
        <Button
          variant="ghost"
          size="sm"
          :disabled="table.page.value >= table.totalPages.value"
          @click="table.setPage(table.page.value + 1)"
        >
          Siguiente
        </Button>
      </div>
    </div>

    <!-- Per-row Actions menu (single instance, anchored to whichever row is open) -->
    <ActionsMenu
      :open="openMenuId !== null"
      :anchor="openMenuId ? menuAnchorRefs[openMenuId] ?? null : null"
      @close="closeActionsMenu"
    >
      <template v-if="openMenuId">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-[13px] font-medium text-t-2 transition-colors hover:bg-card hover:text-t-1"
          :data-testid="`action-edit-account-${openMenuId}`"
          @click="
            (() => {
              const target = rows.find((r) => r.id === openMenuId);
              if (target) openEditAccount(target);
            })()
          "
        >
          <span>Editar datos</span>
        </button>
      </template>
    </ActionsMenu>

    <!-- Modals -->
    <CreateStructureModal v-model:open="createStructureOpen" @created="onMutationSuccess" />
    <CreateAccountModal
      v-model:open="createAccountOpen"
      :existing-accounts="rows"
      @created="onMutationSuccess"
    />
    <EditAccountModal
      v-model:open="editAccountOpen"
      :record="editAccountTarget"
      :existing-accounts="rows"
      @saved="onMutationSuccess"
    />
  </div>
</template>
