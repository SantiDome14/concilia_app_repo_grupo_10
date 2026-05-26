import { computed, type Ref } from 'vue';
import { useQuery, keepPreviousData } from '@tanstack/vue-query';
import { listClients, type ListClientsParams } from '@/api/modules/clients';

// ════════════════════════════════════════════════════════════════════
// useClientsList — paginated Clientes list
// ────────────────────────────────────────────────────────────────────
// Wraps `GET /clients` via vue-query. `keepPreviousData` prevents
// flicker during pagination/search — the previous page stays visible
// until the new page resolves.
// ════════════════════════════════════════════════════════════════════

export function useClientsList(filters: Ref<ListClientsParams>) {
  const query = useQuery({
    queryKey: computed(() => ['clients', 'list', filters.value] as const),
    queryFn: () => listClients(filters.value),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  return query;
}
