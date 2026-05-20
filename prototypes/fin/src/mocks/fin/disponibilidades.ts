// ════════════════════════════════════════════════════════════════════
// Mock Disponibilidades — Posición tree + ecuación maestra KPIs
// ────────────────────────────────────────────────────────────────────
// Per `align-fin-disponibilidades-to-omnibus-model`:
//   - The Posición sub-tab renders a hierarchical tree Sociedad → Cuenta
//     with physical saldo only (no Propio / Cliente segmentation per
//     cuenta — that question is malformed under omnibus accounting).
//   - The L2 KPI strip exposes the 4 dimensions of the ecuación maestra
//     (Bancos / Obligaciones / Pendientes / Capacidad Operativa) per
//     moneda nativa. V1 does NOT apply cross-currency conversions.
//
// Numbers are static seed data consistent with the canonical CUENTAS
// catalogue. The ecuación maestra holds at the consolidated group level
// per moneda — the per-sociedad split is not enforced in the mock but
// the seed values are chosen so the consolidated invariant `Bancos =
// Obligaciones + Pendientes + Capacidad Operativa` cuadra exactly.
// ════════════════════════════════════════════════════════════════════

import type {
  Moneda,
  PosicionEcuacionMaestra,
  SociedadPos,
} from '@/types/fin';

// ────────────────────────────────────────────────────────────────────
// Posición tree (Sociedad → Cuenta with physical saldo per moneda)
// ────────────────────────────────────────────────────────────────────

export const POSICION_TREE: SociedadPos[] = [
  {
    id: 'hp',
    name: 'Haz Pagos',
    sub: 'PSP · Argentina · ARS',
    open: true,
    totals: [{ lbl: 'ARS', val: '1.017.930.500' }],
    cuentas: [
      {
        icon: 'bank',
        id: 'cu-hp-coinag-1',
        banco: 'COINAG',
        numero: 'Cta 10.049',
        det: 'CBU principal',
        saldo: '845.230.500',
        moneda: 'ARS',
      },
      {
        icon: 'bank',
        id: 'cu-hp-coinag-cvu',
        banco: 'COINAG',
        numero: 'CVU Cliente Pool',
        det: 'Pool de CVUs',
        saldo: '142.500.000',
        moneda: 'ARS',
      },
      {
        icon: 'bank',
        id: 'cu-hp-brubank-1',
        banco: 'BRUBANK',
        numero: 'Cta 2504679505001',
        det: 'cuenta x4521',
        saldo: '8.200.000',
        moneda: 'ARS',
      },
      {
        icon: 'bank',
        id: 'cu-hp-bind-1',
        banco: 'BIND',
        numero: 'Cta 4403443/1',
        det: 'cuenta principal',
        saldo: '22.000.000',
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
    cuentas: [
      {
        icon: 'wallet',
        id: 'cu-cp-bitgo-2',
        banco: 'BITGO',
        numero: '0xBG...A8C2',
        det: 'wallet USDC pool',
        saldo: '3.200.000',
        moneda: 'USDC',
      },
      {
        icon: 'wallet',
        id: 'cu-cp-bitgo-1',
        banco: 'BITGO',
        numero: '0xBG...USDT',
        det: 'wallet USDT custodia',
        saldo: '1.500.000',
        moneda: 'USDT',
      },
      {
        icon: 'wallet',
        id: 'cu-cp-bitso-1',
        banco: 'BITSO',
        numero: '0x789...4F2A',
        det: 'wallet USDT',
        saldo: '280.000',
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
    cuentas: [
      {
        icon: 'bank',
        id: 'cu-asc-bridge-1',
        banco: 'BRIDGE',
        numero: 'Cta BR-7733',
        det: 'cuenta xx-9821',
        saldo: '8.450.000',
        moneda: 'USD',
      },
      {
        icon: 'bank',
        id: 'cu-asc-convera-1',
        banco: 'CONVERA',
        numero: 'Cta CV-1188',
        det: 'cuenta xx-3344',
        saldo: '3.000.000',
        moneda: 'USD',
      },
      {
        icon: 'bank',
        id: 'cu-asc-bmo-1',
        banco: 'BMO',
        numero: 'Cta BM-2200',
        det: 'account xx-1122',
        saldo: '1.200.000',
        moneda: 'CAD',
      },
      {
        icon: 'wallet',
        id: 'cu-asc-coinbase-usdc',
        banco: 'COINBASE',
        numero: '0xCBA...E1D9',
        det: 'wallet USDC',
        saldo: '1.000.000',
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
    cuentas: [
      {
        icon: 'bank',
        id: 'cu-av-bind-1',
        banco: 'BIND',
        numero: 'Cta BD-5566',
        det: 'cuenta xx-5566',
        saldo: '1.820.000',
        moneda: 'EUR',
      },
      {
        icon: 'wallet',
        id: 'cu-av-bitgo-1',
        banco: 'BITGO',
        numero: '0xAST...77B3',
        det: 'wallet USDC (Astra)',
        saldo: '580.000',
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
// Posición KPIs — ecuación maestra per moneda
// ────────────────────────────────────────────────────────────────────
// Σ Bancos  =  Σ Obligaciones  +  Σ Pendientes  +  Σ Capacidad Operativa
//
// Per-moneda seed values consolidated across the four sociedades. The
// numbers are chosen so the invariant cuadra exactly per moneda — adding
// any column to the right of the equation MUST equal the Bancos figure.
// ────────────────────────────────────────────────────────────────────

export const POSICION_KPIS: PosicionEcuacionMaestra = {
  bancos: {
    ARS: '1.017.930.500',
    USD: '11.450.000',
    USDC: '4.780.000',
    USDT: '1.780.000',
    EUR: '1.820.000',
    CAD: '1.200.000',
  },
  obligaciones: {
    ARS: '667.510.000',
    USD: '4.220.000',
    USDC: '2.340.000',
    USDT: '1.500.000',
    EUR: '640.000',
    CAD: '1.020.000',
  },
  pendientes: {
    ARS: '8.500.000',
    USD: '180.000',
    USDC: '130.000',
    USDT: '0',
    EUR: '95.000',
    CAD: '0',
  },
  capacidadOperativa: {
    ARS: '341.920.500',
    USD: '7.050.000',
    USDC: '2.310.000',
    USDT: '280.000',
    EUR: '1.085.000',
    CAD: '180.000',
  },
};
