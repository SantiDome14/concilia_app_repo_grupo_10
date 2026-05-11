import type { App } from 'vue';
import { env } from '@/config/env';

// ════════════════════════════════════════════════════════════════════
// LaunchDarkly (opt-in)
// ────────────────────────────────────────────────────────────────────
// Activated by VITE_FEATURE_LAUNCHDARKLY=true. Imported dynamically
// from main.ts to keep the bundle clean when disabled.
// ════════════════════════════════════════════════════════════════════

export async function setupLaunchDarkly(app: App): Promise<void> {
  if (!env.VITE_LAUNCHDARKLY_CLIENT_SIDE_ID) {
     
    console.warn('[launchdarkly] Feature enabled but client-side ID missing');
    return;
  }

  const { LDPlugin } = await import('launchdarkly-vue-client-sdk');
  app.use(LDPlugin, {
    clientSideID: env.VITE_LAUNCHDARKLY_CLIENT_SIDE_ID,
    context: {
      kind: 'user',
      key: 'anonymous',
      name: 'Anonymous',
    },
  });
}
