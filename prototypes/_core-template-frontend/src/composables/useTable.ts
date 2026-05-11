import { ref, computed, type Ref } from 'vue';
import { DEFAULT_PAGE_SIZE } from '@/constants';

// ════════════════════════════════════════════════════════════════════
// useTable — client-side pagination + search + filters
// ────────────────────────────────────────────────────────────────────
// For tables backed by a paginated API, use @tanstack/vue-query with
// server-side params instead. This composable is for tables that
// already have all their data in memory (settings screens, small lists).
// ════════════════════════════════════════════════════════════════════

interface UseTableOptions<T> {
  /** Reactive data source. */
  data: Ref<T[]>;
  /** Fields of T to search against (case-insensitive). */
  searchFields?: (keyof T)[];
  /** Initial page size (default: DEFAULT_PAGE_SIZE from constants). */
  pageSize?: number;
}

export function useTable<T>(options: UseTableOptions<T>) {
  const { data, searchFields = [], pageSize: initialPageSize = DEFAULT_PAGE_SIZE } = options;

  const search = ref('');
  const filters = ref<Partial<Record<keyof T, unknown>>>({});
  const page = ref(1);
  const pageSize = ref(initialPageSize);

  const filtered = computed(() => {
    const q = search.value.toLowerCase().trim();
    return data.value.filter((row) => {
      // Search filter
      if (q && searchFields.length > 0) {
        const match = searchFields.some((field) => {
          const value = row[field];
          return typeof value === 'string' && value.toLowerCase().includes(q);
        });
        if (!match) return false;
      }
      // Field filters
      for (const [key, value] of Object.entries(filters.value)) {
        if (value !== undefined && value !== '' && row[key as keyof T] !== value) {
          return false;
        }
      }
      return true;
    });
  });

  const total = computed(() => filtered.value.length);
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)));

  const paged = computed(() => {
    if (page.value > totalPages.value) page.value = totalPages.value;
    const start = (page.value - 1) * pageSize.value;
    return filtered.value.slice(start, start + pageSize.value);
  });

  function setPage(n: number): void {
    page.value = Math.min(Math.max(1, n), totalPages.value);
  }

  function setPageSize(size: number): void {
    pageSize.value = size;
    page.value = 1;
  }

  function setSearch(q: string): void {
    search.value = q;
    page.value = 1;
  }

  function setFilter(key: keyof T, value: unknown): void {
    filters.value = { ...filters.value, [key]: value };
    page.value = 1;
  }

  function resetFilters(): void {
    filters.value = {};
    search.value = '';
    page.value = 1;
  }

  return {
    search,
    filters,
    page,
    pageSize,
    filtered,
    paged,
    total,
    totalPages,
    setPage,
    setPageSize,
    setSearch,
    setFilter,
    resetFilters,
  };
}
