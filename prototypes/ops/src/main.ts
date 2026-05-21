// ════════════════════════════════════════════════════════════════════
// App entry
// ────────────────────────────────────────────────────────────────────
// Plugin wiring order matters:
//   1. Pinia         — stores must be ready before anything that uses them
//   2. Manifests     — registers action manifests in the registry store
//   3. MSW (opt-in)  — intercepts HTTP when VITE_USE_MOCKS=true; awaited
//                      before mount so the first render hits handlers
//   4. Router        — needs to be registered so route guards run
//   5. Auth0         — router guards depend on Auth0 state
//   6. Vue Query     — server-state cache
//   7. i18n (opt-in) — gated by VITE_FEATURE_I18N
//   8. LD (opt-in)   — gated by VITE_FEATURE_LAUNCHDARKLY
// ════════════════════════════════════════════════════════════════════

import { createApp } from 'vue';
import App from './App.vue';

import { env } from './config/env';
import { setupPinia } from './plugins/pinia';
import { setupRouter } from './router';
import { setupAuth0 } from './plugins/auth0';
import { setupQuery } from './plugins/query';
import { setupManifests } from './plugins/manifests';

import './styles/globals.css';

/**
 * Conditionally boot Mock Service Worker. Dynamic import keeps MSW out
 * of the production bundle when the flag is disabled.
 */
async function enableMocking(): Promise<void> {
  if (!env.VITE_USE_MOCKS) return;

  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });

  // `warn` keeps the message visible in browsers that filter info logs;
  // running against mocks is a non-prod state worth surfacing loudly.
  console.warn(
    `[mocks] MSW active — ${worker.listHandlers().length} handler(s) registered`,
  );
}

// ─── Bootstrap ──────────────────────────────────────────────────────
async function bootstrap() {
  const app = createApp(App);

  setupPinia(app);
  setupManifests();
  await enableMocking();
  setupRouter(app);
  setupAuth0(app);
  setupQuery(app);

  // ─── Opt-in plugins ───────────────────────────────────────────────
  // Activated by setting VITE_FEATURE_* env vars to "true".
  // Both are dynamic imports so they don't bloat the bundle when disabled.
  if (import.meta.env.VITE_FEATURE_I18N === 'true') {
    const { setupI18n } = await import('./i18n');
    setupI18n(app);
  }

  if (import.meta.env.VITE_FEATURE_LAUNCHDARKLY === 'true') {
    const { setupLaunchDarkly } = await import('./plugins/launchdarkly');
    setupLaunchDarkly(app);
  }

  app.mount('#app');
}

bootstrap().catch((error) => {
   
  console.error('[bootstrap] Failed to start app:', error);
});
