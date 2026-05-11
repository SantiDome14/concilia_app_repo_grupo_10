// ════════════════════════════════════════════════════════════════════
// Drawer types — Timeline events and Comment thread shapes
// ────────────────────────────────────────────────────────────────────
// Pure types consumed by the side <Drawer> detail surface contracted
// in `core-modals` (Requirement: workflow-typed records open a Drawer).
// Used by Solicitud (Inbox) and Alerta profile B (Alertas) records.
// ════════════════════════════════════════════════════════════════════

/**
 * A single chronological event on a record's timeline.
 *
 * `kind` is an open string union — the four canonical values
 * (`state_change`, `field_update`, `comment_added`, `system`) drive the
 * dot-color variant on the <Timeline> renderer. Any other value falls
 * back to the neutral dot.
 */
export type TimelineEvent = {
  id: string;
  /** ISO timestamp (e.g. `2026-04-29T14:30:00Z`). */
  at: string;
  actor_id: string;
  actor_name: string;
  kind: 'state_change' | 'field_update' | 'comment_added' | 'system' | string;
  /** Human-readable summary rendered in the timeline row. */
  label: string;
  details?: Record<string, unknown>;
};

/**
 * A comment in the Drawer's threaded comments section.
 *
 * `parent_id` is null/undefined for root comments and a string id for
 * level-1 replies. The renderer enforces a flat reply structure — there
 * is no recursive nesting beyond depth 1.
 */
export type Comment = {
  id: string;
  /** ISO timestamp. */
  at: string;
  author_id: string;
  author_name: string;
  body: string;
  /** null/undefined = root comment; string = reply to that comment id. */
  parent_id?: string | null;
};
