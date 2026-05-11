/** Per-series declaration shape used by all XY chart wrappers. */
export interface ChartSeries<T> {
  name: string;
  accessor: (d: T) => number;
}

// ════════════════════════════════════════════════════════════════════
// Chart series color resolver
// ────────────────────────────────────────────────────────────────────
// Implements the contract from `core-charts`:
//   - Default: cycle through `--chart-1` … `--chart-8`.
//   - Token aliases ('success' | 'warning' | 'danger' | 'info' | 'neutral')
//     resolve against the semantic palette.
//   - `var(--*)` refs are passed through.
//   - Hardcoded hex / rgb is forbidden — runtime warns once per session.
// ════════════════════════════════════════════════════════════════════

const CHART_PALETTE_SIZE = 8;

const SEMANTIC_TOKEN_ALIASES = new Set<SeriesColor>([
  'success',
  'warning',
  'danger',
  'info',
  'neutral',
]);

export type SemanticAlias = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
export type SeriesColor = SemanticAlias | `var(--${string})` | string;

const HARDCODED_PATTERN = /^(#|rgb|hsl|oklch)/i;
let _hexWarned = false;

function semanticVar(alias: SemanticAlias): string {
  switch (alias) {
    case 'success':
      return 'var(--success)';
    case 'warning':
      return 'var(--warning)';
    case 'danger':
      return 'var(--danger)';
    case 'info':
      return 'var(--info)';
    case 'neutral':
      return 'var(--t-3)';
  }
}

function chartTokenForIndex(idx: number): string {
  const slot = (idx % CHART_PALETTE_SIZE) + 1;
  if (idx >= CHART_PALETTE_SIZE && !_hexWarned) {
    console.warn(
      `[charts] Chart series count exceeds ${CHART_PALETTE_SIZE} — colors will repeat`,
    );
  }
  return `var(--chart-${slot})`;
}

/** Resolve a series color: explicit prop value > automatic chart-N. */
export function resolveSeriesColor(
  colors: SeriesColor[] | undefined,
  index: number,
): string {
  const candidate = colors?.[index];
  if (candidate === undefined) return chartTokenForIndex(index);
  if (typeof candidate !== 'string') return chartTokenForIndex(index);
  if (SEMANTIC_TOKEN_ALIASES.has(candidate as SeriesColor)) {
    return semanticVar(candidate as SemanticAlias);
  }
  if (candidate.startsWith('var(')) return candidate;
  if (HARDCODED_PATTERN.test(candidate)) {
    if (!_hexWarned) {
      console.warn(
        `[charts] Hardcoded color "${candidate}" passed to chart series ${index}; use a token alias or var(--*) instead`,
      );
      _hexWarned = true;
    }
    return candidate; // pass through but warned
  }
  return candidate;
}
