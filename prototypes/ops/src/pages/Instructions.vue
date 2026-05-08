<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQuery, useQueryClient, useMutation } from '@tanstack/vue-query';
import { useRoute, useRouter } from 'vue-router';
import { Plus, X } from 'lucide-vue-next';
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
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCapabilities } from '@/composables/useCapabilities';
import {
  listInstructions,
  getInstruction,
  deleteInstruction,
} from '@/ops/instructions/api';
import InstructionsTable from '@/ops/instructions/InstructionsTable.vue';
import CreateInstructionModal from '@/ops/instructions/CreateInstructionModal.vue';
import EditInstructionModal from '@/ops/instructions/EditInstructionModal.vue';
import InstructionDetailModal from '@/ops/instructions/InstructionDetailModal.vue';
import type {
  Instruction,
  InstructionWithAttributes,
} from '@/ops/instructions/types';

// ════════════════════════════════════════════════════════════════════
// Instructions page — implements ops-instructions Requirements 1, 3,
// 4, 7, 8, 9. The page composes the table + filters + modals; the
// modals own the form orchestration.
//
// Capabilities (declared inline per design.md Decision 4):
//   - instructions:create  → Crear CTA + Edit action
//   - instructions:delete  → Eliminar action
//
// The capabilities composable gracefully degrades to false when no
// roles are configured (template's first-run mode).
// ════════════════════════════════════════════════════════════════════

const route = useRoute();
const router = useRouter();
const queryClient = useQueryClient();
const { can } = useCapabilities();

const canCreate = computed(() => can('instructions:create') || can('OPS_ADMIN'));
const canEdit = computed(() => can('instructions:edit') || can('OPS_ADMIN'));
const canDelete = computed(() => can('instructions:delete') || can('OPS_ADMIN'));

// ─── Filters (URL-reflected, debounced for text per Requirement 3) ───
const PAGE_SIZE_KEY = 'ops:instructions:pageSize';
const initialPageSize = (() => {
  const stored = typeof window !== 'undefined' ? window.localStorage.getItem(PAGE_SIZE_KEY) : null;
  const parsed = stored ? Number(stored) : NaN;
  return [10, 25, 50, 100].includes(parsed) ? parsed : 25;
})();

const nameInput = ref<string>(typeof route.query.name === 'string' ? route.query.name : '');
const debouncedName = ref<string>(nameInput.value);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(nameInput, (v) => {
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debouncedName.value = v;
  }, 300);
});

const currencyId = ref<string>(typeof route.query.currency_id === 'string' ? route.query.currency_id : '');
const page = ref<number>(Number(route.query.page) || 1);
const pageSize = ref<number>(initialPageSize);

// ─── Currencies catalog (mocked for now; real: GET /currencies) ──────
const currencies = ref<{ value: string; label: string }[]>([
  { value: 'ARS', label: 'ARS · Pesos argentinos' },
  { value: 'USD', label: 'USD · Dólares' },
  { value: 'EUR', label: 'EUR · Euros' },
  { value: 'USDT', label: 'USDT · Tether' },
  { value: 'USDC', label: 'USDC · USD Coin' },
]);
const currencyLabels = computed(() =>
  Object.fromEntries(currencies.value.map((c) => [c.value, c.label.split(' · ')[0]!])),
);

// ─── URL sync for filters (Requirement 3 Back-nav restoration) ───────
watch(
  [debouncedName, currencyId, page, pageSize],
  ([name, currency, p, ps]) => {
    void router.replace({
      query: {
        ...(name ? { name } : {}),
        ...(currency ? { currency_id: currency } : {}),
        ...(p > 1 ? { page: String(p) } : {}),
        ...(ps !== 25 ? { pageSize: String(ps) } : {}),
        ...(typeof route.query.detail === 'string' ? { detail: route.query.detail } : {}),
        ...(typeof route.query.edit === 'string' ? { edit: route.query.edit } : {}),
      },
    });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PAGE_SIZE_KEY, String(ps));
    }
  },
);

const hasActiveFilters = computed(
  () => Boolean(debouncedName.value) || Boolean(currencyId.value),
);

function clearFilters(): void {
  nameInput.value = '';
  debouncedName.value = '';
  currencyId.value = '';
  page.value = 1;
}

// ─── List query ──────────────────────────────────────────────────────
const queryParams = computed(() => ({
  ...(debouncedName.value ? { name: debouncedName.value } : {}),
  ...(currencyId.value ? { currency_id: currencyId.value } : {}),
  page: page.value,
  pageSize: pageSize.value,
}));

const queryKey = computed(() => ['ops', 'instructions', 'list', queryParams.value] as const);

const {
  data: listData,
  isPending: isListPending,
} = useQuery({
  queryKey,
  queryFn: () => listInstructions(queryParams.value),
});

const rows = computed<Instruction[]>(() => listData.value?.data ?? []);
const totalPages = computed(() => listData.value?.pagination.totalPages ?? 1);

function invalidateList(): void {
  void queryClient.invalidateQueries({ queryKey: ['ops', 'instructions', 'list'] });
}

// ─── Modals (Requirements 4, 7, 8) ───────────────────────────────────
const createOpen = ref(false);
const editOpen = ref(false);
const detailOpen = ref(false);
const detailInstruction = ref<InstructionWithAttributes | null>(null);
const editInstruction = ref<InstructionWithAttributes | null>(null);
const deleteTarget = ref<Instruction | null>(null);
const isDeleting = ref(false);

async function openDetail(id: string): Promise<void> {
  try {
    const fetched = await getInstruction(id);
    detailInstruction.value = fetched;
    detailOpen.value = true;
    void router.replace({ query: { ...route.query, detail: id } });
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'No se pudo cargar la instrucción');
  }
}

function closeDetail(): void {
  detailOpen.value = false;
  detailInstruction.value = null;
  const next = { ...route.query };
  delete next.detail;
  void router.replace({ query: next });
}

async function openEdit(id: string): Promise<void> {
  try {
    const fetched = await getInstruction(id);
    editInstruction.value = fetched;
    editOpen.value = true;
    void router.replace({ query: { ...route.query, edit: id } });
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'No se pudo cargar la instrucción');
  }
}

function closeEdit(): void {
  editOpen.value = false;
  editInstruction.value = null;
  const next = { ...route.query };
  delete next.edit;
  void router.replace({ query: next });
}

function onRowClick(instruction: Instruction): void {
  void openDetail(instruction.id);
}

function onTableEdit(instruction: Instruction): void {
  void openEdit(instruction.id);
}

function onDetailEdit(): void {
  if (!detailInstruction.value) return;
  const id = detailInstruction.value.id;
  closeDetail();
  void openEdit(id);
}

// ─── Eliminar (Requirement 8) ────────────────────────────────────────
const deleteMutation = useMutation({
  mutationFn: (id: string) => deleteInstruction(id),
});

function onTableDelete(instruction: Instruction): void {
  deleteTarget.value = instruction;
}

function cancelDelete(): void {
  if (isDeleting.value) return;
  deleteTarget.value = null;
}

async function confirmDelete(): Promise<void> {
  if (!deleteTarget.value) return;
  const target = deleteTarget.value;
  isDeleting.value = true;
  try {
    await deleteMutation.mutateAsync(target.id);
    toast.success('Instrucción eliminada');
    deleteTarget.value = null;
    invalidateList();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'No se pudo eliminar la instrucción');
  } finally {
    isDeleting.value = false;
  }
}

// ─── Detail/edit deep-link rehydration on mount ──────────────────────
const detailQuery = computed(() =>
  typeof route.query.detail === 'string' ? route.query.detail : null,
);
const editQuery = computed(() => (typeof route.query.edit === 'string' ? route.query.edit : null));

watch(
  detailQuery,
  (id) => {
    if (id && !detailOpen.value) void openDetail(id);
  },
  { immediate: true },
);
watch(
  editQuery,
  (id) => {
    if (id && !editOpen.value) void openEdit(id);
  },
  { immediate: true },
);

// ─── Modal updates from Create/Edit (Requirement 6) ─────────────────
function onCreated(): void {
  invalidateList();
}
function onUpdated(): void {
  invalidateList();
}
</script>

<template>
  <div class="space-y-4 px-6 py-6">
    <!-- Header -->
    <header class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-t-1">Instrucciones</h1>
        <p class="text-sm text-t-3">
          Templates de routing de pago. Cada instrucción puede tener atributos personalizados.
        </p>
      </div>
      <Button
        v-if="canCreate"
        variant="primary"
        class="gap-2"
        @click="createOpen = true"
      >
        <Plus class="h-4 w-4" />
        Crear instrucción
      </Button>
    </header>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-3 rounded-lg border border-b-2 bg-card p-3">
      <Input
        v-model="nameInput"
        placeholder="Buscar por nombre…"
        class="w-64"
        aria-label="Filtrar por nombre"
      />
      <Select v-model="currencyId">
        <SelectTrigger class="w-48" aria-label="Filtrar por moneda">
          <SelectValue placeholder="Todas las monedas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todas las monedas</SelectItem>
          <SelectItem v-for="c in currencies" :key="c.value" :value="c.value">
            {{ c.label }}
          </SelectItem>
        </SelectContent>
      </Select>
      <Button
        v-if="hasActiveFilters"
        variant="ghost"
        size="sm"
        class="gap-1.5"
        @click="clearFilters"
      >
        <X class="h-3.5 w-3.5" />
        Limpiar filtros
      </Button>
    </div>

    <!-- Table -->
    <InstructionsTable
      :rows="rows"
      :is-loading="isListPending"
      :has-active-filters="hasActiveFilters"
      :can-edit="canEdit"
      :can-delete="canDelete"
      :currency-labels="currencyLabels"
      @row-click="onRowClick"
      @edit="onTableEdit"
      @delete="onTableDelete"
      @clear-filters="clearFilters"
    />

    <!-- Pagination (compact) -->
    <div
      v-if="rows.length > 0 && totalPages > 1"
      class="flex items-center justify-end gap-2 text-sm text-t-3"
    >
      <Button
        variant="ghost"
        size="sm"
        :disabled="page === 1"
        @click="page = Math.max(1, page - 1)"
      >
        Anterior
      </Button>
      <span class="px-2">Página {{ page }} de {{ totalPages }}</span>
      <Button
        variant="ghost"
        size="sm"
        :disabled="page >= totalPages"
        @click="page = Math.min(totalPages, page + 1)"
      >
        Siguiente
      </Button>
    </div>

    <!-- Modals -->
    <CreateInstructionModal
      v-model:open="createOpen"
      :currencies="currencies"
      @created="onCreated"
    />
    <EditInstructionModal
      v-model:open="editOpen"
      :instruction="editInstruction"
      :currencies="currencies"
      @update:open="(v) => { if (!v) closeEdit(); }"
      @updated="onUpdated"
    />
    <InstructionDetailModal
      v-model:open="detailOpen"
      :instruction="detailInstruction"
      :can-edit="canEdit"
      @update:open="(v) => { if (!v) closeDetail(); }"
      @edit="onDetailEdit"
    />

    <!-- Destructive Eliminar dialog (Requirement 8) -->
    <Dialog
      :open="deleteTarget !== null"
      @update:open="(v) => (v ? null : cancelDelete())"
    >
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Eliminar instrucción</DialogTitle>
          <DialogDescription v-if="deleteTarget">
            Eliminar la instrucción "{{ deleteTarget.name }}" de la moneda
            {{ currencyLabels[deleteTarget.currency_id] ?? deleteTarget.currency_id }}?
            Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" :disabled="isDeleting" @click="cancelDelete">
            Cancelar
          </Button>
          <Button variant="danger" :disabled="isDeleting" @click="confirmDelete">
            {{ isDeleting ? 'Eliminando…' : 'Eliminar' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
