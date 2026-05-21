// ════════════════════════════════════════════════════════════════════
// MSW handlers — barrel
// ────────────────────────────────────────────────────────────────────
// Aggregates every domain handler array into the `handlers` export that
// `../browser.ts` hands to `setupWorker`. Cross-cutting (template-shared)
// handlers come first; OPS-specific domain handlers will land below as
// each one is wired in Phase 4.
// ════════════════════════════════════════════════════════════════════

import { accountInstructionHandlers } from './accountInstructions';
import { alertaHandlers } from './alertas';
import { banksAccountsHandlers } from './banksAccounts';
import { clientHandlers } from './clients';
import { dashboardKpisHandlers } from './dashboardKpis';
import { exampleHandlers } from './examples';
import { instructionHandlers } from './instructions';
import { movementsHandlers } from './movements';
import { pspHandlers } from './psp';
import { reportHandlers } from './reports';
import { solicitudHandlers } from './solicitudes';
import { statementHandlers } from './statements';
import { tradeHandlers } from './trades';
import { userHandlers } from './users';

// Order matters when patterns overlap. `instructionHandlers` owns the
// shared `/instruction*` paths and MUST run before `accountInstructionHandlers`
// so the wizard's `GET /instruction` (templates) and `GET
// /instruction-attribute/instruction/:id` (schema) resolve from the
// instructions seed rather than 404-ing through the wizard's narrower
// surface.
export const handlers = [
  ...exampleHandlers,
  ...userHandlers,
  ...dashboardKpisHandlers,
  ...solicitudHandlers,
  ...alertaHandlers,
  ...reportHandlers,
  ...clientHandlers,
  ...instructionHandlers,
  ...accountInstructionHandlers,
  ...banksAccountsHandlers,
  ...movementsHandlers,
  ...pspHandlers,
  ...statementHandlers,
  ...tradeHandlers,
];
