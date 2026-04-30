// ════════════════════════════════════════════════════════════════════
// Mock catalog · ops.catalogo_cuentas
// ────────────────────────────────────────────────────────────────────
// Bank and wallet accounts of every Sociedad in the group. Powers the
// `Asignar Banco y Cuenta` action's lookup, which filters by
// `sociedad_id` (catalog_filter `from_record: 'fin.sociedad_id'`), and
// the `Asignar Cuenta de Origen` action on the cola, which filters by
// `moneda` (catalog_filter `from_record: 'moneda'`).
// ════════════════════════════════════════════════════════════════════

import type { CuentaBancaria } from '@/types/fin';

export const CUENTAS: CuentaBancaria[] = [
  // Haz Pagos
  {
    id: 'cu-hp-coinag-cbu',
    sociedad_id: 'hp',
    banco: 'Coinag',
    numero: '2850590940093...',
    moneda: 'ARS',
    label: 'Haz Pagos · CBU Coinag',
  },
  {
    id: 'cu-hp-cvu-pool',
    sociedad_id: 'hp',
    banco: 'Coinag',
    numero: 'Pool de CVUs',
    moneda: 'ARS',
    label: 'Haz Pagos · CVU Cliente Pool',
  },
  {
    id: 'cu-hp-brubank',
    sociedad_id: 'hp',
    banco: 'Brubank',
    numero: 'cuenta x4521',
    moneda: 'ARS',
    label: 'Haz Pagos · Brubank x4521',
  },
  {
    id: 'cu-hp-galicia',
    sociedad_id: 'hp',
    banco: 'Galicia',
    numero: 'cuenta x7733',
    moneda: 'ARS',
    label: 'Haz Pagos · Galicia x7733',
  },
  // Circuit Pay
  {
    id: 'cu-cp-bitgo-usdc',
    sociedad_id: 'cp',
    banco: 'BitGo',
    numero: 'wallet 0xABC...',
    moneda: 'USDC',
    label: 'Circuit Pay · Pool BitGo USDC',
  },
  {
    id: 'cu-cp-bitgo-usdt',
    sociedad_id: 'cp',
    banco: 'BitGo',
    numero: 'wallet 0xDEF...',
    moneda: 'USDT',
    label: 'Circuit Pay · Pool BitGo USDT',
  },
  {
    id: 'cu-cp-bitso-usdt',
    sociedad_id: 'cp',
    banco: 'Bitso',
    numero: 'wallet 0x789...',
    moneda: 'USDT',
    label: 'Circuit Pay · Pool Bitso USDT',
  },
  // Ardua Solutions Corp
  {
    id: 'cu-asc-bridge',
    sociedad_id: 'asc',
    banco: 'Bridge',
    numero: 'BR-7733',
    moneda: 'USD',
    label: 'Ardua Solutions Corp · Bridge USD',
  },
  {
    id: 'cu-asc-convera',
    sociedad_id: 'asc',
    banco: 'Convera',
    numero: 'CV-1188',
    moneda: 'USD',
    label: 'Ardua Solutions Corp · Convera USD',
  },
  {
    id: 'cu-asc-bmo',
    sociedad_id: 'asc',
    banco: 'BMO',
    numero: 'BM-2200',
    moneda: 'CAD',
    label: 'Ardua Solutions Corp · BMO CAD',
  },
  // Astra Ventures
  {
    id: 'cu-av-bind',
    sociedad_id: 'av',
    banco: 'Bind',
    numero: 'BD-5566',
    moneda: 'EUR',
    label: 'Astra Ventures · Bind EUR',
  },
  {
    id: 'cu-av-bitgo-usdc',
    sociedad_id: 'av',
    banco: 'BitGo',
    numero: 'wallet 0xAS...',
    moneda: 'USDC',
    label: 'Astra Ventures · Pool BitGo USDC',
  },
];
