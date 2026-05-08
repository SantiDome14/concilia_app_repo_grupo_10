<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { useRoute, useRouter } from 'vue-router';
import { UserPlus, FileText } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import { useCapabilities } from '@/composables/useCapabilities';
import { listClients } from '@/ops/clients/api';
import ClientsTable from '@/ops/clients/ClientsTable.vue';
import ClientFilters from '@/ops/clients/ClientFilters.vue';
import SignUpUserModal from '@/ops/clients/SignUpUserModal.vue';
import GenerateStatementModal from '@/ops/statements/GenerateStatementModal.vue';
import type { Client } from '@/ops/clients/types';

// ════════════════════════════════════════════════════════════════════
// Clients page — implements ops-clients Requirements 1, 2, 3, 4, 5,
// 10, 11. Type-A master list. Row click navigates to /clients/:id
// (the detail surface is a full route — Decision 1, NOT a modal).
//
// Capabilities (declared inline per design.md cross-capability table):
//   - clients:invite     → Alta CTA (or fallback to OPS_ADMIN role)
//   - clients:statement  → Generar Statement CTA (per ops-statements
//                          Requirement 6)
//
// `useCapabilities()` gracefully degrades to false when no roles are
// configured (template's first-run mode).
// ════════════════════════════════════════════════════════════════════

const route = useRoute();
const router = useRouter();
const { can } = useCapabilities();

const canInvite = computed(() => can('clients:invite') || can('OPS_ADMIN'));
const canGenerateStatement = computed(() => can('clients:statement') || can('OPS_ADMIN'));

// ─── Filters (URL-reflected, debounced for text per Requirement 3) ───
const PAGE_SIZE_KEY = 'ops:clients:pageSize';
const initialPageSize = (() => {
  const stored = typeof window !== 'undefined' ? window.localStorage.getItem(PAGE_SIZE_KEY) : null;
  const parsed = stored ? Number(stored) : NaN;
  return [10, 25, 50, 100].includes(parsed) ? parsed : 25;
})();

const appliedName = ref<string>(typeof route.query.name === 'string' ? route.query.name : '');
const page = ref<number>(Number(route.query.page) || 1);
const pageSize = ref<number>(initialPageSize);

// ─── URL sync ───────────────────────────────────────────────────────
watch(
  [appliedName, page, pageSize],
  ([name, p, ps]) => {
    void router.replace({
      query: {
        ...(name ? { name } : {}),
        ...(p > 1 ? { page: String(p) } : {}),
        ...(ps !== 25 ? { pageSize: String(ps) } : {}),
      },
    });
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PAGE_SIZE_KEY, String(ps));
    }
  },
);

const hasActiveFilters = computed(() => Boolean(appliedName.value));

function clearFilters(): void {
  appliedName.value = '';
  page.value = 1;
}

// ─── Autocomplete suggestions (Requirement 3) ───────────────────────
const suggestions = ref<Client[]>([]);
const isSearchingSuggestions = ref(false);

async function runSuggestions(query: string): Promise<void> {
  isSearchingSuggestions.value = true;
  try {
    const res = await listClients({ page: 1, pageSize: 50, ...(query ? { name: query } : {}) });
    suggestions.value = res.clients;
  } catch {
    suggestions.value = [];
  } finally {
    isSearchingSuggestions.value = false;
  }
}

function applyName(value: string): void {
  appliedName.value = value;
  page.value = 1;
}

// ─── List query ─────────────────────────────────────────────────────
const queryParams = computed(() => ({
  ...(appliedName.value ? { name: appliedName.value } : {}),
  page: page.value,
  pageSize: pageSize.value,
}));

const queryKey = computed(() => ['ops', 'clients', 'list', queryParams.value] as const);

const {
  data: listData,
  isPending: isListPending,
} = useQuery({
  queryKey,
  queryFn: () => listClients(queryParams.value),
});

const rows = computed<Client[]>(() => listData.value?.clients ?? []);
const total = computed<number>(() => listData.value?.total ?? 0);
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

// ─── Row click → detail page ────────────────────────────────────────
function onRowClick(client: Client): void {
  void router.push(`/clients/${client.id}`);
}

// ─── SignUp modal ───────────────────────────────────────────────────
const signUpOpen = ref(false);
function openSignUp(): void {
  signUpOpen.value = true;
}

// ─── Generate Statement modal (no client pre-populated from master) ─
const statementOpen = ref(false);
function openStatement(): void {
  statementOpen.value = true;
}
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <!-- L1 page header (per core-layout) -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-t-1">Clientes</h1>
        <p class="text-xs text-t-4">
          Listado de clientes operativos del sistema.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button
          v-if="canGenerateStatement"
          variant="secondary"
          data-testid="clients-statement-cta"
          @click="openStatement"
        >
          <FileText class="h-4 w-4" />
          Generar Statement
        </Button>
        <Button
          v-if="canInvite"
          variant="primary"
          data-testid="clients-invite-cta"
          @click="openSignUp"
        >
          <UserPlus class="h-4 w-4" />
          Alta de Cliente en APP
        </Button>
      </div>
    </div>

    <!-- Filters row -->
    <ClientFilters
      :model-value="appliedName"
      :suggestions="suggestions"
      :is-searching="isSearchingSuggestions"
      :has-active-filters="hasActiveFilters"
      @search="runSuggestions"
      @update:model-value="applyName"
      @clear-filters="clearFilters"
    />

    <!-- Table -->
    <ClientsTable
      :rows="rows"
      :is-loading="isListPending"
      :has-active-filters="hasActiveFilters"
      @row-click="onRowClick"
      @clear-filters="clearFilters"
    />

    <!-- Pagination footer -->
    <div
      v-if="!isListPending && rows.length > 0"
      class="flex items-center justify-between text-xs text-t-4"
    >
      <div>
        Página {{ page }} de {{ totalPages }} · {{ total }} cliente{{ total === 1 ? '' : 's' }}
      </div>
      <div class="flex gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          :disabled="page <= 1"
          data-testid="clients-pagination-prev"
          @click="page = Math.max(1, page - 1)"
        >
          Anterior
        </Button>
        <Button
          variant="ghost"
          size="sm"
          :disabled="page >= totalPages"
          data-testid="clients-pagination-next"
          @click="page = Math.min(totalPages, page + 1)"
        >
          Siguiente
        </Button>
      </div>
    </div>

    <!-- SignUp modal -->
    <SignUpUserModal v-model:open="signUpOpen" />

    <!-- Generate Statement modal (no client pre-populated from master entry) -->
    <GenerateStatementModal v-model:open="statementOpen" />
  </div>
</template>
