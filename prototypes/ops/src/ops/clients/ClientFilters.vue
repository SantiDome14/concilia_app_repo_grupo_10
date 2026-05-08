<script setup lang="ts">
import { ref, watch } from 'vue';
import { Search, X } from 'lucide-vue-next';
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Skeleton from '@/components/feedback/Skeleton.vue';
import type { Client } from './types';

// ════════════════════════════════════════════════════════════════════
// ClientFilters — implements ops-clients Requirement 3.
//
// Single autocomplete combobox over `name | docket`. Typing debounces
// the lookup (300 ms); selecting a result applies the filter. The
// dropdown reuses the page-side fetch (passed via props) so this
// component stays presentational — the page owns the network.
//
// Two modes:
//   - `'filter'` (default) — emits `update:modelValue` with a string
//     so the page can set `?name=` in the URL. Used by `<Clients>`.
//   - `'picker'` — emits `pick` with the full `Client` object. Used by
//     `<GenerateStatementModal>` (per `ops-statements` Decision 4 —
//     reuse instead of rolling a new picker).
//
// `Limpiar filtros` ghost button appears in `'filter'` mode whenever a
// filter is active; suppressed in `'picker'` mode (the modal owns its
// own clear affordance via the selected-client chip's Cambiar link).
// ════════════════════════════════════════════════════════════════════

const props = withDefaults(
  defineProps<{
    /** Currently applied search term (kept in sync with the URL by the page in 'filter' mode). */
    modelValue: string;
    /** Lookup results to render in the dropdown. */
    suggestions: Client[];
    /** Whether the lookup is in flight. */
    isSearching: boolean;
    /** Toggles the Limpiar button (filter mode only). */
    hasActiveFilters: boolean;
    /** Mode. Defaults to 'filter' — the legacy semantic. */
    mode?: 'filter' | 'picker';
    /** Custom placeholder; defaults to "Buscar por nombre o legajo…". */
    placeholder?: string;
  }>(),
  { mode: 'filter', placeholder: 'Buscar por nombre o legajo…' },
);

const emit = defineEmits<{
  /** Fires after the 300 ms debounce — triggers the lookup. */
  search: [query: string];
  /** Final filter applied — page sets `?name=` and reloads. (filter mode) */
  'update:modelValue': [value: string];
  /** Cleared in filter mode. */
  'clear-filters': [];
  /** Fires when the user picks a suggestion. (picker mode) */
  pick: [client: Client];
}>();

// ─── Local input state (debounced into `search`) ────────────────────
const inputValue = ref<string>(props.modelValue);
const dropdownOpen = ref(false);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.modelValue,
  (v) => {
    inputValue.value = v;
  },
);

function onInput(): void {
  const v = inputValue.value;
  dropdownOpen.value = true;
  if (debounceTimer !== null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    emit('search', v.trim());
  }, 300);
}

function pickSuggestion(client: Client): void {
  const label = client.name || client.tax_number || '';
  inputValue.value = label;
  dropdownOpen.value = false;
  if (props.mode === 'picker') {
    emit('pick', client);
  } else {
    emit('update:modelValue', label);
  }
}

function applyCurrent(): void {
  // Picker mode: Enter without picking is a no-op (the modal needs a real Client).
  if (props.mode === 'picker') return;
  // Filter mode: apply the typed string as the filter.
  dropdownOpen.value = false;
  emit('update:modelValue', inputValue.value.trim());
}

function clear(): void {
  inputValue.value = '';
  dropdownOpen.value = false;
  emit('clear-filters');
}
</script>

<template>
  <div class="flex items-center gap-2.5">
    <Popover v-model:open="dropdownOpen">
      <PopoverAnchor as-child>
        <div class="relative w-72">
          <Search
            class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t-4"
          />
          <Input
            v-model="inputValue"
            :placeholder="props.placeholder"
            class="pl-8"
            data-testid="clients-filter-input"
            @input="onInput"
            @keydown.enter.prevent="applyCurrent"
            @focus="dropdownOpen = inputValue.length > 0"
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        class="w-72 p-0"
        align="start"
        :side-offset="4"
        @open-auto-focus="(e) => e.preventDefault()"
      >
        <div v-if="props.isSearching" class="p-2.5">
          <Skeleton class="mb-1.5 h-4 w-full" />
          <Skeleton class="mb-1.5 h-4 w-2/3" />
          <Skeleton class="h-4 w-3/4" />
        </div>
        <div
          v-else-if="props.suggestions.length === 0"
          class="px-3 py-4 text-center text-xs text-t-4"
        >
          Sin resultados
        </div>
        <ul v-else class="max-h-72 overflow-y-auto py-1">
          <li
            v-for="c in props.suggestions"
            :key="c.id"
            :data-testid="`clients-filter-suggestion-${c.id}`"
            class="cursor-pointer px-3 py-2 text-sm transition-colors hover:bg-card-2"
            @click="pickSuggestion(c)"
          >
            <div class="font-medium text-t-1">{{ c.name || 'Sin nombre' }}</div>
            <div class="font-mono text-[11px] text-t-4">
              {{ c.tax_number || c.docket || '—' }}
            </div>
          </li>
        </ul>
      </PopoverContent>
    </Popover>

    <Button
      v-if="props.mode === 'filter' && props.hasActiveFilters"
      variant="ghost"
      size="sm"
      data-testid="clients-clear-filters"
      @click="clear"
    >
      <X class="h-3.5 w-3.5" />
      Limpiar filtros
    </Button>
  </div>
</template>
