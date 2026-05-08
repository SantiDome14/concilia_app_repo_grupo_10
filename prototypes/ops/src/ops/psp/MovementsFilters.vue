<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Search, X } from 'lucide-vue-next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import { activeSponsors } from './sponsor-catalog';
import type { SponsorCode } from './types';
import type { CatalogOption } from '@/ops/movimientos/catalog';

// ════════════════════════════════════════════════════════════════════
// MovementsFilters — implements part of Requirement 5.
//
// Renders the per-sponsor filter cards (count of movements per
// sponsor in the current view) ABOVE the filter row, and the filter
// row itself (search + 3 selects). Fully presentational; the parent
// owns the state via v-model + emits.
//
// Type / status / origin options come from a closed catalog (per
// `refine-ops-psp-tab-aware-header-and-multi-sponsor`); each option
// is `{ value, label }` so the dropdown can render a human-readable
// label (e.g. `COLLECTOR IN`) while the on-the-wire value remains
// snake_case (e.g. `COLLECTOR_IN`).
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  /** Search input value (synced via v-model:search). */
  search: string;
  /** Active sponsor filter code; null = no filter. */
  sponsor: SponsorCode | null;
  type: string;
  status: string;
  origin: string;
  /** Counts of movements per sponsor in the CURRENT view (after filters). */
  countsBySponsor: Record<SponsorCode, number>;
  hasActiveFilters: boolean;
  /** Type / origin / status options come from the closed catalog. */
  typeOptions: ReadonlyArray<CatalogOption>;
  statusOptions: ReadonlyArray<CatalogOption>;
  originOptions: ReadonlyArray<CatalogOption>;
}>();

const emit = defineEmits<{
  'update:search': [value: string];
  'update:sponsor': [value: SponsorCode | null];
  'update:type': [value: string];
  'update:status': [value: string];
  'update:origin': [value: string];
  'clear-filters': [];
}>();

// Search debounce ──────────────────────────────────────────────────
const ALL = '__all__';
const localSearch = ref(props.search);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.search,
  (v) => {
    if (v !== localSearch.value) localSearch.value = v;
  },
);

watch(localSearch, (v) => {
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    emit('update:search', v.trim());
  }, 300);
});

// Sponsor cards
const cards = computed(() =>
  activeSponsors().map((sp) => ({
    sponsor: sp,
    count: props.countsBySponsor[sp.code] ?? 0,
    isActive: props.sponsor === sp.code,
  })),
);

function toggleSponsor(code: SponsorCode): void {
  emit('update:sponsor', props.sponsor === code ? null : code);
}

// ALL bridges so the Select components can represent "no filter".
const typeModel = computed<string>({
  get: () => props.type || ALL,
  set: (v) => emit('update:type', v === ALL ? '' : v),
});
const statusModel = computed<string>({
  get: () => props.status || ALL,
  set: (v) => emit('update:status', v === ALL ? '' : v),
});
const originModel = computed<string>({
  get: () => props.origin || ALL,
  set: (v) => emit('update:origin', v === ALL ? '' : v),
});
</script>

<template>
  <div class="flex flex-col gap-3" data-testid="movements-filters">
    <!-- Per-sponsor filter cards -->
    <div class="flex flex-wrap gap-2" data-testid="movements-sponsor-cards">
      <button
        v-for="card in cards"
        :key="card.sponsor.code"
        type="button"
        :class="
          cn(
            'inline-flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition-all',
            card.isActive
              ? 'border-brand bg-brand-bg text-brand'
              : 'border-b-1 bg-card text-t-2 hover:border-b-2 hover:bg-card-2',
          )
        "
        :aria-pressed="card.isActive"
        :data-testid="`movements-sponsor-card-${card.sponsor.code}`"
        @click="toggleSponsor(card.sponsor.code)"
      >
        <span>{{ card.sponsor.label }}</span>
        <Badge variant="neutral" class="font-mono">{{ card.count }}</Badge>
      </button>
    </div>

    <!-- Filter row -->
    <div class="flex flex-wrap items-center gap-2.5">
      <div class="relative w-full max-w-sm sm:w-72">
        <Search class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t-4" />
        <Input
          v-model="localSearch"
          placeholder="Buscar movimientos…"
          class="pl-8"
          data-testid="movements-search"
        />
      </div>

      <Select v-model="typeModel">
        <SelectTrigger class="w-full sm:w-40" data-testid="movements-filter-type">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Todos los tipos</SelectItem>
          <SelectItem v-for="opt in props.typeOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </SelectItem>
        </SelectContent>
      </Select>

      <Select v-model="statusModel">
        <SelectTrigger class="w-full sm:w-40" data-testid="movements-filter-status">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Todos los estados</SelectItem>
          <SelectItem v-for="opt in props.statusOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </SelectItem>
        </SelectContent>
      </Select>

      <Select v-model="originModel">
        <SelectTrigger class="w-full sm:w-40" data-testid="movements-filter-origin">
          <SelectValue placeholder="Origen" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Todos los orígenes</SelectItem>
          <SelectItem v-for="opt in props.originOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </SelectItem>
        </SelectContent>
      </Select>

      <Button
        v-if="props.hasActiveFilters"
        variant="ghost"
        size="sm"
        data-testid="movements-clear-filters"
        @click="emit('clear-filters')"
      >
        <X class="h-3.5 w-3.5" />
        Limpiar
      </Button>
    </div>
  </div>
</template>
