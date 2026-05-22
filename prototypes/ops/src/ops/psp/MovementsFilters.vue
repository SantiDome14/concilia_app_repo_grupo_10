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
import type { CatalogOption } from '@/ops/movimientos/catalog';

// ════════════════════════════════════════════════════════════════════
// MovementsFilters — L3 filter row for the PSP Movimientos tab.
// ────────────────────────────────────────────────────────────────────
// Search + Tipo + Estado + Origen. The Partner / sponsor filter was
// dropped per operator review 2026-05-22 — every PSP movement is
// already anchored to a partner (impossible to be null) and the
// cross-tab `sponsorFilter` is exposed in the Posición + Cuentas
// tabs; surfacing it again here was redundant.
//
// Type / status / origin options come from a closed catalog; each
// option is `{ value, label }` so the dropdown can render a human-
// readable label (e.g. `COLLECTOR IN`) while the on-the-wire value
// stays snake_case (e.g. `COLLECTOR_IN`).
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  /** Search input value (synced via v-model:search). */
  search: string;
  /** Client filter — when set, only movements where `client` matches
   *  the value pass. Driven by the "Ver movimientos" action on the
   *  Cuentas tab, but also exposed as a Select here so the operator
   *  can narrow manually. */
  client: string;
  type: string;
  status: string;
  origin: string;
  hasActiveFilters: boolean;
  /** Type / origin / status options come from the closed catalog. */
  typeOptions: ReadonlyArray<CatalogOption>;
  statusOptions: ReadonlyArray<CatalogOption>;
  originOptions: ReadonlyArray<CatalogOption>;
  /** Distinct client names present in the current dataset — drives
   *  the Cliente select. */
  clientOptions: ReadonlyArray<string>;
}>();

const emit = defineEmits<{
  'update:search': [value: string];
  'update:client': [value: string];
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

const clientModel = computed<string>({
  get: () => props.client || ALL,
  set: (v) => emit('update:client', v === ALL ? '' : v),
});

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
    <!-- Filter row (Partner is now a Select alongside Tipo / Estado / Origen) -->
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

      <div class="flex-1" />

      <Select v-model="clientModel">
        <SelectTrigger class="w-full sm:w-52" data-testid="movements-filter-client">
          <SelectValue placeholder="Cliente · Todos" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Cliente · Todos</SelectItem>
          <SelectItem v-for="opt in props.clientOptions" :key="opt" :value="opt">
            {{ opt }}
          </SelectItem>
        </SelectContent>
      </Select>

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
