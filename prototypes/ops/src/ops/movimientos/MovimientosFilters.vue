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
import { activeSponsors } from '@/ops/psp/sponsor-catalog';
import type { SponsorCode } from '@/ops/psp/types';
import type { CatalogOption } from './catalog';

// ════════════════════════════════════════════════════════════════════
// MovimientosFilters — implements part of the Movimientos Requirement.
//
// Per `extend-ops-psp-partner-rename-default-tab-and-filter` the
// per-partner pill cards row was REMOVED — partner is now a Select
// alongside Tipo / Estado / Origen, sourced from `activeSponsors()`.
//
// Type / status / origin options come from a closed catalog (per
// `refine-ops-psp-tab-aware-header-and-multi-sponsor`); each option
// is `{ value, label }` so the dropdown can render a human-readable
// label (e.g. `COLLECTOR IN`) while the on-the-wire value remains
// snake_case (e.g. `COLLECTOR_IN`).
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  search: string;
  sponsor: SponsorCode | null;
  type: string;
  status: string;
  origin: string;
  hasActiveFilters: boolean;
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

// Per `extend-ops-psp-partner-rename-default-tab-and-filter` the
// per-partner pill-cards row is removed; partner is rendered as a
// Select alongside Tipo / Estado / Origen.
const partnerOptions = computed(() =>
  activeSponsors().map((sp) => ({ value: sp.code, label: sp.label })),
);

const partnerModel = computed<string>({
  get: () => props.sponsor || ALL,
  set: (v) => emit('update:sponsor', v === ALL ? null : (v as SponsorCode)),
});

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
  <div class="flex flex-col gap-3" data-testid="activity-filters">
    <!-- Filter row (Partner is now a Select alongside Tipo / Estado / Origen) -->
    <div class="flex flex-wrap items-center gap-2.5">
      <div class="relative w-full max-w-sm sm:w-72">
        <Search class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t-4" />
        <Input
          v-model="localSearch"
          placeholder="Buscar movimientos…"
          class="pl-8"
          data-testid="activity-search"
        />
      </div>

      <Select v-model="partnerModel">
        <SelectTrigger class="w-full sm:w-44" data-testid="activity-filter-partner">
          <SelectValue placeholder="Partner" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Partner · Todos</SelectItem>
          <SelectItem v-for="opt in partnerOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </SelectItem>
        </SelectContent>
      </Select>

      <Select v-model="typeModel">
        <SelectTrigger class="w-full sm:w-40" data-testid="activity-filter-type">
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
        <SelectTrigger class="w-full sm:w-40" data-testid="activity-filter-status">
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
        <SelectTrigger class="w-full sm:w-40" data-testid="activity-filter-origin">
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
        data-testid="activity-clear-filters"
        @click="emit('clear-filters')"
      >
        <X class="h-3.5 w-3.5" />
        Limpiar
      </Button>
    </div>
  </div>
</template>
