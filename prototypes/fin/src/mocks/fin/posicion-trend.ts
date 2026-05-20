// ════════════════════════════════════════════════════════════════════
// Mock seed · Posición consolidada (USD-equivalente) trend series
// ────────────────────────────────────────────────────────────────────
// Daily snapshot of the group's consolidated Bancos position, expressed
// in USD via the Tipos de Cambio table (FX rates). The catalog does NOT
// exist in V1 — these values are placeholder seed data anchored at the
// USD 28.4M figure shown in the Dashboard KPI tile.
//
// The series spans the last 365 days ending at the page's reference
// "today" (2026-04-24). Consumers slice by the canonical period set
// (Día / Mes / Trimestre / Semestre / Año) via `slicePosicionTrend`.
// ════════════════════════════════════════════════════════════════════

export interface PosicionTrendPoint {
  /** ISO date YYYY-MM-DD. */
  date: string;
  /** USD-equivalent millions (e.g., 28.4 means USD 28.4M). */
  value: number;
}

/** Canonical periods supported by the dashboard period selector. */
export type DashboardPeriod = '7' | '30' | '90';

/** Days-back covered by each period. */
const PERIOD_DAYS: Record<DashboardPeriod, number> = {
  '7': 7,
  '30': 30,
  '90': 90,
};

const TODAY = new Date('2026-04-24T00:00:00Z').getTime();
const MS_DAY = 86_400_000;

/** Pseudo-random but deterministic seed — no Math.random in mocks. */
function seededValue(daysAgo: number): number {
  const base = 28.4;
  const wave = Math.sin(daysAgo / 6) * 1.2;
  const drift = -daysAgo * 0.03;
  const bump = daysAgo % 13 === 0 ? -1.3 : 0;
  return Math.max(15, base + wave + drift + bump);
}

function isoDateNDaysAgo(n: number): string {
  return new Date(TODAY - n * MS_DAY).toISOString().slice(0, 10);
}

/** Full 365-day series, ordered oldest → newest. */
export const POSICION_TREND_365D: PosicionTrendPoint[] = Array.from(
  { length: 365 },
  (_unused, i) => {
    const daysAgo = 364 - i;
    return {
      date: isoDateNDaysAgo(daysAgo),
      value: Number(seededValue(daysAgo).toFixed(2)),
    };
  },
);

/**
 * Slice the trend by the dashboard period selector. Returns the last
 * N daily points where N matches the period's day count. The
 * Dashboard's X axis renders one tick per point.
 */
export function slicePosicionTrend(period: DashboardPeriod): PosicionTrendPoint[] {
  return POSICION_TREND_365D.slice(-PERIOD_DAYS[period]);
}

/** Latest snapshot — independent of the current period selector. */
export function latestPosicionPoint(): PosicionTrendPoint {
  const last = POSICION_TREND_365D[POSICION_TREND_365D.length - 1];
  return last ?? { date: '2026-04-24', value: 28.4 };
}
