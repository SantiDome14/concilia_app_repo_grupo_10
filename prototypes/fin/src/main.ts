// ════════════════════════════════════════════════════════════════════
// App entry
// ────────────────────────────────────────────────────────────────────
// Plugin wiring order matters:
//   1. Pinia         — stores must be ready before anything that uses them
//   2. Router        — needs to be registered so route guards run
//   3. Auth0         — router guards depend on Auth0 state
//   4. Vue Query     — server-state cache
//   5. i18n (opt-in) — gated by VITE_FEATURE_I18N
//   6. LD (opt-in)   — gated by VITE_FEATURE_LAUNCHDARKLY
// ════════════════════════════════════════════════════════════════════

import { createApp } from 'vue';
import App from './App.vue';

import { setupPinia } from './plugins/pinia';
import { setupRouter } from './router';
import { setupAuth0 } from './plugins/auth0';
import { setupQuery } from './plugins/query';
import { setupManifests } from './plugins/manifests';
import { setupCatalogs } from './plugins/catalogs';

import './styles/globals.css';

// ─── Bootstrap ──────────────────────────────────────────────────────
async function bootstrap() {
  const app = createApp(App);

  setupPinia(app);
  setupManifests();
  setupCatalogs();
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
