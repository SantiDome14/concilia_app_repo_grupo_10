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
import { ManifestModuleCTAs } from '@/components/manifest';
import { useTable } from '@/composables/useTable';
import { useCapabilities } from '@/composables/useCapabilities';
import { useManifestModule } from '@/composables/useManifestModule';
import { PAGE_SIZE_OPTIONS } from '@/constants';
import {
  createInstructionWithAttributes,
  deleteInstruction,
  getInstruction,
  listInstructions,
  updateInstructionWithAttributes,
} from '@/api/modules/instructions';
import { listCurrencies } from '@/api/modules/clients';
import { CATALOG_QUERY_KEYS } from '@/plugins/catalogs';
import InstructionsTable from '@/ops/instructions/InstructionsTable.vue';
import InstructionDetailModal from '@/ops/instructions/InstructionDetailModal.vue';
import { OPS_INSTRUCTIONS_MANIFEST_KEY } from '@/manifests/ops.instructions.actions';
import type {
  Instruction,
  InstructionFormData,
  InstructionStatus,
  InstructionWithAttributes,
} from '@/ops/instructions/types';
import type { CurrencyEntry } from '@/ops/clients/types';
import type { ModuleCTA } from '@/types/manifest';

// ════════════════════════════════════════════════════════════════════
// Instructions page — canonical pattern: title + ManifestModuleCTAs +
// L2 KPIs + L3 (search left + filters right) + table with manifest
// actions + TablePagination. The Create / Edit / Delete dialogs flow
// through the manifest engine; the Detail modal stays for read-only
// row-click navigation.
//
// Two-phase orchestration (record + attributes) lives in the creator
// + dispatcher below — the engine just collects form values; the
// page wraps `createInstructionWithAttributes` and
// `updateInstructionWithAttributes`.
// ════════════════════════════════════════════════════════════════════

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const { can } = useCapabilities();
const instructionsMod = useManifestModule(OPS_INSTRUCTIONS_MANIFEST_KEY);

const canRead = computed(
  () => can('instructions:read') || can('OPS_ADMIN') || can('ADMIN'),
);

// ─── Filter state (URL-reflected) ───────────────────────────────────
const search = ref<string>(typeof route.query.name === 'string' ? route.query.name : '');
const currencyId = ref<string>(
  typeof route.query.currency_id === 'string' ? route.query.currency_id : '',
);
const providerFilter = ref<string>(
  typeof route.query.provider === 'string' ? route.query.provider : '',
);
const statusFilter = ref<InstructionStatus | ''>(
  isStatus(route.query.status) ? (route.query.status as InstructionStatus) : '',
);

const ALL = '__all__';
const currencyIdModel = computed<string>({
  get: () => currencyId.value || ALL,
  set: (v) => {
    currencyId.value = v === ALL ? '' : v;
  },
});
const providerModel = computed<string>({
  get: () => providerFilter.value || ALL,
  set: (v) => {
    providerFilter.value = v === ALL ? '' : v;
  },
});
const statusModel = computed<string>({
  get: () => statusFilter.value || ALL,
  set: (v) => {
    statusFilter.value = v === ALL ? '' : (v as InstructionStatus);
  },
});

// `/currencies` is the source-of-truth catalog — same cache key the
// `ops.currencies` manifest catalog reads from, so the dropdown and the
// table labels stay in lockstep with the form options.
const currenciesQuery = useQuery({
  queryKey: CATALOG_QUERY_KEYS.currencies,
  queryFn: listCurrencies,
  staleTime: 5 * 60 * 1000,
});
const currencies = computed<CurrencyEntry[]>(
  () => currenciesQuery.data.value ?? [],
);
const currencyLabels = computed(() =>
  Object.fromEntries(currencies.value.map((c) => [c.id, c.name])),
);

const STATUS_LABEL: Record<InstructionStatus, string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
};
const STATUS_OPTIONS: InstructionStatus[] = ['DRAFT', 'ACTIVE', 'INACTIVE'];

function isStatus(value: unknown): value is InstructionStatus {
  return value === 'DRAFT' || value === 'ACTIVE' || value === 'INACTIVE';
}

// ─── URL sync ───────────────────────────────────────────────────────
watch(
  [search, currencyId, providerFilter, statusFilter],
  ([name, currency, provider, status]) => {
    const next: Record<string, string> = {};
    if (name) next.name = name;
    if (currency) next.currency_id = currency;
    if (provider) next.provider = provider;
    if (status) next.status = status;
    if (typeof route.query.detail === 'string') next.detail = route.query.detail;
    void router.replace({ query: next });
  },
);

const hasActiveFilters = computed(
  () =>
    Boolean(search.value) ||
    Boolean(currencyId.value) ||
    Boolean(providerFilter.value) ||
    Boolean(statusFilter.value),
);

function clearFilters(): void {
  search.value = '';
  currencyId.value = '';
  providerFilter.value = '';
  statusFilter.value = '';
}

// ─── List query (client-side filter + pagination via useTable) ──────
const FETCH_PAGE_SIZE = 1000;
const LIST_KEY = ['ops', 'instructions', 'list'] as const;

const listQuery = useQuery({
  queryKey: LIST_KEY,
  queryFn: () =>
    listInstructions({ page: 1, pageSize: FETCH_PAGE_SIZE }),
  enabled: canRead,
});

const allInstructions = computed<Instruction[]>(
  () => listQuery.data.value?.data ?? [],
);

const filtered = computed<Instruction[]>(() => {
  let source = allInstructions.value;
  const q = search.value.trim().toLowerCase();
  if (q !== '') {
    source = source.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        (row.provider ?? '').toLowerCase().includes(q) ||
        (row.description ?? '').toLowerCase().includes(q),
    );
  }
  if (currencyId.value) {
    source = source.filter((row) => row.currency_id === currencyId.value);
  }
  if (providerFilter.value) {
    source = source.filter((row) => row.provider === providerFilter.value);
  }
  if (statusFilter.value) {
    source = source.filter((row) => row.status === statusFilter.value);
  }
  return source;
});

// Distinct providers across the full dataset (unfiltered) so changing
// other filters doesn't make options vanish.
const providers = computed<string[]>(() => {
  const set = new Set<string>();
  for (const row of allInstructions.value) {
    if (row.provider) set.add(row.provider);
  }
  return Array.from(set).sort();
});

const table = useTable<Instruction>({ data: filtered, pageSize: 10 });

function invalidateList(): void {
  void queryClient.invalidateQueries({ queryKey: LIST_KEY });
}

// ─── L2 KPIs ─────────────────────────────────────────────────────────
const kpis = computed(() => {
  const rows = filtered.value;
  let active = 0;
  let drafts = 0;
  let inactive = 0;
  for (const r of rows) {
    if (r.status === 'ACTIVE') active += 1;
    else if (r.status === 'DRAFT') drafts += 1;
    else if (r.status === 'INACTIVE') inactive += 1;
  }
  return {
    total: rows.length,
    drafts,
    active,
    inactive,
  };
});

// ─── Mutations: create / update / delete ────────────────────────────
const createMutation = useMutation({
  mutationFn: (data: InstructionFormData) =>
    createInstructionWithAttributes(data),
  onError: (err) => {
    toast.error(
      err instanceof Error ? err.message : 'No se pudo crear la instrucción.',
    );
  },
  onSettled: invalidateList,
});

const updateMutation = useMutation({
  mutationFn: ({ id, data }: { id: string; data: InstructionFormData }) =>
    updateInstructionWithAttributes(id, data),
  onError: (err) => {
    toast.error(
      err instanceof Error ? err.message : 'No se pudo guardar el cambio.',
    );
  },
  onSettled: invalidateList,
});

const deleteMutation = useMutation({
  mutationFn: (id: string) => deleteInstruction(id),
  onError: (err) => {
    toast.error(
      err instanceof Error ? err.message : 'No se pudo eliminar la instrucción.',
    );
  },
  onSettled: invalidateList,
});

// ─── Manifest engine wiring ─────────────────────────────────────────
// Helper — manifest's key-value-array yields `[{ key, value }, ...]`;
// the api expects `[{ key, value, index }, ...]` with index_order.
function normaliseAttributes(
  raw: unknown,
): Array<{ key: string; value: string; index: number }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, i) => {
      if (!entry || typeof entry !== 'object') return null;
      const obj = entry as Record<string, unknown>;
      const key = typeof obj.key === 'string' ? obj.key : '';
      const value = typeof obj.value === 'string' ? obj.value : '';
      if (key === '') return null;
      return { key, value, index: i };
    })
    .filter((x): x is { key: string; value: string; index: number } => x !== null);
}

function formValuesToFormData(formValues: Record<string, unknown>): InstructionFormData {
  const rawStatus = formValues.status;
  const status: InstructionStatus = isStatus(rawStatus) ? rawStatus : 'DRAFT';
  return {
    name: String(formValues.name ?? '').trim(),
    provider: String(formValues.provider ?? '').trim(),
    currency_id: String(formValues.currency_id ?? ''),
    description: String(formValues.description ?? ''),
    status,
    attributes: normaliseAttributes(formValues.attributes),
  };
}

instructionsMod.registerCreator((cta: ModuleCTA, formValues) => {
  if (cta.id !== 'instructions.crear') return formValues as Record<string, unknown>;
  const data = formValuesToFormData(formValues);
  createMutation.mutate(data);
  return data as unknown as Record<string, unknown>;
});

instructionsMod.registerDispatcher({
  update: (recordId, patch) => {
    if (patch['_action'] === 'eliminar') {
      deleteMutation.mutate(recordId);
      return;
    }
    // Edit flow — convert the form-shaped patch back to the API's
    // InstructionFormData and fire the two-phase orchestrator.
    const data = formValuesToFormData(patch);
    updateMutation.mutate({ id: recordId, data });
  },
  create: () => {
    // Creators are dispatched via registerCreator above.
  },
});

// ─── Detail modal (read-only row-click navigation) ──────────────────
const detailOpen = ref(false);
const detailInstruction = ref<InstructionWithAttributes | null>(null);

async function openDetail(instruction: Instruction): Promise<void> {
  try {
    const fetched = await getInstruction(instruction.id);
    detailInstruction.value = fetched;
    detailOpen.value = true;
    void router.replace({ query: { ...route.query, detail: instruction.id } });
  } catch (e) {
    toast.error(
      e instanceof Error ? e.message : 'No se pudo cargar la instrucción',
    );
  }
}

function onDetailOpenChange(value: boolean): void {
  detailOpen.value = value;
  if (!value) {
    detailInstruction.value = null;
    const next = { ...route.query };
    delete next.detail;
    void router.replace({ query: next });
  }
}

// Detail deep-link rehydration on mount.
watch(
  () => route.query.detail,
  async (id, prev) => {
    if (id === prev) return;
    if (typeof id !== 'string' || !id) return;
    if (detailOpen.value && detailInstruction.value?.id === id) return;
    try {
      detailInstruction.value = await getInstruction(id);
      detailOpen.value = true;
    } catch {
      detailInstruction.value = null;
    }
  },
  { immediate: true },
);

function onDetailEdit(): void {
  if (!detailInstruction.value) return;
  const record = detailInstruction.value;
  onDetailOpenChange(false);
  instructionsMod.openDialog(
    'instructions.editar',
    record as unknown as Record<string, unknown>,
  );
}
</script>

<template>
  <div class="flex flex-col gap-5 px-[22px] py-5" data-testid="instructions-page">
    <!-- L1 · Page header -->
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-[22px] font-extrabold tracking-tight text-t-1">
          Instrucciones
        </h1>
        <p class="mt-1 text-xs text-t-3">
          Templates de routing de pago. Cada instrucción puede tener atributos personalizados.
        </p>
      </div>
      <div class="flex items-center gap-3" data-testid="instructions-main-cta">
        <ManifestModuleCTAs :manifest-key="OPS_INSTRUCTIONS_MANIFEST_KEY" />
      </div>
    </header>

    <!-- L2 · KPI strip -->
    <section
      class="grid grid-cols-2 gap-3 lg:grid-cols-4"
      data-testid="instructions-kpis"
    >
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Total
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">
          {{ kpis.total }}
        </div>
        <div class="mt-1 text-[11px] text-t-4">instrucciones</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Borradores
        </div>
        <div
          class="text-2xl font-extrabold leading-none tracking-tight"
          :class="kpis.drafts > 0 ? 'text-warning' : 'text-t-1'"
        >
          {{ kpis.drafts }}
        </div>
        <div class="mt-1 text-[11px] text-t-4">templates en preparación</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Activos
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-success">
          {{ kpis.active }}
        </div>
        <div class="mt-1 text-[11px] text-t-4">templates publicados</div>
      </div>
      <div class="rounded-xl border border-b-2 bg-card-2 px-[18px] py-4">
        <div class="mb-2 text-[9px] font-extrabold uppercase tracking-wider text-t-4">
          Inactivos
        </div>
        <div class="text-2xl font-extrabold leading-none tracking-tight text-t-1">
          {{ kpis.inactive }}
        </div>
        <div class="mt-1 text-[11px] text-t-4">templates archivados</div>
      </div>
    </section>

    <!-- L3 · Search + filters -->
    <section
      class="flex flex-wrap items-center gap-2.5"
      data-testid="instructions-filters"
    >
      <div class="relative w-full max-w-sm sm:w-72">
        <Search
          class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t-4"
        />
        <Input
          v-model="search"
          placeholder="Buscar por nombre o descripción…"
          class="pl-8"
          data-testid="instructions-search"
        />
      </div>

      <div class="flex-1" />

      <Select v-model="providerModel">
        <SelectTrigger class="h-9 w-[200px] text-xs" data-testid="instructions-filter-provider">
          <SelectValue placeholder="Proveedor · Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Proveedor · Todos</SelectItem>
          <SelectItem v-for="p in providers" :key="p" :value="p">
            {{ p }}
          </SelectItem>
        </SelectContent>
      </Select>

      <Select v-model="currencyIdModel">
        <SelectTrigger class="h-9 w-[200px] text-xs" data-testid="instructions-filter-currency">
          <SelectValue placeholder="Moneda · Todas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Moneda · Todas</SelectItem>
          <SelectItem v-for="c in currencies" :key="c.id" :value="c.id">
            {{ c.name }}
          </SelectItem>
        </SelectContent>
      </Select>

      <Select v-model="statusModel">
        <SelectTrigger class="h-9 w-[180px] text-xs" data-testid="instructions-filter-status">
          <SelectValue placeholder="Estado · Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Estado · Todos</SelectItem>
          <SelectItem v-for="s in STATUS_OPTIONS" :key="s" :value="s">
            {{ STATUS_LABEL[s] }}
          </SelectItem>
        </SelectContent>
      </Select>

      <Button
        v-if="hasActiveFilters"
        variant="ghost"
        size="sm"
        data-testid="instructions-clear-filters"
        @click="clearFilters"
      >
        <X class="h-3.5 w-3.5" />
        Limpiar
      </Button>
    </section>

    <!-- Table -->
    <InstructionsTable
      :rows="table.paged.value"
      :is-loading="listQuery.isPending.value"
      :has-active-filters="hasActiveFilters"
      :currency-labels="currencyLabels"
      :manifest-key="OPS_INSTRUCTIONS_MANIFEST_KEY"
      @row-click="openDetail"
      @clear-filters="clearFilters"
    />
    <TablePagination
      v-if="!listQuery.isPending.value && table.total.value > 0"
      :page="table.page.value"
      :page-size="table.pageSize.value"
      :total="table.total.value"
      :total-pages="table.totalPages.value"
      :page-size-options="PAGE_SIZE_OPTIONS"
      data-testid="instructions-pagination"
      @update:page="table.setPage"
      @update:page-size="table.setPageSize"
    />

    <InstructionDetailModal
      :open="detailOpen"
      :instruction="detailInstruction"
      :can-edit="true"
      :currency-labels="currencyLabels"
      @update:open="onDetailOpenChange"
      @edit="onDetailEdit"
    />
  </div>
</template>
