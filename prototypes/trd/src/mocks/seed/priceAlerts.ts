// ════════════════════════════════════════════════════════════════════
// MSW seed — TRD / Price Alerts
// ────────────────────────────────────────────────────────────────────
// 12 price-trigger rules: 8 active + 4 inactive, mix of BUY/SELL.
// Names follow the desk's convention "PAIR side @ price" so the row
// label communicates intent at a glance.
// ════════════════════════════════════════════════════════════════════

import type { PriceAlert } from '@/types/priceAlert';

const initialPriceAlerts: PriceAlert[] = [
  { id: 'pa_001', name: 'USDT/ARS BUY @ 980',    side: 'BUY',  cost_price: '980',  limit_price: '985',  volume: '50000',  active: true,  created_at: '2026-05-15T10:00:00Z', updated_at: '2026-05-15T10:00:00Z' },
  { id: 'pa_002', name: 'USDT/ARS SELL @ 1020',  side: 'SELL', cost_price: '1020', limit_price: '1015', volume: '50000',  active: true,  created_at: '2026-05-15T10:30:00Z', updated_at: '2026-05-15T10:30:00Z' },
  { id: 'pa_003', name: 'USDC/ARS BUY @ 985',    side: 'BUY',  cost_price: '985',  limit_price: '990',  volume: '80000',  active: true,  created_at: '2026-05-18T09:00:00Z', updated_at: '2026-05-18T09:00:00Z' },
  { id: 'pa_004', name: 'USDC/ARS SELL @ 1015',  side: 'SELL', cost_price: '1015', limit_price: '1010', volume: '80000',  active: true,  created_at: '2026-05-18T09:15:00Z', updated_at: '2026-05-18T09:15:00Z' },
  { id: 'pa_005', name: 'USD/ARS BUY @ 988',     side: 'BUY',  cost_price: '988',  limit_price: '992',  volume: '120000', active: true,  created_at: '2026-05-20T11:00:00Z', updated_at: '2026-05-22T15:30:00Z' },
  { id: 'pa_006', name: 'USD/ARS SELL @ 1018',   side: 'SELL', cost_price: '1018', limit_price: '1012', volume: '120000', active: true,  created_at: '2026-05-20T11:15:00Z', updated_at: '2026-05-20T11:15:00Z' },
  { id: 'pa_007', name: 'BTC/USD BUY @ 65k',     side: 'BUY',  cost_price: '65000',  limit_price: '64500',  volume: '0.5',  active: true,  created_at: '2026-05-22T14:00:00Z', updated_at: '2026-05-22T14:00:00Z' },
  { id: 'pa_008', name: 'BTC/USD SELL @ 70k',    side: 'SELL', cost_price: '70000',  limit_price: '70500',  volume: '0.5',  active: true,  created_at: '2026-05-22T14:30:00Z', updated_at: '2026-05-22T14:30:00Z' },
  { id: 'pa_009', name: 'USDT/ARS legacy buy',   side: 'BUY',  cost_price: '950',  limit_price: '955',  volume: '20000',  active: false, created_at: '2026-04-10T08:00:00Z', updated_at: '2026-04-25T12:00:00Z' },
  { id: 'pa_010', name: 'EUR/ARS sell test',     side: 'SELL', cost_price: '1100', limit_price: '1095', volume: '30000',  active: false, created_at: '2026-04-15T09:30:00Z', updated_at: '2026-05-01T10:00:00Z' },
  { id: 'pa_011', name: 'ETH/USD BUY @ 3200',    side: 'BUY',  cost_price: '3200', limit_price: '3180', volume: '5',      active: false, created_at: '2026-04-20T11:00:00Z', updated_at: '2026-05-10T16:00:00Z' },
  { id: 'pa_012', name: 'BNB/USDT pilot',        side: 'SELL', cost_price: '580',  limit_price: '585',  volume: '10',     active: false, created_at: '2026-04-22T13:00:00Z', updated_at: '2026-05-05T11:00:00Z' },
];

export let priceAlertsSeed: PriceAlert[] = structuredClone(initialPriceAlerts);

let idCounter = initialPriceAlerts.length;

/** Generate a stable, monotonically-incrementing id (pa_013, pa_014, …). */
export function nextPriceAlertId(): string {
  idCounter += 1;
  return `pa_${String(idCounter).padStart(3, '0')}`;
}

export function resetPriceAlertsSeed(): void {
  priceAlertsSeed = structuredClone(initialPriceAlerts);
  idCounter = initialPriceAlerts.length;
}
