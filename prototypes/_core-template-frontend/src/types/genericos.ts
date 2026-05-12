// ════════════════════════════════════════════════════════════════════
// Generic-module shared types — Solicitud, Alerta, Report, ReportRun
// ────────────────────────────────────────────────────────────────────
// Single source of truth for the four cross-cutting standard modules
// (Dashboard, Inbox, Alertas, Reportes) per the `core-modulo-genericos`
// capability spec. Apps SHALL extend these types via interface extension
// or generics; redefining the base interfaces in app code is a contract
// violation (see Requirement: shared TS types).
//
// Reused primitives (`TimelineEvent`, `Comment`) are re-exported from
// `@/types/drawer` so a single import surface satisfies both the Drawer
// component layer and the canonical module-data layer.
//
// ── Architectural principles formalized 2026-05-12 ──────────────────
//
// Two paradigm principles govern how these types are consumed by apps;
// they live as Requirements in the canonical spec
// (`openspec/specs/core-modulo-genericos/spec.md`) and any deviation is
// rejected at PR review:
//
//   1. "Wizard of Oz" — External CTAs MUST invoke a capability of the
//      target app, not a specific execution route. The capability decides
//      at runtime whether the invocation is satisfied by direct
//      integration (no Solicitud in the Centro) or by creating a
//      Solicitud/Tarea (Centro entry). Switching paths MUST NOT require
//      a change to the calling CTA.
//
//   2. Centro scope exclusivity — The Inbox/Centro de Solicitudes hosts
//      ONLY Solicitudes/Tareas requiring human intervention from the
//      backoffice. Pure programmatic jobs (sync, audit, normalization,
//      cron) live in code as Task Definitions, not as records of these
//      types. A job MAY declare opt-in fallback to the Centro for human
//      escalation on failure; without the fallback, failures route to
//      Observability alerts only. The Solicitud model MUST NOT grow an
//      `execution: manual | programmatic` discriminator — every record
//      here is implicitly human-action work.
// ════════════════════════════════════════════════════════════════════

import type { TimelineEvent, Comment } from './drawer';

// Re-export Drawer primitives so consumers only need a single import.
export type { TimelineEvent, Comment } from './drawer';

// ────────────────────────────────────────────────────────────────────
// Solicitud (Inbox)
// ────────────────────────────────────────────────────────────────────

/** Open string union — defaults are the canonical four; apps MAY override. */
export type SolicitudState =
  | 'pendiente'
  | 'en_proceso'
  | 'completed'
  | 'rejected'
  | string;

/** Glanceable severity axis used by CardItem / kanban / list rows. */
export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type Solicitud = {
  id: string;
  type: string;
  source_app: string;
  source_module: string;
  /** Owner id — null when unassigned. */
  owner_id: string | null;
  /** Resolved display name (or empty string when unassigned). */
  owner_name: string;
  /** SLA window in hours — null when SLA tracking is disabled. */
  sla_hours: number | null;
  state: SolicitudState;
  severity?: Severity;
  /** ISO-8601 timestamp. */
  created_at: string;
  /** ISO-8601 timestamp. */
  updated_at: string;
  title: string;
  summary?: string;
  /** Persisted by ClosureModal on terminal-state transitions. */
  closure_comment?: string;
  timeline: TimelineEvent[];
  comments: Comment[];
};

// ────────────────────────────────────────────────────────────────────
// Alerta (Alertas)
// ────────────────────────────────────────────────────────────────────

/** Profile discriminator — exactly one per ALERT_TYPE (see Requirement: Alertas profiles). */
export type AlertProfile = 'A' | 'B' | 'C' | 'D';

export type AlertaState = 'new' | 'in_review' | 'resolved' | 'dismissed' | string;

export type Alerta = {
  id: string;
  type: string;
  profile: AlertProfile;
  source_app: string;
  source_module: string;
  state: AlertaState;
  severity?: Severity;
  /** ISO-8601 timestamp. */
  detected_at: string;
  title: string;
  summary?: string;
  details?: Record<string, unknown>;
  /** Required justification for terminal-state closes (profile B). */
  closure_comment?: string;
  timeline: TimelineEvent[];
  comments: Comment[];
};

// ────────────────────────────────────────────────────────────────────
// Reportes — templates (Catálogo) and runs (Histórico)
// ────────────────────────────────────────────────────────────────────

/**
 * Open string union — apps register their own keys via the
 * REPORT_CATEGORIES config. Baseline keys live in
 * `src/mocks/genericos/reportes.ts`.
 */
export type ReportCategoryKey = string;

export type Periodicity =
  | 'Semanal'
  | 'Mensual'
  | 'Trimestral'
  | 'Semestral'
  | 'Anual'
  | 'Ad-hoc'
  | 'On-demand';

export type ReportFormat = 'PDF' | 'XLSX' | 'CSV' | 'JSON';

export type ReportDependency = {
  app: string;
  module: string;
  task: string;
  owner_role: string;
  /** Days before `next` at which the dependency must be completed. */
  sla_days_before: number;
  completed: boolean;
};

export type Report = {
  id: string;
  name: string;
  description?: string;
  category: ReportCategoryKey;
  periodicity: Periodicity;
  format: ReportFormat;
  /** Free-form retention label (e.g. "5 años"). */
  retention?: string;
  /** ISO date string or null for on-demand reports. */
  next?: string | null;
  cron_enabled: boolean;
  cron_active?: boolean;
  /** Anticipation in days for the próxima emisión chip. */
  antic?: number;
  /** Labels of expected params. */
  params?: string[];
  dependencies?: ReportDependency[];
  locked?: boolean;
  locked_reason?: string;
};

export type ReportRunStatus = 'requested' | 'running' | 'completed' | 'failed';

export type ReportRunTrigger =
  | { type: 'cron' }
  | { type: 'manual'; user_id: string; user_name?: string }
  | { type: 'system' };

export type ReportRun = {
  id: string;
  report_id: string;
  /** ISO-8601 timestamp. */
  requested_at: string;
  /** ISO-8601 timestamp; undefined while pending. */
  completed_at?: string;
  status: ReportRunStatus;
  output_url?: string;
  error_message?: string;
  trigger: ReportRunTrigger;
  /** Resolved display name of the requester (cached on the run). */
  requested_by_name: string;
  /** Snapshot of the report parameters at request time. */
  params?: string;
};

// ────────────────────────────────────────────────────────────────────
// REPORT_DEPENDENCY cross-app event payload
// ────────────────────────────────────────────────────────────────────

export type ReportDependencyEvent = {
  report_id: string;
  /** App publishing the blocker (formerly `blocking_app`). */
  app: string;
  /** Module publishing the blocker (formerly `blocking_module`). */
  module: string;
  /** Task that must complete (formerly `blocking_state`). */
  task: string;
  sla_days_before: number;
  emitted_at: number;
};

// ────────────────────────────────────────────────────────────────────
// Type guards (used by validators + tests)
// ────────────────────────────────────────────────────────────────────

export function isSolicitud(value: unknown): value is Solicitud {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.type === 'string' &&
    typeof v.source_app === 'string' &&
    typeof v.state === 'string' &&
    Array.isArray(v.timeline) &&
    Array.isArray(v.comments)
  );
}

export function isAlerta(value: unknown): value is Alerta {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.type === 'string' &&
    typeof v.profile === 'string' &&
    ['A', 'B', 'C', 'D'].includes(v.profile as string) &&
    typeof v.source_app === 'string'
  );
}

export function isReport(value: unknown): value is Report {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.category === 'string' &&
    typeof v.name === 'string' &&
    typeof v.periodicity === 'string' &&
    typeof v.format === 'string' &&
    typeof v.cron_enabled === 'boolean'
  );
}

export function isReportRun(value: unknown): value is ReportRun {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.report_id === 'string' &&
    typeof v.requested_at === 'string' &&
    typeof v.status === 'string'
  );
}
