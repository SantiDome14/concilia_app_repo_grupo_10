// ════════════════════════════════════════════════════════════════════
// Mock dataset · `quote` records (FIN.Cotizaciones)
// ────────────────────────────────────────────────────────────────────
// Mirrors the legacy `QUOTES` constant in `prototypes/fin-old/fin-prototype.html`
// (line 3737) flattened to the manifest engine's expected shape:
//   - `status` (trading lifecycle: pending / offered / executed / settled / cancelled)
//     drives `show_when` predicates on every Cotizaciones action
//   - `fin.facturaState` (documentación lifecycle: pendiente / facturada / no-req)
//     drives the kanban axis `fin.facturaState` and the Generar Factura /
//     Marcar No Facturable enable_when predicates
// ════════════════════════════════════════════════════════════════════

import type { Quote } from '@/types/fin';

export const QUOTES: Quote[] = [
  {
    id: 'Q-2026-1842',
    status: 'executed',
    cliente_id: 'cli-acme',
    cliente_nombre: 'ACME Corp',
    par: 'USDC/ARS',
    monto: 250000,
    moneda: 'USDC',
    spread_bps: 42,
    fecha: '2026-04-24',
    fin: { facturaState: 'pendiente' },
  },
  {
    id: 'Q-2026-1841',
    status: 'executed',
    cliente_id: 'cli-tecno-sa',
    cliente_nombre: 'Tecno SA',
    par: 'USD/ARS',
    monto: 180000,
    moneda: 'USD',
    spread_bps: 38,
    fecha: '2026-04-24',
    fin: {
      facturaState: 'facturada',
      factura: 'A-0001-00043',
      fact_at: '2026-04-24',
    },
  },
  {
    id: 'Q-2026-1840',
    status: 'executed',
    cliente_id: 'cli-inversiones-norte',
    cliente_nombre: 'Inversiones Norte',
    par: 'USDT/ARS',
    monto: 420000,
    moneda: 'USDT',
    spread_bps: 51,
    fecha: '2026-04-24',
    fin: { facturaState: 'pendiente' },
  },
  {
    id: 'Q-2026-1839',
    status: 'executed',
    cliente_id: 'cli-grupo-sur',
    cliente_nombre: 'Grupo Sur',
    par: 'EUR/USD',
    monto: 95000,
    moneda: 'EUR',
    spread_bps: 18,
    fecha: '2026-04-24',
    fin: {
      facturaState: 'facturada',
      factura: 'A-0001-00042',
      fact_at: '2026-04-24',
    },
  },
  {
    id: 'Q-2026-1838',
    status: 'settled',
    cliente_id: 'cli-capital-plus',
    cliente_nombre: 'Capital Plus',
    par: 'USDC/USD',
    monto: 1200000,
    moneda: 'USDC',
    spread_bps: 9,
    fecha: '2026-04-23',
    fin: {
      facturaState: 'no-req',
      no_factura_motivo: 'Operación interna sin facturación',
    },
  },
  {
    id: 'Q-2026-1837',
    status: 'settled',
    cliente_id: 'cli-mendoza-trading',
    cliente_nombre: 'Mendoza Trading',
    par: 'USDC/ARS',
    monto: 80000,
    moneda: 'USDC',
    spread_bps: 48,
    fecha: '2026-04-23',
    fin: {
      facturaState: 'facturada',
      factura: 'A-0001-00041',
      fact_at: '2026-04-23',
    },
  },
  {
    id: 'Q-2026-1836',
    status: 'settled',
    cliente_id: 'cli-patagonia-fx',
    cliente_nombre: 'Patagonia FX',
    par: 'USDT/ARS',
    monto: 320000,
    moneda: 'USDT',
    spread_bps: 55,
    fecha: '2026-04-23',
    fin: { facturaState: 'pendiente' },
  },
  {
    id: 'Q-2026-1835',
    status: 'settled',
    cliente_id: 'cli-andes-capital',
    cliente_nombre: 'Andes Capital',
    par: 'USD/ARS',
    monto: 220000,
    moneda: 'USD',
    spread_bps: 35,
    fecha: '2026-04-23',
    fin: {
      facturaState: 'facturada',
      factura: 'A-0001-00040',
      fact_at: '2026-04-23',
    },
  },
  {
    id: 'Q-2026-1834',
    status: 'settled',
    cliente_id: 'cli-acme',
    cliente_nombre: 'ACME Corp',
    par: 'USDT/ARS',
    monto: 540000,
    moneda: 'USDT',
    spread_bps: 50,
    fecha: '2026-04-22',
    fin: { facturaState: 'pendiente' },
  },
  {
    id: 'Q-2026-1831',
    status: 'cancelled',
    cliente_id: 'cli-tecno-sa',
    cliente_nombre: 'Tecno SA',
    par: 'USD/ARS',
    monto: 95000,
    moneda: 'USD',
    spread_bps: 32,
    fecha: '2026-04-22',
    fin: {
      facturaState: 'no-req',
      anulado_at: '2026-04-22',
      anulacion_motivo: 'Cliente desistió antes de la ejecución',
    },
  },
];
