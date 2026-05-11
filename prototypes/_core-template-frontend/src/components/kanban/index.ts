// ════════════════════════════════════════════════════════════════════
// Kanban suite barrel — components + runtime types
// ────────────────────────────────────────────────────────────────────
// Components are the rendering layer; the types module is the
// authoring contract pages consume to declare axes + records.
// ════════════════════════════════════════════════════════════════════

export { default as KanbanBoard } from './KanbanBoard.vue';
export { default as KanbanColumn } from './KanbanColumn.vue';
export { default as KanbanCard } from './KanbanCard.vue';
export { default as KanbanAxisDialog } from './KanbanAxisDialog.vue';

export type {
  KanbanAxis,
  KanbanState,
  KanbanRecord,
  KanbanTransition,
  KanbanTransitionMode,
} from '@/types/kanban';
