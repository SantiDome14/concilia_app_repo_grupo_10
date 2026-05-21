// ════════════════════════════════════════════════════════════════════
// MSW handlers — barrel (FIN)
// ────────────────────────────────────────────────────────────────────
// Aggregates the cross-cutting handlers shared with the template.
// FIN-specific handlers (Disponibilidades, Cotizaciones, etc.) will be
// added in their own migration pass; for now those modules keep the
// legacy `src/mocks/fin/*` static-array pattern.
// ════════════════════════════════════════════════════════════════════

import { alertaHandlers } from './alertas';
import { dashboardKpisHandlers } from './dashboardKpis';
import { exampleHandlers } from './examples';
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
];
