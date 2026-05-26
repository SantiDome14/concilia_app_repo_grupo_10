<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { Search, Users } from 'lucide-vue-next';
import { refDebounced } from '@vueuse/core';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/feedback/EmptyState.vue';
import Skeleton from '@/components/feedback/Skeleton.vue';
import TablePagination from '@/components/data-display/TablePagination.vue';
import { ROUTE_NAMES } from '@/config/routes';
import { useClientsList } from '@/composables/useClientsList';
import { usePersistedPageSize, isAllowedPageSize, type AllowedPageSize } from '@/composables/usePersistedPageSize';
import { displayValueOrDash } from '@/types/client';

// ════════════════════════════════════════════════════════════════════
// TRD — Clientes (Type-A master list)
// ────────────────────────────────────────────────────────────────────
// Contract: openspec/changes/add-trd-clients/specs/trd-clients/spec.md
//
// State is URL-driven (q · page · pageSize). Page-size choice is also
// persisted to localStorage via `usePersistedPageSize`; the URL wins
// on conflict so shared links carry intent. Search is debounced 300ms
// before firing the backend query.
// ════════════════════════════════════════════════════════════════════

const router = useRouter();
const route = useRoute();

// ─── Initial state from the URL (URL is authoritative on cold load) ──
function readNumber(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readPageSize(value: unknown, fallback: AllowedPageSize): AllowedPageSize {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (Number.isFinite(parsed) && isAllowedPageSize(parsed)) return parsed;
  return fallback;
}

// Page-size: localStorage default, but URL overrides on cold load.
const persistedPageSize = usePersistedPageSize('trd.clients.pageSize', 25);
const initialPageSize = readPageSize(route.query.pageSize, persistedPageSize.value);
persistedPageSize.value = initialPageSize;

const search = ref<string>(String(route.query.q ?? ''));
const debouncedSearch = refDebounced(search, 300);
const page = ref<number>(readNumber(route.query.page, 1));
const pageSize = persistedPageSize;

// ─── Query — vue-query, paginated, keepPreviousData to avoid flicker ─
const filters = computed(() => ({
  q: debouncedSearch.value.trim() || undefined,
  page: page.value,
  pageSize: pageSize.value,
}));

const query = useClientsList(filters);
const items = computed(() => query.data.value?.data ?? []);
const pagination = computed(
  () => query.data.value?.pagination ?? { page: 1, pageSize: pageSize.value, total: 0, totalPages: 1 },
);

// ─── URL sync — every state change replaces the URL ──────────────────
watch(
  [debouncedSearch, page, pageSize],
  () => {
    const newQuery: Record<string, string> = {};
    const q = debouncedSearch.value.trim();
    if (q) newQuery.q = q;
    if (page.value !== 1) newQuery.page = String(page.value);
    newQuery.pageSize = String(pageSize.value);
    router.replace({ query: newQuery });
  },
  { flush: 'post' },
);

// ─── Search resets to page 1 ────────────────────────────────────────
watch(debouncedSearch, () => {
  page.value = 1;
});

// ─── Row navigation ─────────────────────────────────────────────────
function openClient(id: string): void {
  router.push({ name: ROUTE_NAMES.CLIENT_DETAIL, params: { id } });
}

// ─── Empty-state copy is search-aware ───────────────────────────────
const emptyTitle = computed(() => 'No se encontraron clientes');
const emptyDescription = computed(() =>
  search.value.trim() ? 'Probá ajustar la búsqueda.' : 'Aún no hay clientes registrados.',
);

const isInitialLoading = computed(
  () => query.isLoading.value && !query.data.value,
);
</script>

<template>
  <div class="flex flex-col gap-5" data-testid="clients-page">
    <!-- L1 — page header (title only; no CTA in v1) -->
    <header class="flex items-center justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-[22px] font-extrabold tracking-tight text-t-1">Clientes</h1>
        <p class="text-[13px] text-t-4">
          Maestro transversal de clientes con sus límites y balances asociados.
        </p>
      </div>
    </header>

    <!-- L3 — search input -->
    <div class="flex items-center gap-3">
      <div class="relative w-[320px]">
        <Search class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t-4" />
        <Input
          v-model="search"
          placeholder="Buscar por nombre o legajo..."
          class="pl-8"
          data-testid="clients-search"
        />
      </div>
    </div>

    <!-- Skeleton on cold load -->
    <div
      v-if="isInitialLoading"
      class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2"
      data-testid="clients-skeleton"
    >
      <div class="border-b border-b-2 px-[18px] py-2.5">
        <Skeleton class="h-3 w-32" />
      </div>
      <div v-for="i in 5" :key="i" class="flex items-center gap-4 border-b border-b-1 px-[18px] py-3 last:border-b-0">
        <Skeleton class="h-3 w-1/3" />
        <Skeleton class="h-3 w-1/5" />
        <Skeleton class="h-3 w-16" />
      </div>
    </div>

    <!-- Empty state -->
    <EmptyState
      v-else-if="items.length === 0"
      :icon="Users"
      :title="emptyTitle"
      :description="emptyDescription"
      data-testid="clients-empty"
    />

    <!-- Table -->
    <div
      v-else
      class="overflow-hidden rounded-[10px] border border-b-2 bg-card-2"
      data-testid="clients-table"
    >
      <table class="w-full border-collapse">
        <thead>
          <tr class="border-b border-b-2">
            <th class="px-[18px] py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Nombre</th>
            <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Legajo Ardua</th>
            <th class="px-3.5 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-t-3">Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="c in items"
            :key="c.id"
            class="cursor-pointer border-b border-b-1 transition-colors last:border-b-0 hover:bg-white/[0.02]"
            :data-testid="`row-${c.id}`"
            @click="openClient(c.id)"
          >
            <td class="px-[18px] py-2.5 text-[13px] font-semibold text-t-2">{{ c.name }}</td>
            <td class="px-3.5 py-2.5 font-mono text-xs text-t-3">{{ displayValueOrDash(c.ardua_docket) }}</td>
            <td class="px-3.5 py-2.5">
              <Badge :variant="c.is_active ? 'success' : 'neutral'">
                {{ c.is_active ? 'Activo' : 'Inactivo' }}
              </Badge>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination footer -->
    <TablePagination
      v-if="items.length > 0"
      :page="pagination.page"
      :page-size="pagination.pageSize"
      :total="pagination.total"
      :total-pages="pagination.totalPages"
      :page-size-options="[10, 25, 50, 100]"
      @update:page="(v: number) => (page = v)"
      @update:page-size="(v: number) => {
        if (isAllowedPageSize(v)) pageSize = v;
      }"
    />
  </div>
</template>
