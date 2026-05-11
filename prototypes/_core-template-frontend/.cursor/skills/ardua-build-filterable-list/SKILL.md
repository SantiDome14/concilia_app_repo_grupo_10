---
name: ardua-build-filterable-list
description: Wire the filterable-list pattern on an Ardua module page — search input plus dropdown filters plus pagination plus results count, driven by either `useTable` (client-side) or `@tanstack/vue-query` (server-side). Use when the user wants to add filtering capability to a table (e.g. "agregá filtros por estado y categoría a la tabla", "necesito buscar por nombre y filtrar por tipo", "build a searchable list with filter dropdowns", "la tabla necesita filtros"). Enforces the `core-data-tables` contract: use `useTable` or `vue-query` (hand-rolled pagination forbidden), inline filter dropdowns (not sidebars), search that filters live, and a results-count label when any filter is active.
metadata:
  project: ardua
  version: "1.0"
---

# Purpose

Wire the canonical Ardua filterable-list UX on a table page:

- A search input at the top-left of the L3 section header
- 1-N filter dropdowns at the top-right of the L3 section header
- A results count label ("42 resultados") when any filter or search is active
- Integration with either `useTable<T>` (for client-side in-memory lists) or `@tanstack/vue-query`'s `useQuery` (for server-side paginated endpoints)
- Backdrop-click to close open filter dropdowns

The pattern is extracted from `ModuloA.vue` as the reference. The `useTable` composable is the single source of filter state for client-side tables; hand-rolling pagination in a page component is forbidden by `core-data-tables`.

# When to trigger this skill

Use this skill when the user expresses any of these intents:

- "Agregá filtros a la tabla de X"
- "Necesito buscar/filtrar por Y en Z"
- "Build a searchable list / filterable table"
- "La tabla necesita un buscador y filtros por estado"
- `ardua-add-module` chains here for a `table` or `table-server` L3 surface

Do NOT use this skill for:

- Global search across modules (out of scope — app-level search is a future capability)
- Faceted search with complex combinators (out of scope — this skill covers simple AND-filters)
- Filter-by-date-range (currently not supported by `useTable`; note to user and defer)

# Prerequisites

Before starting, the agent MUST:

1. Read `CLAUDE.md` at the repo root.
2. Read the canonical capability spec:
   ```bash
   openspec show core-data-tables
   ```
3. Read the reference implementation in `src/pages/ModuloA.vue`, sections `L3 · Section header` and `useTable` setup.
4. Read the composable itself: `src/composables/useTable.ts` — understand its API:
   - `setSearch(q)`, `setFilter(key, value)`, `setPage(n)`, `setPageSize(n)`, `resetFilters()`
   - `paged`, `total`, `totalPages`, `page`, `pageSize`

# Steps

## Step 1 — Gather the filter specification

Ask the user via AskUserQuestion:

1. **Target page file** (e.g. `src/pages/Facturas.vue`)
2. **Data mode**: `client-side` (full list in memory, uses `useTable`) or `server-side` (paginated endpoint, uses `useQuery`)
3. **Search** fields — which fields of the record the search should match (case-insensitive). E.g. for a Factura: `['id', 'cliente']`.
4. **Search placeholder** (Spanish, e.g. `"Buscar por nombre o ID..."`)
5. **Filters** — for each filter, collect:
   - **Key** — the field name on the record (e.g. `status`, `category`)
   - **Label** (Spanish, e.g. `"Estado"`, `"Categoría"`)
   - **Options** — the list of possible values. For enums this comes from the domain type. Each option has: `value` (the stored value), `label` (the display label)
   - **Default selected** (usually `''` meaning "all")
6. **Page size** — default 10, options typically `[10, 25, 50]`. Uses `PAGE_SIZE_OPTIONS` from `@/constants`.

## Step 2 — Validate the spec

Stop and report if:

- `client-side` mode is chosen but the dataset is expected to be >1000 rows — recommend `server-side` instead
- `server-side` mode is chosen but no API endpoint exists yet — recommend running `ardua-add-api-endpoint` first
- A filter key does not match any field on the record type — flag as likely typo
- Any filter option label is English (should be Spanish for UI consistency)

## Step 3 — Edit the target page file (client-side mode)

Several edits. Only one mode applies — pick based on user's Step 1.2 answer.

### 3a. Imports

```ts
import { computed, ref } from 'vue';
import { Search, ChevronDown } from 'lucide-vue-next';
import { Input } from '@/components/ui/input';
import { useTable } from '@/composables/useTable';
import { PAGE_SIZE_OPTIONS } from '@/constants';
import { cn } from '@/lib/cn';
```

Extend existing imports; don't duplicate.

### 3b. Data + useTable setup

```ts
// Data source — seed or from a store
const rawData = ref<{RecordType}[]>([/* ... */]);

// Client-side table state
const {
  paged,
  total,
  totalPages,
  page,
  pageSize,
  setPage,
  setPageSize,
  setSearch,
  setFilter,
} = useTable<{RecordType}>({
  data: rawData,
  searchFields: ['id', 'name'],    // ← from user's Step 1.3
  pageSize: 10,
});
```

### 3c. Search input state

```ts
const searchInput = ref('');
function onSearchInput(v: string): void {
  searchInput.value = v;
  setSearch(v);
}
```

### 3d. Filter state

For each filter, add a selected-value ref:

```ts
const selectedStatus = ref<{StatusType} | ''>('');
const selectedCategory = ref<string>('');
```

And an `openFilter` ref to track which dropdown (if any) is open:

```ts
type FilterKey = 'status' | 'category';   // ← extend with user's keys
const openFilter = ref<FilterKey | null>(null);

function toggleFilter(key: FilterKey): void {
  openFilter.value = openFilter.value === key ? null : key;
}
```

### 3e. Filter handlers

For each filter, a handler that sets the selected value, propagates to `useTable`, and closes the dropdown:

```ts
function selectStatus(v: {StatusType} | ''): void {
  selectedStatus.value = v;
  setFilter('status', v || undefined);
  openFilter.value = null;
}

function selectCategory(v: string): void {
  selectedCategory.value = v;
  setFilter('category', v || undefined);
  openFilter.value = null;
}
```

### 3f. Results count

```ts
const filterResultsLabel = computed(() => {
  const hasFilter = searchInput.value || selectedStatus.value || selectedCategory.value;
  return hasFilter ? `${total.value} resultado${total.value !== 1 ? 's' : ''}` : '';
});
```

### 3g. Backdrop click to close filters

```ts
function onBackdropClick(): void {
  openFilter.value = null;
}
```

### 3h. Template — L3 section header

Locate the `<!-- L3 · Section header -->` area (or add it if missing) and populate:

```vue
<!-- L3 · Section header -->
<div class="mb-2.5 flex flex-wrap items-center gap-2">
  <span class="text-sm font-bold text-t-2">{Section Title}</span>
  <div class="w-4" />
  <div class="relative">
    <Search class="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-t-4" />
    <Input
      :model-value="searchInput"
      placeholder="{Search placeholder}"
      class="w-[220px] pl-8"
      @update:model-value="onSearchInput"
    />
  </div>
  <div class="flex-1" />

  <!-- One dropdown per filter -->
  <div class="relative" @click.stop>
    <button
      type="button"
      :class="
        cn(
          'inline-flex h-9 items-center gap-1.5 rounded-md border border-b-2 bg-card px-3 text-xs font-medium text-t-2 transition-colors hover:border-b-3 hover:text-t-1',
          selectedStatus && 'border-info text-[#93C5FD]',
        )
      "
      @click="toggleFilter('status')"
    >
      {{ selectedStatus || 'Estado' }}
      <ChevronDown
        :class="cn('h-2.5 w-2.5 opacity-60 transition-transform', openFilter === 'status' && 'rotate-180')"
      />
    </button>
    <div
      v-if="openFilter === 'status'"
      class="absolute right-0 top-full z-[300] mt-1 min-w-[170px] rounded-lg border border-b-3 bg-card-2 p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.6)]"
    >
      <div class="px-2.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-t-4">
        Estado
      </div>
      <button
        class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-medium text-t-2 transition-colors hover:bg-white/[0.06] hover:text-t-1"
        @click="selectStatus('')"
      >
        Todos
      </button>
      <button
        v-for="st in STATUS_OPTIONS"
        :key="st"
        class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-[13px] font-medium text-t-2 transition-colors hover:bg-white/[0.06] hover:text-t-1"
        @click="selectStatus(st)"
      >
        {{ st }}
      </button>
    </div>
  </div>

  <!-- Repeat for each filter -->

  <span class="px-1 text-[11px] text-t-4">{{ filterResultsLabel }}</span>
</div>
```

Define the option constants near the top of the `<script setup>`:

```ts
const STATUS_OPTIONS: {StatusType}[] = ['ACTIVE', 'PENDING', 'INACTIVE'];
const CATEGORY_OPTIONS = ['Tipo 1', 'Tipo 2', 'Tipo 3'];
```

### 3i. Root element with backdrop-click handler

Wrap the page template root with `@click="onBackdropClick"`:

```vue
<template>
  <div @click="onBackdropClick">
    <!-- ... page content ... -->
  </div>
</template>
```

This collapses any open filter dropdown when the user clicks anywhere outside it.

## Step 3′ — Alternative: Server-side mode with `@tanstack/vue-query`

If the user chose `server-side` in Step 1.2, replace Step 3b-3e with:

### 3b'. Imports

```ts
import { useQuery } from '@tanstack/vue-query';
import { listFacturas } from '@/api/modules/facturas';   // ← adjust
```

### 3c'. Reactive query params

```ts
const page = ref(1);
const pageSize = ref(10);
const searchInput = ref('');
const selectedStatus = ref<{StatusType} | ''>('');
const selectedCategory = ref<string>('');

const queryKey = computed(() => [
  'facturas',
  { page: page.value, pageSize: pageSize.value, search: searchInput.value, status: selectedStatus.value, category: selectedCategory.value },
]);

const { data, isLoading, isError, error } = useQuery({
  queryKey,
  queryFn: () => listFacturas({
    page: page.value,
    pageSize: pageSize.value,
    search: searchInput.value || undefined,
    status: selectedStatus.value || undefined,
    category: selectedCategory.value || undefined,
  }),
  placeholderData: (prev) => prev,   // keep previous page visible during refetch
});

const paged = computed(() => data.value?.items ?? []);
const total = computed(() => data.value?.total ?? 0);
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));
```

### 3d'. Handlers invalidate via state change only

Setters in server-side mode do NOT call a `setFilter` function — they just update the ref, which triggers `queryKey` recomputation and refetch:

```ts
function onSearchInput(v: string): void {
  searchInput.value = v;
  page.value = 1;
}

function selectStatus(v: {StatusType} | ''): void {
  selectedStatus.value = v;
  page.value = 1;
  openFilter.value = null;
}
```

Loading and error states should be rendered using `<Skeleton>` and the empty-state pattern from `core-error-handling`.

## Step 4 — Pagination UI

Append the pagination strip below the table:

```vue
<div class="mt-3.5 flex items-center justify-between">
  <div class="text-xs text-t-3">
    Page <b class="font-semibold text-t-2">{{ page }}</b> of {{ totalPages }} · {{ total }} resultado{{ total !== 1 ? 's' : '' }}
  </div>
  <!-- Page size selector + prev / numbered / next buttons -->
  <!-- (copy from ModuloA.vue — the pagination UI is cross-module consistent) -->
</div>
```

Do NOT re-implement the pagination UI from scratch. Copy the structure from `ModuloA.vue` and adjust only the handlers if needed.

## Step 5 — Run quality gates

```bash
npm run spec:check
npm run type-check
npm run lint
npm run test:run
```

If type-check fails:
- Likely: `{RecordType}` or `{StatusType}` placeholders not replaced. Do a search for `{` in the edited file.
- Likely: missing option in the `FilterKey` union — every dropdown's key must be listed

## Step 6 — Hand off

Do NOT commit. Report:

- Summary: "Filterable list wired on `{page}`. Search fields: {list}. Filters: {list}. Data mode: {client-side | server-side}. Page size: {N}."
- Files touched: the single page file
- Quality gates results (all ✓)
- If server-side: remind user to verify the API endpoint exists and returns the expected shape

# Files you'll touch

| File | Change |
|---|---|
| `src/pages/{ModuleName}.vue` | Add search + filter state, handlers, L3 section header template, pagination UI; imports; replace mock data with `useTable` or `useQuery` integration |

This skill does NOT touch `useTable.ts`, any API client, or any shared component.

# Compliance checklist

- [ ] Client-side tables use `useTable<T>` composable (hand-rolled pagination forbidden by core-data-tables)
- [ ] Server-side tables use `@tanstack/vue-query`'s `useQuery`
- [ ] Search runs client-side via `setSearch` (client mode) or by refetching with new key (server mode)
- [ ] Every filter dropdown has a "Todos" option to clear the filter
- [ ] Open filter dropdowns close on backdrop click (via root `@click="onBackdropClick"`)
- [ ] Results count label is shown only when a filter is active
- [ ] Page resets to 1 on any filter / search change (already handled by `useTable`; in server-side mode, set `page.value = 1`)
- [ ] Filter labels are Spanish
- [ ] Pagination uses the standardized UI from `ModuloA.vue` (not a re-implementation)
- [ ] `npm run spec:check`, `npm run type-check`, `npm run lint`, `npm run test:run` all pass

# Related skills

- `ardua-add-module` — the common caller; this skill runs after the module exists
- `ardua-add-row-actions` — very commonly chained after this skill for tables with per-row actions
- `ardua-add-api-endpoint` — prerequisite for server-side mode
- `ardua-compose-kpi-dashboard` — commonly composed alongside for L2 before the table
