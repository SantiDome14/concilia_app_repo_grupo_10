// ════════════════════════════════════════════════════════════════════
// Mock Disponibilidades — Posición tree + KPIs (REQ-50 §3)
// ────────────────────────────────────────────────────────────────────
// Per REQ-50 (`add-fin-disponibilidades`), the Posición sub-tab renders
// a hierarchical tree Sociedad → Cuenta with consolidated saldos and
// Propio / Cliente segmentation. The Movimientos and Cola legacy mocks
// (`TES_MOVS`, `COLA`) are removed; the new Movimientos sub-tab
// consumes the canonical `Movimiento[]` from `./movimientos.ts`.
//
// In v1 the tree is a static mock with plausible saldos consistent with
// the canonical CUENTAS catalogue. The contract "movimientos in
// pendiente_de_supervision do NOT impact saldos" (REQ-50 §3.3 + §6.2)
// is verified at the spec level and will hold once the backend wires
// the real aggregation. Mock-time derivation from `MOVIMIENTOS` is
// deferred until the real backend lands.
// ════════════════════════════════════════════════════════════════════

import type { Moneda, SociedadPos } from '@/types/fin';

// ────────────────────────────────────────────────────────────────────
// Posición tree (Sociedad → Cuenta with Propio / Cliente segmentation)
// ────────────────────────────────────────────────────────────────────

export const POSICION_TREE: SociedadPos[] = [
  {
    id: 'hp',
    name: 'Haz Pagos',
    sub: 'PSP · Argentina · ARS',
    open: true,
    totals: [{ lbl: 'ARS', val: '1.017.930.500' }],
    total_propio: '350.420.500',
    total_cliente: '667.510.000',
    cuentas: [
      {
        icon: 'bank',
        id: 'cu-hp-coinag-1',
        name: 'COINAG · ARS · Cta 10.049',
        det: 'CBU principal · Banco Coinag',
        saldo: '845.230.500',
        saldo_propio: '244.770.000',
        saldo_cliente: '600.460.500',
        moneda: 'ARS',
      },
      {
        icon: 'bank',
        id: 'cu-hp-coinag-cvu',
        name: 'COINAG · CVU Cliente Pool',
        det: 'Pool de CVUs',
        saldo: '142.500.000',
        saldo_propio: '75.500.000',
        saldo_cliente: '67.000.000',
        moneda: 'ARS',
      },
      {
        icon: 'bank',
        id: 'cu-hp-brubank-1',
        name: 'BRUBANK · ARS · Cta 2504679505001',
        det: 'cuenta x4521',
        saldo: '8.200.000',
        saldo_propio: '8.200.000',
        saldo_cliente: '0',
        moneda: 'ARS',
      },
      {
        icon: 'bank',
        id: 'cu-hp-bind-1',
        name: 'BIND · ARS · Cta 4403443/1',
        det: 'cuenta principal',
        saldo: '22.000.000',
        saldo_propio: '22.000.000',
        saldo_cliente: '0',
        moneda: 'ARS',
      },
    ],
  },
  {
    id: 'cp',
    name: 'Circuit Pay',
    sub: 'PSAV · Argentina · USDC/USDT',
    open: false,
    totals: [
      { lbl: 'USDC', val: '3.200.000' },
      { lbl: 'USDT', val: '1.780.000' },
    ],
    total_propio: '1.480.000',
    total_cliente: '3.500.000',
    cuentas: [
      {
        icon: 'wallet',
        id: 'cu-cp-bitgo-2',
        name: 'BITGO · USD',
        det: 'wallet 0xBG...A8C2',
        saldo: '3.200.000',
        saldo_propio: '1.200.000',
        saldo_cliente: '2.000.000',
        moneda: 'USDC',
      },
      {
        icon: 'wallet',
        id: 'cu-cp-bitgo-1',
        name: 'BITGO · ARS',
        det: 'wallet 0xBG...USDT (USDT custodia)',
        saldo: '1.500.000',
        saldo_propio: '280.000',
        saldo_cliente: '1.220.000',
        moneda: 'USDT',
      },
      {
        icon: 'wallet',
        id: 'cu-cp-bitso-1',
        name: 'BITSO · ARS',
        det: 'wallet 0x789... (USDT)',
        saldo: '280.000',
        saldo_propio: '0',
        saldo_cliente: '280.000',
        moneda: 'USDT',
      },
    ],
  },
  {
    id: 'asc',
    name: 'Ardua Solutions Corp',
    sub: 'MSB · Canadá · USD/CAD/USDC',
    open: false,
    totals: [
      { lbl: 'USD', val: '11.450.000' },
      { lbl: 'CAD', val: '1.200.000' },
      { lbl: 'USDC', val: '1.000.000' },
    ],
    total_propio: '9.430.000',
    total_cliente: '4.220.000',
    cuentas: [
      {
        icon: 'bank',
        id: 'cu-asc-bridge-1',
        name: 'BRIDGE · USD · Cta BR-7733',
        det: 'cuenta xx-9821',
        saldo: '8.450.000',
        saldo_propio: '6.450.000',
        saldo_cliente: '2.000.000',
        moneda: 'USD',
      },
      {
        icon: 'bank',
        id: 'cu-asc-convera-1',
        name: 'CONVERA · USD · Cta CV-1188',
        det: 'cuenta xx-3344',
        saldo: '3.000.000',
        saldo_propio: '1.800.000',
        saldo_cliente: '1.200.000',
        moneda: 'USD',
      },
      {
        icon: 'bank',
        id: 'cu-asc-bmo-1',
        name: 'BMO · CAD · Cta BM-2200',
        det: 'account xx-1122',
        saldo: '1.200.000',
        saldo_propio: '180.000',
        saldo_cliente: '1.020.000',
        moneda: 'CAD',
      },
      {
        icon: 'wallet',
        id: 'cu-asc-coinbase-usdc',
        name: 'Coinbase · USDC',
        det: 'wallet 0xCBA...',
        saldo: '1.000.000',
        saldo_propio: '1.000.000',
        saldo_cliente: '0',
        moneda: 'USDC',
      },
    ],
  },
  {
    id: 'av',
    name: 'Astra Ventures',
    sub: 'VASP · Polonia · EUR/USDC',
    open: false,
    totals: [
      { lbl: 'EUR', val: '1.820.000' },
      { lbl: 'USDC', val: '580.000' },
    ],
    total_propio: '1.420.000',
    total_cliente: '980.000',
    cuentas: [
      {
        icon: 'bank',
        id: 'cu-av-bind-1',
        name: 'BIND · EUR · Cta BD-5566',
        det: 'cuenta xx-5566',
        saldo: '1.820.000',
        saldo_propio: '1.180.000',
        saldo_cliente: '640.000',
        moneda: 'EUR',
      },
      {
        icon: 'wallet',
        id: 'cu-av-bitgo-1',
        name: 'BITGO · USDC (Astra)',
        det: 'wallet 0xAST...',
        saldo: '580.000',
        saldo_propio: '240.000',
        saldo_cliente: '340.000',
        moneda: 'USDC',
      },
    ],
  },
];

/** Sociedades catalog flattened for the filter dropdown. */
export const SOCIEDADES_CATALOG = POSICION_TREE.map((s) => ({
  value: s.id,
  label: s.name,
}));

/** Distinct currencies present in the tree. */
export const MONEDAS_CATALOG: Moneda[] = Array.from(
  new Set(POSICION_TREE.flatMap((s) => s.cuentas.map((c) => c.moneda))),
).sort();

// ────────────────────────────────────────────────────────────────────
// Posición KPIs (L2 of the Posición sub-tab — REQ-50 §3.2)
// ────────────────────────────────────────────────────────────────────

export interface PosicionKpis {
  /** USD-equivalent consolidated position across all sociedades. */
  posicionConsolidada: string;
  /** USD-equivalent Propio total. */
  totalPropio: string;
  /** USD-equivalent Cliente total. */
  totalCliente: string;
  sociedadesActivas: number;
  cuentasActivas: number;
}

export const POSICION_KPIS: PosicionKpis = {
  posicionConsolidada: 'USD 28.4M',
  totalPropio: 'USD 14.6M',
  totalCliente: 'USD 13.8M',
  sociedadesActivas: POSICION_TREE.length,
  cuentasActivas: POSICION_TREE.reduce((acc, s) => acc + s.cuentas.length, 0),
};
