import { afterAll, afterEach, beforeAll } from 'vitest';
import { config, enableAutoUnmount } from '@vue/test-utils';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';

// jsdom doesn't expose ProgressEvent, which MSW's XHR interceptor uses to
// surface progress / load callbacks. Polyfill it minimally before MSW boots.
if (typeof globalThis.ProgressEvent === 'undefined') {
  class ProgressEventPolyfill extends Event {
    public readonly lengthComputable: boolean;
    public readonly loaded: number;
    public readonly total: number;
    constructor(type: string, init?: { lengthComputable?: boolean; loaded?: number; total?: number }) {
      super(type);
      this.lengthComputable = init?.lengthComputable ?? false;
      this.loaded = init?.loaded ?? 0;
      this.total = init?.total ?? 0;
    }
  }
  (globalThis as unknown as { ProgressEvent: typeof ProgressEventPolyfill }).ProgressEvent =
    ProgressEventPolyfill;
}

import { server } from '@/mocks/server';
import { resetAlertasSeed } from '@/mocks/seed/alertas';
import { resetClientsSeed } from '@/mocks/seed/clients';
import { resetDashboardKpisSeed } from '@/mocks/seed/dashboardKpis';
import { resetSeed as resetExamplesSeed } from '@/mocks/seed/examples';
import { resetFinSeed } from '@/mocks/seed/fin';
import { resetReportsSeed } from '@/mocks/seed/reports';
import { resetSolicitudesSeed } from '@/mocks/seed/solicitudes';
import { resetUsersSeed } from '@/mocks/seed/users';

// ════════════════════════════════════════════════════════════════════
// Vitest setup
// ────────────────────────────────────────────────────────────────────
// 1. Boots MSW (node) against the same handlers the browser worker uses,
//    so component tests exercise the real HTTP path end-to-end.
// 2. Installs Vue Query as a global plugin with a fresh queryClient
//    shared across the file; `queryClient.clear()` runs after each test
//    to drop cached results.
// 3. Resets every in-memory seed between tests so mutations don't leak.
// ════════════════════════════════════════════════════════════════════

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, gcTime: 0, staleTime: 0 },
    mutations: { retry: false },
  },
});

config.global.plugins = [
  ...(config.global.plugins ?? []),
  [VueQueryPlugin, { queryClient }],
];

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
});

afterEach(() => {
  server.resetHandlers();
  queryClient.clear();
  resetAlertasSeed();
  resetClientsSeed();
  resetDashboardKpisSeed();
  resetExamplesSeed();
  resetFinSeed();
  resetReportsSeed();
  resetSolicitudesSeed();
  resetUsersSeed();
});

afterAll(() => {
  server.close();
});

enableAutoUnmount(afterEach);
