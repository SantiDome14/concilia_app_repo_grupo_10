import { useQuery } from '@tanstack/vue-query';
import { getCurrentUser } from '@/api/modules/users';
import type { UserProfile } from '@/types/models';

// ════════════════════════════════════════════════════════════════════
// useCurrentUser — identity of the active user
// ────────────────────────────────────────────────────────────────────
// Wraps `GET /users/me`. In mock mode (`VITE_USE_MOCKS=true`) the MSW
// handler returns the first seed user. In real mode the backend
// derives the profile from Auth0 claims and returns the same shape.
//
// Consumers receive the canonical `UserProfile` ({ id, name, initials,
// role }) so callers like InboxCreateDialog never need to know whether
// the data came from a mock or a real backend.
// ════════════════════════════════════════════════════════════════════

export function useCurrentUser() {
  const query = useQuery<UserProfile>({
    queryKey: ['users', 'me'],
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000,
  });

  return {
    user: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
