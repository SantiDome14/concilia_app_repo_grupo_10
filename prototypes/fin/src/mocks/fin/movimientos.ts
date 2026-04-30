// ════════════════════════════════════════════════════════════════════
// Mock dataset · `movimiento` records (FIN.Movimientos)
// ────────────────────────────────────────────────────────────────────
// Mirrors the legacy `MOVS` constant in `prototypes/fin-old/fin-prototype.html`
// (line 3800) but rewritten so the manifest engine's predicates resolve:
//   - `tipo` is the canonical record-type discriminator
//   - `fin.sociedad_id`, `fin.cuenta_id`, etc. carry CATALOG IDS (null
//     when the corresponding imputation is pending) — the prototype's
//     label-only fields (`fin.sociedad: 'Haz Pagos'`) are NOT what the
//     engine reads
//   - `ops.*` preserves OPS-native traceability as read-only metadata
//
// Coverage:
//   - 18 records spanning every MovimientoTipo declared by the manifest
//   - imputation states: 7 PEND, 4 PARC, 7 IMP
//   - conciliacion states: PEND / CONC / DIFF
// ════════════════════════════════════════════════════════════════════

import type { Movimiento } from '@/types/fin';

export const MOVIMIENTOS: Movimiento[] = [
  // ─── PEND · cliente sin asignar (depósito ARS de ACME) ──────────────
  {
    id: 'M-2026-12842',
    tipo: 'COLLECTOR_IN',
    fecha: '2026-04-24',
    monto: '+ ARS 18.500.000',
    moneda: 'ARS',
    status: 'COMPLETED',
    ops: {
      rail: 'CBU Coinag',
      account: '0170-4521',
      client: 'ACME Corp',
      counterparty: null,
      partner: 'Coinag',
      provider: 'Coinag',
    },
    fin: {
      imput: 'PEND',
      sociedad_id: null,
      cuenta_id: null,
      cliente_id: null,
      conc: 'PEND',
    },
  },
  // ─── IMP · withdrawal USDC totalmente imputado ─────────────────────
  {
    id: 'M-2026-12841',
    tipo: 'WITHDRAWAL',
    fecha: '2026-04-24',
    monto: '- USDC 250.000',
    moneda: 'USDC',
    status: 'COMPLETED',
    ops: {
      rail: 'Pool BitGo USDC',
      account: '0xBG...A8C2',
      client: 'Inversiones Norte',
      counterparty: 'Cliente externo',
      partner: 'BitGo',
      provider: 'BitGo',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'cp',
      cuenta_id: 'cu-cp-bitgo-usdc',
      cliente_id: 'cli-inversiones-norte',
      cliente_imputation_note: 'Withdrawal validado contra solicitud CLP',
      conc: 'CONC',
    },
  },
  // ─── IMP · depósito USD imputado a Tecno SA ────────────────────────
  {
    id: 'M-2026-12840',
    tipo: 'DEPOSIT',
    fecha: '2026-04-24',
    monto: '+ USD 180.000',
    moneda: 'USD',
    status: 'COMPLETED',
    ops: {
      rail: 'Bridge USD',
      account: 'BR-7733',
      client: 'Tecno SA',
      counterparty: null,
      partner: 'Bridge',
      provider: 'Bridge',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'asc',
      cuenta_id: 'cu-asc-bridge',
      cliente_id: 'cli-tecno-sa',
      conc: 'PEND',
    },
  },
  // ─── PEND · FEE sin proveedor asignado, conciliación con DIFF ───────
  {
    id: 'M-2026-12839',
    tipo: 'FEE',
    fecha: '2026-04-24',
    monto: '- ARS 12.500',
    moneda: 'ARS',
    status: 'COMPLETED',
    ops: {
      rail: 'CBU Coinag',
      account: '0170-4521',
      client: null,
      counterparty: 'Coinag',
      partner: 'Coinag',
      provider: 'Coinag',
    },
    fin: {
      imput: 'PEND',
      sociedad_id: null,
      cuenta_id: null,
      proveedor_id: null,
      conc: 'DIFF',
    },
  },
  // ─── IMP · SWAP_OUT USDT, swap interno ─────────────────────────────
  {
    id: 'M-2026-12838',
    tipo: 'SWAP_OUT',
    fecha: '2026-04-23',
    monto: '- USDT 420.000',
    moneda: 'USDT',
    status: 'COMPLETED',
    ops: {
      rail: 'Pool BitGo USDT',
      account: '0xBG...USDT',
      client: 'Inversiones Norte',
      counterparty: null,
      partner: 'BitGo',
      provider: 'BitGo',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'cp',
      cuenta_id: 'cu-cp-bitgo-usdt',
      cliente_id: 'cli-inversiones-norte',
      conc: 'CONC',
    },
  },
  // ─── IMP · SWAP_IN USDC, contra-pata del swap interno ───────────────
  {
    id: 'M-2026-12837',
    tipo: 'SWAP_IN',
    fecha: '2026-04-23',
    monto: '+ USDC 419.580',
    moneda: 'USDC',
    status: 'COMPLETED',
    ops: {
      rail: 'Pool BitGo USDC',
      account: '0xBG...A8C2',
      client: 'Inversiones Norte',
      counterparty: null,
      partner: 'BitGo',
      provider: 'BitGo',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'cp',
      cuenta_id: 'cu-cp-bitgo-usdc',
      cliente_id: 'cli-inversiones-norte',
      conc: 'CONC',
    },
  },
  // ─── PARC · TRANSFER_IN, falta cuenta_origen_id (es la pata IN) ────
  {
    id: 'M-2026-12836',
    tipo: 'TRANSFER_IN',
    fecha: '2026-04-23',
    monto: '+ USD 250.000',
    moneda: 'USD',
    status: 'COMPLETED',
    ops: {
      rail: 'Convera USD',
      account: 'CV-1188',
      client: null,
      counterparty: 'Bridge',
      partner: 'Convera',
      provider: 'Convera',
    },
    fin: {
      imput: 'PARC',
      sociedad_id: 'asc',
      cuenta_id: 'cu-asc-convera',
      cuenta_origen_id: null,
      conc: 'PEND',
    },
  },
  // ─── PARC · TRANSFER_OUT, falta cuenta_destino_id ──────────────────
  {
    id: 'M-2026-12835',
    tipo: 'TRANSFER_OUT',
    fecha: '2026-04-23',
    monto: '- USD 250.000',
    moneda: 'USD',
    status: 'COMPLETED',
    ops: {
      rail: 'Bridge USD',
      account: 'BR-7733',
      client: null,
      counterparty: 'Convera',
      partner: 'Bridge',
      provider: 'Bridge',
    },
    fin: {
      imput: 'PARC',
      sociedad_id: 'asc',
      cuenta_id: 'cu-asc-bridge',
      cuenta_destino_id: null,
      conc: 'PEND',
    },
  },
  // ─── IMP · COLLECTOR_OUT con todo asignado ──────────────────────────
  {
    id: 'M-2026-12834',
    tipo: 'COLLECTOR_OUT',
    fecha: '2026-04-23',
    monto: '- ARS 9.200.000',
    moneda: 'ARS',
    status: 'COMPLETED',
    ops: {
      rail: 'CBU Coinag',
      account: '0170-4521',
      client: 'Tecno SA',
      counterparty: null,
      partner: 'Coinag',
      provider: 'Coinag',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'hp',
      cuenta_id: 'cu-hp-coinag-cbu',
      cliente_id: 'cli-tecno-sa',
      conc: 'CONC',
    },
  },
  // ─── PEND · DEPOSIT EUR PENDING en banca ──────────────────────────
  {
    id: 'M-2026-12833',
    tipo: 'DEPOSIT',
    fecha: '2026-04-22',
    monto: '+ EUR 95.000',
    moneda: 'EUR',
    status: 'PENDING',
    ops: {
      rail: 'Bind EUR',
      account: 'BD-5566',
      client: 'Grupo Sur',
      counterparty: null,
      partner: 'Bind',
      provider: 'Bind',
    },
    fin: {
      imput: 'PEND',
      sociedad_id: null,
      cuenta_id: null,
      cliente_id: null,
      conc: 'PEND',
    },
  },
  // ─── PEND · TAX a AFIP, requiere banco_id ──────────────────────────
  {
    id: 'M-2026-12832',
    tipo: 'TAX',
    fecha: '2026-04-22',
    monto: '- ARS 145.000',
    moneda: 'ARS',
    status: 'COMPLETED',
    ops: {
      rail: 'CVU Cliente Pool',
      account: 'CV-9999',
      client: null,
      counterparty: 'AFIP',
      partner: 'AFIP',
      provider: 'AFIP',
    },
    fin: {
      imput: 'PEND',
      sociedad_id: null,
      cuenta_id: null,
      banco_id: null,
      conc: 'PEND',
    },
  },
  // ─── PEND · REBATE BitGo, requiere partner_id ──────────────────────
  {
    id: 'M-2026-12831',
    tipo: 'REBATE',
    fecha: '2026-04-22',
    monto: '+ USDC 1.200',
    moneda: 'USDC',
    status: 'COMPLETED',
    ops: {
      rail: 'Pool BitGo USDC',
      account: '0xBG...A8C2',
      client: null,
      counterparty: 'BitGo',
      partner: 'BitGo',
      provider: 'BitGo',
    },
    fin: {
      imput: 'PEND',
      sociedad_id: null,
      cuenta_id: null,
      partner_id: null,
      conc: 'PEND',
    },
  },
  // ─── IMP · ADDITION manual (carga manual aprobada) ─────────────────
  {
    id: 'M-2026-12830',
    tipo: 'ADDITION',
    fecha: '2026-04-22',
    monto: '+ USD 50.000',
    moneda: 'USD',
    status: 'COMPLETED',
    ops: {
      rail: 'Bridge USD',
      account: 'BR-7733',
      client: null,
      counterparty: null,
      partner: 'Bridge',
      provider: 'Bridge',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'asc',
      cuenta_id: 'cu-asc-bridge',
      conc: 'CONC',
    },
  },
  // ─── PEND · COLLECTOR_IN USDC para Astra ────────────────────────────
  {
    id: 'M-2026-12829',
    tipo: 'COLLECTOR_IN',
    fecha: '2026-04-21',
    monto: '+ USDC 130.000',
    moneda: 'USDC',
    status: 'COMPLETED',
    ops: {
      rail: 'Pool BitGo USDC (Astra)',
      account: '0xBG...AS',
      client: 'Costa Atlántica SRL',
      counterparty: null,
      partner: 'BitGo',
      provider: 'BitGo',
    },
    fin: {
      imput: 'PEND',
      sociedad_id: null,
      cuenta_id: null,
      cliente_id: null,
      conc: 'PEND',
    },
  },
  // ─── IMP · WITHDRAWAL USD a Capital Plus ────────────────────────────
  {
    id: 'M-2026-12828',
    tipo: 'WITHDRAWAL',
    fecha: '2026-04-21',
    monto: '- USD 80.000',
    moneda: 'USD',
    status: 'COMPLETED',
    ops: {
      rail: 'Convera USD',
      account: 'CV-1188',
      client: 'Capital Plus',
      counterparty: null,
      partner: 'Convera',
      provider: 'Convera',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'asc',
      cuenta_id: 'cu-asc-convera',
      cliente_id: 'cli-capital-plus',
      conc: 'CONC',
    },
  },
  // ─── IMP · DEPOSIT ARS imputado a Mendoza Trading ─────────────────
  {
    id: 'M-2026-12827',
    tipo: 'DEPOSIT',
    fecha: '2026-04-21',
    monto: '+ ARS 22.000.000',
    moneda: 'ARS',
    status: 'COMPLETED',
    ops: {
      rail: 'Cuenta Galicia',
      account: 'GA-3344',
      client: 'Mendoza Trading',
      counterparty: null,
      partner: 'Galicia',
      provider: 'Galicia',
    },
    fin: {
      imput: 'IMP',
      sociedad_id: 'hp',
      cuenta_id: 'cu-hp-galicia',
      cliente_id: 'cli-mendoza-trading',
      conc: 'CONC',
    },
  },
  // ─── PARC · FEE Bitso, sociedad asignada pero sin proveedor_id ─────
  {
    id: 'M-2026-12826',
    tipo: 'FEE',
    fecha: '2026-04-21',
    monto: '- USDT 280',
    moneda: 'USDT',
    status: 'COMPLETED',
    ops: {
      rail: 'Pool Bitso USDT',
      account: 'BX-USDT',
      client: null,
      counterparty: 'Bitso',
      partner: 'Bitso',
      provider: 'Bitso',
    },
    fin: {
      imput: 'PARC',
      sociedad_id: 'cp',
      cuenta_id: 'cu-cp-bitso-usdt',
      proveedor_id: null,
      conc: 'PEND',
    },
  },
  // ─── PEND · DEPOSIT CAD FAILED de Andes Capital ─────────────────────
  {
    id: 'M-2026-12825',
    tipo: 'DEPOSIT',
    fecha: '2026-04-20',
    monto: '+ CAD 65.000',
    moneda: 'CAD',
    status: 'FAILED',
    ops: {
      rail: 'BMO CAD',
      account: 'BM-2200',
      client: 'Andes Capital',
      counterparty: null,
      partner: 'BMO',
      provider: 'BMO',
    },
    fin: {
      imput: 'PEND',
      sociedad_id: null,
      cuenta_id: null,
      cliente_id: null,
      conc: 'PEND',
    },
  },
];
