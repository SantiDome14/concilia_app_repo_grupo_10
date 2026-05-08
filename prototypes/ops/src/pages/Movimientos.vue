<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { useRoute, useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { useCapabilities } from '@/composables/useCapabilities';
import {
  getMovement,
  listMovements,
} from '@/ops/movimientos/api';
import MovimientosFilters from '@/ops/movimientos/MovimientosFilters.vue';
import MovimientosTable from '@/ops/movimientos/MovimientosTable.vue';
import MovementDetailsModal from '@/ops/movimientos/MovementDetailsModal.vue';
import type { Movement, MovementDetails } from '@/ops/movimientos/types';
import type { SponsorCode } from '@/ops/psp/types';

// ════════════════════════════════════════════════════════════════════
// Movimientos page — implements ops-movimientos Requirements 1-7.
// Type-A master list at /movimientos. v1 read-only at the
// data-mutation level — Create Movement / Import SWIFT CTAs are
// hidden (their follow-ups are nominated). Row click opens the
// shared <MovementDetailsModal>.
// ════════════════════════════════════════════════════════════════════

const route = useRoute();
const router = useRouter();
const { can } = useCapabilities();

const canRead = computed(() => can('movimientos:read') || can('OPS_ADMIN'));

// ─── Filter state (URL-reflected) ──────────────────────────────────
const sponsorFilter = ref<SponsorCode | null>(
  typeof route.query.sponsor === 'string' ? route.query.sponsor : null,
);
const movSearch = ref<string>(typeof route.query.search === 'string' ? route.query.search : '');
const movType = ref<string>(typeof route.query.type === 'string' ? route.query.type : '');
const movStatus = ref<string>(typeof route.query.status === 'string' ? route.query.status : '');
const movOrigin = ref<string>(typeof route.query.origin === 'string' ? route.query.origin : '');
const movPage = ref<number>(Number(route.query.page) || 1);
const movPageSize = 25;

// ─── URL sync ───────────────────────────────────────────────────────
watch(
  [sponsorFilter, movSearch, movType, movStatus, movOrigin, movPage],
  ([sponsor, search, type, status, origin, page]) => {
    const next: Record<string, string> = {};
    if (sponsor) next.sponsor = sponsor;
    if (search) next.search = search;
    if (type) next.type = type;
    if (status) next.status = status;
    if (origin) next.origin = origin;
    if (page > 1) next.page = String(page);
    if (typeof route.query.movement === 'string') next.movement = route.query.movement;
    void router.replace({ query: next });
  },
);

// ─── Movements query ────────────────────────────────────────────────
const movQueryParams = computed(() => ({
  ...(sponsorFilter.value ? { sponsor: sponsorFilter.value } : {}),
  ...(movSearch.value ? { search: movSearch.value } : {}),
  ...(movType.value ? { type: movType.value } : {}),
  ...(movStatus.value ? { status: movStatus.value } : {}),
  ...(movOrigin.value ? { origin: movOrigin.value } : {}),
  page: movPage.value,
  pageSize: movPageSize,
}));

const movementsQuery = useQuery({
  queryKey: computed(() => ['ops', 'movimientos', 'list', movQueryParams.value] as const),
  queryFn: () => listMovements(movQueryParams.value),
  enabled: canRead,
});

const movements = computed(() => movementsQuery.data.value?.data ?? []);
const movementsTotal = computed(() => movementsQuery.data.value?.total ?? 0);

const hasActiveFilters = computed(
  () =>
    Boolean(sponsorFilter.value) ||
    Boolean(movSearch.value) ||
    Boolean(movType.value) ||
    Boolean(movStatus.value) ||
    Boolean(movOrigin.value),
);

const movementsCountsBySponsor = computed<Record<SponsorCode, number>>(() => {
  const counts: Record<SponsorCode, number> = {};
  for (const m of movements.value) {
    if (!m.sponsor) continue;
    counts[m.sponsor] = (counts[m.sponsor] ?? 0) + 1;
  }
  return counts;
});

const typeOptions = computed(() =>
  Array.from(new Set(movements.value.map((m) => m.type).filter(Boolean))).sort(),
);
const statusOptions = computed(() =>
  Array.from(new Set(movements.value.map((m) => m.status).filter(Boolean))).sort(),
);
const originOptions = computed(() => ['MANUAL', 'SWIFT', 'AUTO']);

function clearFilters(): void {
  sponsorFilter.value = null;
  movSearch.value = '';
  movType.value = '';
  movStatus.value = '';
  movOrigin.value = '';
  movPage.value = 1;
}

// ─── Movement details modal ─────────────────────────────────────────
const detailsOpen = ref(false);
const detailsMovement = ref<MovementDetails | null>(null);

async function openDetails(movement: Movement): Promise<void> {
  try {
    const fetched = await getMovement(movement.id);
    detailsMovement.value = fetched;
    detailsOpen.value = true;
    void router.replace({ query: { ...route.query, movement: movement.id } });
  } catch {
    detailsMovement.value = null;
  }
}

function onDetailsOpenChange(value: boolean): void {
  detailsOpen.value = value;
  if (!value) {
    detailsMovement.value = null;
    const next = { ...route.query };
    delete next.movement;
    void router.replace({ query: next });
  }
}

// Auto-open from `?movement=:id` deep-link.
watch(
  () => route.query.movement,
  async (id, prev) => {
    if (id === prev) return;
    if (typeof id !== 'string' || !id) return;
    if (detailsOpen.value && detailsMovement.value?.id === id) return;
    try {
      detailsMovement.value = await getMovement(id);
      detailsOpen.value = true;
    } catch {
      detailsMovement.value = null;
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex flex-col gap-5 p-6">
    <div class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-t-1">Movimientos</h1>
        <p class="text-xs text-t-4">Movimientos consolidados de la operación.</p>
      </div>
    </div>

    <MovimientosFilters
      :search="movSearch"
      :sponsor="sponsorFilter"
      :type="movType"
      :status="movStatus"
      :origin="movOrigin"
      :counts-by-sponsor="movementsCountsBySponsor"
      :has-active-filters="hasActiveFilters"
      :type-options="typeOptions"
      :status-options="statusOptions"
      :origin-options="originOptions"
      @update:search="(v: string) => { movSearch = v; movPage = 1; }"
      @update:sponsor="(v: string | null) => { sponsorFilter = v; movPage = 1; }"
      @update:type="(v: string) => { movType = v; movPage = 1; }"
      @update:status="(v: string) => { movStatus = v; movPage = 1; }"
      @update:origin="(v: string) => { movOrigin = v; movPage = 1; }"
      @clear-filters="clearFilters"
    />
    <MovimientosTable
      :rows="movements"
      :is-loading="movementsQuery.isPending.value"
      :has-active-filters="hasActiveFilters"
      @row-click="openDetails"
      @clear-filters="clearFilters"
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
          data-testid="movimientos-prev"
          @click="movPage = Math.max(1, movPage - 1)"
        >
          Anterior
        </Button>
        <Button
          variant="ghost"
          size="sm"
          :disabled="movements.length < movPageSize"
          data-testid="movimientos-next"
          @click="movPage += 1"
        >
          Siguiente
        </Button>
      </div>
    </div>

    <MovementDetailsModal
      :open="detailsOpen"
      :movement="detailsMovement"
      @update:open="onDetailsOpenChange"
    />
  </div>
</template>
