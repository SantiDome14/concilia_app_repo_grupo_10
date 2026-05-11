// ════════════════════════════════════════════════════════════════════
// Kanban runtime types — the contract for the <KanbanBoard> Vue layer
// ────────────────────────────────────────────────────────────────────
// These types model what the BOARD consumes at render-time:
//   - declarative states/transitions per axis
//   - records to render as cards
//
// The MANIFEST-side `KanbanAxis`/`KanbanState` in `@/types/manifest`
// is a different (smaller) shape — that one is the JSON-strict
// authoring surface; this one is the in-memory runtime surface that
// the engine projects records onto. The two are intentionally NOT
// merged so manifests stay JSON-serializable.
// ════════════════════════════════════════════════════════════════════

/** A single column descriptor on a kanban axis. */
export type KanbanState = {
  /** Stable id stored on records (e.g. "PENDING"). */
  id: string;
  /** Human label used in toasts and chips. */
  label: string;
  /** Header label rendered on the column itself; falls back to `label`. */
  column_label?: string;
  /** 1-based ordering — columns are sorted by `order` ascending. */
  order: number;
  /** Terminal columns block drags out and undeclared drops in. */
  terminal?: boolean;
};

/** Mode of a declared transition between two states. */
export type KanbanTransitionMode = 'free' | 'modal' | 'blocked';

/** A declared (from, to) transition over a single axis. */
export type KanbanTransition = {
  from: string;
  to: string;
  mode: KanbanTransitionMode;
  /** Named function key in the axis-side `side_effects` registry. */
  side_effect?: string;
};

/**
 * A kanban axis — the runtime projection of a declarative state machine
 * over a single field of a record.
 *
 * `state_field` supports dot-paths (e.g. `'fin.imput'`) so axes can
 * target nested record fields without flattening the record shape.
 */
export type KanbanAxis = {
  axis_id: string;
  label: string;
  description?: string;
  /** Dot-path to the record field that stores the state id. */
  state_field: string;
  states: KanbanState[];
  transitions: KanbanTransition[];
  /** Side-effect functions referenced by `KanbanTransition.side_effect`. */
  side_effects?: Record<string, (record: Record<string, unknown>) => void>;
  /** Read-only axes render but block every drop with an info toast. */
  read_only?: boolean;
};

/**
 * A kanban-renderable record. The `id` is mandatory; `severity` is
 * the canonical glanceable axis. Modules MAY add any other fields.
 */
export type KanbanRecord = Record<string, unknown> & {
  id: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
};
