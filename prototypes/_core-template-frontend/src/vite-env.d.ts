/// <reference types="vite/client" />

// ────────────────────────────────────────────────────────────────────
// Vue SFC shim
// ────────────────────────────────────────────────────────────────────
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}

// ────────────────────────────────────────────────────────────────────
// Typed env — kept in sync with src/config/env.ts
// ────────────────────────────────────────────────────────────────────
interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_ENV: 'local' | 'qa' | 'production';
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_TIMEOUT_MS: string;
  readonly VITE_AUTH0_DOMAIN: string;
  readonly VITE_AUTH0_CLIENT_ID: string;
  readonly VITE_AUTH0_AUDIENCE: string;
  readonly VITE_LAUNCHDARKLY_CLIENT_SIDE_ID: string;
  readonly VITE_FEATURE_I18N: string;
  readonly VITE_FEATURE_LAUNCHDARKLY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ────────────────────────────────────────────────────────────────────
// Build-time injected
// ────────────────────────────────────────────────────────────────────
declare const __APP_VERSION__: string;
