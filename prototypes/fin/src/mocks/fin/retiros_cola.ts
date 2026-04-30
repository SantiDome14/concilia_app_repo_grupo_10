// ════════════════════════════════════════════════════════════════════
// Mock dataset · `retiro_cola` records (FIN.Tesorería · Cola)
// ────────────────────────────────────────────────────────────────────
// Records consumed by the `fin.tesoreria.cola_asignacion` manifest. A
// row stays in the queue while `cuenta_id === null`; assigning a
// matching account moves it to the ledger (out-of-scope from this
// dataset).
//
// The manifest's account lookup is filtered by `moneda` so each row
// has the moneda that drives the lookup options.
// ════════════════════════════════════════════════════════════════════

import type { RetiroCola } from '@/types/fin';

export const RETIROS_COLA: RetiroCola[] = [
  {
    id: 'R-2026-9341',
    fecha: '2026-04-24',
    cliente: 'Inversiones Norte',
    cliente_id: 'cli-inversiones-norte',
    monto: 250000,
    moneda: 'USDC',
    enqueued_at: '2026-04-24T14:38:00Z',
    cuenta_id: null,
    asignacion_note: null,
  },
  {
    id: 'R-2026-9340',
    fecha: '2026-04-24',
    cliente: 'Tecno SA',
    cliente_id: 'cli-tecno-sa',
    monto: 9200000,
    moneda: 'ARS',
    enqueued_at: '2026-04-24T11:02:00Z',
    cuenta_id: null,
    asignacion_note: null,
  },
  {
    id: 'R-2026-9339',
    fecha: '2026-04-24',
    cliente: 'Capital Plus',
    cliente_id: 'cli-capital-plus',
    monto: 80000,
    moneda: 'USD',
    enqueued_at: '2026-04-24T09:15:00Z',
    cuenta_id: null,
    asignacion_note: null,
  },
  {
    id: 'R-2026-9338',
    fecha: '2026-04-23',
    cliente: 'Mendoza Trading',
    cliente_id: 'cli-mendoza-trading',
    monto: 95000,
    moneda: 'USDC',
    enqueued_at: '2026-04-23T17:42:00Z',
    cuenta_id: null,
    asignacion_note: null,
  },
  {
    id: 'R-2026-9337',
    fecha: '2026-04-23',
    cliente: 'Patagonia FX',
    cliente_id: 'cli-patagonia-fx',
    monto: 420000,
    moneda: 'USDT',
    enqueued_at: '2026-04-23T13:27:00Z',
    cuenta_id: null,
    asignacion_note: null,
  },
];
