<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { useRoute, useRouter } from 'vue-router';
import { Search, X } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TablePagination } from '@/components/data-display';
import { useTable } from '@/composables/useTable';
import { useManifestModule } from '@/composables/useManifestModule';
import { useCapabilities } from '@/composables/useCapabilities';
import { PAGE_SIZE_OPTIONS } from '@/constants';
import { listClients, listCurrencies, patchClient } from '@/api/modules/clients';
import { CATALOG_QUERY_KEYS } from '@/plugins/catalogs';
import ClientsTable from '@/ops/clients/ClientsTable.vue';
import SignUpUserModal from '@/ops/clients/SignUpUserModal.vue';
import WhitelistAccountModal from '@/ops/clients/WhitelistAccountModal.vue';
import GenerateStatementModal from '@/ops/statements/GenerateStatementModal.vue';
import { OPS_CLIENTS_MANIFEST_KEY } from '@/manifests/ops.clients.actions';
import type { Client, PortalStatusFlat } from '@/ops/clients/types';

// ════════════════════════════════════════════════════════════════════
// Clients page — canonical pattern aligned with Movimientos / Trades /
// PSP / Instructions: L1 header (sin module CTAs) + L2 KPIs + L3
// search izq + filtros der + tabla con ManifestActionsMenu por fila +
// TablePagination. Cada acción operativa (Ver detalle, Generar
// statement, Alta en portal, Habilitar cuenta CVU, Activar/Desactivar)
// vive en el manifest `ops.clients` y se despacha desde acá.
// ════════════════════════════════════════════════════════════════════

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const { can } = useCapabilities();
const clientsMod = useManifestModule(OPS_CLIENTS_MANIFEST_KEY);

const canRead = computed(
  () => can('clients:read') || can('OPS_ADMIN') || can('ADMIN'),
);

// ─── Filters (URL-reflected) ─────────────────────────────────────────
const search = ref<string>(
  typeof route.query.name === 'string' ? route.query.name : '',
);
const portalFilter = ref<PortalStatusFlat | ''>(
  isPortalStatus(route.query.portal) ? (route.query.portal as PortalStatusFlat) : '',
);
const activeFilter = ref<'ACTIVE' | 'INACTIVE' | ''>(
  route.query.activo === 'ACTIVE' || route.query.activo === 'INACTIVE'
    ? (route.query.activo as 'ACTIVE' | 'INACTIVE')
    : '',
);

const ALL = '__all__';
const portalModel = computed<string>({
  get: () => portalFilter.value || ALL,
  set: (v) => {
    portalFilter.value = v === ALL ? '' : (v as PortalStatusFlat);
  },
});
const activeModel = computed<string>({
  get: () => activeFilter.value || ALL,
  set: (v) => {
    activeFilter.value = v === ALL ? '' : (v as 'ACTIVE' | 'INACTIVE');
  },
});

const PORTAL_OPTIONS: PortalStatusFlat[] = ['ACTIVE', 'PENDING', 'NOT_CREATED'];
const PORTAL_LABEL: Record<PortalStatusFlat, string> = {
  ACTIVE: 'Activo',
  PENDING: 'Pendiente',
  NOT_CREATED: 'No creado',
};

function isPortalStatus(value: unknown): value is PortalStatusFlat {
  return value === 'ACTIVE' || value === 'PENDING' || value === 'NOT_CREATED';
}

watch([search, portalFilter, activeFilter], ([name, portal, activo]) => {
  const next: Record<string, string> = {};
  if (name) next.name = name;
  if (portal) next.portal = portal;
  if (activo) next.activo = activo;
  void router.replace({ query: next });
});

const hasActiveFilters = computed(
  () =>
    Boolean(search.value) ||
    Boolean(portalFilter.value) ||
    Boolean(activeFilter.value),
);

function clearFilters(): void {
  search.value = '';
  portalFilter.value = '';
  activeFilter.value = '';
}

// ─── List query (client-side filter + pagination via useTable) ──────
const FETCH_PAGE_SIZE = 1000;
const LIST_KEY = ['ops', 'clients', 'list'] as const;

const listQuery = useQuery({
  queryKey: LIST_KEY,
  queryFn: () => listClients({ page: 1, pageSize: FETCH_PAGE_SIZE }),
  enabled: canRead,
});

const allClients = computed<Client[]>(() => listQuery.data.value?.clients ?? []);

const filtered = computed<Client[]>(() => {
  let source = allClients.value;
  const q = search.value.trim().toLowerCase();
  if (q !== '') {
    source = source.filter(
      (row) =>
        (row.name ?? '').toLowerCase().includes(q) ||
        (row.tax_number ?? '').toLowerCase().includes(q) ||
        (row.docket ?? '').toLowerCase().includes(q) ||
        (row.email ?? '').toLowerCase().includes(q),
    );
  }
  if (portalFilter.value) {
    source = source.filter(
      (row) => (row.portal_status ?? 'NOT_CREATED') === portalFilter.value,
    );
  }
  if (activeFilter.value) {
    source = source.filter(
      (row) =>
        activeFilter.value === 'ACTIVE' ? row.is_active : !row.is_active,
    );
  }
  return source;
});

const table = useTable<Client>({ data: filtered, pageSize: 10 });

function invalidateList(): void {
  void queryClient.invalidateQueries({ queryKey: LIST_KEY });
}

// ─── L2 KPIs ─────────────────────────────────────────────────────────
const kpis = computed(() => {
  const rows = filtered.value;
  let active = 0;
  let portalActive = 0;
  let portalPending = 0;
  for (const r of rows) {
    if (r.is_active) active += 1;
    if (r.portal_status === 'ACTIVE') portalActive += 1;
    else if (r.portal_status === 'PENDING') portalPending += 1;
  }
  return { total: rows.length, active, portalActive, portalPending };
});

// ─── Currencies (used by WhitelistAccountModal) ─────────────────────
const currenciesQuery = useQuery({
  queryKey: CATALOG_QUERY_KEYS.currencies,
  queryFn: listCurrencies,
  staleTime: 5 * 60 * 1000,
});
const currencies = computed(() => currenciesQuery.data.value ?? []);

// ─── Mutations: toggle is_active ────────────────────────────────────
const setActiveMutation = useMutation({
  mutationFn: ({ id, value }: { id: string; value: boolean }) =>
    patchClient(id, { is_active: value }),
  onError: (err) => {
    toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el cliente.');
  },
  onSettled: invalidateList,
});

// ─── External modal slots driven by manifest dispatchers ────────────
const signUpOpen = ref(false);
const signUpClient = ref<Client | null>(null);
const whitelistOpen = ref(false);
const whitelistClient = ref<Client | null>(null);
const statementOpen = ref(false);
const statementClient = ref<Client | null>(null);

function openSignUpFor(client: Client): void {
  signUpClient.value = client;
  signUpOpen.value = true;
}
function openWhitelistFor(client: Client): void {
  whitelistClient.value = client;
  whitelistOpen.value = true;
}
function openStatementFor(client: Client): void {
  statementClient.value = client;
  statementOpen.value = true;
}

// ─── Manifest engine wiring ─────────────────────────────────────────
clientsMod.registerDispatcher({
  update: (recordId, patch) => {
    const action = patch._action;
    const client = allClients.value.find((c) => c.id === recordId) ?? null;
    if (action === 'generar_statement') {
      if (client) openStatementFor(client);
      return;
    }
    if (action === 'alta_portal') {
      if (client) openSignUpFor(client);
      return;
    }
    if (action === 'habilitar_cuenta') {
      if (client) openWhitelistFor(client);
      return;
    }
    // Activar / Desactivar — engine applied `is_active` in the patch.
    if (typeof patch.is_active === 'boolean') {
      setActiveMutation.mutate({ id: recordId, value: patch.is_active });
    }
  },
  create: () => {
    // No module CTAs in ops.clients.
  },
});

// ─── Row click → detail page (parity with Ver detalle action) ───────
function onRowClick(client: Client): void {
  void router.push(`/clients/${client.id}`);
}
</script>

<template>
  <div class="flex flex-col gap-5 px-[22px] py-5" data-testid="clients-page">
    <!-- L1 · Page header -->
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-[22px] font-extrabold tracking-tight text-t-1">Clientes</h1>
        <p class="mt-1 text-xs text-t-3">
          Listado de clientes operativos. Cada acción (alta de portal, statement,
          whitelist CVU, activar/desactivar) se ejecuta desde el menú de la fila.
        </p>
      </div>
    </header>

    <!-- L2 · KPI strip -->
    <section
      class="grid grid-cols-2 gap-3 lg:grid-cols-4"
      data-testid="clients-kpis"
    >
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Total
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">
          {{ kpis.total }}
        </div>
        <div class="mt-1 text-[11px] text-t-4">clientes</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Activos
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-success">
          {{ kpis.active }}
        </div>
        <div class="mt-1 text-[11px] text-t-4">en operación</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Portal activo
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-success">
          {{ kpis.portalActive }}
        </div>
        <div class="mt-1 text-[11px] text-t-4">onboarding completo</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Portal pendiente
        </div>
        <div
          class="text-2xl font-extrabold leading-none tracking-tight"
          :class="kpis.portalPending > 0 ? 'text-warning' : 'text-t-1'"
        >
          {{ kpis.portalPending }}
        </div>
        <div class="mt-1 text-[11px] text-t-4">invitación enviada</div>
      </div>
    </section>

    <!-- L3 · Search + filters -->
    <section
      class="flex flex-wrap items-center gap-2.5"
      data-testid="clients-filters"
    >
      <div class="relative w-full max-w-sm sm:w-72">
        <Search
          class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t-4"
        />
        <Input
          v-model="search"
          placeholder="Buscar por nombre, CUIT, legajo o email…"
          class="pl-8"
          data-testid="clients-search"
        />
      </div>

      <div class="flex-1" />

      <Select v-model="portalModel">
        <SelectTrigger class="h-9 w-[180px] text-xs" data-testid="clients-filter-portal">
          <SelectValue placeholder="Portal · Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Portal · Todos</SelectItem>
          <SelectItem v-for="p in PORTAL_OPTIONS" :key="p" :value="p">
            {{ PORTAL_LABEL[p] }}
          </SelectItem>
        </SelectContent>
      </Select>

      <Select v-model="activeModel">
        <SelectTrigger class="h-9 w-[160px] text-xs" data-testid="clients-filter-active">
          <SelectValue placeholder="Activo · Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Activo · Todos</SelectItem>
          <SelectItem value="ACTIVE">Activos</SelectItem>
          <SelectItem value="INACTIVE">Inactivos</SelectItem>
        </SelectContent>
      </Select>

      <Button
        v-if="hasActiveFilters"
        variant="ghost"
        size="sm"
        data-testid="clients-clear-filters"
        @click="clearFilters"
      >
        <X class="h-3.5 w-3.5" />
        Limpiar
      </Button>
    </section>

    <!-- Table -->
    <ClientsTable
      :rows="table.paged.value"
      :is-loading="listQuery.isPending.value"
      :has-active-filters="hasActiveFilters"
      :manifest-key="OPS_CLIENTS_MANIFEST_KEY"
      @row-click="onRowClick"
      @clear-filters="clearFilters"
    />
    <TablePagination
      v-if="!listQuery.isPending.value && table.total.value > 0"
      :page="table.page.value"
      :page-size="table.pageSize.value"
      :total="table.total.value"
      :total-pages="table.totalPages.value"
      :page-size-options="PAGE_SIZE_OPTIONS"
      data-testid="clients-pagination"
      @update:page="table.setPage"
      @update:page-size="table.setPageSize"
    />

    <!-- Modals driven by the manifest dispatcher -->
    <SignUpUserModal
      v-model:open="signUpOpen"
      :preselected-client="signUpClient"
    />

    <GenerateStatementModal
      v-model:open="statementOpen"
      :preselected-client="statementClient"
    />

    <WhitelistAccountModal
      v-if="whitelistClient"
      v-model:open="whitelistOpen"
      :client-id="whitelistClient.id"
      :currencies="currencies"
    />
  </div>
</template>
