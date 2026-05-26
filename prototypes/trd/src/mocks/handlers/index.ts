// ════════════════════════════════════════════════════════════════════
// MSW handlers — barrel
// ────────────────────────────────────────────────────────────────────
// Aggregates every domain handler array into the `handlers` export that
// `../browser.ts` hands to `setupWorker`.
//
// Derived apps extend this barrel with their own domain handlers:
//
//   import { fooHandlers } from './foo';
//   export const handlers = [...exampleHandlers, ..., ...fooHandlers];
//
// Keep this file as a thin re-export — never inline handler bodies here.
// ════════════════════════════════════════════════════════════════════

import { alertaHandlers } from './alertas';
import { clientHandlers } from './clients';
import { dashboardKpisHandlers } from './dashboardKpis';
import { exampleHandlers } from './examples';
import { finHandlers } from './fin';
import { liquidityHandlers } from './liquidity';
import { quoteHandlers } from './quotes';
import { reportHandlers } from './reports';
import { solicitudHandlers } from './solicitudes';
import { userHandlers } from './users';

export const handlers = [
  ...exampleHandlers,
  ...userHandlers,
  ...dashboardKpisHandlers,
  ...solicitudHandlers,
  ...alertaHandlers,
  ...reportHandlers,
  ...finHandlers,
  ...clientHandlers,
  ...quoteHandlers,
  ...liquidityHandlers,
];
