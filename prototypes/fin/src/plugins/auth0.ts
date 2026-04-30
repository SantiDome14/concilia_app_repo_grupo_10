import { createAuth0, useAuth0 } from '@auth0/auth0-vue';
import type { App } from 'vue';
import { env } from '@/config/env';
import { setAccessTokenGetter } from '@/api/client';
import { useAuthStore } from '@/stores/auth';

// ════════════════════════════════════════════════════════════════════
// Auth0 setup
// ────────────────────────────────────────────────────────────────────
// Clean pattern (no router.setAuth0 hack): we register the plugin,
// then wire the API client's token getter via `setAccessTokenGetter`.
// Route guards access Auth0 state via the injection at `$auth0` or
// directly via `useAuth0()` inside composables.
//
// Dev fallback: when Auth0 is not configured (local dev / tests), we
// seed the auth store with a mock user that holds every FIN role the
// manifest's capability gates check for, so the action menus and the
// composite-dialog flow are exercisable without a live Auth0 tenant.
// ════════════════════════════════════════════════════════════════════

/** Roles granted to the dev fallback user — covers every capability
 * gate declared by FIN's manifests (Movimientos, Cotizaciones,
 * Tesorería). When wiring real Auth0, the IdP claim drives this list. */
const DEV_FALLBACK_CAPABILITIES = [
  'ADMIN',
  'ADMIN_FIN',
  'ADMIN_OPS',
  'ADMIN_TRD',
  'ANALISTA_CONTABLE',
  'FINANCE',
  'OPS_OFFICER',
  'TRADER',
];

export function setupAuth0(app: App): void {
  // Skip Auth0 wiring entirely if not configured (useful in local dev / tests)
  if (!env.VITE_AUTH0_DOMAIN || !env.VITE_AUTH0_CLIENT_ID) {

    console.warn(
      '[auth0] Not configured — running without authentication; seeding dev user',
    );
    const authStore = useAuthStore();
    authStore.setUser({
      id: 'dev-yasmani',
      name: 'Yasmani Rodríguez',
      email: 'yrodriguez@arduasolutions.com',
      capabilities: DEV_FALLBACK_CAPABILITIES,
    });
    authStore.setLoading(false);
    return;
  }

  const auth0 = createAuth0({
    domain: env.VITE_AUTH0_DOMAIN,
    clientId: env.VITE_AUTH0_CLIENT_ID,
    authorizationParams: {
      redirect_uri: window.location.origin,
      audience: env.VITE_AUTH0_AUDIENCE,
    },
    cacheLocation: 'localstorage',
    useRefreshTokens: true,
  });

  app.use(auth0);

  // Wire the API client's token getter to Auth0's silent token retrieval
  setAccessTokenGetter(async () => {
    try {
      return await auth0.getAccessTokenSilently();
    } catch {
      return undefined;
    }
  });
}

// Re-export for convenience in composables
export { useAuth0 };
