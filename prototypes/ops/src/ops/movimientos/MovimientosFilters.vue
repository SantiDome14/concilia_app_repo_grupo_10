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
// MovimientosFilters — search (left) + filters (right) layout
// ────────────────────────────────────────────────────────────────────
// Filters: Período · Tipo · Rail · Partner · Estado. Origen is intentionally
// dropped in OPS (operator review 2026-05-22) — Origen survives only on the
// PSP tab.
// ════════════════════════════════════════════════════════════════════

export type PeriodValue = 'todo' | 'dia' | 'semana' | 'mes';

const props = defineProps<{
  search: string;
  sponsor: SponsorCode | null;
  type: string;
  status: string;
  rail: string;
  period: PeriodValue;
  hasActiveFilters: boolean;
  typeOptions: ReadonlyArray<CatalogOption>;
  statusOptions: ReadonlyArray<CatalogOption>;
  railOptions: ReadonlyArray<CatalogOption>;
}>();

const emit = defineEmits<{
  'update:search': [value: string];
  'update:sponsor': [value: SponsorCode | null];
  'update:type': [value: string];
  'update:status': [value: string];
  'update:rail': [value: string];
  'update:period': [value: PeriodValue];
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
const railModel = computed<string>({
  get: () => props.rail || ALL,
  set: (v) => emit('update:rail', v === ALL ? '' : v),
});
const periodModel = computed<string>({
  get: () => props.period,
  set: (v) => emit('update:period', v as PeriodValue),
});
</script>

<template>
  <div class="flex flex-wrap items-center gap-2.5" data-testid="movimientos-filters">
    <div class="relative w-full max-w-sm sm:w-72">
      <Search
        class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t-4"
      />
      <Input
        v-model="localSearch"
        placeholder="Buscar por cliente, ID o contraparte…"
        class="pl-8"
        data-testid="movimientos-search"
      />
    </div>

    <div class="flex-1" />

    <Select v-model="periodModel">
      <SelectTrigger class="h-9 w-[140px] text-xs" data-testid="movimientos-filter-period">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="todo">Período · Todo</SelectItem>
        <SelectItem value="dia">Período · Día</SelectItem>
        <SelectItem value="semana">Período · Semana</SelectItem>
        <SelectItem value="mes">Período · Mes</SelectItem>
      </SelectContent>
    </Select>

    <Select v-model="typeModel">
      <SelectTrigger class="h-9 w-[150px] text-xs" data-testid="movimientos-filter-type">
        <SelectValue placeholder="Tipo · Todos" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem :value="ALL">Tipo · Todos</SelectItem>
        <SelectItem v-for="opt in props.typeOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </SelectItem>
      </SelectContent>
    </Select>

    <Select v-model="railModel">
      <SelectTrigger class="h-9 w-[140px] text-xs" data-testid="movimientos-filter-rail">
        <SelectValue placeholder="Rail · Todos" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem :value="ALL">Rail · Todos</SelectItem>
        <SelectItem v-for="opt in props.railOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </SelectItem>
      </SelectContent>
    </Select>

    <Select v-model="partnerModel">
      <SelectTrigger class="h-9 w-[150px] text-xs" data-testid="movimientos-filter-partner">
        <SelectValue placeholder="Partner · Todos" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem :value="ALL">Partner · Todos</SelectItem>
        <SelectItem v-for="opt in partnerOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </SelectItem>
      </SelectContent>
    </Select>

    <Select v-model="statusModel">
      <SelectTrigger class="h-9 w-[140px] text-xs" data-testid="movimientos-filter-status">
        <SelectValue placeholder="Estado · Todos" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem :value="ALL">Estado · Todos</SelectItem>
        <SelectItem v-for="opt in props.statusOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </SelectItem>
      </SelectContent>
    </Select>

    <Button
      v-if="props.hasActiveFilters"
      variant="ghost"
      size="sm"
      data-testid="movimientos-clear-filters"
      @click="emit('clear-filters')"
    >
      <X class="h-3.5 w-3.5" />
      Limpiar
    </Button>
  </div>
</template>
