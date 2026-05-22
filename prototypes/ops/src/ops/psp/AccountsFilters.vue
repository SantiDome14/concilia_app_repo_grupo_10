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
import { activeSponsors } from './sponsor-catalog';
import type { SponsorCode } from './types';

// ════════════════════════════════════════════════════════════════════
// AccountsFilters — L3 filter row for the PSP Cuentas tab. Search left
// + flex-1 + filters right (Partner · Moneda · Estado).
//
// CBU-padre records are intentionally excluded from this table
// (operator review 2026-05-22 — they live in the Posición tab tree
// and each CVU row surfaces its parent CBU as a column). Without
// CBUs on the surface, the previous "Tipo" filter loses its purpose
// and was dropped.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  search: string;
  sponsor: SponsorCode | null;
  currency: string;
  status: string;
  hasActiveFilters: boolean;
  currencyOptions: ReadonlyArray<string>;
}>();

const emit = defineEmits<{
  'update:search': [value: string];
  'update:sponsor': [value: SponsorCode | null];
  'update:currency': [value: string];
  'update:status': [value: string];
  'clear-filters': [];
}>();

const ALL = '__all__';

// Debounced search keeps URL/query churn down while the operator types.
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
  debounceTimer = setTimeout(() => emit('update:search', v.trim()), 300);
});

const partnerOptions = computed(() =>
  activeSponsors().map((sp) => ({ value: sp.code, label: sp.label })),
);

const partnerModel = computed<string>({
  get: () => props.sponsor || ALL,
  set: (v) => emit('update:sponsor', v === ALL ? null : (v as SponsorCode)),
});
const currencyModel = computed<string>({
  get: () => props.currency || ALL,
  set: (v) => emit('update:currency', v === ALL ? '' : v),
});
const statusModel = computed<string>({
  get: () => props.status || ALL,
  set: (v) => emit('update:status', v === ALL ? '' : v),
});
</script>

<template>
  <div class="flex flex-wrap items-center gap-2.5" data-testid="accounts-filters">
    <div class="relative w-full max-w-sm sm:w-72">
      <Search
        class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t-4"
      />
      <Input
        v-model="localSearch"
        placeholder="Buscar por cuenta, owner, CVU o alias…"
        class="pl-8"
        data-testid="accounts-search"
      />
    </div>

    <div class="flex-1" />

    <Select v-model="partnerModel">
      <SelectTrigger class="h-9 w-[150px] text-xs" data-testid="accounts-filter-partner">
        <SelectValue placeholder="Partner · Todos" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem :value="ALL">Partner · Todos</SelectItem>
        <SelectItem v-for="opt in partnerOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </SelectItem>
      </SelectContent>
    </Select>

    <Select v-model="currencyModel">
      <SelectTrigger class="h-9 w-[130px] text-xs" data-testid="accounts-filter-currency">
        <SelectValue placeholder="Moneda · Todas" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem :value="ALL">Moneda · Todas</SelectItem>
        <SelectItem v-for="opt in props.currencyOptions" :key="opt" :value="opt">
          {{ opt }}
        </SelectItem>
      </SelectContent>
    </Select>

    <Select v-model="statusModel">
      <SelectTrigger class="h-9 w-[140px] text-xs" data-testid="accounts-filter-status">
        <SelectValue placeholder="Estado · Todos" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem :value="ALL">Estado · Todos</SelectItem>
        <SelectItem value="ACTIVE">Active</SelectItem>
        <SelectItem value="PAUSED">Paused</SelectItem>
        <SelectItem value="INACTIVE">Inactive</SelectItem>
        <SelectItem value="BLOCKED">Blocked</SelectItem>
      </SelectContent>
    </Select>

    <Button
      v-if="props.hasActiveFilters"
      variant="ghost"
      size="sm"
      data-testid="accounts-clear-filters"
      @click="emit('clear-filters')"
    >
      <X class="h-3.5 w-3.5" />
      Limpiar
    </Button>
  </div>
</template>
