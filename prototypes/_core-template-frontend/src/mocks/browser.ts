// ════════════════════════════════════════════════════════════════════
// MSW browser worker
// ────────────────────────────────────────────────────────────────────
// Wraps `setupWorker` from `msw/browser` with the project's handler set.
// Imported dynamically from `src/main.ts` only when `VITE_USE_MOCKS` is
// `true`, so MSW never ships into a real production bundle.
// ════════════════════════════════════════════════════════════════════

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
