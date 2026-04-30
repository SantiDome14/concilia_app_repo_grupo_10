// ════════════════════════════════════════════════════════════════════
// Kanban transition logic — pure, framework-agnostic helpers
// ────────────────────────────────────────────────────────────────────
// All decisions about whether a drag-drop is allowed, in modal mode,
// or blocked are computed here so they can be unit-tested without a
// DOM. The Vue components consume these helpers to render visual
// feedback and emit events.
// ════════════════════════════════════════════════════════════════════

import type { KanbanAxis, KanbanRecord, KanbanTransition, KanbanTransitionMode } from '@/types/kanban';

/** Block reason surfaced to telemetry. */
export type BlockReason =
  | 'undeclared'
  | 'terminal-origin'
  | 'terminal-destination'
  | 'read-only-axis';

/** The structured outcome of evaluating a candidate drop. */
export type EvaluateDropResult =
  | { allowed: true; mode: 'free' | 'modal'; transition: KanbanTransition }
  | { allowed: false; mode: 'blocked'; reason: BlockReason };

/**
 * Find the declared transition matching (fromState → toState) on an axis.
 * Returns `null` when no transition is declared (i.e. the drop should be
 * blocked by default).
 */
export function findTransition(
  axis: KanbanAxis,
  fromState: string,
  toState: string,
): KanbanTransition | null {
  if (!axis || !Array.isArray(axis.transitions)) return null;
  return axis.transitions.find((t) => t.from === fromState && t.to === toState) ?? null;
}

function isTerminal(axis: KanbanAxis, stateId: string): boolean {
  const state = axis.states.find((s) => s.id === stateId);
  return Boolean(state?.terminal);
}

/**
 * Decide whether a candidate drop is allowed, opens a modal, or is
 * blocked. The decision tree:
 *
 *   1. Read-only axes → blocked (read-only-axis).
 *   2. Origin is a terminal state → blocked (terminal-origin), UNLESS a
 *      transition is declared with `mode: 'modal'` (terminal cards stay
 *      non-draggable in the UI; this is a defense in depth).
 *   3. No declared transition → blocked (undeclared). Terminal
 *      destinations also fall here unless declared.
 *   4. Declared transition with `mode: 'blocked'` → blocked (undeclared).
 *   5. Otherwise → allowed in the declared mode.
 */
export function evaluateDrop(
  axis: KanbanAxis,
  fromState: string,
  toState: string,
): EvaluateDropResult {
  if (axis.read_only) {
    return { allowed: false, mode: 'blocked', reason: 'read-only-axis' };
  }

  const declared = findTransition(axis, fromState, toState);

  // Terminal origin: still blocked unless a transition out is declared
  // with mode === 'modal'. We never allow a free transition out of a
  // terminal column.
  if (isTerminal(axis, fromState)) {
    if (declared && declared.mode === 'modal') {
      return { allowed: true, mode: 'modal', transition: declared };
    }
    return { allowed: false, mode: 'blocked', reason: 'terminal-origin' };
  }

  if (!declared) {
    // Distinguish terminal destinations from generic undeclared so
    // telemetry can attribute the cause. Either way, the surface
    // toast text and snap-back behavior is identical.
    if (isTerminal(axis, toState)) {
      return { allowed: false, mode: 'blocked', reason: 'terminal-destination' };
    }
    return { allowed: false, mode: 'blocked', reason: 'undeclared' };
  }

  if (declared.mode === 'blocked') {
    return { allowed: false, mode: 'blocked', reason: 'undeclared' };
  }

  return { allowed: true, mode: declared.mode, transition: declared };
}

// ────────────────────────────────────────────────────────────────────
// Severity-first sort — used by every kanban column
// ────────────────────────────────────────────────────────────────────

const SEVERITY_RANK: Record<NonNullable<KanbanRecord['severity']>, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function severityRank(value: unknown): number {
  if (typeof value === 'string' && value in SEVERITY_RANK) {
    return SEVERITY_RANK[value as keyof typeof SEVERITY_RANK];
  }
  return 4; // unknown / missing severity sorts after `low`
}

function recencyTimestamp(record: KanbanRecord): number {
  const fromUpdated = parseTimestamp(record['updated_at']);
  if (fromUpdated !== null) return fromUpdated;
  const fromCreated = parseTimestamp(record['created_at']);
  if (fromCreated !== null) return fromCreated;
  return Number.NaN;
}

function parseTimestamp(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : null;
  }
  return null;
}

/**
 * Default sort comparator for kanban-rendered records:
 *   1. severity asc rank (critical → high → medium → low → unknown);
 *   2. recency desc (updated_at, falling back to created_at);
 *   3. fall back to 0 so the caller's input order is preserved.
 */
export function kanbanSort(a: KanbanRecord, b: KanbanRecord): number {
  const sa = severityRank(a.severity);
  const sb = severityRank(b.severity);
  if (sa !== sb) return sa - sb;

  const ra = recencyTimestamp(a);
  const rb = recencyTimestamp(b);
  const raValid = Number.isFinite(ra);
  const rbValid = Number.isFinite(rb);
  if (raValid && rbValid && ra !== rb) return rb - ra; // desc
  if (raValid && !rbValid) return -1; // records with timestamps win
  if (!raValid && rbValid) return 1;

  return 0;
}

// Re-export the runtime-mode union for downstream consumers.
export type { KanbanTransitionMode };
