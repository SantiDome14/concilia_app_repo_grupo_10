import { computed } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { listUsers } from '@/api/modules/users';
import type { UserProfile } from '@/types/models';

// ════════════════════════════════════════════════════════════════════
// useUsers — directory of user profiles
// ────────────────────────────────────────────────────────────────────
// Wraps `GET /users`. Returns the list plus a sync `findUser(id)`
// helper that operates on whatever the query has cached so far —
// callers never await per-id fetches.
// ════════════════════════════════════════════════════════════════════

export function useUsers() {
  const query = useQuery<UserProfile[]>({
    queryKey: ['users'],
    queryFn: listUsers,
    staleTime: 5 * 60 * 1000,
  });

  const users = computed<UserProfile[]>(() => query.data.value ?? []);

  function findUser(id: string | null | undefined): UserProfile | undefined {
    if (!id) return undefined;
    return users.value.find((u) => u.id === id);
  }

  return {
    users,
    findUser,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
