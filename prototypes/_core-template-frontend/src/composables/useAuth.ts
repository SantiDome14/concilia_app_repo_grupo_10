import { computed, getCurrentInstance, type ComputedRef } from 'vue';
import { useAuth0 } from '@auth0/auth0-vue';
import { useAuthStore } from '@/stores/auth';

// ════════════════════════════════════════════════════════════════════
// useAuth — unified authentication API
// ────────────────────────────────────────────────────────────────────
// Wraps @auth0/auth0-vue + Pinia auth store into a single composable.
// Prefer this over raw useAuth0() in pages/components.
//
// If Auth0 is not installed (env vars empty), returns a no-op stub
// so components don't crash. The template is usable out-of-the-box
// without Auth0 configured.
// ════════════════════════════════════════════════════════════════════

interface AuthApi {
  isAuthenticated: ComputedRef<boolean>;
  isLoading: ComputedRef<boolean>;
  user: ComputedRef<{ name?: string; email?: string; picture?: string } | null>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | undefined>;
}

function createStub(): AuthApi {
  return {
    isAuthenticated: computed(() => false),
    isLoading: computed(() => false),
    user: computed(() => null),
    login: async () => {
       
      console.warn('[auth] Auth0 not configured — login() is a no-op');
    },
    logout: async () => {
       
      console.warn('[auth] Auth0 not configured — logout() is a no-op');
    },
    getAccessToken: async () => undefined,
  };
}

export function useAuth(): AuthApi {
  // Detect if Auth0 is registered on the current app instance
  const instance = getCurrentInstance();
  const auth0Registered = !!instance?.appContext.config.globalProperties.$auth0;

  if (!auth0Registered) {
    return createStub();
  }

  const auth0 = useAuth0();
  const store = useAuthStore();

  return {
    isAuthenticated: computed(() => auth0.isAuthenticated.value),
    isLoading: computed(() => auth0.isLoading.value),
    user: computed(() => auth0.user.value ?? null),
    login: async () => {
      await auth0.loginWithRedirect();
    },
    logout: async () => {
      await auth0.logout({ logoutParams: { returnTo: window.location.origin } });
      store.reset();
    },
    getAccessToken: async () => {
      try {
        return await auth0.getAccessTokenSilently();
      } catch {
        return undefined;
      }
    },
  };
}
