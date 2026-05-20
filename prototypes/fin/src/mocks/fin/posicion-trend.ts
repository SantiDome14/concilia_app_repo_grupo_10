// ════════════════════════════════════════════════════════════════════
// Mock seed · Posición consolidada (USD-equivalente) trend series
// ────────────────────────────────────────────────────────────────────
// Daily snapshot of the group's consolidated Bancos position, expressed
// in USD via the Tipos de Cambio table (FX rates). The catalog does NOT
// exist in V1 — these values are placeholder seed data anchored at the
// USD 28.4M figure shown in the Dashboard KPI tile.
//
// The series spans the last 90 days ending at the page's reference
// "today" (2026-04-24). Consumers slice by period (last 7d / 30d / 90d)
// via the `slicePeriod` helper.
// ════════════════════════════════════════════════════════════════════

export interface PosicionTrendPoint {
  /** ISO date YYYY-MM-DD. */
  date: string;
  /** USD-equivalent millions (e.g., 28.4 means USD 28.4M). */
  value: number;
}

const TODAY = new Date('2026-04-24T00:00:00Z').getTime();
const MS_DAY = 86_400_000;

/** Pseudo-random but deterministic seed — no Math.random in mocks. */
function seededValue(daysAgo: number): number {
  const base = 28.4;
  const wave = Math.sin(daysAgo / 6) * 1.2;
  const drift = -daysAgo * 0.06;
  const bump = daysAgo % 13 === 0 ? -1.3 : 0;
  return Math.max(20, base + wave + drift + bump);
}

function isoDateNDaysAgo(n: number): string {
  return new Date(TODAY - n * MS_DAY).toISOString().slice(0, 10);
}

/** Full 90-day series, ordered oldest → newest. */
export const POSICION_TREND_90D: PosicionTrendPoint[] = Array.from(
  { length: 90 },
  (_unused, i) => {
    const daysAgo = 89 - i;
    return {
      date: isoDateNDaysAgo(daysAgo),
      value: Number(seededValue(daysAgo).toFixed(2)),
    };
  },
);

/** Slice the trend by the dashboard period selector. */
export function slicePosicionTrend(
  period: '7' | '30' | '90' | 'today',
): PosicionTrendPoint[] {
  if (period === 'today') return POSICION_TREND_90D.slice(-1);
  const days = Number(period);
  return POSICION_TREND_90D.slice(-days);
}
