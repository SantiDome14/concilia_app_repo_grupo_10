<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { Search, AlertCircle } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import EmptyState from '@/components/feedback/EmptyState.vue';
import Skeleton from '@/components/feedback/Skeleton.vue';
import { TablePagination } from '@/components/data-display';
import { ManifestActionsMenu, ManifestModuleCTAs } from '@/components/manifest';
import { useTable } from '@/composables/useTable';
import { useManifestModule } from '@/composables/useManifestModule';
import { PAGE_SIZE_OPTIONS } from '@/constants';
import {
  fetchBanksAccounts,
  fetchEstructuras,
  fetchSociedades,
  createAccount,
  createStructure,
  updateAccount,
} from '@/api/modules/banksAccounts';
import { CATALOG_QUERY_KEYS } from '@/plugins/catalogs';
import { OPS_BANKS_ACCOUNTS_MANIFEST_KEY } from '@/manifests/ops.banks_accounts.actions';
import type {
  BankAccountRecord,
  CreateAccountPayload,
  CreateStructurePayload,
  CuentaTipo,
  EstructuraTipo,
  Moneda,
  UpdateAccountPayload,
} from '@/ops/banks-accounts/types';
import type { ModuleCTA } from '@/types/manifest';

// ════════════════════════════════════════════════════════════════════
// Bancos / Cuentas — Type A master list at /banks-accounts.
// ────────────────────────────────────────────────────────────────────
// Mirror of the FIN.Disponibilidades > Bancos/Cuentas sub-tab minus
// the accounting metadata (Cuenta Contable column + configurar_contable
// action are FIN-owned). OPS adds two governance actions in their
// place: activar / desactivar (manifest engine, `set_fields`).
//
// L1 header: title + <ManifestModuleCTAs> (Nueva Estructura + Nueva
// Cuenta). L2: 4 KPI tiles. L3: search left + 5 filters right
// (Sociedad / Estructura / Tipo cuenta / Moneda / Estado). Lista view
// only — no Cards/Kanban for the catalog. Per-row <ManifestActionsMenu>.
// Footer: <TablePagination> via useTable.
//
// Creators + dispatcher: `registerCreator` resolves the two CTAs
// (crear_cuenta / crear_estructura) into POST mutations; `register
// Dispatcher` re-routes per-row patches into PATCH updateAccount.
// ════════════════════════════════════════════════════════════════════

const banksAccountsMod = useManifestModule(OPS_BANKS_ACCOUNTS_MANIFEST_KEY);
const queryClient = useQueryClient();

// ─── Queries ─────────────────────────────────────────────────────────
const ACCOUNTS_KEY = ['ops', 'banks-accounts', 'list'] as const;

const accountsQuery = useQuery({
  queryKey: ACCOUNTS_KEY,
  queryFn: fetchBanksAccounts,
});

// Sociedades + Estructuras are pre-fetched so the lookup catalogs
// resolve synchronously on first dropdown open.
useQuery({
  queryKey: CATALOG_QUERY_KEYS.sociedades,
  queryFn: fetchSociedades,
});
useQuery({
  queryKey: CATALOG_QUERY_KEYS.estructuras,
  queryFn: fetchEstructuras,
});

const rows = computed<BankAccountRecord[]>(() => accountsQuery.data.value ?? []);
const isPending = computed(() => accountsQuery.isPending.value);
const isError = computed(() => accountsQuery.isError.value);
const isEmpty = computed(() => !isPending.value && rows.value.length === 0);

// ─── KPIs (computed from full dataset) ───────────────────────────────
const kpis = computed(() => {
  const r = rows.value;
  return {
    estructurasTotales: new Set(r.map((x) => x.estructura)).size,
    cuentasTotales: r.length,
    cuentasActivas: r.filter((x) => x.status === 'Activa').length,
    cuentasInactivas: r.filter((x) => x.status === 'Inactiva').length,
  };
});

// ─── Filters (client-side) ───────────────────────────────────────────
const ALL = '__all__';
const search = ref('');
const fSociedad = ref('');
const fEstructuraTipo = ref('');
const fTipoCuenta = ref('');
const fMoneda = ref('');
const fEstado = ref('');

function bridge<T extends string>(getter: () => T, setter: (v: T) => void) {
  return computed<string>({
    get: () => getter() || ALL,
    set: (v: string) => setter((v === ALL ? '' : v) as T),
  });
}

const fSociedadModel = bridge(() => fSociedad.value, (v) => (fSociedad.value = v));
const fTipoModel = bridge(() => fEstructuraTipo.value, (v) => (fEstructuraTipo.value = v));
const fTipoCuentaModel = bridge(() => fTipoCuenta.value, (v) => (fTipoCuenta.value = v));
const fMonedaModel = bridge(() => fMoneda.value, (v) => (fMoneda.value = v));
const fEstadoModel = bridge(() => fEstado.value, (v) => (fEstado.value = v));

const visibleRows = computed<BankAccountRecord[]>(() => {
  const q = search.value.toLowerCase().trim();
  return rows.value.filter((r) => {
    if (q) {
      const haystack = `${r.estructura} ${r.sociedad} ${r.nro}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (fSociedad.value && r.sociedad !== fSociedad.value) return false;
    if (fEstructuraTipo.value && r.estructuraTipo !== fEstructuraTipo.value) return false;
    if (fTipoCuenta.value && r.tipoCuenta !== fTipoCuenta.value) return false;
    if (fMoneda.value && r.moneda !== fMoneda.value) return false;
    if (fEstado.value && r.status !== fEstado.value) return false;
    return true;
  });
});

const table = useTable<BankAccountRecord>({ data: visibleRows, pageSize: 10 });

// ─── Filter option lists ─────────────────────────────────────────────
const sociedadOptions = computed(() =>
  Array.from(new Set(rows.value.map((r) => r.sociedad))).sort(),
);
const tipoOptions: EstructuraTipo[] = [
  'Banco',
  'Banco digital',
  'ALyC',
  'Exchange',
  'Custodio',
  'PSP',
  'Proveedor',
];
const tipoCuentaOptions: CuentaTipo[] = [
  'Cuenta Corriente',
  'CVU',
  'Wallet Pool',
  'Custodia',
  'Exchange Account',
  'Comitente',
];
const monedaOptions: Moneda[] = ['ARS', 'USD', 'USDC', 'USDT', 'BTC'];

// ─── Visual helpers (chip-style cells matching the canonical pattern) ─
function sociedadShort(name: string): string {
  return name.replace(' SA', '').replace(' Corp', '');
}

function tipoBadgeClass(tipo: string): string {
  switch (tipo) {
    case 'Banco':
    case 'Custodio':
    case 'Banco digital':
      return 'bg-info-bg text-info';
    case 'ALyC':
    case 'PSP':
      return 'bg-warning-bg text-warning';
    case 'Exchange':
      return 'bg-success-bg text-success';
    default:
      return 'bg-card text-t-3';
  }
}

function monedaBadgeClass(moneda: string): string {
  switch (moneda) {
    case 'ARS':
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

// ─── Mutations ───────────────────────────────────────────────────────
const updateMutation = useMutation({
  mutationFn: ({ id, patch }: { id: string; patch: UpdateAccountPayload }) =>
    updateAccount(id, patch),
  onMutate: async ({ id, patch }) => {
    await queryClient.cancelQueries({ queryKey: ACCOUNTS_KEY });
    const snapshot = queryClient.getQueryData<BankAccountRecord[]>(ACCOUNTS_KEY);
    queryClient.setQueryData<BankAccountRecord[]>(ACCOUNTS_KEY, (old) =>
      (old ?? []).map((r) => (r.id === id ? ({ ...r, ...patch } as BankAccountRecord) : r)),
    );
    return { snapshot };
  },
  onError: (_err, _vars, ctx) => {
    if (ctx?.snapshot) queryClient.setQueryData(ACCOUNTS_KEY, ctx.snapshot);
    toast.error('No se pudo guardar el cambio. Se revirtió.');
  },
  onSettled: () => {
    void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
  },
});

const createAccountMutation = useMutation({
  mutationFn: (payload: CreateAccountPayload) => createAccount(payload),
  onError: (err) => {
    toast.error(err instanceof Error ? err.message : 'No se pudo crear la cuenta.');
  },
  onSettled: () => {
    void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
  },
});

const createStructureMutation = useMutation({
  mutationFn: (payload: CreateStructurePayload) => createStructure(payload),
  onError: (err) => {
    toast.error(err instanceof Error ? err.message : 'No se pudo crear la estructura.');
  },
  onSettled: () => {
    void queryClient.invalidateQueries({ queryKey: CATALOG_QUERY_KEYS.estructuras });
    // Newly-created structures should appear when the operator re-opens
    // Crear Cuenta even before the user navigates away.
    void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
  },
});

// ─── Manifest creators (Module CTAs) ─────────────────────────────────
banksAccountsMod.registerCreator((cta: ModuleCTA, formValues) => {
  if (cta.id === 'ops.banks_accounts.crear_cuenta') {
    const payload: CreateAccountPayload = {
      sociedadId: String(formValues.sociedadId ?? ''),
      estructuraId: String(formValues.estructuraId ?? ''),
      tipoCuenta: String(formValues.tipoCuenta ?? '') as CuentaTipo,
      moneda: String(formValues.moneda ?? '') as Moneda,
      nro: String(formValues.nro ?? ''),
    };
    createAccountMutation.mutate(payload);
    return payload as unknown as Record<string, unknown>;
  }
  if (cta.id === 'ops.banks_accounts.crear_estructura') {
    const payload: CreateStructurePayload = {
      name: String(formValues.name ?? ''),
      tipo: String(formValues.tipo ?? '') as EstructuraTipo,
    };
    createStructureMutation.mutate(payload);
    return payload as unknown as Record<string, unknown>;
  }
  return formValues as Record<string, unknown>;
});

// ─── Manifest dispatcher (per-row actions) ───────────────────────────
banksAccountsMod.registerDispatcher({
  update: (recordId, patch) => {
    // Strip undefined keys so the partial schema validates cleanly.
    const clean: UpdateAccountPayload = {};
    if (typeof patch.tipoCuenta === 'string') clean.tipoCuenta = patch.tipoCuenta as CuentaTipo;
    if (typeof patch.moneda === 'string') clean.moneda = patch.moneda as Moneda;
    if (typeof patch.nro === 'string') clean.nro = patch.nro;
    if (typeof patch.status === 'string') clean.status = patch.status as UpdateAccountPayload['status'];
    if ('padreCuentaId' in patch) clean.padreCuentaId = patch.padreCuentaId as string | null;
    updateMutation.mutate({ id: recordId, patch: clean });
  },
  create: () => {
    // Creators are dispatched by `registerCreator` above; this branch
    // is unused by the page.
  },
});
</script>

<template>
  <div class="flex flex-col gap-5 px-[22px] py-5" data-testid="banks-accounts-page">
    <!-- L1 · Page header -->
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-[22px] font-extrabold tracking-tight text-t-1">Bancos / Cuentas</h1>
        <p class="mt-1 text-xs text-t-3">
          Catálogo maestro de estructuras y cuentas del grupo Ardua.
        </p>
      </div>
      <div class="flex items-center gap-3" data-testid="banks-accounts-main-cta">
        <ManifestModuleCTAs :manifest-key="OPS_BANKS_ACCOUNTS_MANIFEST_KEY" />
      </div>
    </header>

    <!-- L2 · KPIs (4 tiles) -->
    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="banks-accounts-kpis">
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Estructuras totales
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">
          {{ kpis.estructurasTotales }}
        </div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Cuentas totales
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">
          {{ kpis.cuentasTotales }}
        </div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Cuentas activas
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-success">
          {{ kpis.cuentasActivas }}
        </div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Cuentas inactivas
        </div>
        <div
          class="text-2xl font-extrabold leading-none tracking-tight"
          :class="kpis.cuentasInactivas > 0 ? 'text-warning' : 'text-t-1'"
        >
          {{ kpis.cuentasInactivas }}
        </div>
      </div>
    </section>

    <!-- Error banner -->
    <div
      v-if="isError"
      class="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2.5 text-[13px] text-danger"
      role="alert"
    >
      <AlertCircle class="mt-0.5 h-4 w-4 flex-shrink-0" />
      <div>No se pudo cargar el catálogo. Reintentá en unos segundos.</div>
    </div>

    <!-- L3 · Search + filters -->
    <section
      v-if="!isEmpty || isPending"
      class="flex flex-wrap items-center gap-2"
      data-testid="banks-accounts-filters"
    >
      <div class="relative">
        <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t-4" />
        <Input
          v-model="search"
          placeholder="Buscar por banco, sociedad o número…"
          class="w-[260px] pl-8"
          data-testid="banks-accounts-search"
        />
      </div>
      <div class="flex-1" />
      <Select v-model="fSociedadModel">
        <SelectTrigger class="h-9 w-[160px] text-xs" data-testid="filter-sociedad">
          <SelectValue placeholder="Sociedad · Todas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Sociedad · Todas</SelectItem>
          <SelectItem v-for="o in sociedadOptions" :key="o" :value="o">{{ o }}</SelectItem>
        </SelectContent>
      </Select>
      <Select v-model="fTipoModel">
        <SelectTrigger class="h-9 w-[150px] text-xs" data-testid="filter-tipo">
          <SelectValue placeholder="Estructura · Todas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Estructura · Todas</SelectItem>
          <SelectItem v-for="o in tipoOptions" :key="o" :value="o">{{ o }}</SelectItem>
        </SelectContent>
      </Select>
      <Select v-model="fTipoCuentaModel">
        <SelectTrigger class="h-9 w-[160px] text-xs" data-testid="filter-tipo-cuenta">
          <SelectValue placeholder="Cuenta · Todas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Cuenta · Todas</SelectItem>
          <SelectItem v-for="o in tipoCuentaOptions" :key="o" :value="o">{{ o }}</SelectItem>
        </SelectContent>
      </Select>
      <Select v-model="fMonedaModel">
        <SelectTrigger class="h-9 w-[120px] text-xs" data-testid="filter-moneda">
          <SelectValue placeholder="Moneda · Todas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Moneda · Todas</SelectItem>
          <SelectItem v-for="o in monedaOptions" :key="o" :value="o">{{ o }}</SelectItem>
        </SelectContent>
      </Select>
      <Select v-model="fEstadoModel">
        <SelectTrigger class="h-9 w-[130px] text-xs" data-testid="filter-estado">
          <SelectValue placeholder="Estado · Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Estado · Todos</SelectItem>
          <SelectItem value="Activa">Activa</SelectItem>
          <SelectItem value="Inactiva">Inactiva</SelectItem>
        </SelectContent>
      </Select>
    </section>

    <!-- Empty state -->
    <div v-if="isEmpty" data-testid="banks-accounts-empty-state">
      <EmptyState
        title="Sin cuentas en el catálogo"
        description="Comenzá agregando una estructura y luego sus cuentas"
      />
    </div>

    <!-- Table -->
    <section
      v-else
      class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2"
      data-testid="banks-accounts-table"
    >
      <table class="w-full border-collapse">
        <thead>
          <tr class="border-b border-b-2">
            <th class="px-[18px] py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Sociedad</th>
            <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Banco / Estructura</th>
            <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Tipo estructura</th>
            <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Tipo cuenta</th>
            <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Moneda</th>
            <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Nro. / Address</th>
            <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Estado</th>
            <th class="px-3.5 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-t-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="isPending">
            <tr v-for="i in 5" :key="`skeleton-${i}`">
              <td v-for="c in 7" :key="c" class="px-3.5 py-2.5">
                <Skeleton class="h-4 w-24" />
              </td>
              <td class="px-3.5 py-2.5" />
            </tr>
          </template>
          <template v-else>
            <tr
              v-for="row in table.paged.value"
              :key="row.id"
              class="border-b border-b-1 last:border-b-0 hover:bg-white/[0.02]"
              :data-testid="`banks-accounts-row-${row.id}`"
            >
              <td class="px-[18px] py-2.5">
                <span class="inline-block rounded-md bg-card px-2 py-0.5 text-[10px] font-semibold text-t-2">
                  {{ sociedadShort(row.sociedad) }}
                </span>
              </td>
              <td class="px-3.5 py-2.5 text-xs text-t-2 font-semibold">{{ row.estructura }}</td>
              <td class="px-3.5 py-2.5">
                <span :class="`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${tipoBadgeClass(row.estructuraTipo)}`">
                  {{ row.estructuraTipo }}
                </span>
              </td>
              <td class="px-3.5 py-2.5 text-xs text-t-3">{{ row.tipoCuenta }}</td>
              <td class="px-3.5 py-2.5">
                <span :class="`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${monedaBadgeClass(row.moneda)}`">
                  {{ row.moneda }}
                </span>
              </td>
              <td class="px-3.5 py-2.5 font-mono text-[11px] text-t-3">{{ row.nro }}</td>
              <td class="px-3.5 py-2.5">
                <span
                  :class="`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                    row.status === 'Activa' ? 'bg-success-bg text-success' : 'bg-card text-t-3'
                  }`"
                >
                  {{ row.status }}
                </span>
              </td>
              <td class="px-3.5 py-2.5 text-center" @click.stop>
                <div class="flex items-center justify-center">
                  <ManifestActionsMenu
                    :manifest-key="OPS_BANKS_ACCOUNTS_MANIFEST_KEY"
                    :record="row as unknown as Record<string, unknown>"
                    variant="table"
                    :data-testid="`banks-accounts-row-${row.id}-actions`"
                  />
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </section>

    <TablePagination
      v-if="!isPending && rows.length > 0"
      :page="table.page.value"
      :page-size="table.pageSize.value"
      :total="table.total.value"
      :total-pages="table.totalPages.value"
      :page-size-options="PAGE_SIZE_OPTIONS"
      data-testid="banks-accounts-pagination"
      @update:page="table.setPage"
      @update:page-size="table.setPageSize"
    />
  </div>
</template>
