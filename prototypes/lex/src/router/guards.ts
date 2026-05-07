import type { NavigationGuardWithThis } from 'vue-router';
import type { Auth0VueClient } from '@auth0/auth0-vue';
import { ROUTE_PATHS } from '@/config/routes';
import { watch } from 'vue';

// ════════════════════════════════════════════════════════════════════
// Navigation guards
// ────────────────────────────────────────────────────────────────────
// Clean pattern — no router.setAuth0 hack. The Auth0 instance is
// passed in when wiring the router, then closed over by the returned
// guard functions. This avoids the ad-hoc pattern used in core-app
// and core-lex.
// ════════════════════════════════════════════════════════════════════

/**
 * Waits for Auth0 to finish its initial loading state.
 * Returns immediately if already loaded.
 */
function waitForAuth0Ready(auth0: Auth0VueClient): Promise<void> {
  if (!auth0.isLoading.value) return Promise.resolve();
  return new Promise((resolve) => {
    const stop = watch(auth0.isLoading, (loading) => {
      if (!loading) {
        stop();
        resolve();
      }
    });
  });
}

/**
 * Builds the auth guard with a captured Auth0 instance.
 * If no Auth0 instance is provided (local dev without Auth0 configured),
 * the guard becomes a no-op that allows all navigation.
 */
export function createAuthGuard(
  auth0: Auth0VueClient | null,
): NavigationGuardWithThis<undefined> {
  return async (to) => {
    // No Auth0 → skip guarding (local dev / tests without auth configured)
    if (!auth0) return true;

    await waitForAuth0Ready(auth0);
    const isAuthenticated = auth0.isAuthenticated.value;

    // Unauthenticated trying to access protected route → redirect to login
    if (to.meta.requiresAuth && !isAuthenticated) {
      return { path: ROUTE_PATHS.LOGIN, query: { redirect: to.fullPath } };
    }

    // Authenticated trying to access login → redirect to dashboard
    if (to.name === 'login' && isAuthenticated) {
      return { path: ROUTE_PATHS.DASHBOARD };
    }

    return true;
  };
}

/**
 * Builds the capabilities (RBAC) guard.
 * A route can declare `meta.capabilities = ['ADMIN_OPS', ...]` to require
 * the authenticated user to have AT LEAST ONE of the listed capabilities.
 */
export function createCapabilitiesGuard(
  auth0: Auth0VueClient | null,
): NavigationGuardWithThis<undefined> {
  return async (to) => {
    const required = (to.meta.capabilities as string[] | undefined) ?? [];
    if (required.length === 0) return true;
    if (!auth0) return true;

    await waitForAuth0Ready(auth0);
    const userCapabilities = (auth0.user.value?.capabilities as string[] | undefined) ?? [];
    const hasAny = required.some((cap) => userCapabilities.includes(cap));

    if (!hasAny) {
      return { path: ROUTE_PATHS.DASHBOARD };
    }
    return true;
  };
}
