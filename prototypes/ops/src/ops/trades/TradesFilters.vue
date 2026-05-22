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
import type { QuotesPeriod } from './types';

// ════════════════════════════════════════════════════════════════════
// TradesFilters — search (left) + filters (right) layout per the
// standardised L3 pattern. No "Quotes" label, no active/historic
// toggle (the page now merges all quotes; the Estado filter handles
// the lifecycle segmentation).
//
// Filters: Período · Estado · Operación · Plazo.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  search: string;
  period: QuotesPeriod;
  status: string;
  operation: string;
  term: string;
  hasActiveFilters: boolean;
  termOptions: ReadonlyArray<string>;
}>();

const emit = defineEmits<{
  'update:search': [value: string];
  'update:period': [value: QuotesPeriod];
  'update:status': [value: string];
  'update:operation': [value: string];
  'update:term': [value: string];
  'clear-filters': [];
}>();

const ALL = '__all__';

// Debounced search → keeps the URL/query churn down while the operator types.
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

const periodModel = computed<string>({
  get: () => props.period,
  set: (v) => emit('update:period', v as QuotesPeriod),
});
const statusModel = computed<string>({
  get: () => props.status || ALL,
  set: (v) => emit('update:status', v === ALL ? '' : v),
});
const operationModel = computed<string>({
  get: () => props.operation || ALL,
  set: (v) => emit('update:operation', v === ALL ? '' : v),
});
const termModel = computed<string>({
  get: () => props.term || ALL,
  set: (v) => emit('update:term', v === ALL ? '' : v),
});
</script>

<template>
  <div class="flex flex-wrap items-center gap-2.5" data-testid="trades-filters">
    <div class="relative w-full max-w-sm sm:w-72">
      <Search
        class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t-4"
      />
      <Input
        v-model="localSearch"
        placeholder="Buscar por nombre de cliente o ID…"
        class="pl-8"
        data-testid="trades-search"
      />
    </div>

    <div class="flex-1" />

    <Select v-model="periodModel">
      <SelectTrigger class="h-9 w-[140px] text-xs" data-testid="trades-filter-period">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todo">Período · Todo</SelectItem>
        <SelectItem value="dia">Período · Día</SelectItem>
        <SelectItem value="semana">Período · Semana</SelectItem>
        <SelectItem value="mes">Período · Mes</SelectItem>
      </SelectContent>
    </Select>

    <Select v-model="statusModel">
      <SelectTrigger class="h-9 w-[150px] text-xs" data-testid="trades-filter-status">
        <SelectValue placeholder="Estado · Todos" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem :value="ALL">Estado · Todos</SelectItem>
        <SelectItem value="PENDING">Pending</SelectItem>
        <SelectItem value="ACCEPTED">Accepted</SelectItem>
        <SelectItem value="COMPLETED">Completed</SelectItem>
        <SelectItem value="REJECTED">Rejected</SelectItem>
        <SelectItem value="EXPIRED">Expired</SelectItem>
      </SelectContent>
    </Select>

    <Select v-model="operationModel">
      <SelectTrigger class="h-9 w-[140px] text-xs" data-testid="trades-filter-operation">
        <SelectValue placeholder="Operación · Todas" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem :value="ALL">Operación · Todas</SelectItem>
        <SelectItem value="BUY">BUY</SelectItem>
        <SelectItem value="SELL">SELL</SelectItem>
      </SelectContent>
    </Select>

    <Select v-model="termModel">
      <SelectTrigger class="h-9 w-[130px] text-xs" data-testid="trades-filter-term">
        <SelectValue placeholder="Plazo · Todos" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem :value="ALL">Plazo · Todos</SelectItem>
        <SelectItem v-for="opt in props.termOptions" :key="opt" :value="opt">
          {{ opt }}
        </SelectItem>
      </SelectContent>
    </Select>

    <Button
      v-if="props.hasActiveFilters"
      variant="ghost"
      size="sm"
      data-testid="trades-clear-filters"
      @click="emit('clear-filters')"
    >
      <X class="h-3.5 w-3.5" />
      Limpiar
    </Button>
  </div>
</template>
