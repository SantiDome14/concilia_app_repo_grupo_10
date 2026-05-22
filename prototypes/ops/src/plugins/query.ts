import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query';
import type { App } from 'vue';
import { ApiError } from '@/types/api';
import { QUERY_DEFAULTS } from '@/constants';

// Singleton exported so non-component modules (catalog resolvers,
// plugin code) can read / invalidate caches without going through the
// Vue injection pipeline.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_DEFAULTS.STALE_TIME_MS,
      retry: (failureCount, error) => {
        // Never retry auth/permission/not-found errors
        if (error instanceof ApiError) {
          if (error.isUnauthorized || error.isForbidden || error.isNotFound) {
            return false;
          }
        }
        return failureCount < QUERY_DEFAULTS.RETRY;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

export function setupQuery(app: App): void {
  app.use(VueQueryPlugin, { queryClient });
}
