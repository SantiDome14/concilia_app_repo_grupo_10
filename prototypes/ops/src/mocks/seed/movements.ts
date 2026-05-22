// ════════════════════════════════════════════════════════════════════
// MSW seed — movements (shared between ops-movimientos + ops-psp)
// ────────────────────────────────────────────────────────────────────
// The legacy backend exposes a single `/movements` endpoint consumed by
// both the OPS Movimientos page (cross-bank / cross-sociedad treasury
// ledger) and the PSP Movements tab (sponsor-scoped sub-account ledger).
// The api modules normalise to slightly different row shapes:
//
//   movimientos.Movement  → { ..., currency, origin, destination, sponsor }
//   psp.PspMovement       → { ..., partner, sponsor }            (no currency)
//
// To satisfy both consumers without duplicating data, the seed stores a
// superset row — each normaliser picks the fields it needs and ignores
// the rest. The PSP handler filters by `?sponsor=` so only the
// sponsor-scoped rows surface in that tab. Absence of `?sponsor` (the
// OPS Movimientos request) returns the full ledger.
// ════════════════════════════════════════════════════════════════════

export interface SeedMovement {
  id: string;
  date: string;
  type: string;
  status: string;
  amount: string;
  currency: string;
  /** Closed-set transport rail (`SWIFT`, `INTERNAL`, `PIX`, …). See `MOVEMENT_RAIL_OPTIONS`. */
  rail: string | null;
  /** Movimientos: bank/account on the source side. */
  origin: string | null;
  /** Movimientos: bank/account on the destination side. */
  destination: string | null;
  /** PSP: sponsor label rendered as a tag (`COINAG`, `BIND`, ...). */
  partner: string | null;
  /** Both modules: open-set sponsor code from `sponsor-catalog`. */
  sponsor: string | null;
  /** Both: client name + tax_number sub-line in the QA UI. */
  client: string | null;
  client_tax_number: string | null;
  counterparty: string | null;
  counterparty_tax_number: string | null;
  /** Movimientos: optional metadata bag exposed by the detail modal. */
  metadata?: Record<string, string>;
}

// ─── PSP sub-account ledger (sponsor-scoped, ARS-only) ──────────────
// Adapted from the OPS-QA `/psp/home` screenshot — Santiago Montero,
// Manuel Gonzalez Lamensa, Ignacio Ramos with COINAG as the partner.
// Types map onto the closed `movimientos/catalog.ts` enum so the
// shared filter dropdowns surface every record:
//   "Withdrawal"   → WITHDRAWAL
//   "Deposit"      → DEPOSIT
//   "Transfer In"  → INT_DEPOSIT
//   "Transfer Out" → IN_WITHDRAWAL
//   "Swap In"      → FX_DEPOSIT

const pspMovements: SeedMovement[] = [
  m('mov-psp-001', '2026-05-14', 'WITHDRAWAL', 'COMPLETED', '-123', 'ARS', 'ARDUA', 'COINAG', 'Santiago Montero', '20434043531', 'Lucas Prueba 245', '20160005115'),
  m('mov-psp-002', '2026-05-13', 'WITHDRAWAL', 'COMPLETED', '-123', 'ARS', 'ARDUA', 'COINAG', 'Santiago Montero', '20434043531', 'Lucas Prueba 245', '20160005115'),
  m('mov-psp-003', '2026-05-12', 'DEPOSIT', 'COMPLETED', '1000', 'ARS', 'INTERNAL', 'COINAG', 'Santiago Montero', '20434043531', 'Nombre', '30999999999'),
  m('mov-psp-004', '2026-05-12', 'WITHDRAWAL', 'COMPLETED', '-12', 'ARS', 'ARDUA', 'COINAG', 'Santiago Montero', '20434043531', 'Lucas Prueba 245', '20160005115'),
  m('mov-psp-005', '2026-05-12', 'WITHDRAWAL', 'COMPLETED', '-12', 'ARS', 'ARDUA', 'COINAG', 'Santiago Montero', '20434043531', 'Lucas Prueba 245', '20160005115'),
  m('mov-psp-006', '2026-05-12', 'INT_DEPOSIT', 'COMPLETED', '12', 'ARS', 'INTERNAL', 'COINAG', 'Manuel Gonzalez Lamensa', '20416466506', 'Santiago Montero', '20434043531'),
  m('mov-psp-007', '2026-05-12', 'IN_WITHDRAWAL', 'COMPLETED', '-12', 'ARS', 'INTERNAL', 'COINAG', 'Santiago Montero', '20434043531', 'Manuel Gonzalez Lamensa', '20416466506'),
  m('mov-psp-008', '2026-05-01', 'WITHDRAWAL', 'COMPLETED', '-100000', 'ARS', 'ARDUA', 'COINAG', 'Santiago Montero', '20434043531', 'Lucas Prueba 245', '20160005115'),
  m('mov-psp-009', '2026-04-27', 'WITHDRAWAL', 'COMPLETED', '-1000', 'ARS', 'ARDUA', 'COINAG', 'Santiago Montero', '20434043531', 'Lucas Prueba 245', '20160005115'),
  m('mov-psp-010', '2026-04-13', 'FX_DEPOSIT', 'COMPLETED', '10', 'ARS', 'FX', 'COINAG', 'Ignacio Ramos', '20430522109', null, null),
  m('mov-psp-011', '2026-04-10', 'DEPOSIT', 'COMPLETED', '3500000', 'ARS', 'ARDUA', 'COINAG', 'Magdalena Ivonne Domínguez Esquibel', 'BP9023RJRAFG', 'Pablo Nicolás Pieroni', '20389441118'),
  m('mov-psp-012', '2026-04-08', 'FEE', 'COMPLETED', '-7.97', 'ARS', 'INTERNAL', 'COINAG', 'Manuel Gonzalez Lamensa', '20416466506', null, null),
  m('mov-psp-013', '2026-04-05', 'WITHDRAWAL', 'PENDING', '-450000', 'ARS', 'ARDUA', 'COINAG', 'Camila Nicole Cattaneo', '27419154704', 'Bridge Pagos SA', '30715432109'),
  m('mov-psp-014', '2026-04-02', 'INT_DEPOSIT', 'COMPLETED', '125000', 'ARS', 'INTERNAL', 'COINAG', 'Club Corrales-Ortiz', 'U1GH6LSN670C', 'Pablo Nicolás Pieroni', '20389441118'),
  m('mov-psp-015', '2026-03-28', 'DEPOSIT', 'COMPLETED', '2400', 'ARS', 'ARDUA', 'COINAG', 'Santiago Montero', '20434043531', 'Bridge Pagos', '30715432109'),
  // BIND records (sponsor structurally listed; lighter activity than COINAG)
  m('mov-psp-016', '2026-05-10', 'DEPOSIT', 'COMPLETED', '50000', 'ARS', 'ARDUA', 'BIND', 'Santiago Montero', '20434043531', 'BIND CVU Pool', '30700000001'),
  m('mov-psp-017', '2026-05-05', 'WITHDRAWAL', 'COMPLETED', '-15000', 'ARS', 'ARDUA', 'BIND', 'Manuel Gonzalez Lamensa', '20416466506', 'BIND CVU Pool', '30700000001'),
  // Banco de Comercio record (single early test movement)
  m('mov-psp-018', '2026-04-30', 'DEPOSIT', 'PENDING', '100000', 'ARS', 'ARDUA', 'BANCO_DE_COMERCIO', 'Camila Nicole Cattaneo', '27419154704', 'BdC Cuenta Madre', '30750000002'),
];

// ─── General OPS Movimientos ledger (no sponsor, multi-currency) ────
// Treasury-side transfers between Sociedades / Bancos / Cuentas. The
// `origin` / `destination` fields surface the source/destination labels
// the Movimientos page renders; PSP normaliser ignores them.

const generalMovements: SeedMovement[] = [
  g('mov-gen-001', '2026-05-15', 'FX_WITHDRAWAL', 'COMPLETED', '-50000', 'USD', 'SWIFT', 'Circuit Pay SA · BIND · 3990180/2', 'Circuit Pay SA · COINAG · 10.047', 'Ardua Solutions Corp', '30734567890', 'Bridge Pagos', '30715432109'),
  g('mov-gen-002', '2026-05-14', 'COLLECTOR_IN', 'COMPLETED', '125000', 'ARS', 'ACH', 'Haz Pagos SA · COINAG · 10.049', null, 'Haz Pagos SA', '30712345678', 'Banco Galicia', '30501113124'),
  g('mov-gen-003', '2026-05-12', 'WITHDRAWAL', 'COMPLETED', '-2500000', 'ARS', 'WIRE', 'Circuit Pay SA · BIND · 3990180/1', 'CENTAURUS ALyC', 'Circuit Pay SA', '30723456789', 'CENTAURUS ALyC', '30765432101'),
  g('mov-gen-004', '2026-05-10', 'DEPOSIT', 'COMPLETED', '12000', 'USDT', 'VCURRENCY USDT', 'Circuit Pay SA · BITGO · USD', null, 'Circuit Pay SA', '30723456789', 'BitGo Custody', null),
  g('mov-gen-005', '2026-05-08', 'FX_DEPOSIT', 'COMPLETED', '1000', 'USDC', 'VCURRENCY USDC', 'Astra Ventures · BITGO · USDC', 'Astra Ventures Wallet', 'Astra Ventures', '30745678901', 'Coinbase Prime', null),
  g('mov-gen-006', '2026-05-05', 'COLLECTOR_OUT', 'COMPLETED', '-15000', 'ARS', 'ACH', 'Circuit Pay SA · COINAG · 10.045', null, 'Circuit Pay SA', '30723456789', 'Cliente Final', null),
  g('mov-gen-007', '2026-05-01', 'FEE', 'COMPLETED', '-150', 'USD', 'INTERNAL', 'Ardua Solutions Corp · BRIDGE · BR-7733', null, 'Ardua Solutions Corp', '30734567890', null, null),
  g('mov-gen-008', '2026-04-29', 'WITHDRAWAL', 'FAILED', '-7500', 'USD', 'SWIFT', 'Circuit Pay SA · FV BANK · 780001002640', 'Convera Bank', null, null, 'CONVERA Wire', null),
  g('mov-gen-009', '2026-04-25', 'INT_DEPOSIT', 'COMPLETED', '4000000', 'ARS', 'INTERNAL', 'Haz Pagos SA · BIND · 4403443/2', 'Haz Pagos SA · COINAG · 10.049', 'Haz Pagos SA', '30712345678', 'Haz Pagos SA', '30712345678'),
  g('mov-gen-010', '2026-04-22', 'DEPOSIT', 'COMPLETED', '500000', 'ARS', 'ACH', 'Circuit Pay SA · BRUBANK · 2504665352001', null, 'Circuit Pay SA', '30723456789', 'Mercado Libre SA', '30708541418'),
  g('mov-gen-011', '2026-04-20', 'FX_DEPOSIT', 'PENDING', '8500', 'USD', 'SWIFT', 'Circuit Pay SA · ADCAP · 250761', 'Circuit Pay SA · BRIDGE · USD', 'Circuit Pay SA', '30723456789', 'BRIDGE Treasury', null),
  g('mov-gen-012', '2026-04-15', 'WITHDRAWAL', 'COMPLETED', '-30000', 'ARS', 'WIRE', 'Haz Pagos SA · ADCAP · 250788', 'BULL MARKET ALyC', 'Haz Pagos SA', '30712345678', 'BULL MARKET ALyC', null),
];

export const movementsSeed: SeedMovement[] = [...pspMovements, ...generalMovements];

export function resetMovementsSeed(): void {
  movementsSeed.length = 0;
  movementsSeed.push(...pspMovements, ...generalMovements);
}

// ─── Constructors (positional sugar — keeps the seed arrays scannable) ────

function m(
  id: string,
  date: string,
  type: string,
  status: string,
  amount: string,
  currency: string,
  rail: string | null,
  sponsor: string | null,
  client: string | null,
  clientTax: string | null,
  counterparty: string | null,
  counterpartyTax: string | null,
): SeedMovement {
  return {
    id,
    date,
    type,
    status,
    amount,
    currency,
    rail,
    origin: null,
    destination: null,
    partner: sponsor,
    sponsor,
    client,
    client_tax_number: clientTax,
    counterparty,
    counterparty_tax_number: counterpartyTax,
  };
}

function g(
  id: string,
  date: string,
  type: string,
  status: string,
  amount: string,
  currency: string,
  rail: string | null,
  origin: string | null,
  destination: string | null,
  client: string | null,
  clientTax: string | null,
  counterparty: string | null,
  counterpartyTax: string | null,
): SeedMovement {
  return {
    id,
    date,
    type,
    status,
    amount,
    currency,
    rail,
    origin,
    destination,
    partner: null,
    sponsor: null,
    client,
    client_tax_number: clientTax,
    counterparty,
    counterparty_tax_number: counterpartyTax,
  };
}
