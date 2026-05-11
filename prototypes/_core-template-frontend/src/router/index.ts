import { createRouter, createWebHistory, type Router } from 'vue-router';
import type { App } from 'vue';
import type { Auth0VueClient } from '@auth0/auth0-vue';
import { routes } from './routes';
import { createAuthGuard, createCapabilitiesGuard } from './guards';

// ════════════════════════════════════════════════════════════════════
// Router setup
// ────────────────────────────────────────────────────────────────────
// Guards are attached via a closure over the Auth0 instance — a clean
// alternative to the router.setAuth0() hack that core-app and core-lex
// implement today.
// ════════════════════════════════════════════════════════════════════

let router: Router | null = null;

export function setupRouter(app: App): void {
  router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior(_to, _from, savedPosition) {
      if (savedPosition) return savedPosition;
      return { top: 0 };
    },
  });

  // Guards are wired AFTER Auth0 setup completes. We use a deferred
  // approach: check app._context.config.globalProperties.$auth0 each
  // time the guard runs, so it picks up Auth0 as soon as it's registered.
  router.beforeEach(async (to, from) => {
    const auth0 = app.config.globalProperties.$auth0 as Auth0VueClient | undefined;
    const authGuard = createAuthGuard(auth0 ?? null);
    const capsGuard = createCapabilitiesGuard(auth0 ?? null);

    const authResult = await authGuard.call(undefined, to, from, () => {});
    if (authResult !== true && authResult !== undefined) return authResult;

    const capsResult = await capsGuard.call(undefined, to, from, () => {});
    if (capsResult !== true && capsResult !== undefined) return capsResult;

    return true;
  });

  app.use(router);
}

export function getRouter(): Router {
  if (!router) throw new Error('[router] Not initialized — call setupRouter first');
  return router;
}
