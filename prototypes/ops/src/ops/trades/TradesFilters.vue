<script setup lang="ts">
import { computed } from 'vue';
import { X } from 'lucide-vue-next';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/cn';
import type { QuotesView } from './types';

// ════════════════════════════════════════════════════════════════════
// TradesFilters — implements part of Requirement 5 + Decision 4.
//
// Sub-toggle Active / Historic + filter row (operation + pair). The
// client filter is owned by the parent (the page imports
// <ClientFilters mode="picker"> from ops-clients) — to keep this
// component focused on the quote-specific filters.
// ════════════════════════════════════════════════════════════════════

const props = defineProps<{
  view: QuotesView;
  operation: string;
  pair: string;
  hasActiveFilters: boolean;
  pairOptions: string[];
}>();

const emit = defineEmits<{
  'update:view': [value: QuotesView];
  'update:operation': [value: string];
  'update:pair': [value: string];
  'clear-filters': [];
}>();

const ALL = '__all__';

const operationModel = computed<string>({
  get: () => props.operation || ALL,
  set: (v) => emit('update:operation', v === ALL ? '' : v),
});
const pairModel = computed<string>({
  get: () => props.pair || ALL,
  set: (v) => emit('update:pair', v === ALL ? '' : v),
});
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3" data-testid="quotes-filters">
    <!-- Sub-toggle Active / Historic -->
    <div
      class="inline-flex h-10 overflow-hidden rounded-lg border border-b-2 bg-card"
      role="tablist"
      data-testid="quotes-view-toggle"
    >
      <button
        type="button"
        role="tab"
        :aria-selected="props.view === 'active'"
        :class="
          cn(
            'px-4 py-1 text-sm font-semibold transition-colors',
            props.view === 'active'
              ? 'bg-brand text-white'
              : 'text-t-3 hover:text-t-1',
          )
        "
        data-testid="quotes-view-active"
        @click="emit('update:view', 'active')"
      >
        Active Quotes
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="props.view === 'historic'"
        :class="
          cn(
            'px-4 py-1 text-sm font-semibold transition-colors',
            props.view === 'historic'
              ? 'bg-brand text-white'
              : 'text-t-3 hover:text-t-1',
          )
        "
        data-testid="quotes-view-historic"
        @click="emit('update:view', 'historic')"
      >
        Historic Quotes
      </button>
    </div>

    <!-- Filter row -->
    <div class="flex flex-wrap items-center gap-2.5">
      <Select v-model="operationModel">
        <SelectTrigger class="w-full sm:w-32" data-testid="quotes-filter-operation">
          <SelectValue placeholder="Operación" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Todas</SelectItem>
          <SelectItem value="BUY">BUY</SelectItem>
          <SelectItem value="SELL">SELL</SelectItem>
        </SelectContent>
      </Select>

      <Select v-model="pairModel">
        <SelectTrigger class="w-full sm:w-40" data-testid="quotes-filter-pair">
          <SelectValue placeholder="Par" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="ALL">Todos los pares</SelectItem>
          <SelectItem v-for="opt in props.pairOptions" :key="opt" :value="opt">{{ opt }}</SelectItem>
        </SelectContent>
      </Select>

      <Button
        v-if="props.hasActiveFilters"
        variant="ghost"
        size="sm"
        data-testid="quotes-clear-filters"
        @click="emit('clear-filters')"
      >
        <X class="h-3.5 w-3.5" />
        Limpiar
      </Button>
    </div>
  </div>
</template>
